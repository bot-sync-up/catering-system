import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CateringChatbot } from "../src/chatbot/CateringChatbot.js";
import { KnowledgeBase } from "../src/chatbot/contextRetrieval.js";
import type { ToolRunner } from "../src/chatbot/tools.js";
import { installAnthropicMock, clearAnthropicMock } from "./anthropicMock.js";
import { resetUsageTracking } from "../src/cost/costTracker.js";
import { resetRateLimits } from "../src/cost/rateLimit.js";

const stubToolRunner: ToolRunner = {
  async search_faq() {
    return [{ question: "מה השעות?", answer: "8:00-22:00", category: "general" }];
  },
  async get_order_status() {
    return {
      order_id: "ORD-1",
      status: "confirmed",
      event_date: "2026-08-15",
      guest_count: 150,
      total_price: 45000,
      currency: "ILS",
    };
  },
  async request_quote() {
    return {
      quote_id: "QUO-9",
      estimated_price: 60000,
      currency: "ILS",
      valid_until: "2026-06-01",
    };
  },
  async find_menu_item() {
    return [
      {
        id: "M1",
        name: "סלמון אפוי",
        price_per_guest: 85,
        kosher: "pareve",
        allergens: ["fish"],
      },
    ];
  },
  async escalate_to_human() {
    return { ticket_id: "T-1", estimated_response_minutes: 15 };
  },
};

beforeEach(() => {
  resetUsageTracking();
  resetRateLimits();
});

afterEach(() => clearAnthropicMock());

describe("CateringChatbot", () => {
  it("מחזיר תשובה כשאין צורך בכלים", async () => {
    installAnthropicMock([{ text: "שלום, איך אוכל לעזור?" }]);
    const bot = new CateringChatbot({ toolRunner: stubToolRunner });
    const r = await bot.sendMessage("היי");
    expect(r.reply).toContain("שלום");
    expect(r.escalated).toBe(false);
    expect(r.toolsUsed).toEqual([]);
  });

  it("מריץ כלי וחוזר עם תוצאה ל-Claude", async () => {
    installAnthropicMock([
      {
        toolUses: [
          {
            id: "tu_1",
            name: "get_order_status",
            input: { order_id: "ORD-1" },
          },
        ],
      },
      { text: "ההזמנה ORD-1 אושרה ל-15.8.2026, 150 איש." },
    ]);
    const bot = new CateringChatbot({ toolRunner: stubToolRunner });
    const r = await bot.sendMessage("מה הסטטוס של ORD-1?");
    expect(r.toolsUsed).toEqual(["get_order_status"]);
    expect(r.reply).toContain("ORD-1");
  });

  it("מבצע auto-escalation על מילים רגישות", async () => {
    const bot = new CateringChatbot({ toolRunner: stubToolRunner });
    const r = await bot.sendMessage("אבא נפטר אתמול, אנחנו עורכים אזכרה");
    expect(r.escalated).toBe(true);
    expect(r.handoffTicket?.reason).toBe("bereavement");
  });

  it("שומר היסטוריית שיחה", async () => {
    installAnthropicMock([{ text: "תשובה 1" }, { text: "תשובה 2" }]);
    const bot = new CateringChatbot({ toolRunner: stubToolRunner });
    await bot.sendMessage("שאלה 1");
    await bot.sendMessage("שאלה 2");
    const hist = bot.getHistory();
    expect(hist).toHaveLength(4);
    expect(hist[0].role).toBe("user");
    expect(hist[3].role).toBe("assistant");
  });

  it("מזריק תוצאות RAG ל-system prompt", async () => {
    const kb = new KnowledgeBase();
    kb.add({
      id: "1",
      title: "מדיניות ביטולים",
      content: "ניתן לבטל עד 14 ימים לפני האירוע ללא קנס",
    });
    const mock = installAnthropicMock([{ text: "לפי המדיניות שלנו..." }]);
    const bot = new CateringChatbot({
      toolRunner: stubToolRunner,
      knowledgeBase: kb,
    });
    await bot.sendMessage("מה מדיניות הביטולים?");
    const lastReq = mock.lastRequest() as {
      system: Array<{ text: string }>;
    };
    const systemText = lastReq.system.map((b) => b.text).join("");
    expect(systemText).toContain("מדיניות ביטולים");
  });
});
