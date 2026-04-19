import { ContributionSourceType, GoalDirection, GoalStatus } from '@prisma/client';
import { calculateProgress, ContributionLike, GoalLike } from './progress.calculator';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeGoal(overrides: Partial<GoalLike> = {}): GoalLike {
  return {
    id: 'g1',
    targetValue: 100,
    currentValue: 0,
    direction: GoalDirection.UP,
    status: GoalStatus.ACTIVE,
    horizonDays: 30,
    createdAt: new Date(Date.now() - 10 * 86_400_000), // 10일 전 생성
    ...overrides,
  };
}

function makeContribution(overrides: Partial<ContributionLike> & { daysAgo?: number } = {}): ContributionLike {
  const { daysAgo = 1, ...rest } = overrides;
  return {
    id: `c_${Math.random()}`,
    sourceType: ContributionSourceType.MANUAL,
    deltaValue: 10,
    loggedAt: new Date(Date.now() - daysAgo * 86_400_000),
    ...rest,
  };
}

function makeContributions(count: number, delta: number, sourceType = ContributionSourceType.MANUAL): ContributionLike[] {
  return Array.from({ length: count }, (_, i) =>
    makeContribution({ daysAgo: i + 1, deltaValue: delta, sourceType }),
  );
}

// ── 1. 기본: 절반 진척 (UP 방향) ────────────────────────────────────────────
it('UP 방향 절반 진척 progressRatio=0.5', () => {
  const goal = makeGoal({ targetValue: 100, currentValue: 50 });
  // startValue = 50 - 50 = 0, contributions sum = 50
  const contribs = makeContributions(5, 10); // 5 * 10 = 50
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBeCloseTo(0.5);
});

// ── 2. UP 방향 완전 달성 → progressRatio=1 ──────────────────────────────────
it('UP 방향 목표 달성 시 progressRatio=1', () => {
  const goal = makeGoal({ targetValue: 100, currentValue: 100 });
  const contribs = makeContributions(10, 10);
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBe(1);
});

// ── 3. UP 방향 초과 달성 → progressRatio 클램프 1 ──────────────────────────
it('UP 방향 초과 달성 시 progressRatio는 1로 클램프', () => {
  const goal = makeGoal({ targetValue: 100, currentValue: 120 });
  const contribs = makeContributions(12, 10);
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBe(1);
});

// ── 4. DOWN 방향 절반 진척 ───────────────────────────────────────────────────
it('DOWN 방향 절반 진척 progressRatio=0.5', () => {
  // 시작 100, 목표 60, 현재 80 → 절반
  const goal = makeGoal({
    targetValue: 60,
    currentValue: 80,
    direction: GoalDirection.DOWN,
  });
  // 총 delta=20 → startValue = 80+20 = 100
  const contribs = makeContributions(2, 10);
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBeCloseTo(0.5);
});

// ── 5. DOWN 방향 목표 달성 → progressRatio=1 ────────────────────────────────
it('DOWN 방향 목표 달성 시 progressRatio=1', () => {
  const goal = makeGoal({
    targetValue: 60,
    currentValue: 60,
    direction: GoalDirection.DOWN,
  });
  const contribs = makeContributions(4, 10);
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBe(1);
});

// ── 6. DOWN 방향 초과 달성 → 1로 클램프 ────────────────────────────────────
it('DOWN 방향 초과 달성 시 progressRatio는 1로 클램프', () => {
  const goal = makeGoal({
    targetValue: 60,
    currentValue: 50,
    direction: GoalDirection.DOWN,
  });
  const contribs = makeContributions(5, 10);
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBe(1);
});

// ── 7. daysElapsed / daysRemaining 계산 ────────────────────────────────────
it('daysElapsed=10, daysRemaining=20 (horizonDays=30)', () => {
  const goal = makeGoal({ horizonDays: 30 });
  const snap = calculateProgress(goal, []);
  expect(snap.daysElapsed).toBe(10);
  expect(snap.daysRemaining).toBe(20);
});

// ── 8. horizonDays 종료 후 daysRemaining=0 ─────────────────────────────────
it('horizonDays 지난 후 daysRemaining=0', () => {
  const goal = makeGoal({
    horizonDays: 5,
    createdAt: new Date(Date.now() - 10 * 86_400_000), // 10일 전 생성
  });
  const snap = calculateProgress(goal, []);
  expect(snap.daysRemaining).toBe(0);
});

// ── 9. paceRequired 계산 ────────────────────────────────────────────────────
it('paceRequired = 남은delta / 남은days', () => {
  // target=100, current=40, daysRemaining=20
  const goal = makeGoal({
    targetValue: 100,
    currentValue: 40,
    horizonDays: 30,
    createdAt: new Date(Date.now() - 10 * 86_400_000),
  });
  const contribs = makeContributions(4, 10); // sum=40
  const snap = calculateProgress(goal, contribs);
  // 남은 delta=60, 남은 days=20 → pace=3
  expect(snap.paceRequired).toBeCloseTo(3);
});

