import { create } from 'zustand';

export type NotificationKind = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  createdAt: number;
  read: boolean;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface NotificationsState {
  items: Notification[];
  add: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => string;
  remove: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  unreadCount: () => number;
}

function genId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Store ל-Zustand לניהול התראות גלובליות. */
export const useNotifications = create<NotificationsState>((set, get) => ({
  items: [],
  add: (n) => {
    const id = genId();
    set((s) => ({
      items: [{ ...n, id, createdAt: Date.now(), read: false }, ...s.items].slice(0, 100),
    }));
    return id;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  markRead: (id) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  clear: () => set({ items: [] }),
  unreadCount: () => get().items.filter((i) => !i.read).length,
}));

/** API קצר לקריאה מכל מקום: notify.success("בוצע!"). */
export const notify = {
  info: (title: string, message?: string) =>
    useNotifications.getState().add({ kind: 'info', title, message, duration: 4000 }),
  success: (title: string, message?: string) =>
    useNotifications.getState().add({ kind: 'success', title, message, duration: 4000 }),
  warning: (title: string, message?: string) =>
    useNotifications.getState().add({ kind: 'warning', title, message, duration: 6000 }),
  error: (title: string, message?: string) =>
    useNotifications.getState().add({ kind: 'error', title, message, duration: 8000 }),
};
