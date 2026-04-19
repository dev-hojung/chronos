import { useState } from 'react';
import { Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import type { InboxItem, ContextLabel } from '../lib/api/stack';

const LABEL_COLORS: Record<ContextLabel, string> = {
  WORK: 'bg-blue-100 text-blue-700',
  PERSONAL: 'bg-green-100 text-green-700',
  RESEARCH: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-orange-100 text-orange-700',
};

const ALL_LABELS: ContextLabel[] = ['WORK', 'PERSONAL', 'RESEARCH', 'ADMIN'];

interface Props {
  item: InboxItem;
  onDelete?: (id: string) => void;
  onLabelChange?: (id: string, label: ContextLabel) => void;
}

export function InboxItemRow({ item, onDelete, onLabelChange }: Props) {
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
      <View className="flex-1 mr-2">
        <Text size="sm">{item.rawText}</Text>
        {item.suggestedLabel && (
          <TouchableOpacity
            onPress={() => setShowLabelPicker(true)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            className="self-start mt-1"
          >
            <View className={`px-2 py-0.5 rounded-full ${LABEL_COLORS[item.suggestedLabel].split(' ')[0]}`}>
              <Text size="sm" className={LABEL_COLORS[item.suggestedLabel].split(' ')[1]}>
                {item.suggestedLabel}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

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

      <Modal
        visible={showLabelPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLabelPicker(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setShowLabelPicker(false)}
        >
          <View className="bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-8">
            <Text size="sm" tone="muted" className="text-center mb-3">
              라벨 선택
            </Text>
            {ALL_LABELS.map((label) => (
              <TouchableOpacity
                key={label}
                onPress={() => {
                  onLabelChange?.(item.id, label);
                  setShowLabelPicker(false);
                }}
                className="py-3 border-b border-gray-100 dark:border-gray-800"
              >
                <Text size="sm" className={label === item.suggestedLabel ? 'font-bold' : ''}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
