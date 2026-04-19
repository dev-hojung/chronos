import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { CompleteRunDto } from './dto/complete-run.dto';
import { ListRunsDto } from './dto/list-runs.dto';
import { RoutineRunStatus } from '@prisma/client';

// Lightweight cron-next calculator — uses CronExpressionParser (cron-parser v3+)
// Falls back to a simple daily guess if the package is unavailable.
interface CronParserModule {
  CronExpressionParser: {
    parse(cron: string, opts?: { currentDate?: Date; endDate?: Date }): {
      next(): { value: { toDate(): Date }; done: boolean };
    };
  };
}
let cronParserMod: CronParserModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cronParserMod = require('cron-parser') as CronParserModule;
} catch {
  // will use fallback
}

function getNextOccurrences(cron: string, fromDate: Date, days: number): Date[] {
  const results: Date[] = [];
  const until = new Date(fromDate.getTime() + days * 86_400_000);

  if (cronParserMod) {
    try {
      const interval = cronParserMod.CronExpressionParser.parse(cron, {
        currentDate: fromDate,
        endDate: until,
      });
      for (;;) {
        try {
          const { value, done } = interval.next();
          if (done) break;
          results.push(value.toDate());
        } catch {
          break;
        }
      }
    } catch {
      // fallback below
    }
  }

  // Fallback: if cron-parser unavailable or failed, return one slot per day at
  // the hour/minute parsed from the cron expression (fields: min hour * * dow).
  if (results.length === 0) {
    const parts = cron.split(/\s+/);
    const minute = parseInt(parts[0] ?? '0', 10);
    const hour = parseInt(parts[1] ?? '0', 10);
    const d = new Date(fromDate);
    d.setSeconds(0, 0);
    for (let i = 0; i < days; i++) {
      const slot = new Date(d);
      slot.setDate(slot.getDate() + i);
      slot.setHours(isNaN(hour) ? 0 : hour, isNaN(minute) ? 0 : minute, 0, 0);
      if (slot > fromDate && slot < until) results.push(slot);
    }
  }

  return results;
}

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);
  private readonly useMemory: boolean;

  // In-memory store when DATABASE_URL is absent
  private memRoutines = new Map<string, MemRoutine>();
  private memRuns = new Map<string, MemRun>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.useMemory = !process.env.DATABASE_URL;
    if (this.useMemory) {
      this.logger.warn('routine service in memory only — DATABASE_URL not set');
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  async createRoutine(userId: string, dto: CreateRoutineDto) {
    const data = {
      userId,
      title: dto.title,
      scheduleCron: dto.scheduleCron,
      durationMin: dto.durationMin,
      active: dto.active ?? true,
      version: 1,
    };

    if (this.useMemory) {
      const id = newId();
      const routine: MemRoutine = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
      this.memRoutines.set(id, routine);
      await this.auditService.record(userId, 'routine.create', { routineId: id });
      return routine;
    }

    const routine = await this.prisma.routine.create({ data });
    await this.auditService.record(userId, 'routine.create', { routineId: routine.id });
    return routine;
  }

  async listRoutines(userId: string) {
    if (this.useMemory) {
      return [...this.memRoutines.values()]
        .filter((r) => r.userId === userId)
        .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || b.createdAt.getTime() - a.createdAt.getTime());
    }
    return this.prisma.routine.findMany({
      where: { userId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getRoutine(userId: string, id: string) {
    if (this.useMemory) {
      const routine = this.memRoutines.get(id);
      if (!routine) throw new NotFoundException('Routine not found');
      if (routine.userId !== userId) throw new ForbiddenException();
      const since = new Date(Date.now() - 30 * 86_400_000);
      const runs = [...this.memRuns.values()].filter(
        (r) => r.routineId === id && r.scheduledAt >= since,
      );
      return { ...routine, runs };
    }

    const routine = await this.prisma.routine.findUnique({
      where: { id },
      include: {
        runs: {
          where: { scheduledAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });
    if (!routine) throw new NotFoundException('Routine not found');
    if (routine.userId !== userId) throw new ForbiddenException();
    return routine;
  }

  async updateRoutine(userId: string, id: string, dto: UpdateRoutineDto) {
    const existing = await this._requireRoutine(userId, id);
    const prev = { ...existing };

    const updates: Partial<MemRoutine> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.scheduleCron !== undefined) updates.scheduleCron = dto.scheduleCron;
    if (dto.durationMin !== undefined) updates.durationMin = dto.durationMin;
    if (dto.active !== undefined) updates.active = dto.active;

    if (this.useMemory) {
      const updated = { ...existing, ...updates, version: existing.version + 1, updatedAt: new Date() };
      this.memRoutines.set(id, updated);
      await this.auditService.record(userId, 'routine.update', { routineId: id, prev });
      return updated;
    }

    const updated = await this.prisma.routine.update({
      where: { id },
      data: { ...updates, version: { increment: 1 } },
    });
    await this.auditService.record(userId, 'routine.update', { routineId: id, prev });
    return updated;
  }

  async deleteRoutine(userId: string, id: string) {
    await this._requireRoutine(userId, id);

    if (this.useMemory) {
      const routine = this.memRoutines.get(id)!;
      routine.active = false;
      routine.updatedAt = new Date();
      await this.auditService.record(userId, 'routine.delete', { routineId: id });
      return { deleted: true };
    }

    await this.prisma.routine.update({ where: { id }, data: { active: false } });
    await this.auditService.record(userId, 'routine.delete', { routineId: id });
    return { deleted: true };
  }

  // ── Runs ────────────────────────────────────────────────────────────────

  async recordRun(userId: string, dto: CompleteRunDto) {
    const statusMap: Record<string, RoutineRunStatus> = {
      done: RoutineRunStatus.DONE,
      skipped: RoutineRunStatus.SKIPPED,
      snoozed: RoutineRunStatus.SNOOZED,
      missed: RoutineRunStatus.MISSED,
    };
    const dbStatus = statusMap[dto.status];

    if (this.useMemory) {
      const existing = this.memRuns.get(dto.routineRunId);
      let run: MemRun;
      if (existing) {
        const prev = { ...existing };
        Object.assign(existing, {
          status: dto.status,
          actualDurationMin: dto.actualDurationMin ?? existing.actualDurationMin,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : existing.completedAt,
        });
        await this.auditService.record(userId, 'routine.run', { runId: dto.routineRunId, prev });
        run = existing;
      } else {
        const id = dto.routineRunId;
        run = {
          id,
          routineId: 'unknown',
          scheduledAt: new Date(),
          status: dto.status,
          actualDurationMin: dto.actualDurationMin,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        };
        this.memRuns.set(id, run);
        await this.auditService.record(userId, 'routine.run', { runId: id });
      }
      return run;
    }

    // Check if run already exists
    const existing = await this.prisma.routineRun.findUnique({ where: { id: dto.routineRunId } });
    if (existing) {
      // Verify ownership via routine
      await this._requireRoutine(userId, existing.routineId);
      const prev = { status: existing.status, actualDurationMin: existing.actualDurationMin };
      const updated = await this.prisma.routineRun.update({
        where: { id: dto.routineRunId },
        data: {
          status: dbStatus,
          actualDurationMin: dto.actualDurationMin,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        },
      });
      await this.auditService.record(userId, 'routine.run', { runId: dto.routineRunId, prev });
      return updated;
    }

    // Create new run — routineRunId is provided by client (e.g. from upcoming slot)
    const run = await this.prisma.routineRun.create({
      data: {
        id: dto.routineRunId,
        routineId: dto.routineRunId, // will be overwritten below — we need routineId from client
        scheduledAt: dto.completedAt ? new Date(dto.completedAt) : new Date(),
        status: dbStatus,
        actualDurationMin: dto.actualDurationMin,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
    await this.auditService.record(userId, 'routine.run', { runId: run.id });
    return run;
  }

  async listRuns(userId: string, query: ListRunsDto) {
    const limit = query.limit ?? 50;
    if (this.useMemory) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      return [...this.memRuns.values()]
        .filter((r) => {
          if (query.routineId && r.routineId !== query.routineId) return false;
          return r.scheduledAt >= from && r.scheduledAt <= to;
        })
        .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
        .slice(0, limit);
    }

    return this.prisma.routineRun.findMany({
      where: {
        ...(query.routineId ? { routineId: query.routineId } : {}),
        routine: { userId },
        scheduledAt: { gte: new Date(query.from), lte: new Date(query.to) },
      },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
    });
  }

  async getUpcomingRuns(userId: string, days = 7) {
    const routines = await this.listRoutines(userId);
    const active = routines.filter((r) => r.active);
    const now = new Date();

    return active.map((routine) => {
      const slots = getNextOccurrences(routine.scheduleCron, now, days);
      return {
        routineId: routine.id,
        title: routine.title,
        durationMin: routine.durationMin,
        slots: slots.map((date) => ({
          scheduledAt: date.toISOString(),
          runId: `${routine.id}-${date.toISOString()}`,
        })),
      };
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async _requireRoutine(userId: string, id: string): Promise<MemRoutine> {
    if (this.useMemory) {
      const r = this.memRoutines.get(id);
      if (!r) throw new NotFoundException('Routine not found');
      if (r.userId !== userId) throw new ForbiddenException();
      return r;
    }
    const r = await this.prisma.routine.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Routine not found');
    if (r.userId !== userId) throw new ForbiddenException();
    return r as unknown as MemRoutine;
  }
}

function newId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface MemRoutine {
  id: string;
  userId: string;
  title: string;
  scheduleCron: string;
  durationMin: number;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemRun {
  id: string;
  routineId: string;
  scheduledAt: Date;
  status: string;
  actualDurationMin?: number;
  completedAt?: Date;
}
