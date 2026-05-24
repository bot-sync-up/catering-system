'use client';

import { useState } from 'react';

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 32
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex flex-row-reverse justify-end gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          aria-label={`${i} כוכבים`}
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(i)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(i)}
          className="transition active:scale-110 disabled:cursor-default"
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={i <= display ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
