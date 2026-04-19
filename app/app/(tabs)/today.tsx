import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';

export default function TodayScreen() {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  return (
    <Screen>
      <Heading level={1}>오늘</Heading>
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
    </Screen>
  );
}
