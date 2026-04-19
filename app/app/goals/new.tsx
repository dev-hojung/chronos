import { useState } from 'react';
import {
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { LinkedRoutinePicker } from '../../components/LinkedRoutinePicker';
import { useCreateGoal } from '../../lib/queries/goal';
import { useRoutines } from '../../lib/queries/routine';
import type { GoalWeight, GoalDirection, GoalMetricType } from '../../lib/api/goal';

const WEIGHT_OPTIONS: { label: string; value: GoalWeight }[] = [
  { label: '낮음', value: 'LOW' },
  { label: '보통', value: 'MED' },
  { label: '높음', value: 'HIGH' },
];

const DIRECTION_OPTIONS: { label: string; value: GoalDirection }[] = [
  { label: '증가 (UP)', value: 'UP' },
  { label: '감소 (DOWN)', value: 'DOWN' },
];

export default function NewGoalScreen() {
  const router = useRouter();
  const createGoal = useCreateGoal();
  const { data: routines = [] } = useRoutines();

  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [unit, setUnit] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [weight, setWeight] = useState<GoalWeight>('MED');
  const [direction, setDirection] = useState<GoalDirection>('UP');
  const [linkedRoutineIds, setLinkedRoutineIds] = useState<string[]>([]);

  const metricType: GoalMetricType = 'NUMERIC';

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('제목을 입력해주세요');
      return;
    }
    const target = parseFloat(targetValue);
    if (isNaN(target) || target <= 0) {
      Alert.alert('목표값을 올바르게 입력해주세요');
      return;
    }
    try {
      await createGoal.mutateAsync({
        title: title.trim(),
        horizonDays,
        weight,
        metricType,
        targetValue: target,
        currentValue: parseFloat(currentValue) || 0,
        unit: unit.trim() || undefined,
        direction,
        linkedRoutineIds,
      });
      router.back();
    } catch (err) {
      Alert.alert('저장 실패', String(err));
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Heading level={2}>새 목표</Heading>

        {/* 제목 */}
        <View className="mt-4 mb-3">
          <Text size="sm" tone="muted" className="mb-1">제목</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="목표 이름"
            className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-base"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* 목표값 / 현재값 / 단위 */}
        <View className="mb-3 flex-row gap-2">
          <View className="flex-1">
            <Text size="sm" tone="muted" className="mb-1">목표값</Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="100"
              keyboardType="numeric"
              className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-base"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View className="flex-1">
            <Text size="sm" tone="muted" className="mb-1">현재값</Text>
            <TextInput
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="0"
              keyboardType="numeric"
              className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-base"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View className="w-20">
            <Text size="sm" tone="muted" className="mb-1">단위</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="kg"
              className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-base"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* 기간 (horizonDays) */}
        <View className="mb-3">
          <Text size="sm" tone="muted" className="mb-1">기간 (일)</Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setHorizonDays((d) => Math.max(1, d - 7))}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
            >
              <Text>−</Text>
            </TouchableOpacity>
            <Text size="base" className="w-16 text-center">{horizonDays}일</Text>
            <TouchableOpacity
              onPress={() => setHorizonDays((d) => d + 7)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
            >
              <Text>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 중요도 (weight) */}
        <View className="mb-3">
          <Text size="sm" tone="muted" className="mb-1">중요도</Text>
          <View className="flex-row gap-2">
            {WEIGHT_OPTIONS.map((w) => (
              <TouchableOpacity
                key={w.value}
                onPress={() => setWeight(w.value)}
                className={`flex-1 py-2 rounded-lg border items-center ${
                  weight === w.value
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-border-light dark:border-border-dark'
                }`}
              >
                <Text size="sm" className={weight === w.value ? 'text-white' : ''}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 방향 (direction) */}
        <View className="mb-3">
          <Text size="sm" tone="muted" className="mb-1">방향</Text>
          <View className="flex-row gap-2">
            {DIRECTION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                onPress={() => setDirection(d.value)}
                className={`flex-1 py-2 rounded-lg border items-center ${
                  direction === d.value
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-border-light dark:border-border-dark'
                }`}
              >
                <Text size="sm" className={direction === d.value ? 'text-white' : ''}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 연결된 루틴 */}
        <View className="mb-6">
          <Text size="sm" tone="muted" className="mb-1">연결된 루틴 (루틴 완료 시 자동 +1)</Text>
          <LinkedRoutinePicker
            routines={routines.filter((r) => r.active)}
            selected={linkedRoutineIds}
            onChange={setLinkedRoutineIds}
          />
        </View>

        {/* 저장 */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={createGoal.isPending}
          className="bg-primary-500 rounded-xl py-3 items-center"
        >
          <Text className="text-white font-semibold">
            {createGoal.isPending ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
