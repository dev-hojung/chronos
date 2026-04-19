import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { InboxQuickEntry } from '../../components/InboxQuickEntry';
import { useInbox, useStacks } from '../../lib/queries/stack';
import { useUpcoming, useRecordRun } from '../../lib/queries/routine';
import type { RoutineRunStatus } from '../../lib/api/routine';

export default function TodayScreen() {
  const router = useRouter();
  const { data: inboxData } = useInbox();
  const { data: stacks } = useStacks();
  const { data: upcoming } = useUpcoming();
  const recordRun = useRecordRun();
  const inboxCount = inboxData?.items?.length ?? 0;
  const stackCount = stacks?.length ?? 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySlots = (upcoming ?? []).flatMap((r) =>
    r.slots
      .filter((s) => s.scheduledAt.slice(0, 10) === todayStr)
      .map((s) => ({ ...s, routineId: r.routineId, title: r.title })),
  );

  const onRunAction = (runId: string, status: RoutineRunStatus) => {
    recordRun.mutate({ routineRunId: runId, status });
  };

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  return (
    <Screen>
      <View className="flex-row items-center justify-between mb-1">
        <Heading level={1}>오늘</Heading>
        <TouchableOpacity
          onPress={() => router.push('/inbox')}
          className="flex-row gap-2"
        >
          <View className="bg-blue-100 dark:bg-blue-900 rounded-full px-2 py-0.5">
            <Text size="xs" className="font-medium">Inbox {inboxCount}</Text>
          </View>
          <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5 ml-1">
            <Text size="xs" className="font-medium" onPress={() => router.push('/stacks')}>
              Stacks {stackCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text tone="muted" size="sm">
        {today}
      </Text>

      <Card tone="accent">
        <Text size="xs" tone="primary" className="font-semibold">
          AI 보고 배너 (placeholder)
        </Text>
        <Text size="sm">AI가 Inbox 12개를 3개 스택으로 정리했어요 · 되돌리기</Text>
      </Card>

      <Card>
        <Text size="base" className="font-semibold">오늘의 루틴</Text>
        {todaySlots.length === 0 ? (
          <Text size="sm" tone="muted">예정된 루틴이 없어요</Text>
        ) : (
          todaySlots.map((s) => {
            const time = new Date(s.scheduledAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <View
                key={s.runId}
                className="flex-row items-center justify-between py-1"
              >
                <Text size="sm">{time}  {s.title}</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => onRunAction(s.runId, 'done')}>
                    <Text size="sm">✅</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRunAction(s.runId, 'skipped')}>
                    <Text size="sm">⏸</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRunAction(s.runId, 'snoozed')}>
                    <Text size="sm">💤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <InboxQuickEntry />
    </Screen>
  );
}
