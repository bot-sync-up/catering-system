// אדפטר Web Widget — WebSocket/HTTP streaming
// מיועד לאינטגרציה עם widget JS שמוטמע באתר Sync Up

import { CateringChatbot } from "../CateringChatbot.js";

export interface WebSession {
  sessionId: string;
  bot: CateringChatbot;
  createdAt: Date;
  lastActivity: Date;
}

export class WebWidgetChannel {
  private readonly sessions = new Map<string, WebSession>();
  private readonly sessionTtlMin: number;

  constructor(
    private readonly chatbotFactory: (sessionId: string) => CateringChatbot,
    options: { sessionTtlMinutes?: number } = {},
  ) {
    this.sessionTtlMin = options.sessionTtlMinutes ?? 60;
  }

  startSession(sessionId: string): WebSession {
    const session: WebSession = {
      sessionId,
      bot: this.chatbotFactory(sessionId),
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async handleMessage(
    sessionId: string,
    text: string,
  ): Promise<{ reply: string; escalated: boolean }> {
    let session = this.sessions.get(sessionId);
    if (!session) session = this.startSession(sessionId);
    session.lastActivity = new Date();
    const r = await session.bot.sendMessage(text);
    return { reply: r.reply, escalated: r.escalated };
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * מוחק סשנים שעברו את ה-TTL. נקרא מ-setInterval.
   */
  reapStaleSessions(): number {
    const cutoff = Date.now() - this.sessionTtlMin * 60_000;
    let removed = 0;
    for (const [id, s] of this.sessions.entries()) {
      if (s.lastActivity.getTime() < cutoff) {
        this.sessions.delete(id);
        removed++;
      }
    }
    return removed;
  }

  activeSessionCount(): number {
    return this.sessions.size;
  }
}
