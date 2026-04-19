import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import type { InboxItem } from '../lib/api/stack';

interface Props {
  item: InboxItem;
  onDelete?: (id: string) => void;
}

export function InboxItemRow({ item, onDelete }: Props) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
      <Text size="sm" className="flex-1 mr-2">
        {item.rawText}
      </Text>
      {onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="px-2"
        >
          <Text size="sm" tone="muted">
            ✕
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
