import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore, type ThemePreference } from '../../stores/themeStore';
import { clearTokens } from '../../lib/secureTokens';

const THEME_OPTIONS: ThemePreference[] = ['auto', 'light', 'dark'];

export default function MeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const signOut = async () => {
    await clearTokens();
    clearAuth();
    router.replace('/(auth)/sign-in');
  };

  return (
    <Screen>
      <Heading level={1}>Me</Heading>
      <Card>
        <Text size="base" className="font-semibold">
          계정
        </Text>
        <Text size="sm" tone="muted">
          {user?.email ?? '이메일 비공개'}
        </Text>
        <Text size="sm" tone="muted">
          구독: {user?.subscriptionTier ?? 'FREE'}
        </Text>
      </Card>

      <Card>
        <Text size="base" className="font-semibold">
          테마
        </Text>
        <View className="flex-row gap-2 mt-2">
          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setPreference(opt)}
                className={`flex-1 h-10 rounded-md items-center justify-center border ${
                  active
                    ? 'bg-primary-500 border-primary-600'
                    : 'bg-surface-light dark:bg-surfaceAlt-dark border-border-light dark:border-border-dark'
                }`}
              >
                <Text
                  size="sm"
                  className={
                    active ? 'text-white font-semibold' : 'font-medium'
                  }
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Pressable
        onPress={signOut}
        className="h-12 rounded-md bg-danger items-center justify-center"
      >
        <Text className="text-white font-semibold">로그아웃</Text>
      </Pressable>
    </Screen>
  );
}
