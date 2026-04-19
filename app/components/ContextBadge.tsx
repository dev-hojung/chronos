import { View } from 'react-native';
import { Text } from './Text';
import type { ContextLabel } from '../lib/api/stack';

const LABEL_MAP: Record<ContextLabel, { label: string; className: string }> = {
  WORK: { label: 'Work', className: 'bg-blue-100 dark:bg-blue-900' },
  PERSONAL: { label: 'Personal', className: 'bg-green-100 dark:bg-green-900' },
  RESEARCH: { label: 'Research', className: 'bg-purple-100 dark:bg-purple-900' },
  ADMIN: { label: 'Admin', className: 'bg-gray-100 dark:bg-gray-700' },
};

interface Props {
  context: ContextLabel;
}

export function ContextBadge({ context }: Props) {
  const { label, className } = LABEL_MAP[context] ?? LABEL_MAP.ADMIN;
  return (
    <View className={`rounded-full px-2 py-0.5 ${className}`}>
      <Text size="xs" className="font-medium">
        {label}
      </Text>
    </View>
  );
}
