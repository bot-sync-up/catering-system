import { etaCalculator } from "./etaCalculator.js";
import type { DroneDeliveryRequest, DroneDeliveryQuote, DroneProvider } from "./DroneProvider.js";

/**
 * ZiplineStubProvider — סטאב שמחקה ספק "זיפליין".
 *
 * הוא מאפשר לפתח לוגיקת UI/Backend בלי תלות בספק חיצוני אמיתי.
 * המחיר מחושב על בסיס מרחק + משקל. ה-ETA לפי `etaCalculator`.
 */
export class ZiplineStubProvider implements DroneProvider {
  name = "zipline-stub";
  /** מקסימום ק"ג שהרחפן יכול לשאת. */
  private maxKg = 6;
  /** מקסימום מרחק ק"מ. */
  private maxKm = 80;

  async quote(req: DroneDeliveryRequest): Promise<DroneDeliveryQuote> {
    const distanceKm = haversineKm(req.pickup, req.dropoff);
    if (req.weightKg > this.maxKg) {
      return {
        provider: this.name,
        available: false,
        priceIls: 0,
        etaMinutes: 0,
        reasonHe: `משקל חורג: ${req.weightKg} ק\"ג (מקסימום ${this.maxKg}).`,
      };
    }
    if (distanceKm > this.maxKm) {
      return {
        provider: this.name,
        available: false,
        priceIls: 0,
        etaMinutes: 0,
        reasonHe: `מרחק חורג: ${distanceKm.toFixed(1)} ק\"מ (מקסימום ${this.maxKm}).`,
      };
    }
    const basePrice = 35;
    const priceIls = Math.round(basePrice + distanceKm * 4 + req.weightKg * 3);
    const etaMinutes = etaCalculator(distanceKm, { cruiseKmH: 80 });
    return {
      provider: this.name,
      available: true,
      priceIls,
      etaMinutes,
    };
  }

  async dispatch(req: DroneDeliveryRequest): Promise<{ trackingId: string; etaMinutes: number }> {
    const q = await this.quote(req);
    if (!q.available) throw new Error(q.reasonHe ?? "DRONE_UNAVAILABLE");
    return { trackingId: `zip-${req.deliveryId}-${Date.now()}`, etaMinutes: q.etaMinutes };
  }

  async cancel(trackingId: string): Promise<{ cancelled: boolean }> {
    return { cancelled: trackingId.startsWith("zip-") };
  }
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
