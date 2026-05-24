// אדפטר WhatsApp Cloud API
// קלט: webhook payload; פלט: שליחת הודעה דרך Graph API

import { CateringChatbot } from "../CateringChatbot.js";

export interface WhatsAppMessage {
  from: string; // מספר טלפון של הלקוח
  text: string;
  messageId: string;
  timestamp: number;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string; // ברירת מחדל v22.0
}

/**
 * מנהל סשנים פר-לקוח (לפי מספר טלפון).
 */
export class WhatsAppChannel {
  private readonly sessions = new Map<string, CateringChatbot>();

  constructor(
    private readonly cfg: WhatsAppConfig,
    private readonly chatbotFactory: (customerId: string) => CateringChatbot,
  ) {}

  /**
   * מקבל webhook payload ומחזיר רשימת הודעות שיצא לשלוח.
   * (השליחה עצמה נעשית ב-sendReply כדי לאפשר בדיקות בלי רשת.)
   */
  async handleIncoming(msg: WhatsAppMessage): Promise<{
    reply: string;
    escalated: boolean;
  }> {
    let bot = this.sessions.get(msg.from);
    if (!bot) {
      bot = this.chatbotFactory(msg.from);
      this.sessions.set(msg.from, bot);
    }
    const result = await bot.sendMessage(msg.text);
    return { reply: result.reply, escalated: result.escalated };
  }

  async sendReply(to: string, text: string): Promise<void> {
    const v = this.cfg.apiVersion ?? "v22.0";
    const url = `https://graph.facebook.com/${v}/${this.cfg.phoneNumberId}/messages`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
  }

  /**
   * מנקה סשנים ישנים — נקרא מ-cron לדוגמה כל שעה.
   */
  cleanupOldSessions(maxAgeMinutes: number): number {
    const _ = maxAgeMinutes; // מימוש מלא דורש last-activity-tracking — placeholder
    let removed = 0;
    if (this.sessions.size > 1000) {
      const keys = Array.from(this.sessions.keys()).slice(0, 500);
      for (const k of keys) {
        this.sessions.delete(k);
        removed++;
      }
    }
    return removed;
  }

  /**
   * פרסור payload גולמי מ-WhatsApp webhook.
   */
  static parseWebhookPayload(payload: unknown): WhatsAppMessage[] {
    const out: WhatsAppMessage[] = [];
    type Entry = {
      changes?: Array<{
        value?: { messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          text?: { body?: string };
        }> };
      }>;
    };
    const entries = (payload as { entry?: Entry[] })?.entry ?? [];
    for (const e of entries) {
      for (const c of e.changes ?? []) {
        for (const m of c.value?.messages ?? []) {
          if (m.text?.body && m.from && m.id) {
            out.push({
              from: m.from,
              text: m.text.body,
              messageId: m.id,
              timestamp: m.timestamp ? parseInt(m.timestamp, 10) : Date.now(),
            });
          }
        }
      }
    }
    return out;
  }
}
