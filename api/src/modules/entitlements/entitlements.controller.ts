import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPrincipal } from '../auth/jwt.strategy';
import { EntitlementsService, type CoreFeature } from './entitlements.service';
import { VerifySsvDto } from './dto/verify-ssv.dto';

@Controller()
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  /**
   * GET /admob/ssv — AdMob SSV 콜백 (서명검증 + ad_token 발급)
   * AdMob 서버가 광고 시청 완료 후 직접 호출 (인증 없음)
   */
  @Get('admob/ssv')
  async handleAdMobSsv(@Query() query: VerifySsvDto) {
    const valid = await this.entitlementsService.verifyAdMobSsv(query);
    if (!valid) {
      throw new UnauthorizedException('AdMob SSV 검증 실패');
    }

    // custom_data = "userId:feature" 형식 파싱
    const customData = query.custom_data ?? '';
    const [userId, feature] = customData.split(':');
    if (!userId || !feature) {
      throw new UnauthorizedException('custom_data 형식 오류 (userId:feature 필요)');
    }

    this.entitlementsService.grantAdToken(
      userId,
      feature as CoreFeature,
      query.transaction_id,
    );

    return { ok: true };
  }

  /**
   * POST /entitlements/check — 엔타이틀먼트 확인
   * body: { feature: CoreFeature }
   */
  @UseGuards(JwtAuthGuard)
  @Post('entitlements/check')
  checkEntitlement(
    @Body('feature') feature: CoreFeature,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.entitlementsService.hasEntitlement(user.userId, user.tier, feature);
  }

  /**
   * GET /entitlements/status — 현재 사용자 구독 상태 + ad_token 유효성
   */
  @UseGuards(JwtAuthGuard)
  @Get('entitlements/status')
  getStatus(@CurrentUser() user: JwtPrincipal) {
    const features: CoreFeature[] = [
      'stack.autoBundle',
      'routine.analyze',
      'plan.generate',
    ];

    const featureStatus = features.map((f) => ({
      feature: f,
      ...this.entitlementsService.hasEntitlement(user.userId, user.tier, f),
    }));

    return {
      tier: user.tier,
      features: featureStatus,
    };
  }
}
