import { ContributionSourceType, GoalDirection, GoalStatus } from '@prisma/client';

export interface GoalLike {
  id: string;
  targetValue: number;
  currentValue: number;
  direction: GoalDirection;
  status: GoalStatus;
  horizonDays: number;
  createdAt: Date;
}

export interface ContributionLike {
  id: string;
  sourceType: ContributionSourceType;
  deltaValue: number;
  loggedAt: Date;
}

export interface ProgressSnapshot {
  progressRatio: number;         // 0..1 clamped, (current - start) / (target - start)
  daysElapsed: number;
  daysRemaining: number;         // max(0, horizonDays - daysElapsed)
  paceRequired: number;          // delta per day needed to reach target in remaining days
  last7DaysContribution: number;
  last30DaysContribution: number;
  contributorBreakdown: Record<ContributionSourceType, number>;
}

/**
 * Compute progress snapshot from pure data — no DB calls needed.
 * startValue 은 currentValue - Σdelta 로 역산. asOfDate defaults to now.
 */
export function calculateProgress(
  goal: GoalLike,
  contributions: ContributionLike[],
  asOfDate: Date = new Date(),
): ProgressSnapshot {
  const msPerDay = 86_400_000;
  const daysElapsed = Math.max(
    0,
    Math.floor((asOfDate.getTime() - goal.createdAt.getTime()) / msPerDay),
  );
  const daysRemaining = Math.max(0, goal.horizonDays - daysElapsed);

  // 시작값 = 현재값 - 모든 기여 합계 (방향에 따라 부호 처리)
  const totalDelta = contributions.reduce((s, c) => s + c.deltaValue, 0);
  const startValue =
    goal.direction === GoalDirection.UP
      ? goal.currentValue - totalDelta
      : goal.currentValue + totalDelta;

  const span = goal.targetValue - startValue;

  // span이 0이면 나누기 금지 — 목표에 이미 도달한 것으로 간주
  let progressRatio: number;
  if (Math.abs(span) < 1e-10) {
    progressRatio = 1;
  } else if (goal.direction === GoalDirection.UP) {
    // UP: current >= start를 향해 올라감
    progressRatio = (goal.currentValue - startValue) / span;
  } else {
    // DOWN: current <= target을 향해 내려감 (span은 음수)
    progressRatio = (startValue - goal.currentValue) / (startValue - goal.targetValue);
  }
  // 0..1 클램프
  progressRatio = Math.min(1, Math.max(0, progressRatio));

  // 남은 delta 계산 후 일 페이스 산출
  const remaining =
    goal.direction === GoalDirection.UP
      ? Math.max(0, goal.targetValue - goal.currentValue)
      : Math.max(0, goal.currentValue - goal.targetValue);
  // 남은 일이 0이면 pace 무한대 → 0으로 반환 (이미 지났거나 완료)
  const paceRequired = daysRemaining > 0 ? remaining / daysRemaining : 0;

  // 기간별 기여 합산
  const now = asOfDate.getTime();
  const cutoff7 = now - 7 * msPerDay;
  const cutoff30 = now - 30 * msPerDay;

  let last7DaysContribution = 0;
  let last30DaysContribution = 0;
  const breakdown: Record<ContributionSourceType, number> = {
    [ContributionSourceType.ROUTINE]: 0,
    [ContributionSourceType.STACK_ACTION]: 0,
    [ContributionSourceType.MANUAL]: 0,
  };

  for (const c of contributions) {
    const t = c.loggedAt.getTime();
    if (t >= cutoff7) last7DaysContribution += c.deltaValue;
    if (t >= cutoff30) last30DaysContribution += c.deltaValue;
    breakdown[c.sourceType] = (breakdown[c.sourceType] ?? 0) + c.deltaValue;
  }

  return {
    progressRatio,
    daysElapsed,
    daysRemaining,
    paceRequired,
    last7DaysContribution,
    last30DaysContribution,
    contributorBreakdown: breakdown,
  };
}
