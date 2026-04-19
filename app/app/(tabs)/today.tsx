import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { InboxQuickEntry } from '../../components/InboxQuickEntry';
import { useInbox, useStacks } from '../../lib/queries/stack';

export default function TodayScreen() {
  const router = useRouter();
  const { data: inboxData } = useInbox();
  const { data: stacks } = useStacks();
  const inboxCount = inboxData?.items?.length ?? 0;
  const stackCount = stacks?.length ?? 0;

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
        <Text size="base" className="font-semibold">
          오늘의 우선 할일
        </Text>
        <Text size="sm">• 김 PM 피드백 반영  🎯 감량</Text>
        <Text size="sm">• 스트레칭 7:30 (AI 조정)</Text>
        <Text size="sm">○ 저녁 샐러드 기록</Text>
      </Card>

      <InboxQuickEntry />
    </Screen>
  );
}
