import { describe, it, expect, afterEach } from "vitest";
import { SentimentAnalyzer } from "../src/sentiment/SentimentAnalyzer.js";
import { TopicExtractor } from "../src/sentiment/topicExtractor.js";
import { AlertEngine } from "../src/sentiment/alertEngine.js";
import { installAnthropicMock, clearAnthropicMock } from "./anthropicMock.js";
import { clearMemCache } from "../src/cost/redisCache.js";

afterEach(() => {
  clearAnthropicMock();
  clearMemCache();
});

describe("SentimentAnalyzer", () => {
  it("מנתח טקסט חיובי", async () => {
    installAnthropicMock([
      {
        text: '{"label":"very_positive","score":0.9,"confidence":0.95,"emotions":["שמחה","הודיה"],"reasoning":"מילים חיוביות מובהקות"}',
      },
    ]);
    const a = new SentimentAnalyzer();
    const r = await a.analyze("האירוע היה מושלם, האוכל פנטסטי!");
    expect(r.label).toBe("very_positive");
    expect(r.score).toBeGreaterThan(0.5);
  });

  it("נופל ל-neutral במקרה של JSON שבור", async () => {
    installAnthropicMock([{ text: "not json at all" }]);
    const a = new SentimentAnalyzer();
    const r = await a.analyze("טקסט כלשהו");
    expect(r.label).toBe("neutral");
  });
});

describe("TopicExtractor", () => {
  it("מחלץ נושאים מתלונה", async () => {
    installAnthropicMock([
      {
        text: '{"topics":[{"topic":"food_quality","weight":0.7},{"topic":"delay","weight":0.3}]}',
      },
    ]);
    const t = new TopicExtractor();
    const r = await t.extract("האוכל היה קר והגיע באיחור של שעה");
    expect(r.topics.map((x) => x.topic)).toContain("food_quality");
    expect(r.topics.map((x) => x.topic)).toContain("delay");
  });
});

describe("AlertEngine", () => {
  it("מפעיל התראה כשמספיק משובים שליליים מצטברים", () => {
    const eng = new AlertEngine();
    const event = {
      timestamp: new Date(),
      sentiment: {
        label: "negative" as const,
        score: -0.8,
        confidence: 0.9,
        emotions: [],
      },
      topics: {
        topics: [
          { topic: "food_quality" as const, label: "אוכל", weight: 0.9 },
        ],
      },
    };
    eng.ingest(event);
    eng.ingest(event);
    const alerts = eng.ingest(event);
    expect(alerts.some((a) => a.topic === "food_quality")).toBe(true);
  });

  it("התראת kosher מיידית אחרי משוב אחד שלילי", () => {
    const eng = new AlertEngine();
    const alerts = eng.ingest({
      timestamp: new Date(),
      sentiment: {
        label: "negative",
        score: -0.7,
        confidence: 0.9,
        emotions: [],
      },
      topics: {
        topics: [{ topic: "kosher", label: "כשרות", weight: 0.9 }],
      },
    });
    expect(alerts.some((a) => a.topic === "kosher")).toBe(true);
  });
});
