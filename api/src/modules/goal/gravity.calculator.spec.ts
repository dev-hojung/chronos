// gravity.calculator.spec.ts — 단위 테스트 ≥ 12케이스
import { rankWithGravity, GravityInput, RankedItem } from './gravity.calculator';

// 기본 candidates 팩토리
function makeRoutineCandidate(
  id: string,
  routineId: string,
  basePriority = 0,
): GravityInput['candidates'][0] {
  return {
    id,
    type: 'routine',
    estimatedDurationMin: 30,
    routineId,
    basePriority,
  };
}

function makeStackCandidate(
  id: string,
  contextLabel: GravityInput['candidates'][0]['contextLabel'],
  basePriority = 0,
): GravityInput['candidates'][0] {
  return {
    id,
    type: 'stack_action',
    estimatedDurationMin: 15,
    contextLabel,
    basePriority,
  };
}

function makeGoal(
  id: string,
  weight: 'LOW' | 'MED' | 'HIGH',
  linkedRoutineIds: string[] = [],
  linkedStackContextLabels: GravityInput['goals'][0]['linkedStackContextLabels'] = [],
  progressDeficit = 0,
): GravityInput['goals'][0] {
  return { id, weight, linkedRoutineIds, linkedStackContextLabels, progressDeficit };
}

