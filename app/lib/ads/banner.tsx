import React from 'react';
import { View } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { getBannerUnitId } from './units';

// react-native-google-mobile-ads는 Expo Dev Client 필요 (Expo Go 미지원)
// 빌드 환경에서만 실제 광고 렌더링, 개발 환경에서는 placeholder
let BannerAd: React.ComponentType<{
  unitId: string;
  size: string;
  requestOptions?: object;
}> | null = null;
let BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string } | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
} catch {
  // Dev Client 없는 환경에서는 무시
}

interface AppBannerProps {
  placement: 'today_bottom' | 'routines_bottom';
}

/**
 * AppBanner: Pro 구독자에게는 렌더링 안 함.
 * react-native-google-mobile-ads SDK가 없으면 placeholder 표시.
 */
export function AppBanner({ placement }: AppBannerProps) {
  const tier = useAuthStore((s) => s.user?.subscriptionTier);

  // Pro 구독자는 광고 표시 안 함
  if (tier === 'PRO') return null;

  // SDK 미설치 환경 (Expo Go) → placeholder
  if (!BannerAd || !BannerAdSize) {
    return (
      <View
        className="h-12 bg-gray-100 dark:bg-gray-800 items-center justify-center"
        accessibilityLabel={`광고 영역 (${placement})`}
      />
    );
  }

  return (
    <BannerAd
      unitId={getBannerUnitId()}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
    />
  );
}
