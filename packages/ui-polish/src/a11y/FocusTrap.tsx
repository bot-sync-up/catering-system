import { useEffect, useRef, type ReactNode } from 'react';
import { getFocusableElements } from '../utils/a11y';

interface Props {
  children: ReactNode;
  active?: boolean;
  restoreFocus?: boolean;
  onEscape?: () => void;
}

/** מלכודת מיקוד עבור דיאלוגים — Tab מסתובב פנימה בלבד. */
export function FocusTrap({ children, active = true, restoreFocus = true, onEscape }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement as HTMLElement | null;

    const root = ref.current;
    if (!root) return;
    const focusables = getFocusableElements(root);
    (focusables[0] ?? root).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusableElements(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (restoreFocus) previousFocus.current?.focus({ preventScroll: true });
    };
  }, [active, restoreFocus, onEscape]);

  return (
    <div ref={ref} tabIndex={-1}>
      {children}
    </div>
  );
}
