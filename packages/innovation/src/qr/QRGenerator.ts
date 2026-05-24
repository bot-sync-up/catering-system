/**
 * QRGenerator
 *
 * שכבת עזר ליצירת קודי QR לכל הישויות במערכת:
 *  Order, Invoice, Event, Customer, Delivery, Equipment, Vehicle, Employee.
 *
 * כל QR מצביע ל-URL קצר (`https://s.syncup.co.il/{code}`) — שירות ה-shortener
 * יודע לפענח את ה-prefix ולנתב לתצוגה הנכונה.
 */

import QRCode, { type QRCodeToBufferOptions, type QRCodeToDataURLOptions } from "qrcode";
import { nanoid } from "nanoid";

export type QRSubject =
  | "order"
  | "invoice"
  | "event"
  | "customer"
  | "delivery"
  | "equipment"
  | "vehicle"
  | "employee";

const SUBJECT_PREFIX: Record<QRSubject, string> = {
  order: "o",
  invoice: "i",
  event: "e",
  customer: "c",
  delivery: "d",
  equipment: "q",
  vehicle: "v",
  employee: "u",
};

export interface QRGeneratorOptions {
  /** דומיין הקיצור — ברירת מחדל s.syncup.co.il. */
  shortDomain?: string;
  /** אורך הקוד הרנדומלי (לא כולל prefix). ברירת מחדל 8. */
  codeLength?: number;
  /** רמת תיקון שגיאות — H מומלץ עבור מדבקות שעלולות להתלכלך. */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /** רוחב התמונה. */
  width?: number;
  /** צבע — חייב להיות hex עם # מוביל. */
  color?: { dark?: string; light?: string };
}

export interface GeneratedQR {
  subject: QRSubject;
  /** מזהה הישות המקורית (למשל ORD-12345). */
  entityId: string;
  /** הקוד הקצר (8 תווים כברירת מחדל) — להחזיק בטבלת קיצורי URL. */
  shortCode: string;
  /** ה-URL המלא שאליו ה-QR מצביע. */
  shortUrl: string;
  /** Data URL של PNG. */
  dataUrl: string;
}

export class QRGenerator {
  private opts: Required<Omit<QRGeneratorOptions, "color">> & Pick<QRGeneratorOptions, "color">;

  constructor(opts: QRGeneratorOptions = {}) {
    this.opts = {
      shortDomain: opts.shortDomain ?? "s.syncup.co.il",
      codeLength: opts.codeLength ?? 8,
      errorCorrectionLevel: opts.errorCorrectionLevel ?? "H",
      width: opts.width ?? 512,
      color: opts.color,
    };
  }

  /** יוצר קוד קצר חדש לישות נתונה. */
  buildShortCode(subject: QRSubject): string {
    return `${SUBJECT_PREFIX[subject]}${nanoid(this.opts.codeLength)}`;
  }

  buildShortUrl(shortCode: string): string {
    return `https://${this.opts.shortDomain}/${shortCode}`;
  }

  async forEntity(subject: QRSubject, entityId: string, providedCode?: string): Promise<GeneratedQR> {
    const shortCode = providedCode ?? this.buildShortCode(subject);
    const shortUrl = this.buildShortUrl(shortCode);
    const dataUrlOpts: QRCodeToDataURLOptions = {
      errorCorrectionLevel: this.opts.errorCorrectionLevel,
      width: this.opts.width,
      margin: 1,
      color: this.opts.color,
    };
    const dataUrl = await QRCode.toDataURL(shortUrl, dataUrlOpts);
    return { subject, entityId, shortCode, shortUrl, dataUrl };
  }

  async forEntityBuffer(
    subject: QRSubject,
    entityId: string,
    providedCode?: string,
  ): Promise<{ qr: GeneratedQR; buffer: Buffer }> {
    const qr = await this.forEntity(subject, entityId, providedCode);
    const bufOpts: QRCodeToBufferOptions = {
      errorCorrectionLevel: this.opts.errorCorrectionLevel,
      width: this.opts.width,
      margin: 1,
      color: this.opts.color,
    };
    const buffer = await QRCode.toBuffer(qr.shortUrl, bufOpts);
    return { qr, buffer };
  }

  // קיצורי נוחות לכל סוג ישות.
  forOrder = (id: string) => this.forEntity("order", id);
  forInvoice = (id: string) => this.forEntity("invoice", id);
  forEvent = (id: string) => this.forEntity("event", id);
  forCustomer = (id: string) => this.forEntity("customer", id);
  forDelivery = (id: string) => this.forEntity("delivery", id);
  forEquipment = (id: string) => this.forEntity("equipment", id);
  forVehicle = (id: string) => this.forEntity("vehicle", id);
  forEmployee = (id: string) => this.forEntity("employee", id);
}

/**
 * Singleton ברירת-מחדל — שימושי לסקריפטים קצרים.
 * עדיף בייצור ליצור instance עם הקונפיג של הסביבה.
 */
export const defaultQRGenerator = new QRGenerator();

/** עוזר סטטי — מאפשר `await QRGeneratorStatic.forOrder("ORD-1")` בקוד קצר. */
export const QRGeneratorStatic = {
  forOrder: (id: string) => defaultQRGenerator.forOrder(id),
  forInvoice: (id: string) => defaultQRGenerator.forInvoice(id),
  forEvent: (id: string) => defaultQRGenerator.forEvent(id),
  forCustomer: (id: string) => defaultQRGenerator.forCustomer(id),
  forDelivery: (id: string) => defaultQRGenerator.forDelivery(id),
  forEquipment: (id: string) => defaultQRGenerator.forEquipment(id),
  forVehicle: (id: string) => defaultQRGenerator.forVehicle(id),
  forEmployee: (id: string) => defaultQRGenerator.forEmployee(id),
};

export function parseShortCode(code: string): { subject: QRSubject | null; rest: string } {
  const prefix = code[0];
  const rest = code.slice(1);
  const entry = (Object.entries(SUBJECT_PREFIX) as [QRSubject, string][]).find(([, p]) => p === prefix);
  return { subject: entry ? entry[0] : null, rest };
}
