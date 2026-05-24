/**
 * etaCalculator — מחשב ETA במשלוח רחפן.
 *
 * נוסחה: דקות = (מרחק / מהירות שיוט) * 60 + 4 דקות overhead
 * (איסוף + נסיקה + נחיתה). מינימום 5 דקות.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface EtaOptions {
  cruiseKmH?: number;
  overheadMinutes?: number;
  minMinutes?: number;
}

export function etaCalculator(distanceKm: number, opts: EtaOptions = {}): number {
  const cruise = opts.cruiseKmH ?? 60;
  const overhead = opts.overheadMinutes ?? 4;
  const min = opts.minMinutes ?? 5;
  const minutes = (distanceKm / cruise) * 60 + overhead;
  return Math.max(min, Math.round(minutes));
}
