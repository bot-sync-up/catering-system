/**
 * DroneProvider — אינטרפייס כללי לספקי משלוחי רחפן.
 *
 * תחת הקלעים כרגע אין ספק אמיתי פעיל — אלא רק `ZiplineStubProvider`.
 * ה-API מתוכנן כדי שנוכל להכניס בעתיד Zipline/Wing/Matternet בלי שינוי מצרכן.
 */

import { etaCalculator, type LatLng } from "./etaCalculator.js";

export interface DroneDeliveryRequest {
  deliveryId: string;
  pickup: LatLng;
  dropoff: LatLng;
  /** משקל החבילה בק"ג. */
  weightKg: number;
  /** עדיפות — משפיע על הקצאה. */
  priority?: "normal" | "high";
}

export interface DroneDeliveryQuote {
  provider: string;
  available: boolean;
  /** מחיר ב-ILS, כולל מע"מ. */
  priceIls: number;
  /** ETA במצב מעופף. */
  etaMinutes: number;
  reasonHe?: string;
}

export interface DroneProvider {
  name: string;
  quote(req: DroneDeliveryRequest): Promise<DroneDeliveryQuote>;
  dispatch(req: DroneDeliveryRequest): Promise<{ trackingId: string; etaMinutes: number }>;
  cancel(trackingId: string): Promise<{ cancelled: boolean }>;
}

export class DroneOrchestrator {
  constructor(private providers: DroneProvider[]) {}

  async bestQuote(req: DroneDeliveryRequest): Promise<DroneDeliveryQuote | null> {
    const quotes = await Promise.all(
      this.providers.map(async (p) => {
        try {
          return await p.quote(req);
        } catch {
          return null;
        }
      }),
    );
    const valid = quotes.filter((q): q is DroneDeliveryQuote => !!q && q.available);
    if (valid.length === 0) return null;
    valid.sort((a, b) => a.etaMinutes - b.etaMinutes || a.priceIls - b.priceIls);
    return valid[0];
  }
}

export { etaCalculator };
export type { LatLng };
