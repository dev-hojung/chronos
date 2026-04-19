import { useState } from 'react';
import { Platform, Pressable, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Screen } from '../../components/Screen';
import { Heading } from '../../components/Heading';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { signInWithApple, signInWithGoogle } from '../../lib/auth';

// TODO(W9): configure Google Sign-In webClientId / iosClientId from env
// once client IDs are registered in Google Cloud Console.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
});

export default function SignInScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApple = async () => {
    setError(null);
    setBusy('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('No Apple identity token returned');
      }
      await signInWithApple(credential.identityToken);
      router.replace('/(tabs)/today');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Apple sign-in failed';
      setError(message);
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      // google-signin v13 returns { type, data }; older returns the user directly.
      const idToken =
        (result as { data?: { idToken?: string } }).data?.idToken ??
        (result as { idToken?: string }).idToken;
      if (!idToken) throw new Error('No Google id token returned');
      await signInWithGoogle(idToken);
      router.replace('/(tabs)/today');
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e &&
        'code' in e &&
        (e as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        setBusy(null);
        return;
      }
      const message = e instanceof Error ? e.message : 'Google sign-in failed';
      setError(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View className="mt-6 gap-2">
        <Heading level={1}>Chronos</Heading>
        <Text tone="muted" size="sm">
          컨텍스트를 정리하고 루틴이 스스로 진화하도록
        </Text>
      </View>

      <Card className="mt-6 gap-3">
        <Text size="lg" className="font-semibold">
          로그인
        </Text>
        <Text tone="muted" size="sm">
          Apple 또는 Google 계정으로 계속합니다
        </Text>

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={handleApple}
            disabled={busy !== null}
            className="h-12 rounded-md bg-black items-center justify-center"
          >
            {busy === 'apple' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold"> Apple로 계속</Text>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={handleGoogle}
          disabled={busy !== null}
          className="h-12 rounded-md bg-white border border-border-light items-center justify-center"
        >
          {busy === 'google' ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-black font-semibold">Google로 계속</Text>
          )}
        </Pressable>

        {error && (
          <Text tone="danger" size="sm">
            {error}
          </Text>
        )}
      </Card>

      <Text tone="muted" size="xs" className="mt-4">
        계속 진행 시 Chronos 서비스 이용약관과 개인정보 처리방침에 동의하게
        됩니다.
      </Text>
    </Screen>
  );
}
