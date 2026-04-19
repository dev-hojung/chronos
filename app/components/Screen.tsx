import { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  scroll?: boolean;
}

export function Screen({ children, scroll = true }: PropsWithChildren<ScreenProps>) {
  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-surfaceAlt-light dark:bg-surface-dark"
    >
      {scroll ? (
        <ScrollView contentContainerClassName="p-4 gap-4">
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 p-4 gap-4">{children}</View>
      )}
    </SafeAreaView>
  );
}
