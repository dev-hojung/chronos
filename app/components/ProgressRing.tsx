import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from './Text';

interface ProgressRingProps {
  ratio: number;        // 0..1
  size?: number;
  strokeWidth?: number;
  label?: string;       // 중앙에 표시할 텍스트
  sublabel?: string;
}

export function ProgressRing({
  ratio,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  // 원 둘레
  const circumference = 2 * Math.PI * r;
  // 진척만큼 stroke dash 오프셋 계산
  const offset = circumference * (1 - Math.min(1, Math.max(0, ratio)));
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* 배경 원 */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 진척 원 — 12시 방향부터 시작하도록 rotation=-90 */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#6366f1"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      {label !== undefined && (
        <View style={{ alignItems: 'center' }}>
          <Text size="base" className="font-bold">
            {label}
          </Text>
          {sublabel !== undefined && (
            <Text size="xs" tone="muted">
              {sublabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
