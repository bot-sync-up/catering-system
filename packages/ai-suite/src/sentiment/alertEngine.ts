// מנוע התראות — מקבל זרם משובים, יוצר התראות לפי כללים
// לדוגמה: 3 משובים שליליים על אותו נושא ב-24 שעות => התראה אדומה

import type { SentimentResult } from "./SentimentAnalyzer.js";
import type { TopicResult, Topic } from "./topicExtractor.js";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  topic: Topic | "overall";
  message: string;
  occurrencesInWindow: number;
  createdAt: Date;
}

export interface AlertRule {
  topic: Topic | "overall";
  windowMinutes: number;
  minOccurrences: number;
  minScoreAbsolute: number; // לדוגמה 0.6 = שלילי או חיובי מאוד
  severity: AlertSeverity;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    topic: "food_quality",
    windowMinutes: 60 * 24,
    minOccurrences: 3,
    minScoreAbsolute: 0.6,
    severity: "critical",
  },
  {
    topic: "delay",
    windowMinutes: 60 * 4,
    minOccurrences: 2,
    minScoreAbsolute: 0.5,
    severity: "warning",
  },
  {
    topic: "kosher",
    windowMinutes: 60 * 24,
    minOccurrences: 1,
    minScoreAbsolute: 0.5,
    severity: "critical",
  },
  {
    topic: "overall",
    windowMinutes: 60 * 24,
    minOccurrences: 5,
    minScoreAbsolute: 0.4,
    severity: "warning",
  },
];

interface FeedbackEvent {
  timestamp: Date;
  sentiment: SentimentResult;
  topics: TopicResult;
}

let _alertCounter = 1;

export class AlertEngine {
  private buffer: FeedbackEvent[] = [];

  constructor(
    private readonly rules: AlertRule[] = DEFAULT_ALERT_RULES,
  ) {}

  ingest(event: FeedbackEvent): Alert[] {
    this.buffer.push(event);
    // ניקוי אירועים ישנים מהזיכרון
    const oldestNeeded = Math.max(...this.rules.map((r) => r.windowMinutes));
    const cutoff = Date.now() - oldestNeeded * 60_000;
    this.buffer = this.buffer.filter(
      (e) => e.timestamp.getTime() >= cutoff,
    );
    return this.evaluate();
  }

  private evaluate(): Alert[] {
    const out: Alert[] = [];
    for (const rule of this.rules) {
      const cutoff = Date.now() - rule.windowMinutes * 60_000;
      const matches = this.buffer.filter((e) => {
        if (e.timestamp.getTime() < cutoff) return false;
        if (Math.abs(e.sentiment.score) < rule.minScoreAbsolute) return false;
        if (rule.topic === "overall") return e.sentiment.score < 0;
        return e.topics.topics.some(
          (t) => t.topic === rule.topic && t.weight > 0.2,
        );
      });
      if (matches.length >= rule.minOccurrences) {
        out.push({
          id: `ALERT-${_alertCounter++}`,
          severity: rule.severity,
          topic: rule.topic,
          message: this.formatMessage(rule, matches.length),
          occurrencesInWindow: matches.length,
          createdAt: new Date(),
        });
      }
    }
    return out;
  }

  private formatMessage(rule: AlertRule, count: number): string {
    const topicHe: Record<string, string> = {
      food_quality: "איכות אוכל",
      service: "שירות",
      price: "מחיר",
      delay: "איחור",
      facility: "מתקנים",
      kosher: "כשרות",
      presentation: "הגשה",
      communication: "תקשורת",
      other: "אחר",
      overall: "כללי",
    };
    return `התראה ${rule.severity.toUpperCase()}: ${count} משובים שליליים על ${topicHe[rule.topic]} ב-${rule.windowMinutes / 60} השעות האחרונות.`;
  }

  clear(): void {
    this.buffer.length = 0;
  }
}
