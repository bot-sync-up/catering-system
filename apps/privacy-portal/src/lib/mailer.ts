/**
 * שכבת mailer — בייצור תשתמש ב-nodemailer / SendGrid וכו'.
 * בפיתוח/בדיקות מדפיסים ל-console ומחזירים את המייל "שנשלח" כדי שטסטים יוכלו להציץ.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
}

const sent: OutboundEmail[] = [];

export async function sendEmail(msg: OutboundEmail): Promise<void> {
  sent.push(msg);
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[mailer] ->", msg.to, "::", msg.subject);
  }
  // TODO: לחבר nodemailer בעת deploy ל-production
}

export function _drainSentForTests(): OutboundEmail[] {
  const copy = sent.slice();
  sent.length = 0;
  return copy;
}

export function buildVerifyUrl(path: string, token: string): string {
  const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3030";
  return `${base}${path}/${encodeURIComponent(token)}`;
}
