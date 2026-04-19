// gravity.calculator.ts — 순수 점수 함수 기반 Today 재정렬 (AI 호출 없음)
// W8: Goal-Gravity 2/2

export type GoalWeight = 'LOW' | 'MED' | 'HIGH';
export type ContextLabel = 'WORK' | 'PERSONAL' | 'RESEARCH' | 'ADMIN';

// 가중치 매핑: LOW=1, MED=2, HIGH=3
const WEIGHT_MAP: Record<GoalWeight, number> = {
  LOW: 1,
  MED: 2,
  HIGH: 3,
};

// 컨텍스트 스위치 페널티 값
const CONTEXT_SWITCH_PENALTY = 0.5;

export interface GravityInput {
  candidates: Array<{
    id: string;                    // routine slot id or stack action id
    type: 'routine' | 'stack_action';
    estimatedDurationMin: number;
    contextLabel?: ContextLabel;   // for stack actions
    routineId?: string;            // for routine slots
    suggestedTimeStart?: Date;
    basePriority: number;          // user-set or default 0
  }>;
  goals: Array<{
    id: string;
    weight: GoalWeight;
    linkedRoutineIds: string[];
    linkedStackContextLabels: ContextLabel[];
    progressDeficit: number;       // 0..1, 기간 대비 뒤처진 정도 (음수=앞섬)
  }>;
  previousContextLabel?: ContextLabel;
}

export interface RankedItem {
  id: string;
  score: number;
  contributingGoalIds: string[];
  rationale: string;               // 한국어 1줄
  contextSwitchPenalty: number;
}

/**
 * rankWithGravity — 점수 함수로 후보 항목을 정렬한다.
 *
 * 알고리즘 (2-pass):
 *   1차: baseScore + goalGravity 계산 후 내림차순 정렬
 *   2차: 정렬된 순서에서 인접 항목 간 컨텍스트 페널티 적용 후 재정렬
 */
export function rankWithGravity(input: GravityInput): RankedItem[] {
  const { candidates, goals } = input;

  if (candidates.length === 0) return [];

  // 1차 pass: base + goalGravity 계산
  const intermediate = candidates.map((c) => {
    // baseScore = basePriority (사용자 설정 우선순위)
    const baseScore = c.basePriority;

    // goalGravity: 매칭 goal들의 가중 합산
    // matching: routineId in goal.linkedRoutineIds OR contextLabel in goal.linkedStackContextLabels
    let goalGravity = 0;
    const contributingGoalIds: string[] = [];

    for (const g of goals) {
      const matches =
        (c.routineId !== undefined && g.linkedRoutineIds.includes(c.routineId)) ||
        (c.contextLabel !== undefined && g.linkedStackContextLabels.includes(c.contextLabel));

      if (matches) {
        // progressDeficit 양수 → 가중 증가, 음수 → max(0, deficit) = 0 → 1배 유지
        const deficitBonus = Math.max(0, g.progressDeficit);
        goalGravity += WEIGHT_MAP[g.weight] * (1 + deficitBonus);
        contributingGoalIds.push(g.id);
      }
    }

    // 1차 점수 (컨텍스트 페널티는 2차에서)
    const score1 = baseScore + goalGravity;

    return { candidate: c, score1, goalGravity, contributingGoalIds, baseScore };
  });

  // 1차 정렬: score1 내림차순, 동점이면 입력 순서 유지 (stable sort)
  intermediate.sort((a, b) => b.score1 - a.score1 || 0);

  // 2차 pass: 순서대로 인접 컨텍스트 페널티 적용
  // 이전 항목의 contextLabel이 현재 항목과 다르면 -0.5 페널티
  const results: RankedItem[] = [];
  let prevCtx: ContextLabel | undefined = input.previousContextLabel;

  for (const item of intermediate) {
    const c = item.candidate;
    // 컨텍스트 스위치 페널티 계산
    let penalty = 0;
    if (prevCtx !== undefined && c.contextLabel !== undefined && c.contextLabel !== prevCtx) {
      penalty = CONTEXT_SWITCH_PENALTY;
    }

    const finalScore = item.score1 - penalty;

    // rationale 한국어 템플릿 조합
    const rationaleParts: string[] = [];
    if (item.contributingGoalIds.length > 0) {
      // 매칭된 goal 중 가장 높은 weight 표시
      const matchedGoals = goals.filter((g) => item.contributingGoalIds.includes(g.id));
      const maxWeight = matchedGoals.reduce(
        (max, g) => (WEIGHT_MAP[g.weight] > WEIGHT_MAP[max] ? g.weight : max),
        matchedGoals[0].weight,
      );
      rationaleParts.push(
        `${maxWeight} 가중치 목표 ${item.contributingGoalIds.length}개 기여 (중력 ${item.goalGravity.toFixed(1)})`,
      );
    }
    if (penalty > 0) {
      rationaleParts.push(`이전과 다른 컨텍스트(-${CONTEXT_SWITCH_PENALTY})`);
    }
    const rationale =
      rationaleParts.length > 0 ? rationaleParts.join(', ') : '기본 우선순위';

    results.push({
      id: c.id,
      score: finalScore,
      contributingGoalIds: item.contributingGoalIds,
      rationale,
      contextSwitchPenalty: penalty,
    });

    // 다음 항목의 페널티 계산을 위해 현재 컨텍스트 업데이트
    if (c.contextLabel !== undefined) {
      prevCtx = c.contextLabel;
    }
  }

  // 2차 정렬: finalScore 내림차순, 동점이면 1차 순서 유지 (stable sort)
  results.sort((a, b) => b.score - a.score || 0);

  return results;
}
