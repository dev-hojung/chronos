import { apiFetch } from '../api';

export type GoalWeight = 'LOW' | 'MED' | 'HIGH';
export type GoalMetricType = 'COUNT' | 'DURATION_MIN' | 'NUMERIC' | 'BOOLEAN';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type GoalDirection = 'UP' | 'DOWN';
export type ContributionSourceType = 'ROUTINE' | 'STACK_ACTION' | 'MANUAL';
export type ContextLabel = 'WORK' | 'PERSONAL' | 'RESEARCH' | 'ADMIN';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  horizonDays: number;
  weight: GoalWeight;
  metricType: GoalMetricType;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  direction: GoalDirection;
  status: GoalStatus;
  completedAt: string | null;
  archivedAt: string | null;
  linkedRoutineIds: string[];
  linkedStackContextLabels: ContextLabel[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  sourceType: ContributionSourceType;
  sourceId: string | null;
  deltaValue: number;
  note: string | null;
  loggedAt: string;
}

export interface ProgressSnapshot {
  progressRatio: number;
  daysElapsed: number;
  daysRemaining: number;
  paceRequired: number;
  last7DaysContribution: number;
  last30DaysContribution: number;
  contributorBreakdown: Record<ContributionSourceType, number>;
}

export interface GoalDetail extends Goal {
  progress: ProgressSnapshot;
  recentContributions: GoalContribution[];
}

export interface CreateGoalBody {
  title: string;
  horizonDays: number;
  weight?: GoalWeight;
  metricType: GoalMetricType;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  direction?: GoalDirection;
  linkedRoutineIds?: string[];
}

export interface UpdateGoalBody {
  title?: string;
  horizonDays?: number;
  weight?: GoalWeight;
  metricType?: GoalMetricType;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  direction?: GoalDirection;
  status?: GoalStatus;
  archivedAt?: string;
  linkedRoutineIds?: string[];
  linkedStackContextLabels?: ContextLabel[];
}

export interface AddContributionBody {
  sourceType: ContributionSourceType;
  sourceId?: string;
  deltaValue: number;
  note?: string;
  loggedAt?: string;
}

export interface ListContributionsQuery {
  goalId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function listGoals(includeArchived = false) {
  return apiFetch<Goal[]>(`/goals?includeArchived=${includeArchived}`);
}

export function createGoal(body: CreateGoalBody) {
  return apiFetch<Goal>('/goals', { method: 'POST', body });
}

export function getGoal(id: string) {
  return apiFetch<GoalDetail>(`/goals/${id}`);
}

export function updateGoal(id: string, body: UpdateGoalBody) {
  return apiFetch<Goal>(`/goals/${id}`, { method: 'PATCH', body });
}

export function archiveGoal(id: string) {
  return apiFetch<Goal>(`/goals/${id}`, { method: 'DELETE' });
}

export function deleteGoal(id: string) {
  return apiFetch<Goal>(`/goals/${id}`, { method: 'DELETE' });
}

export function addContribution(goalId: string, body: AddContributionBody) {
  return apiFetch<GoalContribution>(`/goals/${goalId}/contributions`, {
    method: 'POST',
    body,
  });
}

export function getProgress(goalId: string) {
  return apiFetch<ProgressSnapshot>(`/goals/${goalId}/progress`);
}

export function listContributions(query: ListContributionsQuery) {
  const params = new URLSearchParams();
  if (query.goalId) params.set('goalId', query.goalId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.limit) params.set('limit', String(query.limit));
  return apiFetch<GoalContribution[]>(`/goals/contributions?${params}`);
}

export function removeContribution(contributionId: string) {
  return apiFetch<{ removed: boolean }>(`/goals/contributions/${contributionId}`, {
    method: 'DELETE',
  });
}
