// notificationStore.ts — 알림 설정 zustand store
import { create } from 'zustand';

export interface NotificationPrefs {
  routine_reminder: boolean;      // 루틴 리마인더
  gravity_daily_push: boolean;    // Gravity 일일 푸시
  goal_progress_push: boolean;    // Goal 진척 21시 푸시
}

interface NotificationStore {
  prefs: NotificationPrefs;
  setPref: (key: keyof NotificationPrefs, value: boolean) => void;
  setPrefs: (prefs: Partial<NotificationPrefs>) => void;
}

const DEFAULT_PREFS: NotificationPrefs = {
  routine_reminder: true,
  gravity_daily_push: true,
  goal_progress_push: true,
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  prefs: DEFAULT_PREFS,
  setPref: (key, value) =>
    set((state) => ({
      prefs: { ...state.prefs, [key]: value },
    })),
  setPrefs: (partial) =>
    set((state) => ({
      prefs: { ...state.prefs, ...partial },
    })),
}));
