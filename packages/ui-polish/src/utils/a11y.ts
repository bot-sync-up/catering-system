/** כלי נגישות: הכרזות מסך, ניגודיות, מלכודת מיקוד. */

let liveRegion: HTMLDivElement | null = null;

function ensureLiveRegion(): HTMLDivElement {
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion;
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
  document.body.appendChild(el);
  liveRegion = el;
  return el;
}

/** מכריז טקסט לקוראי מסך באמצעות ARIA live region. */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;
  const region = ensureLiveRegion();
  region.setAttribute('aria-live', priority);
  region.textContent = '';
  // טריק לאלץ קורא מסך לקרוא שוב
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/** מחשב ניגודיות בין שני צבעים (יחס WCAG). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** בודק האם צמד צבעים עומד ב-WCAG AA לטקסט רגיל (4.5:1). */
export function meetsContrastAA(fg: string, bg: string, largeText = false): boolean {
  const ratio = contrastRatio(fg, bg);
  return ratio >= (largeText ? 3 : 4.5);
}

function relativeLuminance(color: string): number {
  const rgb = parseColor(color);
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseColor(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    return [
      parseInt(hex[0]! + hex[0], 16),
      parseInt(hex[1]! + hex[1], 16),
      parseInt(hex[2]! + hex[2], 16),
    ];
  }
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) return [+match[1]!, +match[2]!, +match[3]!];
  return [0, 0, 0];
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** מחזיר את כל האלמנטים הניתנים למיקוד בתוך container. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}
