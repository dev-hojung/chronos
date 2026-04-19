import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { ThemeProvider } from '../components/ThemeProvider';
import { useAuthStore } from '../stores/authStore';
import { loadTokens } from '../lib/secureTokens';
import { apiFetch } from '../lib/api';
import { createInboxItem } from '../lib/api/stack';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      // chronos://share?text=...
      if (parsed.hostname === 'share' && typeof parsed.queryParams?.text === 'string') {
        const text = parsed.queryParams.text;
        try {
          await createInboxItem(text, 'SHARE');
        } catch {
          // ignore — item will be retried on next open
        }
        router.replace('/(tabs)/today');
      }
    };

    // Handle URL that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [router]);

  return null;
}

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
          <DeepLinkHandler />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="inbox" options={{ presentation: 'modal', headerShown: true, title: 'Inbox' }} />
            <Stack.Screen name="stacks/index" options={{ presentation: 'modal', headerShown: true, title: '스택' }} />
            <Stack.Screen name="stacks/[id]" options={{ presentation: 'modal', headerShown: true, title: '스택 상세' }} />
            <Stack.Screen name="routines/new" options={{ presentation: 'modal', headerShown: true, title: '새 루틴' }} />
            <Stack.Screen name="routines/[id]" options={{ presentation: 'modal', headerShown: true, title: '루틴 상세' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
