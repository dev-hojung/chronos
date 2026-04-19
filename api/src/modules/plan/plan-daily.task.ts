// plan-daily.task.ts — 매일 06:00 자동 플랜 생성 크론
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlanService } from './plan.service';

@Injectable()
export class PlanDailyTask {
  private readonly logger = new Logger(PlanDailyTask.name);

  constructor(private readonly planService: PlanService) {}

  /** 매일 06:00 — 모든 active 유저의 generateTodayPlan */
  @Cron('0 6 * * *')
  async runDailyPlanGeneration(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      this.logger.warn('Daily plan generation skipped — no DATABASE_URL');
      return;
    }

    this.logger.log('Starting daily plan generation...');

    let userIds: string[];
    try {
      userIds = await this.planService.getAllActiveUserIds();
    } catch (err) {
      this.logger.error('Failed to fetch users for daily plan generation', err);
      return;
    }

    let generated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.planService.generateTodayPlan(userId);
        generated++;
      } catch (err) {
        this.logger.error(`Daily plan generation failed for user ${userId}`, err);
        failed++;
      }
    }

    this.logger.log(
      `Daily plan generation done — ${userIds.length} users, ${generated} generated, ${failed} failed`,
    );
  }
}
