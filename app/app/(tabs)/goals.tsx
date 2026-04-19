import { FlatList, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { GoalCard } from '../../components/GoalCard';
import { useGoals, useArchiveGoal } from '../../lib/queries/goal';

export default function GoalsScreen() {
  const router = useRouter();
  const { data: goals = [] } = useGoals(false);
  const archiveGoal = useArchiveGoal();

  const active = goals.filter((g) => g.status === 'ACTIVE');
  const completed = goals.filter((g) => g.status === 'COMPLETED');

  return (
    <Screen>
      <View className="flex-row items-center justify-between mb-2">
        <Heading level={1}>목표</Heading>
        <TouchableOpacity
          onPress={() => router.push('/goals/new')}
          className="bg-primary-500 rounded-full px-3 py-1"
        >
          <Text size="sm" className="text-white font-semibold">
            +
          </Text>
        </TouchableOpacity>
      </View>

      {active.length === 0 && (
        <Text tone="muted" size="sm">
          활성 목표가 없습니다. + 버튼으로 추가하세요.
        </Text>
      )}

      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View className="mb-3">
            <GoalCard
              goal={item}
              onPress={() => router.push(`/goals/${item.id}`)}
              onArchive={() => archiveGoal.mutate(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          completed.length > 0 ? (
            <View className="mt-4">
              <Text size="sm" tone="muted" className="mb-2">
                완료된 목표
              </Text>
              {completed.map((g) => (
                <View key={g.id} className="mb-2 opacity-60">
                  <GoalCard
                    goal={g}
                    onPress={() => router.push(`/goals/${g.id}`)}
                  />
                </View>
              ))}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
