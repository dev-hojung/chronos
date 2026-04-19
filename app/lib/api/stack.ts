import { apiFetch } from '../api';

export type InboxSource = 'TEXT' | 'VOICE' | 'SHARE' | 'IMPORT';
export type ContextLabel = 'WORK' | 'PERSONAL' | 'RESEARCH' | 'ADMIN';

export interface InboxItem {
  id: string;
  userId: string;
  rawText: string;
  source: InboxSource;
  processedStackId: string | null;
  createdAt: string;
}

export interface Stack {
  id: string;
  userId: string;
  title: string;
  contextLabel: ContextLabel;
  summary: string | null;
  aiGenerated: boolean;
  createdAt: string;
  _count?: { items: number };
}

export interface StackDetail extends Stack {
  items: Array<{
    stackId: string;
    inboxItemId: string;
    orderIdx: number;
    inboxItem: InboxItem;
  }>;
  nextActions: Array<{
    id: string;
    stackId: string;
    actionText: string;
    priority: number;
    status: string;
  }>;
}

export interface InboxPage {
  items: InboxItem[];
  nextCursor: string | null;
}

export function createInboxItem(rawText: string, source: InboxSource = 'TEXT') {
  return apiFetch<InboxItem>('/inbox', { method: 'POST', body: { rawText, source } });
}

export function listInbox(cursor?: string, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiFetch<InboxPage>(`/inbox?${params}`);
}

export function deleteInboxItem(id: string) {
  return apiFetch<{ deleted: boolean }>(`/inbox/${id}`, { method: 'DELETE' });
}

export function listStacks() {
  return apiFetch<Stack[]>('/stacks');
}

export function getStack(id: string) {
  return apiFetch<StackDetail>(`/stacks/${id}`);
}

export function createStack(body: { title: string; contextLabel: ContextLabel; summary?: string; itemIds?: string[] }) {
  return apiFetch<Stack>('/stacks', { method: 'POST', body });
}

export function addStackItems(stackId: string, itemIds: string[]) {
  return apiFetch<{ added: number }>(`/stacks/${stackId}/items`, {
    method: 'POST',
    body: { itemIds },
  });
}

export function removeStackItem(stackId: string, itemId: string) {
  return apiFetch<{ removed: boolean }>(`/stacks/${stackId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export function deleteStack(id: string) {
  return apiFetch<{ deleted: boolean }>(`/stacks/${id}`, { method: 'DELETE' });
}
