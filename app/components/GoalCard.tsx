import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { WeightBadge } from './WeightBadge';
import type { Goal } from '../lib/api/goal';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  onArchive?: () => void;
}

function paceIndicator(goal: Goal): string {
  // 남은 일수 및 페이스 방향 간단 계산
  const msPerDay = 86_400_000;
  const daysElapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(goal.createdAt).getTime()) / msPerDay),
  );
  const daysRemaining = Math.max(0, goal.horizonDays - daysElapsed);
  if (daysRemaining === 0) return '—';

  // 선형 기대값: targetValue를 horizonDays로 나눈 일일 기대량
  const expectedPerDay = goal.targetValue / goal.horizonDays;
  const expectedSoFar = expectedPerDay * daysElapsed;

  // UP: current >= expected → on track
  // DOWN: (targetValue - current) / targetValue 비율 비교
  const onTrack =
    goal.direction === 'UP'
      ? goal.currentValue >= expectedSoFar
      : goal.currentValue <= expectedSoFar;

  return onTrack ? '↗ 순조' : '↘ 지연';
}

function progressPercent(goal: Goal): number {
  const span = goal.targetValue;
  if (span === 0) return 100;
  if (goal.direction === 'UP') {
    return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  }
  // DOWN: 시작값을 targetValue로 추정 불가 → currentValue만으로 표시
  return Math.min(100, Math.round((1 - goal.currentValue / goal.targetValue) * 100));
}

function daysRemainingLabel(goal: Goal): string {
  const msPerDay = 86_400_000;
  const daysElapsed = Math.floor(
    (Date.now() - new Date(goal.createdAt).getTime()) / msPerDay,
  );
  const rem = Math.max(0, goal.horizonDays - daysElapsed);
  return `D-${rem}`;
}

export function GoalCard({ goal, onPress, onArchive }: GoalCardProps) {
  const pct = progressPercent(goal);
  const pace = paceIndicator(goal);
  const dLabel = daysRemainingLabel(goal);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text size="base" className="font-semibold">
              {goal.title}
            </Text>
            <Text size="xs" tone="muted">
              {goal.unit
                ? `${goal.currentValue}${goal.unit} → ${goal.targetValue}${goal.unit}`
                : `${goal.currentValue} / ${goal.targetValue}`}
            </Text>
          </View>
          <View className="items-end gap-1">
            <WeightBadge weight={goal.weight} />
            <Text size="xs" tone="muted">
              {dLabel}
            </Text>
          </View>
        </View>

        {/* 게이지 바 */}
        <View className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-1">
          <View
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${pct}%` }}
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text size="xs" tone="muted">
            {pct}%
          </Text>
          <Text size="xs" tone={pace.startsWith('↗') ? 'primary' : 'danger'}>
            {pace}
          </Text>
          {onArchive && (
            <TouchableOpacity
              onPress={onArchive}
              className="ml-2 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
            >
              <Text size="xs" tone="muted">
                보관
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}
