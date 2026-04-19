// push.ts — Expo push token 등록
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '../api/plan';

/**
 * registerPushToken — Expo Notifications로 토큰을 받아 서버에 등록
 * 옵트인(notificationPrefs.gravity_daily_push=true) 이후에만 호출
 */
export async function registerExpoPushToken(
  notificationPrefs?: Record<string, boolean>,
): Promise<void> {
  try {
    // 알림 권한 요청
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // 권한 거부 → skip (강제 없음)
      return;
    }

    // Expo push token 획득
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // 서버에 등록
    await registerPushToken(token, notificationPrefs);
  } catch {
    // 토큰 등록 실패는 앱 동작에 영향 없음 — silent fail
  }
}
