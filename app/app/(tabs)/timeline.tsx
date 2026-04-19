import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';

export default function TimelineScreen() {
  return (
    <Screen>
      <Heading level={1}>Timeline</Heading>
      <Text tone="muted" size="sm">
        과거 audit log와 일자별 달성치, 그리고 자동실행 되돌리기 진입 지점입니다.
      </Text>

      <Card>
        <Text size="base" className="font-semibold">
          오늘 자동실행 (placeholder)
        </Text>
        <Text size="sm">06:00 — Goal-Gravity 재정렬 (3건 상승)</Text>
        <Text size="sm">09:12 — Context Stack 12→3 정리</Text>
      </Card>
    </Screen>
  );
}
