import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPrincipal } from '../auth/jwt.strategy';
import { StackService } from './stack.service';
import { CreateInboxItemDto } from './dto/create-inbox-item.dto';
import { ListInboxDto } from './dto/list-inbox.dto';
import { CreateStackDto } from './dto/create-stack.dto';
import { UpdateInboxItemDto } from './dto/update-inbox-item.dto';
import { EntitlementsService } from '../entitlements/entitlements.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class StackController {
  constructor(
    private readonly stackService: StackService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  // ── Inbox ──────────────────────────────────────────────────────────────

  @Post('inbox')
  createInboxItem(@Body() dto: CreateInboxItemDto, @CurrentUser() user: JwtPrincipal) {
    return this.stackService.createInboxItem(user.userId, dto);
  }

  @Get('inbox')
  listInbox(@Query() query: ListInboxDto, @CurrentUser() user: JwtPrincipal) {
    return this.stackService.listInbox(user.userId, query);
  }

  @Delete('inbox/:id')
  deleteInboxItem(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.stackService.deleteInboxItem(user.userId, id);
  }

  @Patch('inbox/:id')
  updateInboxItem(
    @Param('id') id: string,
    @Body() dto: UpdateInboxItemDto,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.stackService.updateInboxItem(user.userId, id, dto);
  }

  @Post('inbox/auto-bundle')
  autoBundleInbox(@CurrentUser() user: JwtPrincipal) {
    // 핵심기능 게이트: PRO 또는 유효 ad_token 필요
    this.entitlementsService.requireEntitlement(user.userId, user.tier, 'stack.autoBundle');
    return this.stackService.autoBundleInbox(user.userId);
  }

  // ── Stacks ─────────────────────────────────────────────────────────────

  @Get('stacks')
  listStacks(@CurrentUser() user: JwtPrincipal) {
    return this.stackService.listStacks(user.userId);
  }

  @Post('stacks')
  createStack(@Body() dto: CreateStackDto, @CurrentUser() user: JwtPrincipal) {
    return this.stackService.createManualStack(user.userId, dto);
  }

  @Get('stacks/:id')
  getStack(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.stackService.getStack(user.userId, id);
  }

  @Post('stacks/:id/items')
  addItems(
    @Param('id') id: string,
    @Body('itemIds') itemIds: string[],
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.stackService.addItemsToStack(user.userId, id, itemIds);
  }

  @Delete('stacks/:id/items/:itemId')
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.stackService.removeItem(user.userId, id, itemId);
  }

  @Delete('stacks/:id')
  deleteStack(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.stackService.deleteStack(user.userId, id);
  }
}
