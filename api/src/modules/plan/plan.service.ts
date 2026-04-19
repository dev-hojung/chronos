// plan.service.ts — Today 재정렬 서비스 (AI 호출 없음, 점수 함수 기반)
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GoalService } from '../goal/goal.service';
import { RoutineService } from '../routine/routine.service';
import { rankWithGravity, GravityInput, ContextLabel } from '../goal/gravity.calculator';

// in-memory DailyPlan (DATABASE_URL 없을 때)
function newId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface MemDailyPlan {
  id: string;
  userId: string;
  planDate: Date;
  orderedItemIds: string[];
  gravitySnapshot: unknown;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);
  private readonly useMemory: boolean;
  private memPlans = new Map<string, MemDailyPlan>(); // key: `${userId}_${dateStr}`

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly goalService: GoalService,
    private readonly routineService: RoutineService,
  ) {
    this.useMemory = !process.env.DATABASE_URL;
    if (this.useMemory) {
      this.logger.warn('plan service in memory only — DATABASE_URL not set');
    }
  }

  // ── 오늘 플랜 조회 (없으면 생성) ─────────────────────────────────────────────

  async getTodayPlan(userId: string, date?: Date) {
    const planDate = date ?? this._today();
    const existing = await this._findPlan(userId, planDate);

    // locked 플랜은 자동 재생성 안 함
    if (existing && existing.locked) {
      return existing;
    }
    if (existing) {
      return existing;
    }

    // 없으면 생성
    return this.generateTodayPlan(userId, planDate);
  }

  // ── 오늘 플랜 생성/재생성 ─────────────────────────────────────────────────────

  async generateTodayPlan(userId: string, date?: Date) {
    const planDate = date ?? this._today();

    // 1. 이전 순서 기록 (undo 용)
    const existing = await this._findPlan(userId, planDate);
    const prevOrderedIds = existing ? (existing.orderedItemIds as string[]) : [];

    // 2. 후보 수집: 오늘의 routine slots + active stack next_actions
    const candidates = await this._collectCandidates(userId, planDate);

    // 3. goal progressDeficit 계산
    const goalInputs = await this._buildGoalInputs(userId);

    // 4. previousContextLabel: 어제 마지막 완료 항목의 contextLabel
    const previousContextLabel = await this._getYesterdayLastContext(userId, planDate);

    // 5. rankWithGravity 호출
    const gravityInput: GravityInput = {
      candidates,
      goals: goalInputs,
      previousContextLabel,
    };
    const ranked = rankWithGravity(gravityInput);
    const orderedIds = ranked.map((r) => r.id);

    // 6. gravitySnapshot — 디버깅/투명성
    const gravitySnapshot = {
      input: gravityInput,
      output: ranked,
      generatedAt: new Date().toISOString(),
    };

    // 7. DailyPlan upsert
    const plan = await this._upsertPlan(userId, planDate, orderedIds, gravitySnapshot, false);

    // 8. audit plan.generate (이전 ordered_item_ids 저장)
    await this.auditService.record(userId, 'plan.generate', {
      planDate: planDate.toISOString().slice(0, 10),
      prevOrderedItemIds: prevOrderedIds,
      newOrderedItemIds: orderedIds,
    });

    return plan;
  }

  // ── 수동 재정렬 + 잠금 ────────────────────────────────────────────────────────

  async manualReorder(userId: string, date: Date, orderedIds: string[]) {
    const planDate = date;
    const existing = await this._findPlan(userId, planDate);
    const prevOrderedIds = existing ? (existing.orderedItemIds as string[]) : [];
    const prevSnapshot = existing ? existing.gravitySnapshot : null;

    const plan = await this._upsertPlan(
      userId,
      planDate,
      orderedIds,
      prevSnapshot ?? { manualReorder: true },
      true, // locked
    );

    await this.auditService.record(userId, 'plan.manualReorder', {
      planDate: planDate.toISOString().slice(0, 10),
      prevOrderedItemIds: prevOrderedIds,
      newOrderedItemIds: orderedIds,
    });

    return plan;
  }

  // ── 잠금 해제 ────────────────────────────────────────────────────────────────

  async unlockPlan(userId: string, date: Date) {
    const planDate = date;
    const existing = await this._findPlan(userId, planDate);
    if (!existing) {
      throw new NotFoundException('플랜을 찾을 수 없습니다');
    }
    return this._setPlanLocked(userId, planDate, false);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _today(): Date {
    const now = new Date();
    // 날짜만 추출 (시간 제거)
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private async _findPlan(userId: string, planDate: Date): Promise<MemDailyPlan | null> {
    const key = this._planKey(userId, planDate);
    if (this.useMemory) {
      return this.memPlans.get(key) ?? null;
    }
    const plan = await this.prisma.dailyPlan.findUnique({
      where: { userId_planDate: { userId, planDate } },
    });
    if (!plan) return null;
    return {
      id: plan.id,
      userId: plan.userId,
      planDate: plan.planDate,
      orderedItemIds: plan.orderedItemIds as string[],
      gravitySnapshot: plan.gravitySnapshot,
      locked: plan.locked,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private async _upsertPlan(
    userId: string,
    planDate: Date,
    orderedItemIds: string[],
    gravitySnapshot: unknown,
    locked: boolean,
  ): Promise<MemDailyPlan> {
    const key = this._planKey(userId, planDate);

    if (this.useMemory) {
      const existing = this.memPlans.get(key);
      const now = new Date();
      if (existing) {
        existing.orderedItemIds = orderedItemIds;
        existing.gravitySnapshot = gravitySnapshot;
        existing.locked = locked;
        existing.updatedAt = now;
        return existing;
      }
      const plan: MemDailyPlan = {
        id: newId(),
        userId,
        planDate,
        orderedItemIds,
        gravitySnapshot,
        locked,
        createdAt: now,
        updatedAt: now,
      };
      this.memPlans.set(key, plan);
      return plan;
    }

    const plan = await this.prisma.dailyPlan.upsert({
      where: { userId_planDate: { userId, planDate } },
      create: {
        userId,
        planDate,
        orderedItemIds,
        gravitySnapshot: gravitySnapshot as object,
        locked,
      },
      update: {
        orderedItemIds,
        gravitySnapshot: gravitySnapshot as object,
        locked,
      },
    });
    return {
      id: plan.id,
      userId: plan.userId,
      planDate: plan.planDate,
      orderedItemIds: plan.orderedItemIds as string[],
      gravitySnapshot: plan.gravitySnapshot,
      locked: plan.locked,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private async _setPlanLocked(
    userId: string,
    planDate: Date,
    locked: boolean,
  ): Promise<MemDailyPlan> {
    const key = this._planKey(userId, planDate);
    if (this.useMemory) {
      const plan = this.memPlans.get(key);
      if (!plan) throw new NotFoundException('플랜을 찾을 수 없습니다');
      if (plan.userId !== userId) throw new ForbiddenException();
      plan.locked = locked;
      plan.updatedAt = new Date();
      return plan;
    }
    const plan = await this.prisma.dailyPlan.update({
      where: { userId_planDate: { userId, planDate } },
      data: { locked },
    });
    return {
      id: plan.id,
      userId: plan.userId,
      planDate: plan.planDate,
      orderedItemIds: plan.orderedItemIds as string[],
      gravitySnapshot: plan.gravitySnapshot,
      locked: plan.locked,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private _planKey(userId: string, planDate: Date): string {
    return `${userId}_${planDate.toISOString().slice(0, 10)}`;
  }

  // 오늘의 routine slots + active stack next_actions 수집
  private async _collectCandidates(
    userId: string,
    planDate: Date,
  ): Promise<GravityInput['candidates']> {
    const candidates: GravityInput['candidates'] = [];
    const todayStr = planDate.toISOString().slice(0, 10);

    // routine upcoming slots (오늘)
    try {
      const upcoming = await this.routineService.getUpcomingRuns(userId, 1);
      for (const r of upcoming) {
        const todaySlots = r.slots.filter((s) => s.scheduledAt.slice(0, 10) === todayStr);
        for (const slot of todaySlots) {
          candidates.push({
            id: slot.runId,
            type: 'routine',
            estimatedDurationMin: r.durationMin,
            routineId: r.routineId,
            basePriority: 0,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`routine 후보 수집 실패: ${String(err)}`);
    }

    // active stack next_actions
    if (!this.useMemory) {
      try {
        const stacks = await this.prisma.stack.findMany({
          where: { userId },
          include: {
            nextActions: {
              where: { status: 'PENDING' },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        for (const stack of stacks) {
          for (const action of stack.nextActions) {
            // priority 매핑: NOW=3, TODAY=2, THIS_WEEK=1, SOMEDAY=0
            const priorityMap: Record<string, number> = {
              NOW: 3,
              TODAY: 2,
              THIS_WEEK: 1,
              SOMEDAY: 0,
            };
            candidates.push({
              id: action.id,
              type: 'stack_action',
              estimatedDurationMin: 30,
              contextLabel: stack.contextLabel as ContextLabel,
              basePriority: priorityMap[action.priority] ?? 0,
            });
          }
        }
      } catch (err) {
        this.logger.warn(`stack action 후보 수집 실패: ${String(err)}`);
      }
    }

    return candidates;
  }

  // goal progressDeficit 계산
  private async _buildGoalInputs(userId: string): Promise<GravityInput['goals']> {
    try {
      const goals = await this.goalService.listGoals(userId);
      const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
      const now = new Date();

      return activeGoals.map((g) => {
        const createdAt = g.createdAt instanceof Date ? g.createdAt : new Date(g.createdAt);
        const msPerDay = 86_400_000;
        const daysElapsed = Math.max(
          0,
          (now.getTime() - createdAt.getTime()) / msPerDay,
        );

        // progressDeficit 계산:
        // expected = (daysElapsed / horizonDays) × (target - start)
        // start ≈ 0 (초기값 — GoalService에서는 currentValue - contributions로 역산하지만 여기선 단순화)
        // deficit = (expected - current) / (target - start), 클램프 -1..1
        const horizonDays = g.horizonDays > 0 ? g.horizonDays : 1;
        const target = g.targetValue;
        const current = g.currentValue;
        const span = target; // start=0 가정
        let deficit = 0;

        if (Math.abs(span) > 1e-10) {
          const expected = (Math.min(daysElapsed, horizonDays) / horizonDays) * span;
          deficit = (expected - current) / span;
          deficit = Math.min(1, Math.max(-1, deficit));
        }

        return {
          id: g.id,
          weight: g.weight as 'LOW' | 'MED' | 'HIGH',
          linkedRoutineIds: g.linkedRoutineIds as string[],
          linkedStackContextLabels: g.linkedStackContextLabels as ContextLabel[],
          progressDeficit: deficit,
        };
      });
    } catch (err) {
      this.logger.warn(`goal inputs 빌드 실패: ${String(err)}`);
      return [];
    }
  }

  // 어제 마지막 완료 항목의 contextLabel
  private async _getYesterdayLastContext(
    userId: string,
    planDate: Date,
  ): Promise<ContextLabel | undefined> {
    if (this.useMemory) return undefined;

    try {
      const yesterday = new Date(planDate.getTime() - 86_400_000);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const yesterdayDate = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
      );

      const prevPlan = await this.prisma.dailyPlan.findUnique({
        where: { userId_planDate: { userId, planDate: yesterdayDate } },
      });

      if (!prevPlan) return undefined;

      // 어제 플랜의 마지막 항목 ID → stack_action이면 contextLabel 조회
      const orderedIds = prevPlan.orderedItemIds as string[];
      if (orderedIds.length === 0) return undefined;

      const lastId = orderedIds[orderedIds.length - 1];
      const action = await this.prisma.stackNextAction.findUnique({
        where: { id: lastId },
        include: { stack: true },
      });

      if (action) {
        return action.stack.contextLabel as ContextLabel;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  // 모든 active 유저 ID 반환 (크론 용)
  async getAllActiveUserIds(): Promise<string[]> {
    if (this.useMemory) return [];
    try {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      return users.map((u) => u.id);
    } catch {
      return [];
    }
  }

  // 오늘 기여 합산 (21시 푸시 용)
  async getTodayContributionSummary(
    userId: string,
  ): Promise<{ goalId: string; title: string; totalDelta: number }[]> {
    if (this.useMemory) return [];

    try {
      const today = this._today();
      const tomorrow = new Date(today.getTime() + 86_400_000);

      const goals = await this.goalService.listGoals(userId);
      const results: { goalId: string; title: string; totalDelta: number }[] = [];

      for (const goal of goals) {
        if (goal.status !== 'ACTIVE') continue;

        const contributions = await this.prisma.goalContribution.findMany({
          where: {
            goalId: goal.id,
            loggedAt: { gte: today, lt: tomorrow },
          },
        });

        const totalDelta = contributions.reduce((s, c) => s + c.deltaValue, 0);
        if (totalDelta > 0) {
          results.push({ goalId: goal.id, title: goal.title, totalDelta });
        }
      }

      return results;
    } catch (err) {
      this.logger.warn(`today contribution summary 실패: ${String(err)}`);
      return [];
    }
  }

  // 유저의 expoPushToken 조회
  async getUserPushToken(userId: string): Promise<string | null> {
    if (this.useMemory) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { expoPushToken: true },
      });
      return user?.expoPushToken ?? null;
    } catch {
      return null;
    }
  }

  // 유저의 notificationPrefs 조회
  async getUserNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
    if (this.useMemory) return {};
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPrefs: true },
      });
      return (user?.notificationPrefs as Record<string, boolean>) ?? {};
    } catch {
      return {};
    }
  }
}
