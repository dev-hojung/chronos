import * as Notifications from 'expo-notifications';
import type { Routine, UpcomingRoutine } from '../api/routine';

const ROUTINE_ID_PREFIX = 'routine-';

/**
 * Cancel all previously scheduled routine notifications and reschedule
 * based on the latest upcoming slots.
 *
 * Safe to call even if notification permissions are not granted — any
 * errors are caught and swallowed so the app never crashes.
 */
export async function scheduleRoutineNotifications(
  routines: Routine[],
  upcomingByRoutineId: Map<string, UpcomingRoutine>,
): Promise<void> {
  try {
    // Cancel existing routine notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const routineNotifs = scheduled.filter((n) =>
      n.identifier.startsWith(ROUTINE_ID_PREFIX),
    );
    await Promise.all(
      routineNotifs.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier),
      ),
    );

    const now = Date.now();

    for (const routine of routines) {
      if (!routine.active) continue;
      const upcoming = upcomingByRoutineId.get(routine.id);
      if (!upcoming) continue;

      for (const slot of upcoming.slots) {
        const scheduledMs = new Date(slot.scheduledAt).getTime();
        const triggerMs = scheduledMs - 5 * 60_000; // 5 min before
        if (triggerMs <= now) continue;

        const identifier = `${ROUTINE_ID_PREFIX}${routine.id}-${slot.scheduledAt}`;
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: '루틴 알림',
            body: `${routine.title} 시작 5분 전입니다`,
            data: { routineId: routine.id, scheduledAt: slot.scheduledAt },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(triggerMs),
          },
        });
      }
    }
  } catch (err) {
    // Never crash the app over notification scheduling
    console.warn('[routineNotifications] scheduling failed:', err);
  }
}

/**
 * Request notification permissions. Call this right after the user creates
 * their first routine.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
