import Decimal from 'decimal.js';
import { z } from 'zod';
import { CurrencySchema, Currency } from '../enums/Currency.js';

/**
 * סכמת Money — סכומים מיוצגים תמיד כמחרוזת בייצוג Decimal, לעולם לא float.
 * שדה amount הוא מחרוזת המתפרשת ל-Decimal (למשל "1234.56").
 */
export const MoneySchema = z
  .object({
    amount: z
      .string()
      .regex(/^-?\d+(\.\d{1,10})?$/, 'Money amount must be a decimal string')
      .refine((v) => {
        try {
          // eslint-disable-next-line no-new
          new Decimal(v);
          return true;
        } catch {
          return false;
        }
      }, 'Invalid Decimal string'),
    currency: CurrencySchema.default(Currency.ILS),
  })
  .strict();

export type Money = z.infer<typeof MoneySchema>;

/** יוצר ערך Money בטוח מ-string/number/Decimal. */
export const money = (
  amount: string | number | Decimal,
  currency: Currency = Currency.ILS,
): Money => ({
  amount: new Decimal(amount).toFixed(),
  currency,
});

/** המרה ל-Decimal לחישובים */
export const toDecimal = (m: Money): Decimal => new Decimal(m.amount);

/** חיבור שתי תוצאות Money — חייבות להיות באותו מטבע */
export const addMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add money in different currencies: ${a.currency} vs ${b.currency}`,
    );
  }
  return money(toDecimal(a).plus(toDecimal(b)), a.currency);
};

/** הכפלה של Money בכמות (Decimal-safe) */
export const mulMoney = (m: Money, qty: string | number | Decimal): Money =>
  money(toDecimal(m).mul(new Decimal(qty)), m.currency);

/** שיעור מע"מ ברירת מחדל בישראל */
export const VAT_RATE = new Decimal('0.18'); // 18%

/** חישוב סכום מע"מ ברוטו -> נטו (סכום חייב במע"מ) */
export const vatAmount = (net: Money): Money =>
  money(toDecimal(net).mul(VAT_RATE), net.currency);

/** סכום עם מע"מ */
export const withVat = (net: Money): Money =>
  money(toDecimal(net).mul(new Decimal('1').plus(VAT_RATE)), net.currency);
