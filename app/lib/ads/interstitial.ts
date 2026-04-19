import { create } from 'zustand';
import { useAuthStore } from '../../stores/authStore';
import { getInterstitialUnitId } from './units';

// 전면 광고 표시 쿨다운: 6분
const INTERSTITIAL_COOLDOWN_MS = 6 * 60 * 1000;
// 루틴 완료 N회마다 전면 광고
const INTERSTITIAL_EVERY_N = 5;

interface InterstitialStore {
  completedCount: number;       // 루틴 완료 누적 횟수
  lastShownAt: number | null;   // 마지막 전면 광고 표시 시각 (ms)
  incrementCount: () => void;
  recordShown: () => void;
}

export const useInterstitialStore = create<InterstitialStore>((set) => ({
  completedCount: 0,
  lastShownAt: null,
  incrementCount: () => set((s) => ({ completedCount: s.completedCount + 1 })),
  recordShown: () => set({ lastShownAt: Date.now() }),
}));

// react-native-google-mobile-ads 동적 임포트
function loadInterstitialModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

/**
 * 루틴 완료 시 호출.
 * Pro 구독자면 카운터 증가 안 함.
 * 5의 배수 + 마지막 표시 6분 경과 시 전면 광고 노출.
 */
export async function onRoutineCompleted(): Promise<void> {
  const tier = useAuthStore.getState().user?.subscriptionTier;
  // Pro 구독자는 전면 광고 카운터 증가 안 함
  if (tier === 'PRO') return;

  const store = useInterstitialStore.getState();
  store.incrementCount();

  const { completedCount, lastShownAt } = useInterstitialStore.getState();
  const nowMs = Date.now();

  // 5의 배수 + 쿨다운 경과 여부 확인
  const shouldShow =
    completedCount % INTERSTITIAL_EVERY_N === 0 &&
    (lastShownAt === null || nowMs - lastShownAt >= INTERSTITIAL_COOLDOWN_MS);

  if (!shouldShow) return;

  const admob = loadInterstitialModule();
  if (!admob) return; // SDK 없는 환경 (Expo Go)

  try {
    const { InterstitialAd, AdEventType } = admob;
    const ad = InterstitialAd.createForAdRequest(getInterstitialUnitId());

    await new Promise<void>((resolve, reject) => {
      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        unsubLoaded();
        ad.show();
        store.recordShown();
        resolve();
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        unsubError();
        reject();
      });
      ad.load();
    });
  } catch {
    // 광고 로드 실패 시 무시
  }
}
