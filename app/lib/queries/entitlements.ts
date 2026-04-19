import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as entitlementsApi from '../api/entitlements';
import type { CoreFeature } from '../api/entitlements';
import { showRewardedAd } from '../ads/rewarded';

// ── Cache keys ────────────────────────────────────────────────────────────────

export const entitlementKeys = {
  check: (feature: CoreFeature) => ['entitlements', 'check', feature] as const,
  status: () => ['entitlements', 'status'] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * 특정 feature 엔타이틀먼트 확인
 * staleTime 30초 — 광고 시청 직후 재조회 고려
 */
export function useEntitlement(feature: CoreFeature) {
  return useQuery({
    queryKey: entitlementKeys.check(feature),
    queryFn: () => entitlementsApi.checkEntitlement(feature),
    staleTime: 30_000,
  });
}

export function useEntitlementStatus() {
  return useQuery({
    queryKey: entitlementKeys.status(),
    queryFn: entitlementsApi.getEntitlementStatus,
    staleTime: 30_000,
  });
}

// ── 보상형 광고 + ad_token 도착 대기 ─────────────────────────────────────────

/**
 * 보상형 광고 시청 후 ad_token 도착 대기 훅
 * 1. showRewardedAd(feature) 호출
 * 2. 성공 시 3초 대기 (SSV가 백엔드에 도착할 시간)
 * 3. entitlements 쿼리 무효화 → 재조회
 */
export function useShowRewardedFor(feature: CoreFeature) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const success = await showRewardedAd(feature);
      if (!success) throw new Error('광고 시청 실패 또는 취소');

      // SSV가 백엔드에 도착할 시간 대기 (3초)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return true;
    },
    onSuccess: () => {
      // 엔타이틀먼트 재조회
      qc.invalidateQueries({ queryKey: entitlementKeys.check(feature) });
      qc.invalidateQueries({ queryKey: entitlementKeys.status() });
    },
  });
}
