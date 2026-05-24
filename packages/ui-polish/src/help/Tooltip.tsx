import { useId, useState, type ReactElement, cloneElement } from 'react';
import { cn } from '../utils/cn';

type Side = 'top' | 'bottom' | 'start' | 'end';

interface Props {
  content: string;
  children: ReactElement;
  side?: Side;
  delay?: number;
  className?: string;
}

const positionMap: Record<Side, string> = {
  top: 'bottom-full mb-1 right-1/2 translate-x-1/2',
  bottom: 'top-full mt-1 right-1/2 translate-x-1/2',
  start: 'right-full mr-1 top-1/2 -translate-y-1/2',
  end: 'left-full ml-1 top-1/2 -translate-y-1/2',
};

/** טוּלטיפּ נגיש בעברית, מתאים ל-RTL. */
export function Tooltip({ content, children, side = 'top', delay = 200, className }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  let timer: number | undefined;

  const show = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = (): void => {
    window.clearTimeout(timer);
    setOpen(false);
  };

  const child = cloneElement(children, {
    'aria-describedby': open ? id : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <span className="relative inline-flex" dir="rtl">
      {child}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded bg-text px-2 py-1 text-xs text-bg shadow animate-fade-in',
            positionMap[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
