import { Platform } from 'react-native';

// AdMob 테스트 Unit ID (실 ID는 .env에서 주입)
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_REWARDED_IOS = 'ca-app-pub-3940256099942544/1712485313';
const TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917';

const isIos = Platform.OS === 'ios';

// 플랫폼별 배너 unit ID (env 우선, fallback: 테스트 ID)
export function getBannerUnitId(): string {
  if (isIos) {
    return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS ?? TEST_BANNER_IOS;
  }
  return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID ?? TEST_BANNER_ANDROID;
}

// 플랫폼별 전면 unit ID
export function getInterstitialUnitId(): string {
  if (isIos) {
    return process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_IOS ?? TEST_INTERSTITIAL_IOS;
  }
  return process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_ANDROID ?? TEST_INTERSTITIAL_ANDROID;
}

// 플랫폼별 보상형 unit ID
export function getRewardedUnitId(): string {
  if (isIos) {
    return process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS ?? TEST_REWARDED_IOS;
  }
  return process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_ANDROID ?? TEST_REWARDED_ANDROID;
}
