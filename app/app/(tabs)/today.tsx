import { TouchableOpacity, View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { InboxQuickEntry } from '../../components/InboxQuickEntry';
import { ContextBadge } from '../../components/ContextBadge';
import { EntitlementGate } from '../../components/EntitlementGate';
import { AppBanner } from '../../lib/ads/banner';
import { useInbox, useStacks } from '../../lib/queries/stack';
import { useRecordRun } from '../../lib/queries/routine';
import { useTodayPlan, useGenerateTodayPlan, useReorderPlan, useUnlockPlan } from '../../lib/queries/plan';
import type { RoutineRunStatus } from '../../lib/api/routine';
import type { RankedItem } from '../../lib/api/plan';
import type { ContextLabel } from '../../lib/api/stack';

// 오늘 날짜 YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// gravity snapshot에서 rankedItems 추출
function getRankedItems(snapshot: unknown): RankedItem[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const s = snapshot as { output?: RankedItem[] };
  return s.output ?? [];
}

// 항목 타입 판별 (routineSlot runId 패턴: uuid-ISO)
function isRoutineItem(id: string): boolean {
  return id.includes('T') && id.includes(':');
}

export default function TodayScreen() {
  const router = useRouter();
  const { data: inboxData } = useInbox();
  const { data: stacks } = useStacks();
  const recordRun = useRecordRun();

  const date = todayStr();
  const { data: plan, isLoading } = useTodayPlan(date);
  const generatePlan = useGenerateTodayPlan();
  const reorderPlan = useReorderPlan();
  const unlockPlan = useUnlockPlan();

  const inboxCount = inboxData?.items?.length ?? 0;
  const stackCount = stacks?.length ?? 0;

  // 드래그 정렬용 로컬 상태 (서버 플랜이 업데이트되기 전 낙관적 표시)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const orderedIds: string[] = localOrder ?? plan?.orderedItemIds ?? [];
  const rankedMap = new Map<string, RankedItem>(
    getRankedItems(plan?.gravitySnapshot).map((r) => [r.id, r]),
  );

  // 기여 목표 수 합산
  const totalContributingGoals = new Set(
    getRankedItems(plan?.gravitySnapshot).flatMap((r) => r.contributingGoalIds),
  ).size;

  // HIGH/MED weight 목표 기여 표시용
  const gravityBannerText = plan
    ? `Gravity 정렬: ${orderedIds.length}개 항목 · ${totalContributingGoals}개 목표 기여`
    : 'Gravity 정렬 로딩 중...';

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const onRunAction = (runId: string, status: RoutineRunStatus) => {
    recordRun.mutate({ routineRunId: runId, status });
  };

  // 드래그 완료 → 서버에 저장 + 잠금
  const onDragEnd = useCallback(
    (newOrder: string[]) => {
      setLocalOrder(newOrder);
      reorderPlan.mutate(
        { date, orderedIds: newOrder },
        {
          onSuccess: () => setLocalOrder(null), // 서버 응답 후 로컬 상태 해제
        },
      );
    },
    [date, reorderPlan],
  );

  // 수동 순서 변경 (드래그 없이 버튼으로 이동)
  const moveItem = (fromIdx: number, toIdx: number) => {
    const newOrder = [...orderedIds];
    const [item] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, item);
    onDragEnd(newOrder);
  };

  const renderItem = (id: string, idx: number) => {
    const ranked = rankedMap.get(id);
    const isRoutine = isRoutineItem(id);

    // routineItem: id 패턴 routineId-ISO
    const parts = id.split('-');
    const displayTitle = isRoutine ? `루틴 슬롯` : `스택 액션`;

    // contextLabel 추출 (stack action이면 스택에서)
    let contextLabel: ContextLabel | undefined;
    if (!isRoutine && stacks) {
      for (const stack of stacks) {
        if (
          (stack as unknown as { nextActions?: { id: string }[] }).nextActions?.some(
            (a: { id: string }) => a.id === id,
          )
        ) {
          contextLabel = (stack as unknown as { contextLabel: ContextLabel }).contextLabel;
          break;
        }
      }
    }

    return (
      <View
        key={id}
        className="flex-row items-start py-2 border-b border-border-light dark:border-border-dark"
      >
        {/* 드래그 핸들 대체: 위/아래 버튼 */}
        <View className="mr-2 gap-1 justify-center">
          <TouchableOpacity
            onPress={() => idx > 0 && moveItem(idx, idx - 1)}
            disabled={idx === 0}
          >
            <Text size="xs" tone={idx === 0 ? 'muted' : 'primary'}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => idx < orderedIds.length - 1 && moveItem(idx, idx + 1)}
            disabled={idx === orderedIds.length - 1}
          >
            <Text size="xs" tone={idx === orderedIds.length - 1 ? 'muted' : 'primary'}>▼</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text size="sm" className="font-medium">{displayTitle}</Text>
            {contextLabel && <ContextBadge context={contextLabel} />}
            {isRoutine && (
              <View className="bg-orange-100 dark:bg-orange-900 rounded-full px-2 py-0.5">
                <Text size="xs">루틴</Text>
              </View>
            )}
          </View>

          {/* 기여 목표 칩 */}
          {ranked && ranked.contributingGoalIds.length > 0 && (
            <View className="flex-row gap-1 mt-0.5 flex-wrap">
              {ranked.contributingGoalIds.slice(0, 3).map((gid) => (
                <View key={gid} className="bg-primary-100 dark:bg-primary-900 rounded-full px-1.5 py-0.5">
                  <Text size="xs" tone="primary">목표</Text>
                </View>
              ))}
              <Text size="xs" tone="muted" className="ml-1">{ranked.rationale}</Text>
            </View>
          )}
        </View>

        {/* 루틴 액션 버튼 */}
        {isRoutine && (
          <View className="flex-row gap-2 ml-2">
            <TouchableOpacity onPress={() => onRunAction(id, 'done')}>
              <Text size="sm">✅</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onRunAction(id, 'skipped')}>
              <Text size="sm">⏸</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onRunAction(id, 'snoozed')}>
              <Text size="sm">💤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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

      <Text tone="muted" size="sm">{today}</Text>

      {/* Gravity 정렬 배너 */}
      <Card tone="accent">
        <Text size="xs" tone="primary" className="font-semibold">
          {gravityBannerText}
        </Text>
        {plan?.locked && (
          <Text size="xs" tone="muted">수동 정렬로 잠금됨</Text>
        )}
      </Card>

      {/* 오늘 플랜 카드 */}
      <Card>
        <View className="flex-row items-center justify-between mb-2">
          <Text size="base" className="font-semibold">
            오늘 (Gravity 정렬) {plan?.locked ? '🔒' : ''}
          </Text>
          <View className="flex-row gap-2">
            {plan?.locked && (
              <TouchableOpacity
                onPress={() => unlockPlan.mutate(date)}
                className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1"
              >
                <Text size="xs">잠금 해제</Text>
              </TouchableOpacity>
            )}
            {!plan?.locked && (
              <EntitlementGate
                feature="plan.generate"
                onGranted={() => generatePlan.mutate(date)}
                className="bg-primary-100 dark:bg-primary-900 rounded px-2 py-1"
              >
                <Text size="xs" tone="primary">
                  {generatePlan.isPending ? '정렬 중...' : '지금 다시 정렬'}
                </Text>
              </EntitlementGate>
            )}
          </View>
        </View>

        {isLoading ? (
          <Text size="sm" tone="muted">플랜 로딩 중...</Text>
        ) : orderedIds.length === 0 ? (
          <Text size="sm" tone="muted">오늘 예정된 항목이 없어요</Text>
        ) : (
          orderedIds.map((id, idx) => renderItem(id, idx))
        )}
      </Card>

      <InboxQuickEntry />
      <AppBanner placement="today_bottom" />
    </Screen>
  );
}
