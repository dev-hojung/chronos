import { useState } from 'react';
import { Alert, FlatList, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Heading } from '../components/Heading';
import { Text } from '../components/Text';
import { InboxItemRow } from '../components/InboxItemRow';
import { EntitlementGate } from '../components/EntitlementGate';
import { useInbox, useDeleteInboxItem, useAutoBundleInbox, useUpdateInboxItem } from '../lib/queries/stack';
import type { ContextLabel } from '../lib/api/stack';

export default function InboxScreen() {
  const { data, isLoading } = useInbox();
  const deleteMutation = useDeleteInboxItem();
  const autoBundleMutation = useAutoBundleInbox();
  const updateLabelMutation = useUpdateInboxItem();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const items = data?.items ?? [];

  function handleAutoBundle() {
    autoBundleMutation.mutate(undefined, {
      onSuccess: (result) => {
        setToastMessage(`${result.stacksCreated}개 스택 생성됨`);
        setTimeout(() => setToastMessage(null), 3000);
      },
      onError: () => {
        Alert.alert('오류', '자동 묶기에 실패했습니다.');
      },
    });
  }

  function handleLabelChange(id: string, label: ContextLabel) {
    updateLabelMutation.mutate({ id, dto: { suggestedLabel: label } });
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between mb-2">
        <Heading level={1}>Inbox</Heading>
        <EntitlementGate
          feature="stack.autoBundle"
          onGranted={handleAutoBundle}
          className="px-3 py-1.5 bg-indigo-600 rounded-lg"
        >
          <Text size="sm" className="text-white">
            {autoBundleMutation.isPending ? '처리 중...' : '자동 묶기'}
          </Text>
        </EntitlementGate>
      </View>

      {toastMessage && (
        <View className="bg-gray-800 rounded-lg px-4 py-2 mb-3">
          <Text size="sm" className="text-white">
            {toastMessage}
          </Text>
        </View>
      )}

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
              onLabelChange={handleLabelChange}
            />
          )}
          ListFooterComponent={<View className="h-8" />}
        />
      )}
    </Screen>
  );
}
