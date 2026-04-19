import { Pressable, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore, type ThemePreference } from '../../stores/themeStore';
import { useNotificationStore, type NotificationPrefs } from '../../stores/notificationStore';
import { clearTokens } from '../../lib/secureTokens';
import { registerPushToken } from '../../lib/api/plan';
import { registerExpoPushToken } from '../../lib/notifications/push';

const THEME_OPTIONS: ThemePreference[] = ['auto', 'light', 'dark'];

const NOTIFICATION_LABELS: Record<keyof NotificationPrefs, string> = {
  routine_reminder: '루틴 리마인더',
  gravity_daily_push: 'Gravity 일일 푸시',
  goal_progress_push: 'Goal 진척 21시 푸시',
};

export default function MeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const prefs = useNotificationStore((s) => s.prefs);
  const setPref = useNotificationStore((s) => s.setPref);

  const signOut = async () => {
    await clearTokens();
    clearAuth();
    router.replace('/(auth)/sign-in');
  };

  // 토글 변경 → 서버에 저장 + 필요시 push token 등록
  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    setPref(key, value);
    const newPrefs = { ...prefs, [key]: value };

    try {
      // 옵트인 시 push token 등록 시도
      if (value && (key === 'gravity_daily_push' || key === 'goal_progress_push')) {
        await registerExpoPushToken(newPrefs);
      } else {
        // 프리퍼런스만 서버에 저장
        await registerPushToken('', newPrefs);
      }
    } catch {
      // 서버 저장 실패는 로컬 상태 유지
    }
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

      {/* 알림 설정 */}
      <Card>
        <Text size="base" className="font-semibold mb-2">
          알림 설정
        </Text>
        {(Object.keys(NOTIFICATION_LABELS) as (keyof NotificationPrefs)[]).map((key) => (
          <View
            key={key}
            className="flex-row items-center justify-between py-2 border-b border-border-light dark:border-border-dark last:border-b-0"
          >
            <Text size="sm">{NOTIFICATION_LABELS[key]}</Text>
            <Switch
              value={prefs[key]}
              onValueChange={(value) => handleToggle(key, value)}
            />
          </View>
        ))}
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
