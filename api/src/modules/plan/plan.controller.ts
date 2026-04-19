// plan.controller.ts — Today 플랜 API (JwtAuthGuard 보호)
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPrincipal } from '../auth/jwt.strategy';
import { PlanService } from './plan.service';

interface ReorderBody {
  date: string;           // ISO date string YYYY-MM-DD
  orderedIds: string[];
}

interface PushTokenBody {
  token: string;
}

@Controller('plan')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  /** POST /plan/generate — 즉시 재생성 */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(
    @CurrentUser() principal: JwtPrincipal,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? this._parseDate(dateStr) : undefined;
    return this.planService.generateTodayPlan(principal.userId, date);
  }

  /** GET /plan/today?date=YYYY-MM-DD — 오늘 또는 지정일 */
  @Get('today')
  async getToday(
    @CurrentUser() principal: JwtPrincipal,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? this._parseDate(dateStr) : undefined;
    return this.planService.getTodayPlan(principal.userId, date);
  }

  /** POST /plan/reorder — 수동 재정렬 + 잠금 */
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @CurrentUser() principal: JwtPrincipal,
    @Body() body: ReorderBody,
  ) {
    const date = this._parseDate(body.date);
    return this.planService.manualReorder(principal.userId, date, body.orderedIds);
  }

  /** POST /plan/unlock?date= — 잠금 해제 */
  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  async unlock(
    @CurrentUser() principal: JwtPrincipal,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? this._parseDate(dateStr) : this._today();
    return this.planService.unlockPlan(principal.userId, date);
  }

  private _parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private _today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
