import { apiFetch } from '../api';

export type RoutineRunStatus = 'done' | 'skipped' | 'snoozed' | 'missed';

export interface Routine {
  id: string;
  userId: string;
  title: string;
  scheduleCron: string;
  durationMin: number;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineDetail extends Routine {
  runs: RoutineRun[];
}

export interface RoutineRun {
  id: string;
  routineId: string;
  scheduledAt: string;
  status: RoutineRunStatus;
  actualDurationMin: number | null;
  completedAt: string | null;
}

export interface UpcomingSlot {
  scheduledAt: string;
  runId: string;
}

export interface UpcomingRoutine {
  routineId: string;
  title: string;
  durationMin: number;
  slots: UpcomingSlot[];
}

export interface CreateRoutineBody {
  title: string;
  scheduleCron: string;
  durationMin: number;
  active?: boolean;
}

export interface UpdateRoutineBody {
  title?: string;
  scheduleCron?: string;
  durationMin?: number;
  active?: boolean;
}

export interface RecordRunBody {
  routineRunId: string;
  status: RoutineRunStatus;
  actualDurationMin?: number;
  completedAt?: string;
}

export interface ListRunsQuery {
  routineId?: string;
  from: string;
  to: string;
  limit?: number;
}

export function listRoutines() {
  return apiFetch<Routine[]>('/routines');
}

export function createRoutine(body: CreateRoutineBody) {
  return apiFetch<Routine>('/routines', { method: 'POST', body });
}

export function getRoutine(id: string) {
  return apiFetch<RoutineDetail>(`/routines/${id}`);
}

export function updateRoutine(id: string, body: UpdateRoutineBody) {
  return apiFetch<Routine>(`/routines/${id}`, { method: 'PATCH', body });
}

export function deleteRoutine(id: string) {
  return apiFetch<{ deleted: boolean }>(`/routines/${id}`, { method: 'DELETE' });
}

export function recordRun(body: RecordRunBody) {
  return apiFetch<RoutineRun>('/routines/runs', { method: 'POST', body });
}

export function listRuns(query: ListRunsQuery) {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.routineId) params.set('routineId', query.routineId);
  if (query.limit) params.set('limit', String(query.limit));
  return apiFetch<RoutineRun[]>(`/routines/runs?${params}`);
}

export function getUpcoming() {
  return apiFetch<UpcomingRoutine[]>('/routines/upcoming');
}
