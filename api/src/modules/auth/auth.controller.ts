import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AppleSignInDto,
  GoogleSignInDto,
  RefreshDto,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { JwtPrincipal } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async signInApple(@Body() dto: AppleSignInDto) {
    const { sub, email } = await this.authService.verifyAppleIdToken(
      dto.idToken,
      dto.nonce,
    );
    const user = await this.authService.upsertUser('apple', sub, email);
    const tokens = await this.authService.issueTokens(user);
    return { user, ...tokens };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async signInGoogle(@Body() dto: GoogleSignInDto) {
    const { sub, email } = await this.authService.verifyGoogleIdToken(
      dto.idToken,
    );
    const user = await this.authService.upsertUser('google', sub, email);
    const tokens = await this.authService.issueTokens(user);
    return { user, ...tokens };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.rotateRefresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() principal: JwtPrincipal) {
    const user = await this.authService.getUserById(principal.userId);
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }
}
