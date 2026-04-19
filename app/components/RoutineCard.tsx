import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import type { Routine } from '../lib/api/routine';
import type { UpcomingRoutine } from '../lib/api/routine';

interface RoutineCardProps {
  routine: Routine;
  upcoming?: UpcomingRoutine;
  /** recent runs for completion rate */
  recentRuns?: { status: string }[];
  onPress?: () => void;
  onDeactivate?: () => void;
}

function completionRate(runs: { status: string }[]): string {
  if (runs.length === 0) return '—';
  const done = runs.filter((r) => r.status === 'done').length;
  return `${Math.round((done / runs.length) * 100)}%`;
}

function formatNextSlot(upcoming?: UpcomingRoutine): string {
  if (!upcoming || upcoming.slots.length === 0) return '예정 없음';
  const d = new Date(upcoming.slots[0].scheduledAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.round(diffMs / 3_600_000);
  if (diffH < 24) return `${diffH}시간 후`;
  const diffD = Math.round(diffMs / 86_400_000);
  return `${diffD}일 후`;
}

export function RoutineCard({
  routine,
  upcoming,
  recentRuns = [],
  onPress,
  onDeactivate,
}: RoutineCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text size="base" className="font-semibold">
              {routine.title}
            </Text>
            <View className="flex-row gap-3 mt-1">
              <Text size="xs" tone="muted">
                다음: {formatNextSlot(upcoming)}
              </Text>
              <Text size="xs" tone="muted">
                완료율: {completionRate(recentRuns)}
              </Text>
            </View>
          </View>
          {onDeactivate && (
            <TouchableOpacity
              onPress={onDeactivate}
              className="ml-2 px-2 py-1 rounded bg-red-100 dark:bg-red-900"
            >
              <Text size="xs" className="text-red-600 dark:text-red-300">
                비활성
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}
