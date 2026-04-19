import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as stackApi from '../api/stack';

// ── Keys ─────────────────────────────────────────────────────────────────────

export const stackKeys = {
  inbox: () => ['inbox'] as const,
  stacks: () => ['stacks'] as const,
  stack: (id: string) => ['stacks', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useInbox() {
  return useQuery({
    queryKey: stackKeys.inbox(),
    queryFn: () => stackApi.listInbox(),
  });
}

export function useStacks() {
  return useQuery({
    queryKey: stackKeys.stacks(),
    queryFn: stackApi.listStacks,
  });
}

export function useStack(id: string) {
  return useQuery({
    queryKey: stackKeys.stack(id),
    queryFn: () => stackApi.getStack(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rawText, source }: { rawText: string; source?: stackApi.InboxSource }) =>
      stackApi.createInboxItem(rawText, source),
    onSuccess: () => qc.invalidateQueries({ queryKey: stackKeys.inbox() }),
  });
}

export function useDeleteInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stackApi.deleteInboxItem(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: stackKeys.inbox() });
      const prev = qc.getQueryData<stackApi.InboxPage>(stackKeys.inbox());
      qc.setQueryData<stackApi.InboxPage>(stackKeys.inbox(), (old) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(stackKeys.inbox(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: stackKeys.inbox() }),
  });
}

export function useCreateStack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof stackApi.createStack>[0]) =>
      stackApi.createStack(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: stackKeys.stacks() }),
  });
}

export function useDeleteStack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stackApi.deleteStack(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: stackKeys.stacks() });
      const prev = qc.getQueryData<stackApi.Stack[]>(stackKeys.stacks());
      qc.setQueryData<stackApi.Stack[]>(stackKeys.stacks(), (old) =>
        old ? old.filter((s) => s.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(stackKeys.stacks(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: stackKeys.stacks() }),
  });
}

export function useAddStackItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stackId, itemIds }: { stackId: string; itemIds: string[] }) =>
      stackApi.addStackItems(stackId, itemIds),
    onSuccess: (_data, { stackId }) => {
      qc.invalidateQueries({ queryKey: stackKeys.stack(stackId) });
      qc.invalidateQueries({ queryKey: stackKeys.inbox() });
    },
  });
}

export function useRemoveStackItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stackId, itemId }: { stackId: string; itemId: string }) =>
      stackApi.removeStackItem(stackId, itemId),
    onSuccess: (_data, { stackId }) => {
      qc.invalidateQueries({ queryKey: stackKeys.stack(stackId) });
    },
  });
}

export function useAutoBundleInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stackApi.autoBundleInbox,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stackKeys.inbox() });
      qc.invalidateQueries({ queryKey: stackKeys.stacks() });
    },
  });
}

export function useUpdateInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { suggestedLabel?: stackApi.ContextLabel } }) =>
      stackApi.updateInboxItem(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stackKeys.inbox() });
    },
  });
}
