import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditRecord {
  id: string;
  userId: string;
  actionType: string;
  payload: unknown;
  undoableUntil: Date | null;
  revertedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly memoryMap = new Map<string, AuditRecord>();
  private readonly useMemory: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.useMemory = !process.env.DATABASE_URL;
    if (this.useMemory) {
      this.logger.warn('audit in memory only — DATABASE_URL not set');
    }
  }

  async record(
    userId: string,
    actionType: string,
    payload: unknown,
    undoableMinutes = 1440,
  ): Promise<string> {
    const undoableUntil = new Date(Date.now() + undoableMinutes * 60_000);

    if (this.useMemory) {
      const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this.memoryMap.set(id, {
        id, userId, actionType, payload,
        undoableUntil, revertedAt: null, createdAt: new Date(),
      });
      return id;
    }

    const log = await this.prisma.auditLog.create({
      data: { userId, actionType, payload: payload as object, undoableUntil },
    });
    return log.id;
  }

  async undo(userId: string, auditId: string): Promise<void> {
    const entry = await this.findEntry(userId, auditId);
    if (entry.revertedAt) throw new ForbiddenException('Already reverted');
    if (entry.undoableUntil && entry.undoableUntil < new Date()) {
      throw new ForbiddenException('Undo window expired');
    }

    await this.applyUndo(userId, entry.actionType, entry.payload as Record<string, unknown>);
    await this.markReverted(auditId);
  }

  private async findEntry(userId: string, auditId: string): Promise<AuditRecord> {
    if (this.useMemory) {
      const entry = this.memoryMap.get(auditId);
      if (!entry) throw new NotFoundException('Audit entry not found');
      if (entry.userId !== userId) throw new ForbiddenException();
      return entry;
    }
    const log = await this.prisma.auditLog.findUnique({ where: { id: auditId } });
    if (!log) throw new NotFoundException('Audit entry not found');
    if (log.userId !== userId) throw new ForbiddenException();
    return {
      id: log.id,
      userId: log.userId,
      actionType: log.actionType,
      payload: log.payload,
      undoableUntil: log.undoableUntil,
      revertedAt: log.revertedAt,
      createdAt: log.createdAt,
    };
  }

  private async markReverted(auditId: string): Promise<void> {
    if (this.useMemory) {
      const entry = this.memoryMap.get(auditId);
      if (entry) entry.revertedAt = new Date();
      return;
    }
    await this.prisma.auditLog.update({
      where: { id: auditId },
      data: { revertedAt: new Date() },
    });
  }

  private async applyUndo(
    userId: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (this.useMemory) {
      // In-memory mode: no actual DB rows to revert
      this.logger.warn(`[memory] undo ${actionType} for ${userId} — no-op in memory mode`);
      return;
    }

    switch (actionType) {
      case 'inbox.create': {
        await this.prisma.inboxItem.delete({ where: { id: payload['itemId'] as string } });
        break;
      }
      case 'inbox.delete': {
        const item = payload['item'] as { id: string; rawText: string; source: string; createdAt: string };
        await this.prisma.inboxItem.create({
          data: {
            id: item.id,
            userId,
            rawText: item.rawText,
            source: item.source as import('@prisma/client').InboxSource,
            createdAt: new Date(item.createdAt),
          },
        });
        break;
      }
      case 'stack.create': {
        const stackId = payload['stackId'] as string;
        await this.prisma.stackItem.deleteMany({ where: { stackId } });
        await this.prisma.inboxItem.updateMany({
          where: { processedStackId: stackId },
          data: { processedStackId: null },
        });
        await this.prisma.stack.delete({ where: { id: stackId } });
        break;
      }
      case 'stack.addItems': {
        const { stackId, itemIds } = payload as { stackId: string; itemIds: string[] };
        await this.prisma.stackItem.deleteMany({
          where: { stackId, inboxItemId: { in: itemIds } },
        });
        await this.prisma.inboxItem.updateMany({
          where: { id: { in: itemIds } },
          data: { processedStackId: null },
        });
        break;
      }
      case 'stack.removeItem': {
        const { stackId, itemId, orderIdx } = payload as { stackId: string; itemId: string; orderIdx: number };
        await this.prisma.stackItem.create({
          data: { stackId, inboxItemId: itemId, orderIdx },
        });
        await this.prisma.inboxItem.update({
          where: { id: itemId },
          data: { processedStackId: stackId },
        });
        break;
      }
      case 'stack.delete': {
        const { stack, itemIds } = payload as {
          stack: { id: string; title: string; contextLabel: string; summary?: string };
          itemIds: string[];
        };
        await this.prisma.stack.create({
          data: {
            id: stack.id,
            userId,
            title: stack.title,
            contextLabel: stack.contextLabel as import('@prisma/client').ContextLabel,
            summary: stack.summary,
          },
        });
        if (itemIds.length) {
          await this.prisma.stackItem.createMany({
            data: itemIds.map((iid, idx) => ({
              stackId: stack.id,
              inboxItemId: iid,
              orderIdx: idx,
            })),
          });
          await this.prisma.inboxItem.updateMany({
            where: { id: { in: itemIds } },
            data: { processedStackId: stack.id },
          });
        }
        break;
      }
      case 'stack.autoBundle': {
        const { stackIds, itemIds } = payload as { stackIds: string[]; itemIds: string[] };
        if (stackIds?.length) {
          await this.prisma.stackItem.deleteMany({ where: { stackId: { in: stackIds } } });
          if (itemIds?.length) {
            await this.prisma.inboxItem.updateMany({
              where: { id: { in: itemIds } },
              data: { processedStackId: null },
            });
          }
          await this.prisma.stack.deleteMany({ where: { id: { in: stackIds } } });
        }
        break;
      }
      case 'routine.create': {
        const { routineId } = payload as { routineId: string };
        await this.prisma.routine.update({ where: { id: routineId }, data: { active: false } });
        break;
      }
      case 'routine.update': {
        const { routineId, prev } = payload as {
          routineId: string;
          prev: { title?: string; scheduleCron?: string; durationMin?: number; active?: boolean; version?: number };
        };
        await this.prisma.routine.update({
          where: { id: routineId },
          data: {
            ...(prev.title !== undefined ? { title: prev.title } : {}),
            ...(prev.scheduleCron !== undefined ? { scheduleCron: prev.scheduleCron } : {}),
            ...(prev.durationMin !== undefined ? { durationMin: prev.durationMin } : {}),
            ...(prev.active !== undefined ? { active: prev.active } : {}),
            ...(prev.version !== undefined ? { version: prev.version } : {}),
          },
        });
        break;
      }
      case 'routine.delete': {
        const { routineId } = payload as { routineId: string };
        await this.prisma.routine.update({ where: { id: routineId }, data: { active: true } });
        break;
      }
      case 'routine.run': {
        const { runId, prev } = payload as {
          runId: string;
          prev?: { status?: string; actualDurationMin?: number | null };
        };
        if (prev) {
          await this.prisma.routineRun.update({
            where: { id: runId },
            data: {
              ...(prev.status !== undefined ? { status: prev.status as import('@prisma/client').RoutineRunStatus } : {}),
              ...(prev.actualDurationMin !== undefined ? { actualDurationMin: prev.actualDurationMin } : {}),
            },
          });
        } else {
          await this.prisma.routineRun.delete({ where: { id: runId } });
        }
        break;
      }
      case 'goal.create': {
        const { goalId } = payload as { goalId: string };
        await this.prisma.goal.update({
          where: { id: goalId },
          data: { status: 'ARCHIVED', archivedAt: new Date() },
        });
        break;
      }
      case 'goal.update': {
        const { goalId, prev } = payload as { goalId: string; prev: Record<string, unknown> };
        const updateData: Record<string, unknown> = {};
        const fields = [
          'title', 'horizonDays', 'weight', 'metricType', 'targetValue',
          'currentValue', 'unit', 'direction', 'status', 'linkedRoutineIds',
        ];
        for (const f of fields) {
          if (prev[f] !== undefined) updateData[f] = prev[f];
        }
        if (Object.keys(updateData).length > 0) {
          await this.prisma.goal.update({ where: { id: goalId }, data: updateData });
        }
        break;
      }
      case 'goal.archive': {
        const { goalId, prev } = payload as {
          goalId: string;
          prev: { status: string; archivedAt: string | null };
        };
        await this.prisma.goal.update({
          where: { id: goalId },
          data: {
            status: prev.status as import('@prisma/client').GoalStatus,
            archivedAt: prev.archivedAt ? new Date(prev.archivedAt) : null,
          },
        });
        break;
      }
      case 'goal.contribution': {
        // undo: contribution 삭제 + currentValue 역산 (removeContribution 로직과 동일)
        const { contributionId } = payload as { contributionId: string };
        const contribution = await this.prisma.goalContribution.findUnique({
          where: { id: contributionId },
          include: { goal: true },
        });
        if (contribution) {
          const reversedValue =
            contribution.goal.direction === 'UP'
              ? contribution.goal.currentValue - contribution.deltaValue
              : contribution.goal.currentValue + contribution.deltaValue;
          await this.prisma.$transaction([
            this.prisma.goalContribution.delete({ where: { id: contributionId } }),
            this.prisma.goal.update({
              where: { id: contribution.goalId },
              data: { currentValue: reversedValue },
            }),
          ]);
        }
        break;
      }
      case 'goal.contributionRemove': {
        // undo: contribution 재추가 + currentValue 재산출
        const { goalId, delta, contributionId } = payload as {
          goalId: string;
          delta: number;
          contributionId: string;
        };
        const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
        if (goal) {
          const newValue =
            goal.direction === 'UP'
              ? goal.currentValue + delta
              : goal.currentValue - delta;
          await this.prisma.$transaction([
            this.prisma.goalContribution.create({
              data: {
                id: contributionId,
                goalId,
                sourceType: 'MANUAL',
                deltaValue: delta,
                loggedAt: new Date(),
              },
            }),
            this.prisma.goal.update({
              where: { id: goalId },
              data: { currentValue: newValue },
            }),
          ]);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown actionType for undo: ${actionType}`);
    }
  }
}
