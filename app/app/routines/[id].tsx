import { useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { RoutineHeatmap } from '../../components/RoutineHeatmap';
import { ProposalCard } from '../../components/ProposalCard';
import {
  useRoutine,
  useDeleteRoutine,
  useRecordRun,
  useUpcoming,
  useProposals,
  useRevertProposal,
} from '../../lib/queries/routine';
import type { RoutineRunStatus } from '../../lib/api/routine';

const STATUS_LABEL: Record<RoutineRunStatus, string> = {
  done: '✅ 완료',
  skipped: '⏸ 스킵',
  snoozed: '💤 스누즈',
  missed: '❌ 미실행',
};

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: routine, isLoading } = useRoutine(id ?? '');
  const { data: upcoming = [] } = useUpcoming();
  const { data: allProposals = [] } = useProposals();
  const deleteRoutine = useDeleteRoutine();
  const recordRun = useRecordRun();
  const revertProposal = useRevertProposal();
  const [historyOpen, setHistoryOpen] = useState(false);

  const upcomingForThis = upcoming.find((u) => u.routineId === id);
  const routineProposals = allProposals.filter((p) => p.routineId === id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentAutoApplied = routineProposals.filter(
    (p) => p.appliedAt != null && new Date(p.appliedAt) >= sevenDaysAgo && p.revertedAt == null,
  );
  const todaySlots = (upcomingForThis?.slots ?? []).filter((s) => {
    const d = new Date(s.scheduledAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  // Recent 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  const recentRuns = (routine?.runs ?? []).filter(
    (r) => new Date(r.scheduledAt) >= fourteenDaysAgo,
  );

  const handleDeactivate = () => {
    Alert.alert('비활성화', '이 루틴을 비활성화할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '비활성화',
        style: 'destructive',
        onPress: () => {
          deleteRoutine.mutate(id ?? '');
          router.back();
        },
      },
    ]);
  };

  const handleRun = (runId: string, status: RoutineRunStatus) => {
    recordRun.mutate({
      routineRunId: runId,
      status,
      completedAt: new Date().toISOString(),
    });
  };

  if (isLoading) {
    return (
      <Screen>
        <Text tone="muted">불러오는 중...</Text>
      </Screen>
    );
  }

  if (!routine) {
    return (
      <Screen>
        <Text tone="muted">루틴을 찾을 수 없습니다.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-1">
          <Heading level={2}>{routine.title}</Heading>
          <TouchableOpacity onPress={handleDeactivate} className="px-2 py-1">
            <Text size="sm" tone="muted">
              비활성화
            </Text>
          </TouchableOpacity>
        </View>

        {upcomingForThis && upcomingForThis.slots.length > 0 && (
          <Text size="sm" tone="muted" className="mb-3">
            다음 실행:{' '}
            {new Date(upcomingForThis.slots[0].scheduledAt).toLocaleString('ko-KR')}
          </Text>
        )}

        {/* Today's action buttons */}
        {todaySlots.length > 0 && (
          <Card tone="accent" className="mb-4">
            <Text size="sm" className="font-semibold mb-2">
              오늘 예정된 실행
            </Text>
            {todaySlots.map((slot) => (
              <View key={slot.runId} className="mb-2">
                <Text size="xs" tone="muted" className="mb-1">
                  {new Date(slot.scheduledAt).toLocaleTimeString('ko-KR')}
                </Text>
                <View className="flex-row gap-2">
                  {(['done', 'skipped', 'snoozed'] as RoutineRunStatus[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => handleRun(slot.runId, s)}
                      className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark"
                    >
                      <Text size="xs">{STATUS_LABEL[s]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Heatmap */}
        <View className="mb-4">
          <Text size="sm" className="font-semibold mb-2">
            지난 4주 히트맵
          </Text>
          <RoutineHeatmap runs={routine.runs} days={28} />
        </View>

        {/* Recent runs */}
        <View>
          <Text size="sm" className="font-semibold mb-2">
            최근 실행 (14일)
          </Text>
          {recentRuns.length === 0 && (
            <Text size="sm" tone="muted">
              기록 없음
            </Text>
          )}
          {recentRuns.map((run) => (
            <View key={run.id} className="flex-row justify-between py-1 border-b border-border-light dark:border-border-dark">
              <Text size="sm">
                {new Date(run.scheduledAt).toLocaleDateString('ko-KR')}
              </Text>
              <Text size="sm" tone="muted">
                {STATUS_LABEL[run.status] ?? run.status}
              </Text>
            </View>
          ))}
        </View>

        {/* Auto-applied banner */}
        {recentAutoApplied.length > 0 && (
          <Card tone="accent" className="mt-4">
            <Text size="sm" className="font-semibold">
              최근 7일 내 AI 조정 자동 적용됨 ({recentAutoApplied.length}건)
            </Text>
          </Card>
        )}

        {/* AI 조정 히스토리 아코디언 */}
        {routineProposals.length > 0 && (
          <View className="mt-4">
            <TouchableOpacity
              onPress={() => setHistoryOpen((v) => !v)}
              className="flex-row items-center justify-between py-2"
            >
              <Text size="sm" className="font-semibold">
                AI 조정 히스토리
              </Text>
              <Text size="sm" tone="muted">
                {historyOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {historyOpen && (
              <View className="mt-2">
                {routineProposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    onRevert={
                      p.appliedAt != null && p.revertedAt == null
                        ? (pid) => revertProposal.mutate(pid)
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
