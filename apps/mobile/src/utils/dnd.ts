/**
 * Do-Not-Disturb window: night hours (default 22:00 -> 07:00 local).
 * Notifications are silently dropped during the window.
 */
export interface DndWindow {
  startHour: number; // inclusive
  endHour: number; // exclusive
}

let current: DndWindow = { startHour: 22, endHour: 7 };

export function setDndWindow(w: DndWindow) {
  current = w;
}

export function getDndWindow(): DndWindow {
  return current;
}

export function isWithinDnd(now: Date, w: DndWindow = current): boolean {
  const h = now.getHours();
  if (w.startHour === w.endHour) return false;
  if (w.startHour < w.endHour) {
    return h >= w.startHour && h < w.endHour;
  }
  // wraps midnight, e.g. 22 -> 7
  return h >= w.startHour || h < w.endHour;
}
