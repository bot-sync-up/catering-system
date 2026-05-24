/**
 * Channel adapters — לכל ערוץ קלט (פורטל / טלפון / ווטסאפ / סוכן) יש adapter
 * שמתרגם הודעת הזמנה גולמית למבנה אחיד שניתן להזין ל-engine.
 */

export type ChannelKind = 'PORTAL' | 'PHONE' | 'WHATSAPP' | 'AGENT';

export interface NormalizedOrderInput {
  channel: ChannelKind;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
  };
  type: 'ONE_TIME_EVENT' | 'RECURRING_PLAN' | 'MONTHLY_SUBSCRIPTION';
  eventDate?: Date;
  eventLocation?: string;
  guestCount?: number;
  customerNotes?: string;
  items: Array<{
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    kitchenInstructions?: string;
  }>;
  /** מי הזין במערכת — סוכן/קלידן */
  takenBy?: string;
}

export interface ChannelAdapter<TRaw> {
  kind: ChannelKind;
  parse(raw: TRaw): NormalizedOrderInput;
}
