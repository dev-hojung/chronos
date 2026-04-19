import { FlatList, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Heading } from '../components/Heading';
import { Text } from '../components/Text';
import { InboxItemRow } from '../components/InboxItemRow';
import { useInbox, useDeleteInboxItem } from '../lib/queries/stack';

export default function InboxScreen() {
  const { data, isLoading } = useInbox();
  const deleteMutation = useDeleteInboxItem();

  const items = data?.items ?? [];

  return (
    <Screen>
      <Heading level={1}>Inbox</Heading>
      {isLoading ? (
        <Text tone="muted" size="sm">
          불러오는 중...
        </Text>
      ) : items.length === 0 ? (
        <Text tone="muted" size="sm">
          Inbox가 비어 있어요.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <InboxItemRow
              item={item}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
          ListFooterComponent={<View className="h-8" />}
        />
      )}
    </Screen>
  );
}
