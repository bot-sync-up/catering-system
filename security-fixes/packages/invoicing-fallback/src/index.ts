/**
 * Invoicing Fallback Chain
 *
 * הוצאת חשבונית — חובה רגולטורית במס הכנסה.
 * השביתה של ספק אחד לא יכולה למנוע מהמשתמש לקבל חשבונית.
 *
 * סדר fallback: iCount → GreenInvoice → Rivhit.
 * כל ניסיון נכשל נרשם ב-audit; ההצלחה הראשונה — מסיימת.
 */
import { z } from 'zod';

export const InvoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceExclVat: z.number().nonnegative(),
});

export const InvoiceRequestSchema = z.object({
  externalRef: z.string(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    taxId: z.string().optional(),
    address: z.string().optional(),
  }),
  lines: z.array(InvoiceLineSchema).min(1),
  vatRate: z.number().min(0).max(1),
  currency: z.enum(['ILS', 'USD', 'EUR']).default('ILS'),
  issueDate: z.date(),
});

export type InvoiceRequest = z.infer<typeof InvoiceRequestSchema>;

export interface InvoiceResult {
  provider: string;
  invoiceNumber: string;
  pdfUrl: string;
  issuedAt: Date;
}

export interface InvoiceProvider {
  name: string;
  isHealthy(): Promise<boolean>;
  issue(req: InvoiceRequest): Promise<InvoiceResult>;
}

export interface AuditLog {
  recordAttempt(externalRef: string, provider: string, success: boolean, error?: string): Promise<void>;
}

export class AllProvidersFailedError extends Error {
  constructor(
    public readonly attempts: Array<{ provider: string; error: string }>,
    public readonly externalRef: string,
  ) {
    super(`כל ספקי החשבונית נכשלו עבור ${externalRef}`);
    this.name = 'AllProvidersFailedError';
  }
}

/**
 * ניסיון רציף לפי הסדר. החזרה ראשונה שמצליחה.
 */
export async function issueInvoice(
  req: InvoiceRequest,
  providers: InvoiceProvider[],
  audit: AuditLog,
): Promise<InvoiceResult> {
  const parsed = InvoiceRequestSchema.parse(req);
  const attempts: Array<{ provider: string; error: string }> = [];

  for (const provider of providers) {
    try {
      const healthy = await provider.isHealthy().catch(() => false);
      if (!healthy) {
        attempts.push({ provider: provider.name, error: 'unhealthy' });
        await audit.recordAttempt(parsed.externalRef, provider.name, false, 'unhealthy');
        continue;
      }
      const result = await provider.issue(parsed);
      await audit.recordAttempt(parsed.externalRef, provider.name, true);
      return result;
    } catch (e) {
      const msg = (e as Error).message;
      attempts.push({ provider: provider.name, error: msg });
      await audit.recordAttempt(parsed.externalRef, provider.name, false, msg);
    }
  }

  throw new AllProvidersFailedError(attempts, parsed.externalRef);
}

/**
 * סדר ברירת מחדל המומלץ בישראל (ניתן לשנות לפי חוזה).
 */
export function defaultProviderOrder(
  iCount: InvoiceProvider,
  greenInvoice: InvoiceProvider,
  rivhit: InvoiceProvider,
): InvoiceProvider[] {
  return [iCount, greenInvoice, rivhit];
}
