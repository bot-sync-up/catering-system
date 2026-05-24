/**
 * Ordinary Least Squares — רגרסיה לינארית y = a*x + b
 *
 * שימוש פנימי בחיזוי תזרים ועוד.
 */
import type { RegressionResult } from "../types.js";

export interface XYPoint {
  x: number;
  y: number;
}

export function linearRegression(points: XYPoint[]): RegressionResult {
  const n = points.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  }
  if (n === 1) {
    const y = points[0]!.y;
    return { slope: 0, intercept: y, r2: 1, predict: () => y };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
    sumYY += p.y * p.y;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² — מקדם דטרמינציה
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yhat = slope * p.x + intercept;
    ssRes += (p.y - yhat) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    r2: Math.max(0, Math.min(1, r2)),
    predict: (x: number) => slope * x + intercept,
  };
}
