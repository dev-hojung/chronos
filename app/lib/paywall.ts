import { create } from 'zustand';

// Paywall 노출 정책 상수
const AD_VIEWS_FOR_FULLSCREEN = 3; // 누적 광고 시청 3회 → fullscreen paywall

type PaywallMode = 'soft' | 'fullscreen';

interface PaywallStore {
  lastShownAt: number | null;     // 마지막 페이월 노출 시각 (ms)
  totalAdViews: number;           // 누적 광고 시청 횟수
  pendingSoftPaywall: boolean;    // 다음 화면 진입 시 soft paywall 노출 예약
  incrementAdViews: () => PaywallMode | null; // 광고 시청 후 호출 → 노출 모드 반환
  clearPendingSoft: () => void;
  recordShown: () => void;
  shouldShowOnMount: () => PaywallMode | null;
}

export const usePaywallStore = create<PaywallStore>((set, get) => ({
  lastShownAt: null,
  totalAdViews: 0,
  pendingSoftPaywall: false,

  /**
   * 광고 시청 완료 후 호출
   * - 첫 광고 시청 직후 → soft paywall 예약 (다음 화면 진입 시 1회)
   * - 누적 3회 → fullscreen
   */
  incrementAdViews: () => {
    const { totalAdViews } = get();
    const newCount = totalAdViews + 1;
    set({ totalAdViews: newCount });

    if (newCount >= AD_VIEWS_FOR_FULLSCREEN) {
      set({ lastShownAt: Date.now() });
      return 'fullscreen';
    }
    // 첫 광고 시청 직후 soft paywall 예약
    set({ pendingSoftPaywall: true });
    return 'soft';
  },

  clearPendingSoft: () => set({ pendingSoftPaywall: false }),

  recordShown: () => set({ lastShownAt: Date.now() }),

  /**
   * 화면 마운트 시 호출 — 예약된 soft paywall 소비
   */
  shouldShowOnMount: () => {
    const { pendingSoftPaywall } = get();
    if (pendingSoftPaywall) {
      set({ pendingSoftPaywall: false });
      return 'soft';
    }
    return null;
  },
}));