describe('rankWithGravity', () => {
  // 케이스 1: 빈 candidates → []
  it('빈 candidates → 빈 배열 반환', () => {
    const result = rankWithGravity({ candidates: [], goals: [] });
    expect(result).toEqual([]);
  });

  // 케이스 2: goal 없음 → basePriority만으로 정렬
  it('goal 없음 → basePriority 내림차순 정렬', () => {
    const input: GravityInput = {
      candidates: [
        makeRoutineCandidate('r1', 'routine-1', 1),
        makeRoutineCandidate('r2', 'routine-2', 5),
        makeRoutineCandidate('r3', 'routine-3', 3),
      ],
      goals: [],
    };
    const result = rankWithGravity(input);
    expect(result.map((r) => r.id)).toEqual(['r2', 'r3', 'r1']);
  });

  // 케이스 3: HIGH weight goal 매칭 → 높은 점수
  it('HIGH weight goal 매칭 → 낮은 basePriority보다 높은 점수', () => {
    const input: GravityInput = {
      candidates: [
        makeRoutineCandidate('r1', 'routine-high', 0),  // HIGH goal 매칭
        makeRoutineCandidate('r2', 'routine-none', 2),  // goal 미매칭, basePriority=2
      ],
      goals: [makeGoal('g1', 'HIGH', ['routine-high'])],
    };
    const result = rankWithGravity(input);
    // HIGH goal: weight=3, progressDeficit=0 → gravity=3*(1+0)=3, score=0+3=3 vs r2: score=2
    expect(result[0].id).toBe('r1');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  // 케이스 4: 여러 goal 매칭 합산
  it('여러 goal 매칭 시 goalGravity 합산', () => {
    const input: GravityInput = {
      candidates: [
        makeRoutineCandidate('r1', 'routine-1', 0),  // 2개 goal 매칭
        makeRoutineCandidate('r2', 'routine-2', 0),  // 1개 goal 매칭
      ],
      goals: [
        makeGoal('g1', 'MED', ['routine-1']),  // weight=2
        makeGoal('g2', 'LOW', ['routine-1']),  // weight=1
        makeGoal('g3', 'HIGH', ['routine-2']), // weight=3
      ],
    };
    const result = rankWithGravity(input);
    const r1 = result.find((r) => r.id === 'r1')!;
    const r2 = result.find((r) => r.id === 'r2')!;
    // r1: gravity = 2 + 1 = 3, r2: gravity = 3
    expect(r1.contributingGoalIds).toHaveLength(2);
    expect(r2.contributingGoalIds).toHaveLength(1);
    // 동점 → 입력 순서
    expect(r1.score).toBe(r2.score);
  });

  // 케이스 5: 컨텍스트 스위치 페널티 적용
  it('컨텍스트 스위치 페널티 -0.5 적용', () => {
    const input: GravityInput = {
      candidates: [
        makeStackCandidate('s1', 'WORK', 2),
        makeStackCandidate('s2', 'PERSONAL', 2),
      ],
      goals: [],
      previousContextLabel: 'WORK',
    };
    const result = rankWithGravity(input);
    // s1(WORK) 페널티 없음, s2(PERSONAL) 페널티 0.5 (2nd 위치에서)
    // 1차 정렬 기준: s1=2, s2=2 → 동점이면 입력 순서 s1 먼저
    // s1 처리: prevCtx=WORK, s1.ctx=WORK → 동일 → penalty=0, score=2
    // s2 처리: prevCtx=WORK(s1 ctx후), s2.ctx=PERSONAL → 다름 → penalty=0.5, score=1.5
    expect(result[0].id).toBe('s1');
    expect(result[0].contextSwitchPenalty).toBe(0);
    expect(result[1].id).toBe('s2');
    expect(result[1].contextSwitchPenalty).toBe(0.5);
  });

  // 케이스 6: 동일 컨텍스트 연속 → 페널티 0
  it('동일 컨텍스트 연속 → 페널티 없음', () => {
    const input: GravityInput = {
      candidates: [
        makeStackCandidate('s1', 'WORK', 3),
        makeStackCandidate('s2', 'WORK', 2),
      ],
      goals: [],
      previousContextLabel: 'WORK',
    };
    const result = rankWithGravity(input);
    expect(result[0].contextSwitchPenalty).toBe(0);
    expect(result[1].contextSwitchPenalty).toBe(0);
  });

  // 케이스 7: progressDeficit 양수 → goalGravity 증가
  it('progressDeficit 양수 → goalGravity 증가', () => {
    const inputNoDeficit: GravityInput = {
      candidates: [makeRoutineCandidate('r1', 'routine-1', 0)],
      goals: [makeGoal('g1', 'MED', ['routine-1'], [], 0)],
    };
    const inputWithDeficit: GravityInput = {
      candidates: [makeRoutineCandidate('r1', 'routine-1', 0)],
      goals: [makeGoal('g1', 'MED', ['routine-1'], [], 0.5)],
    };
    const r1 = rankWithGravity(inputNoDeficit)[0];
    const r2 = rankWithGravity(inputWithDeficit)[0];
    // deficit=0 → gravity=2*(1+0)=2, deficit=0.5 → gravity=2*(1+0.5)=3
    expect(r2.score).toBeGreaterThan(r1.score);
    expect(r2.score).toBeCloseTo(3);
    expect(r1.score).toBeCloseTo(2);
  });

  // 케이스 8: progressDeficit 음수 → max(0,deficit)=0 → 1배 유지
  it('progressDeficit 음수 → gravity 증가 없음 (1배 유지)', () => {
    const inputNegative: GravityInput = {
      candidates: [makeRoutineCandidate('r1', 'routine-1', 0)],
      goals: [makeGoal('g1', 'MED', ['routine-1'], [], -0.5)],
    };
    const result = rankWithGravity(inputNegative)[0];
    // deficit=-0.5 → max(0,-0.5)=0 → gravity=2*(1+0)=2
    expect(result.score).toBeCloseTo(2);
  });

  // 케이스 9: routine vs stack_action 동등 처리 (타입 무관하게 점수 계산)
  it('routine과 stack_action 타입 동등 처리', () => {
    const input: GravityInput = {
      candidates: [
        makeRoutineCandidate('r1', 'routine-1', 0),
        makeStackCandidate('s1', 'WORK', 0),
      ],
      goals: [
        makeGoal('g1', 'HIGH', ['routine-1']),           // routine 매칭
        makeGoal('g2', 'HIGH', [], ['WORK']),             // stack 매칭
      ],
    };
    const result = rankWithGravity(input);
    const r1 = result.find((r) => r.id === 'r1')!;
    const s1 = result.find((r) => r.id === 's1')!;
    // 둘 다 HIGH goal 1개 매칭 → gravity=3, score=3
    expect(r1.score).toBeCloseTo(s1.score);
    expect(r1.contributingGoalIds).toHaveLength(1);
    expect(s1.contributingGoalIds).toHaveLength(1);
  });

  // 케이스 10: 음수 점수 안전 (basePriority 음수 + 페널티)
  it('음수 점수 허용 (안전하게 반환)', () => {
    const input: GravityInput = {
      candidates: [
        makeStackCandidate('s1', 'PERSONAL', -2),
      ],
      goals: [],
      previousContextLabel: 'WORK',
    };
    const result = rankWithGravity(input);
    // basePriority=-2, 컨텍스트 페널티=0.5 → score=-2.5
    expect(result[0].score).toBeCloseTo(-2.5);
  });

  // 케이스 11: 모든 동일 점수 → 입력 순서 유지 (stable sort)
  it('모든 동일 점수 → 입력 순서 유지', () => {
    const input: GravityInput = {
      candidates: [
        makeRoutineCandidate('r1', 'routine-a', 0),
        makeRoutineCandidate('r2', 'routine-b', 0),
        makeRoutineCandidate('r3', 'routine-c', 0),
      ],
      goals: [],
    };
    const result = rankWithGravity(input);
    // 모두 score=0, 입력 순서 r1, r2, r3
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  // 케이스 12: LOW=1, MED=2, HIGH=3 매핑 검증
  it('LOW=1, MED=2, HIGH=3 가중치 매핑 검증', () => {
    const buildInput = (weight: 'LOW' | 'MED' | 'HIGH'): GravityInput => ({
      candidates: [makeRoutineCandidate('r1', 'routine-1', 0)],
      goals: [makeGoal('g1', weight, ['routine-1'], [], 0)],
    });

    const low = rankWithGravity(buildInput('LOW'))[0];
    const med = rankWithGravity(buildInput('MED'))[0];
    const high = rankWithGravity(buildInput('HIGH'))[0];

    expect(low.score).toBeCloseTo(1);   // LOW=1
    expect(med.score).toBeCloseTo(2);   // MED=2
    expect(high.score).toBeCloseTo(3);  // HIGH=3
    expect(low.score).toBeLessThan(med.score);
    expect(med.score).toBeLessThan(high.score);
  });

  // 케이스 13: contextLabel 없는 후보 → 컨텍스트 페널티 없음
  it('contextLabel 없는 후보 → 컨텍스트 페널티 0', () => {
    const input: GravityInput = {
      candidates: [
        makeRoutineCandidate('r1', 'routine-1', 2),  // contextLabel 없음
      ],
      goals: [],
      previousContextLabel: 'WORK',
    };
    const result = rankWithGravity(input);
    expect(result[0].contextSwitchPenalty).toBe(0);
  });

  // 케이스 14: rationale 포함 검증 (goal 매칭 없음 → "기본 우선순위")
  it('goal 매칭 없음 → rationale "기본 우선순위"', () => {
    const input: GravityInput = {
      candidates: [makeRoutineCandidate('r1', 'routine-x', 1)],
      goals: [makeGoal('g1', 'HIGH', ['routine-other'])],
    };
    const result = rankWithGravity(input);
    expect(result[0].rationale).toBe('기본 우선순위');
  });

  // 케이스 15: goal 매칭 + 컨텍스트 스위치 → rationale 두 부분 포함
  it('goal 매칭 + 컨텍스트 스위치 → rationale 두 부분 모두 포함', () => {
    const input: GravityInput = {
      candidates: [
        makeStackCandidate('s1', 'WORK', 0),
        makeStackCandidate('s2', 'PERSONAL', 0),  // WORK 이후 다른 ctx
      ],
      goals: [makeGoal('g1', 'HIGH', [], ['PERSONAL'])],
      previousContextLabel: 'WORK',
    };
    const result = rankWithGravity(input);
    // s2는 PERSONAL goal 매칭 + ctx switch
    const s2 = result.find((r) => r.id === 's2')!;
    expect(s2.rationale).toContain('목표');
    expect(s2.rationale).toContain('컨텍스트');
  });
});
