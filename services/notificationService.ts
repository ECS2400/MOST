import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function schedulePushNotification(
  title: string,
  body: string,
  delaySeconds = 0
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
    });
    return id;
  } catch {
    return null;
  }
}

const STREAK_REMINDER_ID = 'most-streak-reminder';
const GRATITUDE_REMINDER_ID = 'most-gratitude-reminder';

export async function scheduleStreakReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: '🔥 Utrzymaj serię!',
        body: 'Zaloguj się dziś, aby nie przerywać swojej serii.',
        sound: true,
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
  } catch {
    // non-blocking
  }
}

/** Codzienne przypomnienie o dzienniku wdzięczności — 20:00 */
export async function scheduleGratitudeReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(GRATITUDE_REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: GRATITUDE_REMINDER_ID,
      content: {
        title: '💜 Dziennik wdzięczności',
        body: 'Co dobrego zrobił/a dziś Twój partner?',
        sound: true,
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
  } catch {
    // non-blocking
  }
}

export async function scheduleDailyReminders(): Promise<void> {
  await Promise.all([scheduleStreakReminder(), scheduleGratitudeReminder()]);
}

export async function sendPartnerTurnNotification(partnerName: string): Promise<void> {
  await schedulePushNotification(
    'Twoja kolej! 💬',
    `${partnerName} ukończył/a swoją fazę. Czas na Ciebie.`,
    1
  );
}

export async function sendAchievementNotification(achievementTitle: string): Promise<void> {
  await schedulePushNotification(
    '🏆 Osiągnięcie odblokowane!',
    `Zdobyłeś/aś: ${achievementTitle}`,
    1
  );
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
