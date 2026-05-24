interface Props {
  href?: string;
  children?: string;
}

/** קישור "דלג לתוכן" — מופיע ב-focus עבור גולשי מקלדת. */
export function SkipLink({ href = '#main', children = 'דלג לתוכן הראשי' }: Props = {}) {
  return (
    <a href={href} className="skip-link" dir="rtl">
      {children}
    </a>
  );
}
