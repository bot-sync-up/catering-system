/**
 * עונתיות — מקדמי חודש מתוך היסטוריה
 *
 * בענף קייטרינג/אירועים יש פערים משמעותיים בין חורף לקיץ.
 * מחשבים מקדם עונתי לכל חודש (0..11):
 *   factor[m] = avg(month=m) / avg(all)
 *
 * הצפי המשולב = trend(predict t) * seasonalFactor(month-of(t))
 */
export interface SeasonalIndex {
  /** מקדם לכל חודש 0..11 — 1.0 = ניטרלי */
  factors: number[];
  baseAverage: number;
}

export interface SeasonalPoint {
  date: Date;
  value: number;
}

export function computeSeasonalIndex(points: SeasonalPoint[]): SeasonalIndex {
  if (points.length === 0) {
    return { factors: new Array(12).fill(1), baseAverage: 0 };
  }
  const sums = new Array(12).fill(0);
  const counts = new Array(12).fill(0);
  let total = 0;
  for (const p of points) {
    const m = p.date.getMonth();
    sums[m] += p.value;
    counts[m] += 1;
    total += p.value;
  }
  const baseAverage = total / points.length;
  const factors = sums.map((sum, m) => {
    if (counts[m] === 0 || baseAverage === 0) return 1;
    const monthAvg = sum / counts[m];
    return monthAvg / baseAverage;
  });
  return { factors, baseAverage };
}

export function applySeasonalFactor(index: SeasonalIndex, date: Date, baseValue: number): number {
  const factor = index.factors[date.getMonth()] ?? 1;
  return baseValue * factor;
}
