// plan.ts — Today 플랜 React Query hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as planApi from '../api/plan';

// ── Cache keys ────────────────────────────────────────────────────────────────

export const planKeys = {
  all: () => ['plan'] as const,
  today: (date?: string) => ['plan', 'today', date ?? 'today'] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTodayPlan(date?: string) {
  return useQuery({
    queryKey: planKeys.today(date),
    queryFn: () => planApi.getTodayPlan(date),
    // 5분 캐시 — 크론이 06:00에 재생성하므로 충분
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useGenerateTodayPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => planApi.generateTodayPlan(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all() });
    },
  });
}

export function useReorderPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, orderedIds }: { date: string; orderedIds: string[] }) =>
      planApi.manualReorderPlan(date, orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all() });
    },
  });
}

export function useUnlockPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => planApi.unlockPlan(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all() });
    },
  });
}
