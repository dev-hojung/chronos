import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ContributionSourceType, GoalDirection, GoalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';
import { ListContributionsDto } from './dto/list-contributions.dto';
import { calculateProgress, ContributionLike, GoalLike } from './progress.calculator';

// ── In-memory types (DATABASE_URL 없을 때 사용) ──────────────────────────────

function newId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface MemGoal {
  id: string;
  userId: string;
  title: string;
  horizonDays: number;
  weight: string;
  metricType: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  direction: GoalDirection;
  status: GoalStatus;
  completedAt: Date | null;
  archivedAt: Date | null;
  linkedRoutineIds: string[];
  linkedStackContextLabels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemContribution {
  id: string;
  goalId: string;
  sourceType: ContributionSourceType;
  sourceId: string | null;
  deltaValue: number;
  note: string | null;
  loggedAt: Date;
}

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);
  private readonly useMemory: boolean;

  private memGoals = new Map<string, MemGoal>();
  private memContributions = new Map<string, MemContribution>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.useMemory = !process.env.DATABASE_URL;
    if (this.useMemory) {
      this.logger.warn('goal service in memory only — DATABASE_URL not set');
    }
  }

  // ── Goal CRUD ────────────────────────────────────────────────────────────────

  async createGoal(userId: string, dto: CreateGoalDto) {
    const data = {
      userId,
      title: dto.title,
      horizonDays: dto.horizonDays,
      weight: dto.weight ?? 'MED',
      metricType: dto.metricType,
      targetValue: dto.targetValue,
      currentValue: dto.currentValue ?? 0,
      unit: dto.unit ?? null,
      direction: dto.direction ?? GoalDirection.UP,
      status: GoalStatus.ACTIVE,
      linkedRoutineIds: dto.linkedRoutineIds ?? [],
      linkedStackContextLabels: [],
    };

    if (this.useMemory) {
      const id = newId();
      const goal: MemGoal = {
        ...data,
        id,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memGoals.set(id, goal);
      await this.auditService.record(userId, 'goal.create', { goalId: id });
      return goal;
    }

    const goal = await this.prisma.goal.create({ data });
    await this.auditService.record(userId, 'goal.create', { goalId: goal.id });
    return goal;
  }

  async listGoals(userId: string, includeArchived = false) {
    if (this.useMemory) {
      return [...this.memGoals.values()]
        .filter((g) => {
          if (g.userId !== userId) return false;
          if (!includeArchived && g.status === GoalStatus.ARCHIVED) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return this.prisma.goal.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { status: { not: GoalStatus.ARCHIVED } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGoal(userId: string, id: string) {
    const goal = await this._requireGoal(userId, id);

    const contributions = await this._getContributions(id);
    const progress = calculateProgress(
      goal as GoalLike,
      contributions.map(toContributionLike),
    );

    // 기여 중인 루틴/스택 정보
    return { ...goal, progress, recentContributions: contributions.slice(0, 10) };
  }

  async updateGoal(userId: string, id: string, dto: UpdateGoalDto) {
    const existing = await this._requireGoal(userId, id);
    const prev = { ...existing };

    const updates: Partial<MemGoal> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.horizonDays !== undefined) updates.horizonDays = dto.horizonDays;
    if (dto.weight !== undefined) updates.weight = dto.weight;
    if (dto.metricType !== undefined) updates.metricType = dto.metricType;
    if (dto.targetValue !== undefined) updates.targetValue = dto.targetValue;
    if (dto.currentValue !== undefined) updates.currentValue = dto.currentValue;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.direction !== undefined) updates.direction = dto.direction;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.archivedAt !== undefined) updates.archivedAt = new Date(dto.archivedAt);
    if (dto.linkedRoutineIds !== undefined) updates.linkedRoutineIds = dto.linkedRoutineIds;
    if (dto.linkedStackContextLabels !== undefined) {
      updates.linkedStackContextLabels = dto.linkedStackContextLabels as string[];
    }

    if (this.useMemory) {
      const updated: MemGoal = { ...existing as MemGoal, ...updates, updatedAt: new Date() };
      this.memGoals.set(id, updated);
      await this.auditService.record(userId, 'goal.update', { goalId: id, prev });
      return updated;
    }

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.horizonDays !== undefined ? { horizonDays: dto.horizonDays } : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        ...(dto.metricType !== undefined ? { metricType: dto.metricType } : {}),
        ...(dto.targetValue !== undefined ? { targetValue: dto.targetValue } : {}),
        ...(dto.currentValue !== undefined ? { currentValue: dto.currentValue } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.archivedAt !== undefined ? { archivedAt: new Date(dto.archivedAt) } : {}),
        ...(dto.linkedRoutineIds !== undefined ? { linkedRoutineIds: dto.linkedRoutineIds } : {}),
        ...(dto.linkedStackContextLabels !== undefined
          ? { linkedStackContextLabels: dto.linkedStackContextLabels }
          : {}),
      },
    });
    await this.auditService.record(userId, 'goal.update', { goalId: id, prev });
    return updated;
  }

  async archiveGoal(userId: string, id: string) {
    const existing = await this._requireGoal(userId, id);
    const prev = { status: existing.status, archivedAt: existing.archivedAt };
    const now = new Date();

    if (this.useMemory) {
      const goal = this.memGoals.get(id)!;
      goal.status = GoalStatus.ARCHIVED;
      goal.archivedAt = now;
      goal.updatedAt = now;
      await this.auditService.record(userId, 'goal.archive', { goalId: id, prev });
      return goal;
    }

    const updated = await this.prisma.goal.update({
      where: { id },
      data: { status: GoalStatus.ARCHIVED, archivedAt: now },
    });
    await this.auditService.record(userId, 'goal.archive', { goalId: id, prev });
    return updated;
  }

  async deleteGoal(userId: string, id: string) {
    // soft delete — 실제 DB 삭제는 별도 cron (30일 후 hard delete, 미구현)
    return this.archiveGoal(userId, id);
  }

  // ── Contributions ────────────────────────────────────────────────────────────

  async addContribution(userId: string, dto: AddContributionDto) {
    const goal = await this._requireGoal(userId, dto.goalId);

    // ACTIVE 상태 검증 — 보관/완료된 goal에는 기여 불가
    if (goal.status !== GoalStatus.ACTIVE) {
      throw new BadRequestException('활성 목표에만 기여를 추가할 수 있습니다');
    }

    const loggedAt = dto.loggedAt ? new Date(dto.loggedAt) : new Date();

    if (this.useMemory) {
      return this._addContributionMemory(goal as MemGoal, userId, dto, loggedAt);
    }
    return this._addContributionDb(goal, userId, dto, loggedAt);
  }

  private async _addContributionMemory(
    goal: MemGoal,
    userId: string,
    dto: AddContributionDto,
    loggedAt: Date,
  ) {
    const id = newId();
    const contribution: MemContribution = {
      id,
      goalId: goal.id,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      deltaValue: dto.deltaValue,
      note: dto.note ?? null,
      loggedAt,
    };
    this.memContributions.set(id, contribution);

    // 트랜잭션: currentValue 업데이트 (UP → 더하기, DOWN → 빼기)
    if (goal.direction === GoalDirection.UP) {
      goal.currentValue += dto.deltaValue;
    } else {
      goal.currentValue -= dto.deltaValue;
    }
    goal.updatedAt = new Date();

    // 목표 달성 여부 확인
    const reached = this._isTargetReached(goal);
    if (reached && goal.status === GoalStatus.ACTIVE) {
      goal.status = GoalStatus.COMPLETED;
      goal.completedAt = new Date();
    }

    await this.auditService.record(userId, 'goal.contribution', {
      goalId: goal.id,
      contributionId: id,
      delta: dto.deltaValue,
    });
    return contribution;
  }

  private async _addContributionDb(
    goal: { id: string; direction: GoalDirection; currentValue: number; status: GoalStatus; targetValue: number },
    userId: string,
    dto: AddContributionDto,
    loggedAt: Date,
  ) {
    // UP → currentValue += delta, DOWN → currentValue -= delta
    const newValue =
      goal.direction === GoalDirection.UP
        ? goal.currentValue + dto.deltaValue
        : goal.currentValue - dto.deltaValue;

    const reached = this._isTargetReachedValues(
      newValue,
      goal.targetValue,
      goal.direction,
    );

    // 트랜잭션: contribution insert + goal currentValue 업데이트 원자적 실행
    const [contribution] = await this.prisma.$transaction([
      this.prisma.goalContribution.create({
        data: {
          goalId: goal.id,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId ?? null,
          deltaValue: dto.deltaValue,
          note: dto.note ?? null,
          loggedAt,
        },
      }),
      this.prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentValue: newValue,
          ...(reached && goal.status === GoalStatus.ACTIVE
            ? { status: GoalStatus.COMPLETED, completedAt: new Date() }
            : {}),
        },
      }),
    ]);

    await this.auditService.record(userId, 'goal.contribution', {
      goalId: goal.id,
      contributionId: contribution.id,
      delta: dto.deltaValue,
    });
    return contribution;
  }

  async removeContribution(userId: string, contributionId: string) {
    if (this.useMemory) {
      const contribution = this.memContributions.get(contributionId);
      if (!contribution) throw new NotFoundException('기여 항목을 찾을 수 없습니다');
      const goal = await this._requireGoal(userId, contribution.goalId);

      // currentValue 역산
      const g = goal as MemGoal;
      if (g.direction === GoalDirection.UP) {
        g.currentValue -= contribution.deltaValue;
      } else {
        g.currentValue += contribution.deltaValue;
      }
      // 상태 재평가 — 역산 후 목표 미달 시 ACTIVE로 되돌림
      if (g.status === GoalStatus.COMPLETED && !this._isTargetReached(g)) {
        g.status = GoalStatus.ACTIVE;
        g.completedAt = null;
      }
      g.updatedAt = new Date();
      this.memContributions.delete(contributionId);

      await this.auditService.record(userId, 'goal.contributionRemove', {
        goalId: contribution.goalId,
        contributionId,
        delta: contribution.deltaValue,
      });
      return { removed: true };
    }

    const contribution = await this.prisma.goalContribution.findUnique({
      where: { id: contributionId },
      include: { goal: true },
    });
    if (!contribution) throw new NotFoundException('기여 항목을 찾을 수 없습니다');
    if (contribution.goal.userId !== userId) throw new ForbiddenException();

    const reversedValue =
      contribution.goal.direction === GoalDirection.UP
        ? contribution.goal.currentValue - contribution.deltaValue
        : contribution.goal.currentValue + contribution.deltaValue;

    const nowActive = !this._isTargetReachedValues(
      reversedValue,
      contribution.goal.targetValue,
      contribution.goal.direction,
    );

    // 트랜잭션: contribution 삭제 + goal currentValue 역산 원자적 실행
    await this.prisma.$transaction([
      this.prisma.goalContribution.delete({ where: { id: contributionId } }),
      this.prisma.goal.update({
        where: { id: contribution.goalId },
        data: {
          currentValue: reversedValue,
          ...(contribution.goal.status === GoalStatus.COMPLETED && nowActive
            ? { status: GoalStatus.ACTIVE, completedAt: null }
            : {}),
        },
      }),
    ]);

    await this.auditService.record(userId, 'goal.contributionRemove', {
      goalId: contribution.goalId,
      contributionId,
      delta: contribution.deltaValue,
    });
    return { removed: true };
  }

  async listContributions(userId: string, query: ListContributionsDto) {
    const limit = query.limit ?? 50;

    if (this.useMemory) {
      const from = query.from ? new Date(query.from) : new Date(0);
      const to = query.to ? new Date(query.to) : new Date();
      return [...this.memContributions.values()]
        .filter((c) => {
          if (query.goalId && c.goalId !== query.goalId) return false;
          // userId 소유권 검증
          const goal = this.memGoals.get(c.goalId);
          if (!goal || goal.userId !== userId) return false;
          return c.loggedAt >= from && c.loggedAt <= to;
        })
        .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
        .slice(0, limit);
    }

    const from = query.from ? new Date(query.from) : new Date(0);
    const to = query.to ? new Date(query.to) : new Date();

    return this.prisma.goalContribution.findMany({
      where: {
        ...(query.goalId ? { goalId: query.goalId } : {}),
        goal: { userId },
        loggedAt: { gte: from, lte: to },
      },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });
  }

  async getProgress(userId: string, goalId: string) {
    const goal = await this._requireGoal(userId, goalId);
    const contributions = await this._getContributions(goalId);
    return calculateProgress(goal as GoalLike, contributions.map(toContributionLike));
  }

  // ── 자동 수집: 루틴 완료 연동 ───────────────────────────────────────────────

  /**
   * 루틴 완료 시 해당 routineId를 linkedRoutineIds에 포함하는 모든 ACTIVE goal에
   * +1 contribution 자동 추가 (sourceType=ROUTINE, delta=1).
   */
  async applyRoutineCompletion(userId: string, routineId: string, routineTitle?: string) {
    const goals = await this.listGoals(userId);
    const linked = goals.filter(
      (g) =>
        g.status === GoalStatus.ACTIVE &&
        (g.linkedRoutineIds as string[]).includes(routineId),
    );

    for (const goal of linked) {
      try {
        await this.addContribution(userId, {
          goalId: goal.id,
          sourceType: ContributionSourceType.ROUTINE,
          sourceId: routineId,
          deltaValue: 1,
          note: routineTitle ? `자동: ${routineTitle}` : '자동: 루틴 완료',
        });
      } catch (err) {
        this.logger.warn(`applyRoutineCompletion 실패 goalId=${goal.id}: ${String(err)}`);
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async _requireGoal(userId: string, id: string): Promise<MemGoal> {
    if (this.useMemory) {
      const g = this.memGoals.get(id);
      if (!g) throw new NotFoundException('목표를 찾을 수 없습니다');
      if (g.userId !== userId) throw new ForbiddenException();
      return g;
    }
    const g = await this.prisma.goal.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('목표를 찾을 수 없습니다');
    if (g.userId !== userId) throw new ForbiddenException();
    // DB 모델을 MemGoal 형태로 매핑
    return {
      id: g.id,
      userId: g.userId,
      title: g.title,
      horizonDays: g.horizonDays,
      weight: g.weight,
      metricType: g.metricType,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      unit: g.unit ?? null,
      direction: g.direction,
      status: g.status,
      completedAt: g.completedAt ?? null,
      archivedAt: g.archivedAt ?? null,
      linkedRoutineIds: g.linkedRoutineIds,
      linkedStackContextLabels: g.linkedStackContextLabels as string[],
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  private async _getContributions(goalId: string): Promise<MemContribution[]> {
    if (this.useMemory) {
      return [...this.memContributions.values()]
        .filter((c) => c.goalId === goalId)
        .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
    }
    const rows = await this.prisma.goalContribution.findMany({
      where: { goalId },
      orderBy: { loggedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      goalId: r.goalId,
      sourceType: r.sourceType,
      sourceId: r.sourceId ?? null,
      deltaValue: r.deltaValue,
      note: r.note ?? null,
      loggedAt: r.loggedAt,
    }));
  }

  /** UP: current >= target, DOWN: current <= target */
  private _isTargetReached(goal: MemGoal): boolean {
    return this._isTargetReachedValues(goal.currentValue, goal.targetValue, goal.direction);
  }

  private _isTargetReachedValues(
    currentValue: number,
    targetValue: number,
    direction: GoalDirection,
  ): boolean {
    return direction === GoalDirection.UP
      ? currentValue >= targetValue
      : currentValue <= targetValue;
  }
}

function toContributionLike(c: MemContribution): ContributionLike {
  return {
    id: c.id,
    sourceType: c.sourceType,
    deltaValue: c.deltaValue,
    loggedAt: c.loggedAt,
  };
}
