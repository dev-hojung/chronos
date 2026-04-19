import { useEffect, useRef } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { RoutineCard } from '../../components/RoutineCard';
import { useRoutines, useDeleteRoutine, useUpcoming } from '../../lib/queries/routine';
import { scheduleRoutineNotifications } from '../../lib/notifications/routines';
import type { UpcomingRoutine } from '../../lib/api/routine';

export default function RoutinesScreen() {
  const router = useRouter();
  const { data: routines = [] } = useRoutines();
  const { data: upcoming = [] } = useUpcoming();
  const deleteRoutine = useDeleteRoutine();
  const scheduleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reschedule notifications when routines or upcoming changes
  useEffect(() => {
    if (scheduleDebounce.current) clearTimeout(scheduleDebounce.current);
    scheduleDebounce.current = setTimeout(() => {
      const map = new Map<string, UpcomingRoutine>(
        upcoming.map((u) => [u.routineId, u]),
      );
      scheduleRoutineNotifications(routines, map);
    }, 500);
    return () => {
      if (scheduleDebounce.current) clearTimeout(scheduleDebounce.current);
    };
  }, [routines, upcoming]);

  const upcomingMap = new Map<string, UpcomingRoutine>(
    upcoming.map((u) => [u.routineId, u]),
  );

  return (
    <Screen>
      <View className="flex-row items-center justify-between mb-2">
        <Heading level={1}>루틴</Heading>
        <TouchableOpacity
          onPress={() => router.push('/routines/new')}
          className="bg-primary-500 rounded-full px-3 py-1"
        >
          <Text size="sm" className="text-white font-semibold">
            +
          </Text>
        </TouchableOpacity>
      </View>

      {routines.length === 0 && (
        <Text tone="muted" size="sm">
          루틴이 없습니다. + 버튼으로 추가하세요.
        </Text>
      )}

      <FlatList
        data={routines.filter((r) => r.active)}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View className="mb-3">
            <RoutineCard
              routine={item}
              upcoming={upcomingMap.get(item.id)}
              onPress={() => router.push(`/routines/${item.id}`)}
              onDeactivate={() => deleteRoutine.mutate(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          routines.some((r) => !r.active) ? (
            <View className="mt-4">
              <Text size="sm" tone="muted" className="mb-2">
                비활성 루틴
              </Text>
              {routines
                .filter((r) => !r.active)
                .map((r) => (
                  <View key={r.id} className="mb-2 opacity-50">
                    <RoutineCard routine={r} onPress={() => router.push(`/routines/${r.id}`)} />
                  </View>
                ))}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
