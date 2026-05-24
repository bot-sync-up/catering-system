import type { Hook, HookContext, SideEffectEvent } from './types';
import type { OrderStatusKey } from '../order/stateMachine';

/**
 * Registry של hooks — נרשמים לפי מעבר סטטוס מסוים, או "any".
 * המנגנון הזה מאפשר לבדוק side-effects בלי DB אמיתי (in-memory bus).
 */

type Key = `${OrderStatusKey | '*'}->${OrderStatusKey | '*'}`;

class HookRegistry {
  private hooks = new Map<Key, Hook[]>();

  on(from: OrderStatusKey | '*', to: OrderStatusKey | '*', hook: Hook): void {
    const key: Key = `${from}->${to}`;
    const list = this.hooks.get(key) ?? [];
    list.push(hook);
    this.hooks.set(key, list);
  }

  /** מריץ את כל ה-hooks הרלוונטיים. אוסף אירועי side-effect. */
  async run(ctx: Omit<HookContext, 'emit'>): Promise<SideEffectEvent[]> {
    const events: SideEffectEvent[] = [];
    const emit = (e: SideEffectEvent) => events.push(e);
    const fullCtx: HookContext = { ...ctx, emit };

    const fromKey = ctx.fromStatus ?? '*';
    const candidates: Key[] = [
      `${fromKey}->${ctx.toStatus}`,
      `*->${ctx.toStatus}`,
      `${fromKey}->*`,
      `*->*`,
    ];

    for (const key of candidates) {
      const list = this.hooks.get(key) ?? [];
      for (const hook of list) {
        await hook(fullCtx);
      }
    }
    return events;
  }

  clear(): void {
    this.hooks.clear();
  }
}

export const hookRegistry = new HookRegistry();
export type { HookContext, SideEffectEvent } from './types';
