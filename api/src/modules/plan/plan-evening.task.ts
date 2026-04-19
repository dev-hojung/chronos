// plan-evening.task.ts — 매일 21:00 진척 푸시
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlanService } from './plan.service';

// expo-server-sdk 동적 로드 (패키지 미설치 시 graceful skip)
let ExpoSdk: typeof import('expo-server-sdk') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoSdk = require('expo-server-sdk') as typeof import('expo-server-sdk');
} catch {
  // expo-server-sdk 없으면 푸시 발송 skip
}

@Injectable()
export class PlanEveningTask {
  private readonly logger = new Logger(PlanEveningTask.name);

  constructor(private readonly planService: PlanService) {}

  /** 매일 21:00 — 각 user의 active goals 진척 합산 + 푸시 발송 */
  @Cron('0 21 * * *')
  async runEveningPush(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      this.logger.warn('Evening push skipped — no DATABASE_URL');
      return;
    }

    this.logger.log('Starting evening progress push...');

    let userIds: string[];
    try {
      userIds = await this.planService.getAllActiveUserIds();
    } catch (err) {
      this.logger.error('Failed to fetch users for evening push', err);
      return;
    }

    // expo-server-sdk 없으면 skip
    if (!ExpoSdk) {
      this.logger.warn('Evening push skipped — expo-server-sdk not installed');
      return;
    }

    const expo = new ExpoSdk.Expo();
    let sent = 0;
    let skipped = 0;

    for (const userId of userIds) {
      try {
        // notificationPrefs 확인 — goal_progress_push 옵트인 여부
        const prefs = await this.planService.getUserNotificationPrefs(userId);
        if (prefs['goal_progress_push'] === false) {
          skipped++;
          continue;
        }

        // 푸시 토큰 확인
        const pushToken = await this.planService.getUserPushToken(userId);
        if (!pushToken) {
          skipped++;
          continue;
        }

        // expo push token 유효성 검사
        if (!ExpoSdk.Expo.isExpoPushToken(pushToken)) {
          this.logger.warn(`Invalid Expo push token for user ${userId}`);
          skipped++;
          continue;
        }

        // 오늘 기여 합산
        const contributions = await this.planService.getTodayContributionSummary(userId);
        if (contributions.length === 0) {
          skipped++;
          continue;
        }

        // 푸시 페이로드 작성
        const goalTitles = contributions.slice(0, 3).map((c) => c.title).join(', ');
        const totalGoals = contributions.length;
        const body =
          totalGoals === 1
            ? `오늘 '${goalTitles}' 목표에 기여했어요!`
            : `오늘 ${totalGoals}개 목표(${goalTitles} 등)에 기여했어요!`;

        const message = {
          to: pushToken,
          sound: 'default' as const,
          title: 'Chronos — 오늘의 목표 진척',
          body,
          data: { type: 'evening_progress', contributions },
        };

        // 푸시 발송 (chunk 처리)
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (err) {
            this.logger.warn(`Push send failed for user ${userId}: ${String(err)}`);
          }
        }

        sent++;
      } catch (err) {
        this.logger.error(`Evening push failed for user ${userId}`, err);
      }
    }

    this.logger.log(
      `Evening push done — ${userIds.length} users, ${sent} sent, ${skipped} skipped`,
    );
  }
}
