import { View } from 'react-native';
import { Text } from './Text';
import type { GoalWeight } from '../lib/api/goal';

interface WeightBadgeProps {
  weight: GoalWeight;
}

const WEIGHT_LABEL: Record<GoalWeight, string> = {
  LOW: '낮음',
  MED: '보통',
  HIGH: '높음',
};

const WEIGHT_CLS: Record<GoalWeight, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-800',
  MED: 'bg-yellow-100 dark:bg-yellow-900',
  HIGH: 'bg-red-100 dark:bg-red-900',
};

const WEIGHT_TEXT_CLS: Record<GoalWeight, string> = {
  LOW: 'text-gray-600 dark:text-gray-300',
  MED: 'text-yellow-700 dark:text-yellow-300',
  HIGH: 'text-red-600 dark:text-red-300',
};

export function WeightBadge({ weight }: WeightBadgeProps) {
  return (
    <View className={`px-2 py-0.5 rounded-full ${WEIGHT_CLS[weight]}`}>
      <Text size="xs" className={`font-semibold ${WEIGHT_TEXT_CLS[weight]}`}>
        {WEIGHT_LABEL[weight]}
      </Text>
    </View>
  );
}
