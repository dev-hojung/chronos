import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { WeekdayPicker, buildCron, PRESETS } from '../../components/WeekdayPicker';
import { useCreateRoutine } from '../../lib/queries/routine';
import { requestNotificationPermissions } from '../../lib/notifications/routines';

const PRESET_LABELS = [
  { label: '매일', days: PRESETS.everyday },
  { label: '평일', days: PRESETS.weekdays },
  { label: '주말', days: PRESETS.weekend },
  { label: '사용자 정의', days: null as number[] | null },
];

export default function NewRoutineScreen() {
  const router = useRouter();
  const createRoutine = useCreateRoutine();

  const [title, setTitle] = useState('');
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [durationMin, setDurationMin] = useState(30);
  const [presetIdx, setPresetIdx] = useState(0);
  const [customDays, setCustomDays] = useState<number[]>([]);

  const selectedDays =
    PRESET_LABELS[presetIdx]?.days ?? customDays;

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('제목을 입력해주세요');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('반복 요일을 선택해주세요');
      return;
    }

    const scheduleCron = buildCron(selectedDays, hour, minute);

    try {
      await createRoutine.mutateAsync({
        title: title.trim(),
        scheduleCron,
        durationMin,
        active: true,
      });
      // Request permissions after first creation
      await requestNotificationPermissions();
      router.back();
    } catch (err) {
      Alert.alert('저장 실패', String(err));
    }
  };

  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Heading level={2}>새 루틴</Heading>

        {/* Title */}
        <View className="mt-4 mb-3">
          <Text size="sm" tone="muted" className="mb-1">
            제목
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="루틴 이름"
            className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-base"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Time picker — simple +/- buttons (no native picker dependency needed) */}
        <View className="mb-3">
          <Text size="sm" tone="muted" className="mb-1">
            시간
          </Text>
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setHour((h) => (h - 1 + 24) % 24)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Text>−</Text>
              </TouchableOpacity>
              <Text size="lg" className="w-10 text-center">
                {String(hour).padStart(2, '0')}
              </Text>
              <TouchableOpacity
                onPress={() => setHour((h) => (h + 1) % 24)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Text>+</Text>
              </TouchableOpacity>
            </View>
            <Text size="lg">:</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setMinute((m) => (m - 5 + 60) % 60)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Text>−</Text>
              </TouchableOpacity>
              <Text size="lg" className="w-10 text-center">
                {String(minute).padStart(2, '0')}
              </Text>
              <TouchableOpacity
                onPress={() => setMinute((m) => (m + 5) % 60)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Text>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text size="xs" tone="muted" className="mt-1">
            선택된 시간: {timeLabel}
          </Text>
        </View>

        {/* Repeat preset */}
        <View className="mb-3">
          <Text size="sm" tone="muted" className="mb-1">
            반복
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            {PRESET_LABELS.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setPresetIdx(idx)}
                className={`px-3 py-1 rounded-full border ${
                  presetIdx === idx
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-border-light dark:border-border-dark'
                }`}
              >
                <Text size="sm" className={presetIdx === idx ? 'text-white' : ''}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {presetIdx === 3 && (
            <View className="mt-2">
              <WeekdayPicker selected={customDays} onChange={setCustomDays} />
            </View>
          )}
        </View>

        {/* Duration */}
        <View className="mb-6">
          <Text size="sm" tone="muted" className="mb-1">
            소요시간 (분)
          </Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setDurationMin((d) => Math.max(1, d - 5))}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
            >
              <Text>−</Text>
            </TouchableOpacity>
            <Text size="base" className="w-12 text-center">
              {durationMin}분
            </Text>
            <TouchableOpacity
              onPress={() => setDurationMin((d) => d + 5)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
            >
              <Text>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={createRoutine.isPending}
          className="bg-primary-500 rounded-xl py-3 items-center"
        >
          <Text className="text-white font-semibold">
            {createRoutine.isPending ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
