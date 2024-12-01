import { LocalNotifications } from '@nativescript/local-notifications';

export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermission();
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  static async showRecordingNotification(options: { id: number; title: string; body: string }) {
    await LocalNotifications.schedule([
      {
        id: options.id,
        title: options.title,
        body: options.body,
        ongoing: true,
      }
    ]);
  }

  static async cancelNotification(id: number) {
    await LocalNotifications.cancel(id);
  }
}