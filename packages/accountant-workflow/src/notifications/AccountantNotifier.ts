/**
 * שליחת התראות לרו"ח דרך 3 ערוצים:
 *  - Email כשקובץ מוכן.
 *  - WhatsApp 48 שעות לפני deadline.
 *  - SMS תזכורת ביום ההגשה.
 *
 * הספקים מוזרקים (Email/SMS/WhatsApp providers) כדי לאפשר Mock בבדיקות.
 */
import { GeneratedFile } from '../types';

export interface EmailProvider {
  send(opts: { to: string; subject: string; bodyText: string; bodyHtml?: string; attachments?: { name: string; path: string }[] }): Promise<void>;
}

export interface SmsProvider {
  send(opts: { to: string; text: string }): Promise<void>;
}

export interface WhatsAppProvider {
  send(opts: { to: string; text: string }): Promise<void>;
}

export interface AccountantContact {
  email?: string;
  phone?: string;
}

export interface NotifierConfig {
  email?: EmailProvider;
  sms?: SmsProvider;
  whatsapp?: WhatsAppProvider;
  contact: AccountantContact;
}

export class AccountantNotifier {
  constructor(private readonly cfg: NotifierConfig) {}

  async notifyFileReady(file: GeneratedFile): Promise<void> {
    if (!this.cfg.email || !this.cfg.contact.email) return;
    const subject = `קובץ ${this.translateForm(file.formType)} מוכן להגשה - ${file.period.year}${
      file.period.month ? `/${String(file.period.month).padStart(2, '0')}` : ''
    }`;
    const bodyText = `שלום,

קובץ ${this.translateForm(file.formType)} עבור התקופה ${file.period.year}${
      file.period.month ? `/${String(file.period.month).padStart(2, '0')}` : ''
    } מוכן להורדה דרך הפורטל.

שם קובץ: ${file.fileName}
גודל: ${(file.byteSize / 1024).toFixed(1)} KB
Checksum: ${file.checksum.slice(0, 16)}...

יש להוריד, להגיש לרשות הרלוונטית, ולסמן בפורטל "הוגש" עם מספר אסמכתא.

בברכה,
מערכת Catering`;
    await this.cfg.email.send({
      to: this.cfg.contact.email,
      subject,
      bodyText,
    });
  }

  async notifyDeadlineApproaching(file: GeneratedFile, deadline: Date): Promise<void> {
    if (!this.cfg.whatsapp || !this.cfg.contact.phone) return;
    const dateStr = deadline.toLocaleDateString('he-IL');
    await this.cfg.whatsapp.send({
      to: this.cfg.contact.phone,
      text: `תזכורת: יש להגיש את ${this.translateForm(file.formType)} עד ${dateStr} (בעוד יומיים).`,
    });
  }

  async notifyDeadlineToday(file: GeneratedFile): Promise<void> {
    if (!this.cfg.sms || !this.cfg.contact.phone) return;
    await this.cfg.sms.send({
      to: this.cfg.contact.phone,
      text: `דחוף: היום מועד הגשת ${this.translateForm(file.formType)}.`,
    });
  }

  private translateForm(t: GeneratedFile['formType']): string {
    return {
      PCN874: 'דוח מע"מ PCN874',
      FORM856: 'טופס 856 שנתי',
      FORM856_PART_A: 'טופס 856 - לקוחות',
      FORM856_PART_B: 'טופס 856 - ספקים',
      FORM102: 'טופס 102 ניכויי שכר',
      FORM126: 'טופס 126 שנתי שכר',
      INCOME_STATEMENT: 'דוח רווח והפסד',
      BALANCE_SHEET: 'מאזן',
      JOURNAL_ENTRIES: 'יומן הנהלת חשבונות',
    }[t];
  }
}
