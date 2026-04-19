import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { ContextBadge } from './ContextBadge';
import type { Stack } from '../lib/api/stack';

interface Props {
  stack: Stack;
  onPress?: (id: string) => void;
}

export function StackCard({ stack, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={() => onPress?.(stack.id)}
      className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text size="base" className="font-semibold flex-1 mr-2">
          {stack.title}
        </Text>
        <ContextBadge context={stack.contextLabel} />
      </View>
      {stack.summary ? (
        <Text size="sm" tone="muted" className="mt-1">
          {stack.summary}
        </Text>
      ) : null}
      {stack._count !== undefined && (
        <Text size="xs" tone="muted" className="mt-2">
          {stack._count.items}개 항목
        </Text>
      )}
    </TouchableOpacity>
  );
}
