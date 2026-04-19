import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import type { RoutineProposal } from '../lib/api/routine';

interface Props {
  proposal: RoutineProposal;
  routineTitle?: string;
  onRevert?: (id: string) => void;
}

/** cron "MIN HOUR …" → "HH:MM" */
function cronToTime(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  const h = parseInt(parts[1] ?? '0', 10);
  const m = parseInt(parts[0] ?? '0', 10);
  if (isNaN(h) || isNaN(m)) return cron;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

export function ProposalCard({ proposal, routineTitle, onRevert }: Props) {
  const change = proposal.proposedChange;
  const canRevert = proposal.appliedAt != null && proposal.revertedAt == null;

  const changeLines: string[] = [];
  if (change.newCron) {
    changeLines.push(`시간: → ${cronToTime(change.newCron)}`);
  }
  if (change.newDurationMin) {
    changeLines.push(`소요시간: → ${change.newDurationMin}분`);
  }

  return (
    <Card tone="default" className="mb-3">
      {routineTitle && (
        <Text size="xs" tone="muted" className="mb-1">
          {routineTitle}
        </Text>
      )}
      <Text size="sm" className="mb-2">
        {proposal.diagnosis}
      </Text>

      {changeLines.length > 0 && (
        <View className="mb-2">
          {changeLines.map((line, i) => (
            <Text key={i} size="xs" tone="muted">
              {line}
            </Text>
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <Text size="xs" tone="muted">
          {proposal.appliedAt
            ? `적용됨 ${formatDate(proposal.appliedAt)}`
            : proposal.revertedAt
            ? `되돌림 ${formatDate(proposal.revertedAt)}`
            : `제안 ${formatDate(proposal.createdAt)}`}
        </Text>
        {canRevert && onRevert && (
          <TouchableOpacity
            onPress={() => onRevert(proposal.id)}
            className="px-2 py-1 rounded bg-red-100 dark:bg-red-900"
          >
            <Text size="xs" className="text-red-700 dark:text-red-200">
              되돌리기
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}
