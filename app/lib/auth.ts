import { apiFetch } from './api';
import { persistTokens } from './secureTokens';
import { useAuthStore, type AuthTokens, type AuthUser } from '../stores/authStore';

interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export async function signInWithApple(
  idToken: string,
  nonce?: string,
): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/auth/apple', {
    method: 'POST',
    body: { idToken, nonce },
    auth: false,
  });
  applyAuth(res);
  return res;
}

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { idToken },
    auth: false,
  });
  applyAuth(res);
  return res;
}

function applyAuth(res: AuthResponse) {
  const tokens: AuthTokens = {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresIn: res.expiresIn,
  };
  useAuthStore.getState().setAuth(res.user, tokens);
  void persistTokens(tokens);
}
