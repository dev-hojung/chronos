import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import type { Routine } from '../lib/api/routine';

interface LinkedRoutinePickerProps {
  routines: Routine[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function LinkedRoutinePicker({
  routines,
  selected,
  onChange,
}: LinkedRoutinePickerProps) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (routines.length === 0) {
    return (
      <Text size="sm" tone="muted">
        연결 가능한 루틴이 없습니다.
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {routines.map((r) => {
        const isSelected = selected.includes(r.id);
        return (
          <TouchableOpacity
            key={r.id}
            onPress={() => toggle(r.id)}
            className={`px-3 py-1 rounded-full border ${
              isSelected
                ? 'bg-primary-500 border-primary-500'
                : 'border-border-light dark:border-border-dark'
            }`}
          >
            <Text size="sm" className={isSelected ? 'text-white' : ''}>
              {r.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
