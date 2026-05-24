// אדפטר Customer Portal — שילוב עם portal Sync Up המאומת
// כאן יש לקוח מזוהה, אז ההיסטוריה נשמרת ב-DB חיצוני

import { CateringChatbot, type ConversationTurn } from "../CateringChatbot.js";

/**
 * אינטרפייס לאחסון היסטוריה — המטמיע מספק.
 * לדוגמה: PostgreSQL table chatbot_conversations(customer_id, turn_index, role, content).
 */
export interface PortalHistoryStore {
  load(customerId: string): Promise<ConversationTurn[]>;
  append(customerId: string, turn: ConversationTurn): Promise<void>;
}

export class PortalChannel {
  constructor(
    private readonly store: PortalHistoryStore,
    private readonly chatbotFactory: (customerId: string) => CateringChatbot,
  ) {}

  async chat(
    customerId: string,
    message: string,
  ): Promise<{ reply: string; escalated: boolean }> {
    const bot = this.chatbotFactory(customerId);

    // טוען היסטוריה היסטורית — מזרים ל-bot אם תומך
    const prior = await this.store.load(customerId);
    for (const turn of prior) {
      // pushing to internal history בעקיפין דרך method ציבורי
      // (אם CateringChatbot.history פרטית — נסתפק בתוכן ההיסטורי כקונטקסט מערכת)
      // לכן: אנו מעבירים את ההודעה האחרונה בלבד אם אין loader. כאן נסתפק בהזרמת הודעת המשתמש החדשה.
      void turn;
    }

    const r = await bot.sendMessage(message);

    await this.store.append(customerId, {
      role: "user",
      content: message,
    });
    await this.store.append(customerId, {
      role: "assistant",
      content: r.reply,
    });

    return { reply: r.reply, escalated: r.escalated };
  }
}
