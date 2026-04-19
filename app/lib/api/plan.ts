// plan.ts — Today 플랜 API 클라이언트
import { apiFetch } from '../api';

export interface DailyPlan {
  id: string;
  userId: string;
  planDate: string;
  orderedItemIds: string[];
  gravitySnapshot: GravitySnapshot;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RankedItem {
  id: string;
  score: number;
  contributingGoalIds: string[];
  rationale: string;
  contextSwitchPenalty: number;
}

export interface GravitySnapshot {
  input?: unknown;
  output?: RankedItem[];
  generatedAt?: string;
  manualReorder?: boolean;
}

export function getTodayPlan(date?: string): Promise<DailyPlan> {
  const qs = date ? `?date=${date}` : '';
  return apiFetch<DailyPlan>(`/plan/today${qs}`);
}

export function generateTodayPlan(date?: string): Promise<DailyPlan> {
  const qs = date ? `?date=${date}` : '';
  return apiFetch<DailyPlan>(`/plan/generate${qs}`, { method: 'POST' });
}

export function manualReorderPlan(date: string, orderedIds: string[]): Promise<DailyPlan> {
  return apiFetch<DailyPlan>('/plan/reorder', {
    method: 'POST',
    body: { date, orderedIds },
  });
}

export function unlockPlan(date?: string): Promise<DailyPlan> {
  const qs = date ? `?date=${date}` : '';
  return apiFetch<DailyPlan>(`/plan/unlock${qs}`, { method: 'POST' });
}

export function registerPushToken(
  token: string,
  notificationPrefs?: Record<string, boolean>,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/auth/push-token', {
    method: 'POST',
    body: { token, notificationPrefs },
  });
}
