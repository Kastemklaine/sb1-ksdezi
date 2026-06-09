import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { AppNotification, NotificationType } from '../types';

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (userId: string, type: NotificationType, title: string, body: string, link?: string) => void;
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  clearAll: (userId: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (userId, type, title, body, link) => {
        const notif: AppNotification = {
          id: uuid(),
          userId,
          type,
          title,
          body,
          link,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ notifications: [notif, ...s.notifications].slice(0, 100) }));
      },

      markRead: (id) => {
        set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
      },

      markAllRead: (userId) => {
        set(s => ({ notifications: s.notifications.map(n => n.userId === userId ? { ...n, read: true } : n) }));
      },

      clearAll: (userId) => {
        set(s => ({ notifications: s.notifications.filter(n => n.userId !== userId) }));
      },
    }),
    { name: 'notification-store-v1' }
  )
);
