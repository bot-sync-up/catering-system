// מכונת מצבים להזמנה חדשה: ברכה → זיהוי → סוג אירוע → תאריך → אורחים → תפריט → אישור → תשלום → פרידה
import { setup, assign, createActor, type ActorRefFrom } from 'xstate';
import type { ExtractedEntities } from '../types.js';

export interface OrderContext {
  callSid: string;
  order: Partial<ExtractedEntities>;
  attempts: Record<string, number>;
  lastPrompt?: string;
  errorMessage?: string;
}

export type OrderEvent =
  | { type: 'USER_INPUT'; text: string; entities: ExtractedEntities }
  | { type: 'DTMF'; digit: string }
  | { type: 'TIMEOUT' }
  | { type: 'ESCALATE' }
  | { type: 'CONFIRM' }
  | { type: 'REJECT' };

const MAX_ATTEMPTS = 3;

export const orderDialogMachine = setup({
  types: {
    context: {} as OrderContext,
    events: {} as OrderEvent,
    input: {} as { callSid: string } | undefined,
  },
  guards: {
    // הבדיקה משלבת את ה-context ואת ה-event הנוכחי, כי האקשן מתבצע *אחרי* הגארד
    hasEventType: ({ context, event }) =>
      context.order.eventType != null ||
      (event.type === 'USER_INPUT' && event.entities.eventType != null),
    hasDate: ({ context, event }) =>
      context.order.date != null ||
      (event.type === 'USER_INPUT' && event.entities.date != null),
    hasGuestCount: ({ context, event }) =>
      context.order.guestCount != null ||
      (event.type === 'USER_INPUT' && event.entities.guestCount != null),
    hasMenu: ({ context, event }) => {
      const ctxOk =
        Array.isArray(context.order.menuItems) && context.order.menuItems.length > 0;
      const evtOk =
        event.type === 'USER_INPUT' &&
        Array.isArray(event.entities.menuItems) &&
        event.entities.menuItems.length > 0;
      return ctxOk || evtOk;
    },
    isConfirmed: ({ event }) => event.type === 'CONFIRM',
    tooManyAttempts: ({ context }) =>
      Object.values(context.attempts).some((n) => n >= MAX_ATTEMPTS),
    isEscalate: ({ event }) => event.type === 'ESCALATE',
  },
  actions: {
    mergeEntities: assign({
      order: ({ context, event }) => {
        if (event.type !== 'USER_INPUT') return context.order;
        return { ...context.order, ...event.entities };
      },
    }),
    incAttempt: assign({
      attempts: ({ context, event }) => {
        const key = event.type === 'USER_INPUT' ? 'current' : event.type;
        return { ...context.attempts, [key]: (context.attempts[key] ?? 0) + 1 };
      },
    }),
    resetAttempts: assign({ attempts: () => ({}) }),
  },
}).createMachine({
  id: 'orderDialog',
  initial: 'greeting',
  context: ({ input }) => ({
    callSid: input?.callSid ?? '',
    order: {},
    attempts: {},
  }),
  states: {
    greeting: {
      on: {
        USER_INPUT: { target: 'identify', actions: 'mergeEntities' },
        ESCALATE: 'escalation',
      },
    },
    identify: {
      on: {
        USER_INPUT: [
          {
            guard: 'hasEventType',
            target: 'date',
            actions: 'mergeEntities',
          },
          { target: 'eventType', actions: 'mergeEntities' },
        ],
        ESCALATE: 'escalation',
      },
    },
    eventType: {
      on: {
        USER_INPUT: [
          {
            guard: 'hasEventType',
            target: 'date',
            actions: ['mergeEntities', 'resetAttempts'],
          },
          { target: 'eventType', actions: ['mergeEntities', 'incAttempt'] },
        ],
        ESCALATE: 'escalation',
      },
      always: { guard: 'tooManyAttempts', target: 'escalation' },
    },
    date: {
      on: {
        USER_INPUT: [
          {
            guard: 'hasDate',
            target: 'guests',
            actions: ['mergeEntities', 'resetAttempts'],
          },
          { target: 'date', actions: ['mergeEntities', 'incAttempt'] },
        ],
        ESCALATE: 'escalation',
      },
      always: { guard: 'tooManyAttempts', target: 'escalation' },
    },
    guests: {
      on: {
        USER_INPUT: [
          {
            guard: 'hasGuestCount',
            target: 'menu',
            actions: ['mergeEntities', 'resetAttempts'],
          },
          { target: 'guests', actions: ['mergeEntities', 'incAttempt'] },
        ],
        ESCALATE: 'escalation',
      },
      always: { guard: 'tooManyAttempts', target: 'escalation' },
    },
    menu: {
      on: {
        USER_INPUT: [
          {
            guard: 'hasMenu',
            target: 'confirm',
            actions: ['mergeEntities', 'resetAttempts'],
          },
          { target: 'menu', actions: ['mergeEntities', 'incAttempt'] },
        ],
        ESCALATE: 'escalation',
      },
    },
    confirm: {
      on: {
        CONFIRM: 'payment',
        REJECT: 'menu',
        USER_INPUT: { target: 'confirm', actions: 'mergeEntities' },
        ESCALATE: 'escalation',
      },
    },
    payment: {
      on: {
        CONFIRM: 'goodbye',
        REJECT: 'confirm',
        ESCALATE: 'escalation',
      },
    },
    goodbye: { type: 'final' },
    escalation: { type: 'final' },
  },
});

export type OrderActor = ActorRefFrom<typeof orderDialogMachine>;

export function startOrderDialog(callSid: string): OrderActor {
  const actor = createActor(orderDialogMachine, { input: { callSid } });
  actor.start();
  return actor;
}

/** מחזיר טקסט פרומפט עבור המצב הנוכחי — TTS ישתמש בזה */
export function promptForState(state: string, ctx: OrderContext): string {
  switch (state) {
    case 'greeting':
      return 'שלום, הגעת למחלקת ההזמנות. במה אפשר לעזור?';
    case 'identify':
      return 'באיזה שם נרשום את ההזמנה?';
    case 'eventType':
      return 'איזה סוג אירוע תרצה להזמין? חתונה, בר מצווה, ברית או משהו אחר?';
    case 'date':
      return 'מתי האירוע? אפשר להגיד תאריך מדויק או למשל "בשבת הבאה".';
    case 'guests':
      return 'כמה אורחים צפויים להגיע?';
    case 'menu':
      return 'איזה תפריט תרצה? יש לנו בשרי, חלבי, צמחוני, וגם אפשרויות גלאט.';
    case 'confirm': {
      const o = ctx.order;
      return `לסיכום: ${o.eventType ?? 'אירוע'} בתאריך ${o.date ?? '—'} ל-${o.guestCount ?? '—'} אורחים, תפריט ${o.menuItems?.join(', ') ?? '—'}. לאשר?`;
    }
    case 'payment':
      return 'מעולה. אעביר אותך כעת למחלקת התשלומים להשלמת ההזמנה.';
    case 'goodbye':
      return 'תודה רבה, ההזמנה נקלטה. נדבר בקרוב, יום נעים!';
    case 'escalation':
      return 'מעביר אותך לנציג אנושי, רגע בבקשה.';
    default:
      return 'אני לא בטוח שהבנתי. אפשר להגיד שוב?';
  }
}
