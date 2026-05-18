import {
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, addMonths, format,
} from 'date-fns';

export type Period = 'month' | 'quarter' | 'year';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export function rangeFor(period: Period, ref: Date = new Date()): DateRange {
  switch (period) {
    case 'month':
      return {
        from: startOfMonth(ref),
        to: endOfMonth(ref),
        label: format(ref, 'yyyy-MM'),
      };
    case 'quarter':
      return {
        from: startOfQuarter(ref),
        to: endOfQuarter(ref),
        label: `${format(ref, 'yyyy')}-Q${Math.floor(ref.getMonth() / 3) + 1}`,
      };
    case 'year':
      return {
        from: startOfYear(ref),
        to: endOfYear(ref),
        label: format(ref, 'yyyy'),
      };
  }
}

export function monthBuckets(from: Date, to: Date): DateRange[] {
  const buckets: DateRange[] = [];
  let cur = startOfMonth(from);
  while (cur <= to) {
    buckets.push({
      from: startOfMonth(cur),
      to: endOfMonth(cur),
      label: format(cur, 'yyyy-MM'),
    });
    cur = addMonths(cur, 1);
  }
  return buckets;
}
