// CateringChatbot — האורקסטרטור הראשי של בוט שירות הלקוחות
// מטפל בהודעות נכנסות, ריצת tools, prompt caching, escalation

import type Anthropic from "@anthropic-ai/sdk";
import {
  createMessage,
  extractText,
  extractToolUses,
} from "../shared/anthropicClient.js";
import {
  SYSTEM_PROMPT_HE,
  FEW_SHOT_EXAMPLES_HE,
} from "./promptTemplates.js";
import { CHATBOT_TOOLS, type ToolRunner } from "./tools.js";
import {
  KnowledgeBase,
  type KnowledgeDoc,
  formatResultsAsContext,
} from "./contextRetrieval.js";
import {
  createHandoffTicket,
  shouldAutoEscalate,
  type HandoffSink,
  type HandoffTicket,
} from "./handoff.js";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotConfig {
  toolRunner: ToolRunner;
  knowledgeBase?: KnowledgeBase;
  handoffSink?: HandoffSink;
  maxTurns?: number; // מספר tool-call rounds מקסימלי לפני עצירה
  customerId?: string;
}

export interface ChatResponse {
  reply: string;
  toolsUsed: string[];
  escalated: boolean;
  handoffTicket?: HandoffTicket;
}

export class CateringChatbot {
  private readonly cfg: ChatbotConfig;
  private readonly history: ConversationTurn[] = [];

  constructor(config: ChatbotConfig) {
    this.cfg = { maxTurns: 5, ...config };
  }

  /**
   * שולח הודעת משתמש ומחזיר תגובה. שומר את ההיסטוריה אוטומטית.
   */
  async sendMessage(userMessage: string): Promise<ChatResponse> {
    // בדיקת escalation מהירה לפני שמשלמים על קריאה ל-LLM
    const auto = shouldAutoEscalate(userMessage);
    if (auto.escalate) {
      this.history.push({ role: "user", content: userMessage });
      const ticket = await createHandoffTicket({
        reason: auto.reason!,
        priority: auto.priority!,
        transcript: this.history,
        customerId: this.cfg.customerId,
        sink: this.cfg.handoffSink,
      });
      const reply = `הבנתי, אני מעבירה אותך לנציג אנושי. כרטיס תמיכה ${ticket.ticketId} נפתח, נציג יחזור אליך תוך ${ticket.estimatedResponseMinutes} דקות.`;
      this.history.push({ role: "assistant", content: reply });
      return {
        reply,
        toolsUsed: [],
        escalated: true,
        handoffTicket: ticket,
      };
    }

    this.history.push({ role: "user", content: userMessage });

    // הזרקת קונטקסט RAG אם יש knowledge base
    let systemPrompt = SYSTEM_PROMPT_HE;
    if (this.cfg.knowledgeBase && this.cfg.knowledgeBase.size() > 0) {
      const ragResults = this.cfg.knowledgeBase.search(userMessage, 3);
      if (ragResults.length > 0) {
        systemPrompt +=
          "\n\n# קונטקסט רלוונטי ממאגר הידע (השתמש לפי הצורך):\n" +
          formatResultsAsContext(ragResults);
      }
    }

    const messages: Anthropic.MessageParam[] = [
      ...FEW_SHOT_EXAMPLES_HE,
      ...this.history.map((h) => ({ role: h.role, content: h.content })),
    ];

    const toolsUsed: string[] = [];
    let escalated = false;
    let handoffTicket: HandoffTicket | undefined;
    let finalText = "";

    for (let turn = 0; turn < this.cfg.maxTurns!; turn++) {
      const response = await createMessage({
        callerTag: "chatbot",
        maxTokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages,
        tools: CHATBOT_TOOLS,
      });

      const toolUses = extractToolUses(response);

      if (toolUses.length === 0) {
        finalText = extractText(response);
        break;
      }

      // assistant turn עם tool_use blocks
      messages.push({ role: "assistant", content: response.content });

      // הרצת כל הכלים והחזרת תוצאות
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        toolsUsed.push(tu.name);
        try {
          const result = await this.runTool(tu);
          // טיפול ב-escalation כתוצאה מקריאה לכלי
          if (tu.name === "escalate_to_human") {
            escalated = true;
            const input = tu.input as {
              reason: string;
              summary: string;
              priority: string;
            };
            handoffTicket = await createHandoffTicket({
              reason: input.reason as HandoffTicket["reason"],
              priority: input.priority as HandoffTicket["priority"],
              transcript: this.history,
              customerId: this.cfg.customerId,
              sink: this.cfg.handoffSink,
            });
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: `שגיאה: ${(err as Error).message}`,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    if (!finalText) {
      finalText =
        "סליחה, נתקלתי בקושי לעבד את הבקשה. אשמח אם תנסח/י שוב או אעביר לנציג אנושי.";
    }

    this.history.push({ role: "assistant", content: finalText });

    return {
      reply: finalText,
      toolsUsed,
      escalated,
      handoffTicket,
    };
  }

  private async runTool(
    tu: Anthropic.ToolUseBlock,
  ): Promise<unknown> {
    const r = this.cfg.toolRunner;
    const input = tu.input as Record<string, unknown>;
    switch (tu.name) {
      case "search_faq":
        return r.search_faq(input as { query: string; category?: string });
      case "get_order_status":
        return r.get_order_status(input as { order_id: string });
      case "request_quote":
        return r.request_quote(input);
      case "find_menu_item":
        return r.find_menu_item(
          input as {
            query: string;
            category?: string;
            kosher?: string;
            exclude_allergens?: string[];
          },
        );
      case "escalate_to_human":
        return r.escalate_to_human(
          input as { reason: string; summary: string; priority: string },
        );
      default:
        throw new Error(`כלי לא מוכר: ${tu.name}`);
    }
  }

  getHistory(): ConversationTurn[] {
    return [...this.history];
  }

  resetHistory(): void {
    this.history.length = 0;
  }
}

export { type KnowledgeDoc, KnowledgeBase } from "./contextRetrieval.js";
export type { HandoffTicket, HandoffSink } from "./handoff.js";
export type { ToolRunner } from "./tools.js";
