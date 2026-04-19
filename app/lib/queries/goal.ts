import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as goalApi from '../api/goal';

// ── Cache keys ────────────────────────────────────────────────────────────────

export const goalKeys = {
  all: () => ['goals'] as const,
  list: (includeArchived: boolean) => ['goals', 'list', includeArchived] as const,
  detail: (id: string) => ['goals', 'detail', id] as const,
  progress: (id: string) => ['goals', 'progress', id] as const,
  contributions: (query: goalApi.ListContributionsQuery) =>
    ['goals', 'contributions', query] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGoals(includeArchived = false) {
  return useQuery({
    queryKey: goalKeys.list(includeArchived),
    queryFn: () => goalApi.listGoals(includeArchived),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: () => goalApi.getGoal(id),
    enabled: !!id,
  });
}

export function useProgress(goalId: string) {
  return useQuery({
    queryKey: goalKeys.progress(goalId),
    queryFn: () => goalApi.getProgress(goalId),
    enabled: !!goalId,
  });
}

export function useContributions(query: goalApi.ListContributionsQuery) {
  return useQuery({
    queryKey: goalKeys.contributions(query),
    queryFn: () => goalApi.listContributions(query),
    enabled: !!query.goalId || !!query.from,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: goalApi.CreateGoalBody) => goalApi.createGoal(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: goalApi.UpdateGoalBody }) =>
      goalApi.updateGoal(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
      qc.invalidateQueries({ queryKey: goalKeys.detail(id) });
      qc.invalidateQueries({ queryKey: goalKeys.progress(id) });
    },
  });
}

export function useArchiveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalApi.archiveGoal(id),
    // 낙관적 업데이트: 목록에서 즉시 제거
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: goalKeys.list(false) });
      const prev = qc.getQueryData<goalApi.Goal[]>(goalKeys.list(false));
      qc.setQueryData<goalApi.Goal[]>(goalKeys.list(false), (old) =>
        old ? old.filter((g) => g.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(goalKeys.list(false), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });
}

export function useDeleteGoal() {
  return useArchiveGoal();
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, body }: { goalId: string; body: goalApi.AddContributionBody }) =>
      goalApi.addContribution(goalId, body),
    onSuccess: (_data, { goalId }) => {
      qc.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
      qc.invalidateQueries({ queryKey: goalKeys.progress(goalId) });
      qc.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });
}

export function useRemoveContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => goalApi.removeContribution(contributionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });
}
