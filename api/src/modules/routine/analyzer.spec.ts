import { analyzeRoutine, cronShiftMinutes } from './analyzer';
import type { RoutineLike, RunLike } from './analyzer';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRoutine(overrides: Partial<RoutineLike> = {}): RoutineLike {
  return {
    id: 'r1',
    title: '아침 스트레칭',
    scheduleCron: '0 7 * * *', // 07:00
    durationMin: 30,
    ...overrides,
  };
}

function makeRun(
  overrides: Partial<RunLike> & { daysAgo?: number } = {},
): RunLike {
  const { daysAgo = 1, ...rest } = overrides;
  const scheduledAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    routineId: 'r1',
    scheduledAt,
    status: 'DONE',
    actualDurationMin: 30,
    completedAt: scheduledAt,
    ...rest,
  };
}

/** n개의 runs 생성, daysAgo=1~n */
function makeRuns(
  n: number,
  overrides: Partial<RunLike> = {},
  completedOffsetMin = 0,
): RunLike[] {
  return Array.from({ length: n }, (_, i) => {
    const scheduledAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
    const completedAt = completedOffsetMin
      ? new Date(scheduledAt.getTime() + completedOffsetMin * 60_000)
      : scheduledAt;
    return {
      routineId: 'r1',
      scheduledAt,
      status: 'DONE',
      actualDurationMin: 30,
      completedAt,
      ...overrides,
    };
  });
}

// ── 1. 데이터 부족 (< 15 runs) → null ─────────────────────────────────────────
it('데이터 부족 시 null 반환', () => {
  const routine = makeRoutine();
  const runs = makeRuns(10);
  expect(analyzeRoutine(routine, runs)).toBeNull();
});

// ── 2. 모두 done, 안정적 패턴 → null (변경 없음) ────────────────────────────
it('안정적 패턴이면 null 반환 (변경 불필요)', () => {
  const routine = makeRoutine();
  // 20개 모두 done, 정시 완료, duration 딱 맞음
  const runs = makeRuns(20);
  const result = analyzeRoutine(routine, runs);
  expect(result).toBeNull();
});

// ── 3. 늦게 시작 패턴 → cron 이동 제안 ────────────────────────────────────────
it('평균 45분 늦게 시작하면 cron 이동 제안', () => {
  const routine = makeRoutine({ scheduleCron: '0 7 * * *' });
  const runs = makeRuns(20, { status: 'DONE' }, 45); // 45분 늦게 완료
  const result = analyzeRoutine(routine, runs);
  expect(result).not.toBeNull();
  expect(result!.proposedChanges.newCron).toBeDefined();
  // 07:00 + 45min = 07:45
  expect(result!.proposedChanges.newCron).toBe('45 7 * * *');
});

// ── 4. 짧게 끝남 → duration 제안 ────────────────────────────────────────────
it('실제 소요시간이 설정값의 50% 미만이면 duration 제안', () => {
  const routine = makeRoutine({ durationMin: 60 });
  // actualDurationMin=20 (60의 33%) → ±50% 초과
  const runs = makeRuns(20, { actualDurationMin: 20 });
  const result = analyzeRoutine(routine, runs);
  expect(result).not.toBeNull();
  expect(result!.proposedChanges.newDurationMin).toBe(20);
  expect(result!.diagnosis).toContain('20분으로 조정할까요?');
});

// ── 5. 사용자 최근 7일 수동 수정 → 자동 적용 X ─────────────────────────────
it('직전 7일 수동 수정이 있으면 applyAutomatically=false', () => {
  const routine = makeRoutine({ scheduleCron: '0 7 * * *' });
  const runs = makeRuns(25, { status: 'DONE' }, 60); // 60분 늦게
  const recentEdit = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2일 전
  const result = analyzeRoutine(routine, runs, recentEdit);
  expect(result).not.toBeNull();
  expect(result!.applyAutomatically).toBe(false);
});

// ── 6. 변동성 높음 → 낮은 confidence ─────────────────────────────────────────
it('완료 시각 변동성이 높으면 confidence가 낮음', () => {
  const routine = makeRoutine({ scheduleCron: '0 7 * * *' });
  // 홀수는 10분, 짝수는 120분 늦게 → 고변동성
  const runs: RunLike[] = Array.from({ length: 20 }, (_, i) => {
    const scheduledAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
    const offset = i % 2 === 0 ? 10 : 120;
    return {
      routineId: 'r1',
      scheduledAt,
      status: 'DONE',
      actualDurationMin: 30,
      completedAt: new Date(scheduledAt.getTime() + offset * 60_000),
    };
  });
  const result = analyzeRoutine(routine, runs);
  // 평균 시프트=(10+120)/2=65 → cron 제안은 있으나 confidence 낮음
  if (result) {
    expect(result.confidence).toBeLessThan(0.75);
  }
  // null이어도 OK (변동성 너무 높아 제안 없음)
});

// ── 7. 완료율 낮음 → diagnosis 텍스트에 완료율 포함 ─────────────────────────
it('완료율이 낮으면 diagnosis에 완료율 포함', () => {
  const routine = makeRoutine({ scheduleCron: '0 7 * * *', durationMin: 30 });
  // 20개: 5 done, 15 missed
  const runs: RunLike[] = [
    ...makeRuns(5, { status: 'DONE' }),
    ...makeRuns(15, { status: 'MISSED', actualDurationMin: null, completedAt: null }),
  ];
  const result = analyzeRoutine(routine, runs);
  // 완료율 25% → diagnosis에 표시
  expect(result).not.toBeNull();
  expect(result!.diagnosis).toMatch(/완료율 \d+%/);
  expect(result!.diagnosis).toContain('25%');
});

// ── 8. 충분한 데이터 + 수정 없음 + confidence≥0.75 → 자동 적용 ──────────────
it('confidence 높고 최근 수정 없으면 applyAutomatically=true', () => {
  const routine = makeRoutine({ scheduleCron: '0 7 * * *', durationMin: 60 });
  // 30개, 모두 일관되게 늦게(45분) 완료
  const runs = makeRuns(30, { status: 'DONE', actualDurationMin: 30 }, 45);
  // lastManualEditAt 없음
  const result = analyzeRoutine(routine, runs);
  expect(result).not.toBeNull();
  // 30개 샘플, 일관된 패턴 → confidence 높음
  expect(result!.confidence).toBeGreaterThanOrEqual(0.75);
  expect(result!.applyAutomatically).toBe(true);
});

// ── cronShiftMinutes 유닛 테스트 ──────────────────────────────────────────────
describe('cronShiftMinutes', () => {
  it('07:00 + 45분 = 07:45', () => {
    expect(cronShiftMinutes('0 7 * * *', 45)).toBe('45 7 * * *');
  });

  it('23:30 + 60분 = 00:30 (자정 넘김)', () => {
    expect(cronShiftMinutes('30 23 * * *', 60)).toBe('30 0 * * *');
  });

  it('음수 delta: 07:10 - 20분 = 06:50', () => {
    expect(cronShiftMinutes('10 7 * * *', -20)).toBe('50 6 * * *');
  });
});
