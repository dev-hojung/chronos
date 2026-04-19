import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // no-op: hydration happens in root layout
  }, []);

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceAlt-light dark:bg-surface-dark">
        <ActivityIndicator />
      </View>
    );
  }

  return user ? (
    <Redirect href="/(tabs)/today" />
  ) : (
    <Redirect href="/(auth)/sign-in" />
  );
}
