import { apiFetch } from '../api';

// 핵심기능 feature 코드 (백엔드와 동기화)
export type CoreFeature = 'stack.autoBundle' | 'routine.analyze' | 'plan.generate';

export interface EntitlementResult {
  granted: boolean;
  source: 'pro' | 'ad_token' | null;
  expiresAt?: string; // ISO string
}

export interface EntitlementStatus {
  tier: 'FREE' | 'PRO';
  features: Array<{ feature: CoreFeature } & EntitlementResult>;
}

// POST /entitlements/check — 특정 feature 엔타이틀먼트 확인
export function checkEntitlement(feature: CoreFeature): Promise<EntitlementResult> {
  return apiFetch<EntitlementResult>('/entitlements/check', {
    method: 'POST',
    body: { feature },
  });
}

// GET /entitlements/status — 전체 엔타이틀먼트 상태
export function getEntitlementStatus(): Promise<EntitlementStatus> {
  return apiFetch<EntitlementStatus>('/entitlements/status');
}
