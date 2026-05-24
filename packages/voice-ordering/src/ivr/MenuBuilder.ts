// IVR פשוט עם DTMF — fallback כאשר ASR/NLU נכשלים
import twilio from 'twilio';

export interface MenuItem {
  digit: string;
  label: string;
  action: 'transfer' | 'submenu' | 'message' | 'callback';
  target?: string;
  message?: string;
  submenu?: MenuItem[];
}

export interface IvrMenu {
  prompt: string;
  items: MenuItem[];
  timeoutSeconds?: number;
  maxRetries?: number;
}

export class MenuBuilder {
  constructor(private webhookBase: string) {}

  /** ממיר IVR למבנה TwiML עם <Gather> ל-DTMF */
  toTwiML(menu: IvrMenu, menuId: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['dtmf'],
      numDigits: 1,
      timeout: menu.timeoutSeconds ?? 5,
      action: `${this.webhookBase}/ivr/${menuId}/select`,
      method: 'POST',
      language: 'he-IL',
    });
    gather.say({ language: 'he-IL' }, menu.prompt);
    response.say({ language: 'he-IL' }, 'לא קלטתי בחירה. ננסה שוב.');
    response.redirect({ method: 'POST' }, `${this.webhookBase}/ivr/${menuId}`);
    return response.toString();
  }

  /** מטפל בבחירה ומחזיר TwiML בהתאם */
  handleSelection(menu: IvrMenu, digit: string): string {
    const item = menu.items.find((i) => i.digit === digit);
    const response = new twilio.twiml.VoiceResponse();
    if (!item) {
      response.say({ language: 'he-IL' }, 'בחירה לא תקפה.');
      response.redirect({ method: 'POST' }, `${this.webhookBase}/ivr/main`);
      return response.toString();
    }
    switch (item.action) {
      case 'transfer':
        response.say({ language: 'he-IL' }, `מעביר אותך ל${item.label}.`);
        response.dial(item.target ?? '');
        break;
      case 'message':
        response.say({ language: 'he-IL' }, item.message ?? '');
        response.hangup();
        break;
      case 'callback':
        response.say({ language: 'he-IL' }, 'תודה, נחזור אליך בהקדם.');
        response.hangup();
        break;
      case 'submenu':
        // יחזיר ה-route ל-submenu
        break;
    }
    return response.toString();
  }
}

// תפריט ברירת מחדל
export const DEFAULT_MAIN_MENU: IvrMenu = {
  prompt:
    'שלום והגעת לאולמי האירועים שלנו. להזמנה חדשה הקש 1. לסטטוס הזמנה קיימת הקש 2. לדבר עם נציג הקש 9.',
  items: [
    { digit: '1', label: 'הזמנה חדשה', action: 'transfer', target: 'order-bot' },
    { digit: '2', label: 'סטטוס הזמנה', action: 'transfer', target: 'status-bot' },
    { digit: '9', label: 'נציג', action: 'transfer', target: '+972500000000' },
  ],
  timeoutSeconds: 5,
  maxRetries: 3,
};
