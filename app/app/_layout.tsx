import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../components/ThemeProvider';
import { useAuthStore } from '../stores/authStore';
import { loadTokens } from '../lib/secureTokens';
import { apiFetch } from '../lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

export default function RootLayout() {
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    (async () => {
      const tokens = await loadTokens();
      if (tokens) {
        // Attach tokens first so /auth/me carries the Bearer header.
        useAuthStore.setState({ tokens });
        try {
          const res = await apiFetch<{ user: Parameters<typeof setAuth>[0] }>(
            '/auth/me',
          );
          setAuth(res.user, tokens);
        } catch {
          // Token invalid — leave auth cleared.
          useAuthStore.getState().clearAuth();
        }
      }
      setHydrated(true);
    })();
  }, [setAuth, setHydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
