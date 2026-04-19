import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as routineApi from '../api/routine';

// ── Keys ─────────────────────────────────────────────────────────────────────

export const routineKeys = {
  all: () => ['routines'] as const,
  routine: (id: string) => ['routines', id] as const,
  runs: (query: routineApi.ListRunsQuery) => ['routineRuns', query] as const,
  upcoming: () => ['routineUpcoming'] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useRoutines() {
  return useQuery({
    queryKey: routineKeys.all(),
    queryFn: routineApi.listRoutines,
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: routineKeys.routine(id),
    queryFn: () => routineApi.getRoutine(id),
    enabled: !!id,
  });
}

export function useListRuns(query: routineApi.ListRunsQuery) {
  return useQuery({
    queryKey: routineKeys.runs(query),
    queryFn: () => routineApi.listRuns(query),
    enabled: !!query.from && !!query.to,
  });
}

export function useUpcoming() {
  return useQuery({
    queryKey: routineKeys.upcoming(),
    queryFn: routineApi.getUpcoming,
    staleTime: 5 * 60_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: routineApi.CreateRoutineBody) => routineApi.createRoutine(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routineKeys.all() });
      qc.invalidateQueries({ queryKey: routineKeys.upcoming() });
    },
  });
}

export function useUpdateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: routineApi.UpdateRoutineBody }) =>
      routineApi.updateRoutine(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: routineKeys.all() });
      qc.invalidateQueries({ queryKey: routineKeys.routine(id) });
      qc.invalidateQueries({ queryKey: routineKeys.upcoming() });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routineApi.deleteRoutine(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: routineKeys.all() });
      const prev = qc.getQueryData<routineApi.Routine[]>(routineKeys.all());
      qc.setQueryData<routineApi.Routine[]>(routineKeys.all(), (old) =>
        old ? old.filter((r) => r.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(routineKeys.all(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: routineKeys.all() });
      qc.invalidateQueries({ queryKey: routineKeys.upcoming() });
    },
  });
}

export function useRecordRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: routineApi.RecordRunBody) => routineApi.recordRun(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routineKeys.upcoming() });
    },
  });
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export const proposalKeys = {
  all: () => ['routineProposals'] as const,
};

export function useProposals() {
  return useQuery({
    queryKey: proposalKeys.all(),
    queryFn: routineApi.listProposals,
    staleTime: 5 * 60_000,
  });
}

export function useAnalyzeRoutines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: routineApi.analyzeRoutines,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proposalKeys.all() });
      qc.invalidateQueries({ queryKey: routineKeys.all() });
    },
  });
}

export function useRevertProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routineApi.revertProposal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proposalKeys.all() });
      qc.invalidateQueries({ queryKey: routineKeys.all() });
    },
  });
}
