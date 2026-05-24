import { useEffect, useMemo } from 'react';

export interface Shortcut {
  /** קומבינציה כמו "cmd+k", "ctrl+s", "alt+shift+n", "?". */
  combo: string;
  description: string;
  /** קטגוריה לקיבוץ במסך עזרה. */
  group?: string;
  handler: (e: KeyboardEvent) => void;
  /** האם לפעול גם בתוך שדות קלט. ברירת מחדל: false. */
  enableInInputs?: boolean;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

function normalize(combo: string): string {
  return combo
    .toLowerCase()
    .split('+')
    .map((s) => s.trim())
    .map((s) => (s === 'cmd' || s === 'meta' ? 'mod' : s))
    .map((s) => (s === 'control' || s === 'ctrl' ? 'mod' : s))
    .sort()
    .join('+');
}

function matches(combo: string, e: KeyboardEvent): boolean {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  return parts.sort().join('+') === normalize(combo);
}

/** הוק לרישום קיצורי מקלדת גלובליים. */
export function useShortcuts(shortcuts: Shortcut[], enabled = true): void {
  const list = useMemo(() => shortcuts, [shortcuts]);
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      for (const s of list) {
        if (!s.enableInInputs && isTypingTarget(e.target)) continue;
        if (matches(s.combo, e)) {
          e.preventDefault();
          s.handler(e);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list, enabled]);
}

/** פורמט קומבינציה לתצוגה (מציג Ctrl/⌘ לפי הפלטפורמה). */
export function formatCombo(combo: string): string {
  const isMac =
    typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
  return combo
    .toLowerCase()
    .split('+')
    .map((s) => s.trim())
    .map((s) => {
      if (s === 'mod' || s === 'cmd' || s === 'meta') return isMac ? '⌘' : 'Ctrl';
      if (s === 'ctrl' || s === 'control') return 'Ctrl';
      if (s === 'alt' || s === 'option') return isMac ? '⌥' : 'Alt';
      if (s === 'shift') return isMac ? '⇧' : 'Shift';
      if (s === 'enter') return '↵';
      if (s === 'escape' || s === 'esc') return 'Esc';
      if (s === 'arrowup') return '↑';
      if (s === 'arrowdown') return '↓';
      if (s === 'arrowleft') return '←';
      if (s === 'arrowright') return '→';
      return s.length === 1 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1);
    })
    .join(' + ');
}
