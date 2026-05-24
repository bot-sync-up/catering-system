// מכונת מצבים לבירור סטטוס הזמנה
import { setup, assign, createActor } from 'xstate';

export interface StatusContext {
  callSid: string;
  orderId?: string;
  customerPhone?: string;
  attempts: number;
}

export type StatusEvent =
  | { type: 'PROVIDE_ID'; orderId: string }
  | { type: 'PROVIDE_PHONE'; phone: string }
  | { type: 'NOT_FOUND' }
  | { type: 'FOUND'; status: string }
  | { type: 'ESCALATE' };

export const statusDialogMachine = setup({
  types: {
    context: {} as StatusContext,
    events: {} as StatusEvent,
    input: {} as { callSid: string } | undefined,
  },
  actions: {
    setOrderId: assign({
      orderId: ({ event }) => (event.type === 'PROVIDE_ID' ? event.orderId : undefined),
    }),
    setPhone: assign({
      customerPhone: ({ event }) => (event.type === 'PROVIDE_PHONE' ? event.phone : undefined),
    }),
    incAttempt: assign({ attempts: ({ context }) => context.attempts + 1 }),
  },
  guards: {
    tooManyAttempts: ({ context }) => context.attempts >= 3,
  },
}).createMachine({
  id: 'statusDialog',
  initial: 'askIdentifier',
  context: ({ input }) => ({
    callSid: input?.callSid ?? '',
    attempts: 0,
  }),
  states: {
    askIdentifier: {
      on: {
        PROVIDE_ID: { target: 'lookup', actions: 'setOrderId' },
        PROVIDE_PHONE: { target: 'lookup', actions: 'setPhone' },
        ESCALATE: 'escalation',
      },
    },
    lookup: {
      on: {
        FOUND: 'report',
        NOT_FOUND: { target: 'askIdentifier', actions: 'incAttempt' },
        ESCALATE: 'escalation',
      },
      always: { guard: 'tooManyAttempts', target: 'escalation' },
    },
    report: { type: 'final' },
    escalation: { type: 'final' },
  },
});

export function startStatusDialog(callSid: string) {
  const actor = createActor(statusDialogMachine, { input: { callSid } });
  actor.start();
  return actor;
}
