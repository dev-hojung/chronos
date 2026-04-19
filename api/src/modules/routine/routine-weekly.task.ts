import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RoutineService } from './routine.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoutineWeeklyTask {
  private readonly logger = new Logger(RoutineWeeklyTask.name);

  constructor(
    private readonly routineService: RoutineService,
    private readonly prisma: PrismaService,
  ) {}

  /** 매주 일요일 22:00 — 모든 유저 루틴 분석 */
  @Cron('0 22 * * 0')
  async runWeeklyAnalysis(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      this.logger.warn('Weekly analysis skipped — no DATABASE_URL');
      return;
    }

    this.logger.log('Starting weekly routine analysis...');
    let userIds: string[];
    try {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      userIds = users.map((u) => u.id);
    } catch (err) {
      this.logger.error('Failed to fetch users for weekly analysis', err);
      return;
    }

    let created = 0;
    let applied = 0;
    for (const userId of userIds) {
      try {
        const proposals = await this.routineService.analyzeAndProposeForUser(userId);
        created += proposals.length;
        applied += proposals.filter((p) => p.appliedAt != null).length;
      } catch (err) {
        this.logger.error(`Analysis failed for user ${userId}`, err);
      }
    }

    this.logger.log(
      `Weekly analysis done — ${userIds.length} users, ${created} proposals, ${applied} auto-applied`,
    );
  }
}
