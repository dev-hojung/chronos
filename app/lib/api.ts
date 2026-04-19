import Constants from 'expo-constants';
import { useAuthStore, type AuthTokens } from '../stores/authStore';
import { clearTokens, persistTokens } from './secureTokens';

const DEFAULT_BASE_URL = 'http://localhost:3000';

function resolveBaseUrl(): string {
  const fromExtra =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
      ?.apiBaseUrl ?? undefined;
  return fromExtra ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API error ${status}`);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean;
}

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = useAuthStore.getState().tokens;
  if (!current?.refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${resolveBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as AuthTokens;
      useAuthStore.getState().updateTokens(data);
      await persistTokens(data);
      return data;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const url = `${resolveBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (auth) {
    const token = useAuthStore.getState().tokens?.accessToken;
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const doFetch = () =>
    fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await doFetch();
  if (res.status === 401 && auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers.authorization = `Bearer ${refreshed.accessToken}`;
      res = await doFetch();
    } else {
      useAuthStore.getState().clearAuth();
      await clearTokens();
    }
  }

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, parsed, `API ${method} ${path} -> ${res.status}`);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
