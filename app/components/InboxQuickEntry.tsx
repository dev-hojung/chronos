import { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { useCreateInboxItem } from '../lib/queries/stack';

interface Props {
  onSuccess?: () => void;
}

export function InboxQuickEntry({ onSuccess }: Props) {
  const [text, setText] = useState('');
  const mutation = useCreateInboxItem();

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutation.mutate(
      { rawText: trimmed },
      {
        onSuccess: () => {
          setText('');
          onSuccess?.();
        },
      },
    );
  };

  return (
    <View className="flex-row items-center gap-2 mt-4 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-sm">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Inbox에 추가..."
        placeholderTextColor="#9ca3af"
        returnKeyType="send"
        onSubmitEditing={submit}
        blurOnSubmit={false}
        className="flex-1 text-sm text-gray-900 dark:text-gray-100 py-1"
        editable={!mutation.isPending}
      />
      {/* Voice placeholder — W4 TODO: integrate expo-av recording */}
      <TouchableOpacity
        className="px-2 py-1"
        onPress={() => {/* TODO W4: voice recording */}}
      >
        <Text size="base">🎤</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={submit}
        disabled={mutation.isPending || !text.trim()}
        className="bg-blue-500 rounded-lg px-3 py-1.5"
      >
        <Text size="sm" className="text-white font-semibold">
          {mutation.isPending ? '...' : '추가'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
