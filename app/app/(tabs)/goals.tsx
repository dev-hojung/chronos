import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';

export default function GoalsScreen() {
  return (
    <Screen>
      <Heading level={1}>Goals</Heading>
      <Text tone="muted" size="sm">
        Goal-Gravity — 장기 목표가 오늘의 우선순위에 중력을 행사합니다.
      </Text>

      <Card>
        <Text size="base" className="font-semibold">
          6월까지 10kg 감량
        </Text>
        <Text size="sm" tone="muted">
          Horizon 60일 · Weight High · 진척 24%
        </Text>
      </Card>
    </Screen>
  );
}
