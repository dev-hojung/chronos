import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { ContextBadge } from '../../components/ContextBadge';
import { InboxItemRow } from '../../components/InboxItemRow';
import { useStack, useRemoveStackItem } from '../../lib/queries/stack';

export default function StackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: stack, isLoading } = useStack(id ?? '');
  const removeMutation = useRemoveStackItem();

  if (isLoading || !stack) {
    return (
      <Screen>
        <Text tone="muted" size="sm">
          {isLoading ? '불러오는 중...' : '스택을 찾을 수 없어요.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row items-center gap-2 mb-1">
        <Heading level={1}>{stack.title}</Heading>
        <ContextBadge context={stack.contextLabel} />
      </View>
      {stack.summary ? (
        <Text tone="muted" size="sm" className="mb-3">
          {stack.summary}
        </Text>
      ) : null}

      {stack.nextActions.length > 0 && (
        <Card tone="accent">
          <Text size="xs" tone="primary" className="font-semibold mb-1">
            다음 할일
          </Text>
          {stack.nextActions.map((a) => (
            <Text key={a.id} size="sm">
              • {a.actionText}
            </Text>
          ))}
        </Card>
      )}

      <Heading level={2}>항목</Heading>
      <FlatList
        data={stack.items}
        keyExtractor={(i) => i.inboxItemId}
        renderItem={({ item }) => (
          <InboxItemRow
            item={item.inboxItem}
            onDelete={(itemId) =>
              removeMutation.mutate({ stackId: stack.id, itemId })
            }
          />
        )}
        ListEmptyComponent={
          <Text tone="muted" size="sm">
            항목이 없어요.
          </Text>
        }
        ListFooterComponent={<View className="h-8" />}
      />
    </Screen>
  );
}
