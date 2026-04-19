import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
// cron-parser uses 0=Sunday ... 6=Saturday
// We display Mon-Sun (index 0=Mon), map to cron: Mon=1,Tue=2,...,Sat=6,Sun=0
const DAY_TO_CRON = [1, 2, 3, 4, 5, 6, 0];

interface WeekdayPickerProps {
  selected: number[]; // indices into DAYS array (0=Mon..6=Sun)
  onChange: (selected: number[]) => void;
}

export function WeekdayPicker({ selected, onChange }: WeekdayPickerProps) {
  const toggle = (idx: number) => {
    if (selected.includes(idx)) {
      onChange(selected.filter((d) => d !== idx));
    } else {
      onChange([...selected, idx].sort());
    }
  };

  return (
    <View className="flex-row gap-2 flex-wrap">
      {DAYS.map((label, idx) => {
        const active = selected.includes(idx);
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => toggle(idx)}
            className={`w-9 h-9 rounded-full items-center justify-center border ${
              active
                ? 'bg-primary-500 border-primary-500'
                : 'bg-transparent border-border-light dark:border-border-dark'
            }`}
          >
            <Text size="xs" className={active ? 'text-white font-semibold' : ''}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Convert selected day indices (0=Mon..6=Sun) + time to a cron expression */
export function buildCron(
  selectedDays: number[],
  hour: number,
  minute: number,
): string {
  if (selectedDays.length === 0 || selectedDays.length === 7) {
    // Every day
    return `${minute} ${hour} * * *`;
  }
  const cronDays = selectedDays.map((d) => DAY_TO_CRON[d]).join(',');
  return `${minute} ${hour} * * ${cronDays}`;
}

/** Returns preset selection arrays */
export const PRESETS = {
  everyday: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [0, 1, 2, 3, 4],
  weekend: [5, 6],
};
