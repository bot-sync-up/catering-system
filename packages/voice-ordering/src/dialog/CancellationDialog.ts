// מכונת מצבים לביטול הזמנה — כולל מדיניות וזיהוי
import { setup, assign, createActor } from 'xstate';

export interface CancelContext {
  callSid: string;
  orderId?: string;
  reason?: string;
  attempts: number;
  refundEligible?: boolean;
}

export type CancelEvent =
  | { type: 'PROVIDE_ID'; orderId: string }
  | { type: 'PROVIDE_REASON'; reason: string }
  | { type: 'CONFIRM_CANCEL' }
  | { type: 'KEEP_ORDER' }
  | { type: 'POLICY_OK'; refundEligible: boolean }
  | { type: 'ESCALATE' };

export const cancellationDialogMachine = setup({
  types: {
    context: {} as CancelContext,
    events: {} as CancelEvent,
    input: {} as { callSid: string } | undefined,
  },
  actions: {
    setOrderId: assign({
      orderId: ({ event }) => (event.type === 'PROVIDE_ID' ? event.orderId : undefined),
    }),
    setReason: assign({
      reason: ({ event }) => (event.type === 'PROVIDE_REASON' ? event.reason : undefined),
    }),
    setRefund: assign({
      refundEligible: ({ event }) =>
        event.type === 'POLICY_OK' ? event.refundEligible : undefined,
    }),
    incAttempt: assign({ attempts: ({ context }) => context.attempts + 1 }),
  },
}).createMachine({
  id: 'cancellationDialog',
  initial: 'identify',
  context: ({ input }) => ({
    callSid: input?.callSid ?? '',
    attempts: 0,
  }),
  states: {
    identify: {
      on: {
        PROVIDE_ID: { target: 'reason', actions: 'setOrderId' },
        ESCALATE: 'escalation',
      },
    },
    reason: {
      on: {
        PROVIDE_REASON: { target: 'checkPolicy', actions: 'setReason' },
        ESCALATE: 'escalation',
      },
    },
    checkPolicy: {
      on: {
        POLICY_OK: { target: 'confirm', actions: 'setRefund' },
        ESCALATE: 'escalation',
      },
    },
    confirm: {
      on: {
        CONFIRM_CANCEL: 'cancelled',
        KEEP_ORDER: 'kept',
        ESCALATE: 'escalation',
      },
    },
    cancelled: { type: 'final' },
    kept: { type: 'final' },
    escalation: { type: 'final' },
  },
});

export function startCancellationDialog(callSid: string) {
  const actor = createActor(cancellationDialogMachine, { input: { callSid } });
  actor.start();
  return actor;
}
