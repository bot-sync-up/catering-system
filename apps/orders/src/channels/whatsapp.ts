/**
 * ווטסאפ — קלט מטקסט חופשי. מנסים לחלץ פריטים פשוטים בעזרת רגקס/heuristics.
 *
 * פורמט מצופה (מודרך):
 *   שם: ישראל ישראלי
 *   טלפון: 050-1234567
 *   אירוע: 12/05/2026 בערב, 50 איש
 *   כתובת: רחוב הרצל 5, תל אביב
 *   פריטים:
 *   - 50 חמין מנה רגילה (45)
 *   - 20 קוגל ירושלמי (35)
 */

import type { ChannelAdapter, NormalizedOrderInput } from './types';

export interface WhatsappRaw {
  fromPhone: string;
  text: string;
}

const LINE_KV = /^\s*([^:]+):\s*(.+)$/;
const ITEM_LINE = /^\s*-\s*(\d+)\s+(.+?)\s*\((\d+(?:\.\d+)?)\)\s*$/;

export const whatsappAdapter: ChannelAdapter<WhatsappRaw> = {
  kind: 'WHATSAPP',
  parse(raw) {
    const lines = raw.text.split(/\r?\n/);
    const fields: Record<string, string> = {};
    const items: NormalizedOrderInput['items'] = [];
    let inItems = false;

    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      if (line.startsWith('פריטים')) {
        inItems = true;
        continue;
      }
      if (inItems) {
        const m = line.match(ITEM_LINE);
        if (m) {
          const qty = parseInt(m[1], 10);
          const name = m[2].trim();
          const price = parseFloat(m[3]);
          items.push({
            productSku: slugify(name),
            productName: name,
            quantity: qty,
            unitPrice: price,
          });
        }
        continue;
      }
      const m = line.match(LINE_KV);
      if (m) fields[m[1].trim()] = m[2].trim();
    }

    const eventDate = parseDate(fields['אירוע'] ?? fields['תאריך']);
    const guestCount = parseGuestCount(fields['אירוע']);

    return {
      channel: 'WHATSAPP',
      customer: {
        fullName: fields['שם'] ?? 'ללא שם',
        phone: fields['טלפון'] ?? raw.fromPhone,
        address: fields['כתובת'],
      },
      type: 'ONE_TIME_EVENT',
      eventDate,
      eventLocation: fields['כתובת'],
      guestCount,
      customerNotes: fields['הערות'],
      items,
    };
  },
};

function slugify(s: string): string {
  return s.replace(/\s+/g, '-').slice(0, 40);
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return undefined;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  return new Date(y, mo, d);
}

function parseGuestCount(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d+)\s*איש/);
  return m ? parseInt(m[1], 10) : undefined;
}
