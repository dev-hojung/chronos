import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';

export default function RoutinesScreen() {
  return (
    <Screen>
      <Heading level={1}>Routines</Heading>
      <Text tone="muted" size="sm">
        Living Routines — 자가진화 루틴과 AI 조정 히스토리가 여기 표시됩니다.
      </Text>

      <Card>
        <Text size="base" className="font-semibold">
          아침 스트레칭
        </Text>
        <Text size="sm">평일 07:30 · 10분 · 이번 주 91%</Text>
      </Card>
      <Card>
        <Text size="base" className="font-semibold">
          주간 리뷰
        </Text>
        <Text size="sm">일요일 20:00 · 30분 · 이번 주 100%</Text>
      </Card>
    </Screen>
  );
}
