import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../stores/authStore';

const ACCESS_KEY = 'chronos.accessToken';
const REFRESH_KEY = 'chronos.refreshToken';
const EXPIRES_KEY = 'chronos.expiresIn';

export async function persistTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(EXPIRES_KEY, String(tokens.expiresIn)),
  ]);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken, expires] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(EXPIRES_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return {
    accessToken,
    refreshToken,
    expiresIn: expires ? Number(expires) : 900,
  };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(EXPIRES_KEY),
  ]);
}
