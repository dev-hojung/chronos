import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { StackCard } from '../../components/StackCard';
import { useStacks } from '../../lib/queries/stack';

export default function StacksScreen() {
  const { data: stacks, isLoading } = useStacks();
  const router = useRouter();

  return (
    <Screen>
      <Heading level={1}>스택</Heading>
      {isLoading ? (
        <Text tone="muted" size="sm">
          불러오는 중...
        </Text>
      ) : !stacks?.length ? (
        <Text tone="muted" size="sm">
          아직 스택이 없어요.
        </Text>
      ) : (
        <FlatList
          data={stacks}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <StackCard
              stack={item}
              onPress={(id) => router.push(`/stacks/${id}`)}
            />
          )}
          ListFooterComponent={<View className="h-8" />}
        />
      )}
    </Screen>
  );
}
