import { useAuthStore } from '../../stores/authStore';
import { getRewardedUnitId } from './units';
import type { CoreFeature } from '../api/entitlements';

// react-native-google-mobile-ads 동적 임포트
function loadRewardedModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

/**
 * 보상형 광고 시청.
 * - 광고 시청 완료 시 AdMob 서버가 /admob/ssv를 백엔드에 직접 호출하여 ad_token 발급
 * - custom_data에 "userId:feature" 부착
 * - 반환값: 광고 시청 성공 여부 (SSV 도착은 비동기 — 3초 지연 후 클라이언트가 재확인)
 */
export async function showRewardedAd(feature: CoreFeature): Promise<boolean> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return false;

  const admob = loadRewardedModule();
  if (!admob) {
    // SDK 없는 환경 (Expo Go) → 개발용 즉시 성공 시뮬레이션 안 함, false 반환
    return false;
  }

  const { RewardedAd, RewardedAdEventType } = admob;
  // custom_data에 userId:feature 부착 → AdMob SSV가 백엔드로 전달
  const ad = RewardedAd.createForAdRequest(getRewardedUnitId(), {
    serverSideVerificationOptions: {
      customData: `${userId}:${feature}`,
    },
  });

  return new Promise<boolean>((resolve) => {
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      unsubLoaded();
      ad.show();
    });

    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        unsubEarned();
        resolve(true);
      },
    );

    const unsubError = ad.addAdEventListener(RewardedAdEventType.ERROR, () => {
      unsubError();
      resolve(false);
    });

    // 사용자가 광고 닫기 (보상 없이)
    const unsubClosed = ad.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      unsubClosed();
      // EARNED_REWARD가 이미 fired됐으면 resolved 상태이므로 중복 resolve 무시
      resolve(false);
    });

    ad.load();
  });
}
