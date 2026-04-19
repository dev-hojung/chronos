import { View } from 'react-native';
import { Text } from './Text';
import type { RoutineRun } from '../lib/api/routine';

interface RoutineHeatmapProps {
  runs: RoutineRun[];
  /** number of days to display (default 28) */
  days?: number;
}

const STATUS_COLOR: Record<string, string> = {
  done: 'bg-green-400 dark:bg-green-500',
  skipped: 'bg-gray-300 dark:bg-gray-600',
  snoozed: 'bg-yellow-300 dark:bg-yellow-500',
  missed: 'bg-transparent',
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function RoutineHeatmap({ runs, days = 28 }: RoutineHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build array of dates (oldest first)
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }

  // Map date string → run status
  const statusByDay = new Map<string, string>();
  for (const run of runs) {
    const d = new Date(run.scheduledAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    statusByDay.set(key, run.status);
  }

  // Split into weeks (7 per row)
  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  return (
    <View className="gap-1">
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row gap-1">
          {week.map((date, di) => {
            const key = date.toISOString().slice(0, 10);
            const status = statusByDay.get(key) ?? 'none';
            const isToday = isSameDay(date, new Date());
            const colorCls = STATUS_COLOR[status] ?? 'bg-transparent';
            return (
              <View
                key={di}
                className={`w-7 h-7 rounded-sm border ${colorCls} ${
                  isToday
                    ? 'border-primary-500'
                    : 'border-border-light dark:border-border-dark'
                }`}
              />
            );
          })}
        </View>
      ))}
      <View className="flex-row gap-3 mt-1">
        {(['done', 'skipped', 'snoozed'] as const).map((s) => (
          <View key={s} className="flex-row items-center gap-1">
            <View className={`w-3 h-3 rounded-sm ${STATUS_COLOR[s]}`} />
            <Text size="xs" tone="muted">
              {s === 'done' ? '완료' : s === 'skipped' ? '스킵' : '스누즈'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
