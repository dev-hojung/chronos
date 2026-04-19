import { Tabs } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

export default function TabsLayout() {
  const { tokens, scheme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
        },
        headerStyle: { backgroundColor: tokens.surface },
        headerTitleStyle: { fontWeight: '600', color: tokens.text },
        headerTintColor: tokens.text,
        headerShadowVisible: false,
        sceneStyle: {
          backgroundColor: scheme === 'dark' ? tokens.surface : tokens.surfaceAlt,
        },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
      <Tabs.Screen name="routines" options={{ title: 'Routines' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
