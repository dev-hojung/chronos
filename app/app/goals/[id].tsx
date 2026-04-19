import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { ProgressRing } from '../../components/ProgressRing';
import { ContributionRow } from '../../components/ContributionRow';
import { WeightBadge } from '../../components/WeightBadge';
import { LinkedRoutinePicker } from '../../components/LinkedRoutinePicker';
import {
  useGoal,
  useArchiveGoal,
  useAddContribution,
  useUpdateGoal,
} from '../../lib/queries/goal';
import { useRoutines } from '../../lib/queries/routine';
import { useContributions } from '../../lib/queries/goal';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: goal } = useGoal(id ?? '');
  const archiveGoal = useArchiveGoal();
  const addContribution = useAddContribution();
  const updateGoal = useUpdateGoal();
  const { data: routines = [] } = useRoutines();

  // 30일 기여 목록
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: contributions = [] } = useContributions({
    goalId: id ?? '',
    from: thirtyDaysAgo,
  });

  const [showContribModal, setShowContribModal] = useState(false);
  const [deltaInput, setDeltaInput] = useState('1');
  const [noteInput, setNoteInput] = useState('');

  const [showRoutineEdit, setShowRoutineEdit] = useState(false);
  const [linkedIds, setLinkedIds] = useState<string[]>(goal?.linkedRoutineIds ?? []);

  if (!goal) {
    return (
      <Screen>
        <Text tone="muted">로딩 중...</Text>
      </Screen>
    );
  }

  const progress = goal.progress;
  const pct = Math.round(progress.progressRatio * 100);
  const ringLabel = goal.unit
    ? `${goal.currentValue}${goal.unit}`
    : `${Math.round(goal.currentValue)}`;
  const ringSubLabel = goal.unit
    ? `/ ${goal.targetValue}${goal.unit}`
    : `/ ${goal.targetValue}`;

  async function handleAddContribution() {
    const delta = parseFloat(deltaInput);
    if (isNaN(delta)) {
      Alert.alert('올바른 숫자를 입력해주세요');
      return;
    }
    try {
      await addContribution.mutateAsync({
        goalId: id!,
        body: { sourceType: 'MANUAL', deltaValue: delta, note: noteInput || undefined },
      });
      setDeltaInput('1');
      setNoteInput('');
      setShowContribModal(false);
    } catch (err) {
      Alert.alert('추가 실패', String(err));
    }
  }

  async function handleSaveLinkedRoutines() {
    try {
      await updateGoal.mutateAsync({ id: id!, body: { linkedRoutineIds: linkedIds } });
      setShowRoutineEdit(false);
    } catch (err) {
      Alert.alert('저장 실패', String(err));
    }
  }

  async function handleArchive() {
    Alert.alert('목표 보관', '이 목표를 보관하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '보관',
        style: 'destructive',
        onPress: async () => {
          await archiveGoal.mutateAsync(id!);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-2">
            <Heading level={2}>{goal.title}</Heading>
            <View className="flex-row items-center gap-2 mt-1">
              <WeightBadge weight={goal.weight} />
              <Text size="xs" tone="muted">D-{progress.daysRemaining}일 남음</Text>
            </View>
          </View>
        </View>

        {/* 원형 진척 게이지 */}
        <View className="items-center mb-6">
          <ProgressRing
            ratio={progress.progressRatio}
            size={140}
            strokeWidth={12}
            label={ringLabel}
            sublabel={ringSubLabel}
          />
          <Text size="base" className="mt-2 font-semibold">{pct}% 달성</Text>
          <Text size="sm" tone="muted">
            일 페이스: {progress.paceRequired.toFixed(1)}{goal.unit ?? ''}/일 필요
          </Text>
        </View>

        {/* 이번 주 기여 */}
        <Card className="mb-4">
          <Text size="sm" className="font-semibold mb-2">이번 주 기여</Text>
          <View className="flex-row gap-4">
            <View>
              <Text size="xs" tone="muted">7일</Text>
              <Text size="base" className="font-bold text-primary-600 dark:text-primary-300">
                +{progress.last7DaysContribution}
              </Text>
            </View>
            <View>
              <Text size="xs" tone="muted">30일</Text>
              <Text size="base" className="font-bold">
                +{progress.last30DaysContribution}
              </Text>
            </View>
          </View>

          {/* 기여 분포 (sourceType별 간단 텍스트) */}
          <View className="flex-row gap-3 mt-2">
            {Object.entries(progress.contributorBreakdown).map(([type, val]) =>
              val > 0 ? (
                <Text key={type} size="xs" tone="muted">
                  {type === 'ROUTINE' ? '루틴' : type === 'MANUAL' ? '수동' : '스택'}: {val}
                </Text>
              ) : null,
            )}
          </View>
        </Card>

        {/* 기여 추가 버튼 */}
        {goal.status === 'ACTIVE' && (
          <TouchableOpacity
            onPress={() => setShowContribModal(true)}
            className="bg-primary-500 rounded-xl py-3 items-center mb-4"
          >
            <Text className="text-white font-semibold">기여 추가</Text>
          </TouchableOpacity>
        )}

        {/* 연결된 루틴 */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text size="sm" className="font-semibold">연결된 루틴</Text>
            <TouchableOpacity onPress={() => { setLinkedIds(goal.linkedRoutineIds); setShowRoutineEdit(true); }}>
              <Text size="xs" tone="primary">편집</Text>
            </TouchableOpacity>
          </View>
          {goal.linkedRoutineIds.length === 0 ? (
            <Text size="sm" tone="muted">연결된 루틴 없음</Text>
          ) : (
            goal.linkedRoutineIds.map((rid) => {
              const r = routines.find((rt) => rt.id === rid);
              return (
                <Text key={rid} size="sm">
                  {r ? r.title : rid}
                </Text>
              );
            })
          )}
        </Card>

        {/* 히스토리 */}
        <Card className="mb-4">
          <Text size="sm" className="font-semibold mb-2">30일 히스토리</Text>
          {contributions.length === 0 ? (
            <Text size="sm" tone="muted">기여 없음</Text>
          ) : (
            contributions.map((c) => <ContributionRow key={c.id} contribution={c} />)
          )}
        </Card>

        {/* 보관 버튼 */}
        {goal.status === 'ACTIVE' && (
          <TouchableOpacity
            onPress={handleArchive}
            className="border border-border-light dark:border-border-dark rounded-xl py-3 items-center mb-8"
          >
            <Text tone="muted">목표 보관</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 기여 추가 모달 */}
      <Modal
        visible={showContribModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContribModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-surface-light dark:bg-surface-dark rounded-t-2xl p-6">
            <Text size="base" className="font-semibold mb-4">기여 추가</Text>
            <Text size="sm" tone="muted" className="mb-1">기여값</Text>
            <TextInput
              value={deltaInput}
              onChangeText={setDeltaInput}
              keyboardType="numeric"
              className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 mb-3 text-base"
              placeholderTextColor="#9ca3af"
            />
            <Text size="sm" tone="muted" className="mb-1">메모 (선택)</Text>
            <TextInput
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="메모를 입력하세요"
              className="border border-border-light dark:border-border-dark rounded-lg px-3 py-2 mb-4 text-base"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              onPress={handleAddContribution}
              disabled={addContribution.isPending}
              className="bg-primary-500 rounded-xl py-3 items-center mb-2"
            >
              <Text className="text-white font-semibold">
                {addContribution.isPending ? '추가 중...' : '추가'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowContribModal(false)}
              className="py-3 items-center"
            >
              <Text tone="muted">취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 연결 루틴 편집 모달 */}
      <Modal
        visible={showRoutineEdit}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoutineEdit(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-surface-light dark:bg-surface-dark rounded-t-2xl p-6">
            <Text size="base" className="font-semibold mb-4">연결 루틴 편집</Text>
            <LinkedRoutinePicker
              routines={routines.filter((r) => r.active)}
              selected={linkedIds}
              onChange={setLinkedIds}
            />
            <TouchableOpacity
              onPress={handleSaveLinkedRoutines}
              disabled={updateGoal.isPending}
              className="bg-primary-500 rounded-xl py-3 items-center mt-4 mb-2"
            >
              <Text className="text-white font-semibold">
                {updateGoal.isPending ? '저장 중...' : '저장'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRoutineEdit(false)}
              className="py-3 items-center"
            >
              <Text tone="muted">취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