// ── 10. daysRemaining=0이면 paceRequired=0 (division by zero 방지) ───────────
it('horizonDays 종료 후 paceRequired=0 (division by zero 방지)', () => {
  const goal = makeGoal({
    targetValue: 100,
    currentValue: 50,
    horizonDays: 5,
    createdAt: new Date(Date.now() - 10 * 86_400_000),
  });
  const snap = calculateProgress(goal, []);
  expect(snap.paceRequired).toBe(0);
});

// ── 11. span=0 division 안전 (start=target) ─────────────────────────────────
it('targetValue=currentValue=0 이면 progressRatio=1 (division by zero 안전)', () => {
  const goal = makeGoal({ targetValue: 0, currentValue: 0 });
  const snap = calculateProgress(goal, []);
  expect(snap.progressRatio).toBe(1);
});

// ── 12. last7Days / last30Days 기여 합산 ────────────────────────────────────
it('last7Days와 last30Days 기여 합산 정확', () => {
  const goal = makeGoal({ targetValue: 100, currentValue: 50 });
  const contribs = [
    makeContribution({ daysAgo: 2, deltaValue: 10 }),  // 7일 내
    makeContribution({ daysAgo: 5, deltaValue: 20 }),  // 7일 내
    makeContribution({ daysAgo: 10, deltaValue: 30 }), // 30일 내, 7일 초과
    makeContribution({ daysAgo: 40, deltaValue: 5 }),  // 30일 초과
  ];
  const snap = calculateProgress(goal, contribs);
  expect(snap.last7DaysContribution).toBeCloseTo(30);
  expect(snap.last30DaysContribution).toBeCloseTo(60);
});

// ── 13. contributorBreakdown sourceType별 합계 ──────────────────────────────
it('contributorBreakdown sourceType별 합계 정확', () => {
  const goal = makeGoal({ targetValue: 100, currentValue: 60 });
  const contribs = [
    makeContribution({ deltaValue: 20, sourceType: ContributionSourceType.ROUTINE }),
    makeContribution({ deltaValue: 15, sourceType: ContributionSourceType.ROUTINE }),
    makeContribution({ deltaValue: 10, sourceType: ContributionSourceType.MANUAL }),
    makeContribution({ deltaValue: 5, sourceType: ContributionSourceType.STACK_ACTION }),
  ];
  const snap = calculateProgress(goal, contribs);
  expect(snap.contributorBreakdown[ContributionSourceType.ROUTINE]).toBeCloseTo(35);
  expect(snap.contributorBreakdown[ContributionSourceType.MANUAL]).toBeCloseTo(10);
  expect(snap.contributorBreakdown[ContributionSourceType.STACK_ACTION]).toBeCloseTo(5);
});

// ── 14. contributions 없을 때 기본값 ─────────────────────────────────────────
it('contributions 없을 때 last7Days=0, breakdown all zeros', () => {
  const goal = makeGoal();
  const snap = calculateProgress(goal, []);
  expect(snap.last7DaysContribution).toBe(0);
  expect(snap.last30DaysContribution).toBe(0);
  expect(snap.contributorBreakdown[ContributionSourceType.ROUTINE]).toBe(0);
  expect(snap.contributorBreakdown[ContributionSourceType.MANUAL]).toBe(0);
});

// ── 15. progressRatio는 음수가 될 수 없음 (역방향 기여) ─────────────────────
it('currentValue가 startValue보다 낮아져도 progressRatio는 0 이상', () => {
  // UP 방향인데 current < start
  const goal = makeGoal({ targetValue: 100, currentValue: 5 });
  // contributions sum=50 → startValue = 5-50 = -45 → ratio = (5-(-45))/(100-(-45)) 가 아닌
  // 실제로 ratio=(5 - startValue)/(100 - startValue) = (5-(-45))/(100-(-45)) = 50/145 ≈ 0.34
  const contribs = makeContributions(5, 10); // sum=50
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBeGreaterThanOrEqual(0);
});

// ── 16. asOfDate 파라미터 동작 확인 ─────────────────────────────────────────
it('asOfDate 지정 시 daysElapsed 정확히 계산', () => {
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const asOfDate = new Date('2026-01-16T00:00:00Z'); // 15일 후
  const goal = makeGoal({ horizonDays: 30, createdAt });
  const snap = calculateProgress(goal, [], asOfDate);
  expect(snap.daysElapsed).toBe(15);
  expect(snap.daysRemaining).toBe(15);
});

// ── 17. 음수 deltaValue: progressRatio 0 클램프 ────────────────────────────
it('음수 delta로 currentValue가 줄어도 progressRatio 0 이상', () => {
  const goal = makeGoal({ targetValue: 100, currentValue: 0 });
  // 음수 기여 (역기여)
  const contribs = [makeContribution({ deltaValue: -10 })];
  const snap = calculateProgress(goal, contribs);
  expect(snap.progressRatio).toBeGreaterThanOrEqual(0);
});
