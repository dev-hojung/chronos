/**
 * analyzer.ts — W6 통계 기반 루틴 조정 분석기 (AI 호출 없음, 순수 통계)
 */

export interface RoutineLike {
  id: string;
  title: string;
  scheduleCron: string;
  durationMin: number;
}

export interface RunLike {
  routineId: string;
  scheduledAt: Date;
  status: string; // 'DONE' | 'SKIPPED' | 'MISSED' | 'SNOOZED'
  actualDurationMin?: number | null;
  completedAt?: Date | null;
}

export interface RoutineDiagnosis {
  routineId: string;
  diagnosis: string;
  proposedChanges: {
    newCron?: string;
    newDurationMin?: number;
  };
  confidence: number;
  applyAutomatically: boolean;
}

// ── 날짜 유틸 ──────────────────────────────────────────────────────────────────

function weeksAgo(n: number): Date {
  return new Date(Date.now() - n * 7 * 24 * 60 * 60 * 1000);
}

// ── 통계 유틸 ─────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/** 변동계수 (coefficient of variation) — 0~1 클램프 */
function cv(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  if (m === 0) return 0;
  return Math.min(1, stddev(arr) / Math.abs(m));
}

// ── cron 유틸 ─────────────────────────────────────────────────────────────────

/**
 * cron 표현식의 시각(분,시)만 deltaMinutes 만큼 이동.
 * 5-field cron: "MIN HOUR DOM MON DOW"
 */
export function cronShiftMinutes(cron: string, deltaMinutes: number): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;

  const origMin = parseInt(parts[0], 10);
  const origHour = parseInt(parts[1], 10);

  if (isNaN(origMin) || isNaN(origHour)) return cron;

  const totalMins = origHour * 60 + origMin + deltaMinutes;
  // wrap into 0..1439
  const wrapped = ((totalMins % 1440) + 1440) % 1440;
  const newHour = Math.floor(wrapped / 60);
  const newMin = wrapped % 60;

  const newParts = [...parts];
  newParts[0] = String(newMin);
  newParts[1] = String(newHour);
  return newParts.join(' ');
}

/** cron "MIN HOUR …" → "HH:MM" 형식 문자열 */
function cronToTime(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  const h = parseInt(parts[1] ?? '0', 10);
  const m = parseInt(parts[0] ?? '0', 10);
  if (isNaN(h) || isNaN(m)) return cron;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── 핵심 분석 함수 ────────────────────────────────────────────────────────────

/**
 * analyzeRoutine — 최근 4주 runs 기반 통계 분석.
 *
 * @param routine  루틴 객체
 * @param runs     해당 루틴의 전체 runs (함수 내에서 4주 필터 적용)
 * @param lastManualEditAt  사용자의 마지막 수동 수정 시각 (없으면 undefined)
 * @returns RoutineDiagnosis 또는 null (데이터 부족/변경 없음)
 */
export function analyzeRoutine(
  routine: RoutineLike,
  runs: RunLike[],
  lastManualEditAt?: Date,
): RoutineDiagnosis | null {
  const since = weeksAgo(4);

  // 1. 최근 4주 필터
  const recent = runs.filter(
    (r) => r.routineId === routine.id && r.scheduledAt >= since,
  );

  // 2. 데이터 부족 → null
  if (recent.length < 15) return null;

  // 3. 완료율
  const done = recent.filter((r) => r.status === 'DONE').length;
  const skipped = recent.filter((r) => r.status === 'SKIPPED').length;
  const missed = recent.filter((r) => r.status === 'MISSED').length;
  const completionRate = done / (done + skipped + missed || 1);
  const pct = Math.round(completionRate * 100);

  // 4. 시간대 시프트 분석 (완료된 runs 기준)
  const doneRuns = recent.filter((r) => r.status === 'DONE' && r.completedAt != null);
  let shiftMin = 0;
  let shiftSd = 0;
  if (doneRuns.length >= 5) {
    const deltas = doneRuns.map((r) => {
      const diff = (r.completedAt!.getTime() - r.scheduledAt.getTime()) / 60_000;
      return diff;
    });
    shiftMin = Math.round(mean(deltas));
    shiftSd = stddev(deltas);
  }

  // 5. 소요시간 분석
  const durRuns = recent.filter(
    (r) => r.status === 'DONE' && r.actualDurationMin != null && r.actualDurationMin > 0,
  );
  let avgActualMin = routine.durationMin;
  let durationCv = 0;
  if (durRuns.length >= 5) {
    const durations = durRuns.map((r) => r.actualDurationMin!);
    avgActualMin = Math.round(mean(durations));
    durationCv = cv(durations);
  }

  // 6. confidence 계산
  const sampleFactor = Math.min(1, recent.length / 30);
  // 시간대 cv와 duration cv 중 큰 값을 변동성으로 사용
  const shiftCv = doneRuns.length >= 5 ? Math.min(1, shiftSd / (Math.abs(shiftMin) + 1)) : 0;
  const variability = Math.max(shiftCv, durationCv);
  const confidence = Math.max(0, Math.min(1, sampleFactor * (1 - variability)));

  // 7. 제안 생성
  const proposedChanges: RoutineDiagnosis['proposedChanges'] = {};

  // 시간 조정 제안: 평균 30분+ 늦게 완료
  if (shiftMin >= 30) {
    proposedChanges.newCron = cronShiftMinutes(routine.scheduleCron, shiftMin);
  }

  // 소요시간 조정 제안: ±50% 이상 차이
  const durDiff = Math.abs(avgActualMin - routine.durationMin) / (routine.durationMin || 1);
  if (durRuns.length >= 5 && durDiff >= 0.5) {
    proposedChanges.newDurationMin = avgActualMin;
  }

  // 변경 제안이 없고, 완료율도 높고 안정적이면 null (stable)
  if (!proposedChanges.newCron && !proposedChanges.newDurationMin && completionRate >= 0.8) {
    return null;
  }

  // 8. 자동 적용 여부
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentlyEdited = lastManualEditAt != null && lastManualEditAt >= sevenDaysAgo;
  const applyAutomatically =
    confidence >= 0.75 && recent.length >= 15 && !recentlyEdited;

  // 9. 진단 한국어 템플릿
  const avgMin = durRuns.length >= 5 ? avgActualMin : routine.durationMin;
  const newTime = proposedChanges.newCron ? cronToTime(proposedChanges.newCron) : '';
  const diagnosis = [
    `최근 4주 ${routine.title} 완료율 ${pct}%.`,
    `평균 ${avgMin}분 소요.`,
    shiftMin >= 30 ? `평균 ${shiftMin}분 늦게 시작합니다.` : '',
    shiftMin >= 30 && newTime ? `${newTime}로 옮길까요?` : '',
    proposedChanges.newDurationMin && !proposedChanges.newCron
      ? `소요시간을 ${proposedChanges.newDurationMin}분으로 조정할까요?`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    routineId: routine.id,
    diagnosis,
    proposedChanges,
    confidence,
    applyAutomatically,
  };
}
