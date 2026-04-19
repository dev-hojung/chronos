import { View } from 'react-native';
import { Text } from './Text';
import type { GoalContribution, ContributionSourceType } from '../lib/api/goal';

interface ContributionRowProps {
  contribution: GoalContribution;
}

const SOURCE_LABEL: Record<ContributionSourceType, string> = {
  ROUTINE: '루틴',
  STACK_ACTION: '스택',
  MANUAL: '수동',
};

const SOURCE_COLOR: Record<ContributionSourceType, string> = {
  ROUTINE: 'text-blue-600 dark:text-blue-300',
  STACK_ACTION: 'text-purple-600 dark:text-purple-300',
  MANUAL: 'text-green-600 dark:text-green-300',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ContributionRow({ contribution }: ContributionRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-border-light dark:border-border-dark">
      <View className="flex-row items-center gap-2">
        <Text size="xs" className={`font-semibold ${SOURCE_COLOR[contribution.sourceType]}`}>
          {SOURCE_LABEL[contribution.sourceType]}
        </Text>
        <Text size="sm">
          {contribution.note ?? `+${contribution.deltaValue}`}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text size="sm" className="font-semibold text-primary-600 dark:text-primary-300">
          +{contribution.deltaValue}
        </Text>
        <Text size="xs" tone="muted">
          {formatDate(contribution.loggedAt)}
        </Text>
      </View>
    </View>
  );
}
