// מעקב עלויות שימוש ב-Claude API
// תעריפים נכון ל-2026, ב-USD לכל מיליון טוקנים

interface ModelPricing {
  input: number;
  output: number;
  cacheWrite: number; // 1.25x input
  cacheRead: number; // 0.1x input
}

const PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  "claude-sonnet-4-7": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "claude-haiku-4-5": {
    input: 0.8,
    output: 4,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
};

export interface UsageEvent {
  tag: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  timestamp?: Date;
}

export interface UsageSummary {
  totalCallsUSD: number;
  byTag: Record<string, number>;
  byModel: Record<string, number>;
  cacheHitRate: number;
  eventCount: number;
}

const _events: UsageEvent[] = [];

function priceFor(model: string): ModelPricing {
  // התאמת prefix אם המודל מכיל suffix של גרסה
  for (const [key, val] of Object.entries(PRICING)) {
    if (model.startsWith(key)) return val;
  }
  return PRICING["claude-opus-4-7"]; // default
}

export function costFor(event: UsageEvent): number {
  const p = priceFor(event.model);
  const M = 1_000_000;
  return (
    (event.inputTokens * p.input) / M +
    (event.outputTokens * p.output) / M +
    (event.cacheCreationTokens * p.cacheWrite) / M +
    (event.cacheReadTokens * p.cacheRead) / M
  );
}

export function trackUsage(event: UsageEvent): void {
  _events.push({ ...event, timestamp: event.timestamp ?? new Date() });
  // הגנה מפני זליגת זיכרון — שומר רק 10000 אחרונים
  if (_events.length > 10000) _events.splice(0, _events.length - 10000);
}

export function getUsageSummary(filter?: {
  tag?: string;
  since?: Date;
}): UsageSummary {
  const filtered = _events.filter((e) => {
    if (filter?.tag && e.tag !== filter.tag) return false;
    if (filter?.since && e.timestamp! < filter.since) return false;
    return true;
  });

  const byTag: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  let total = 0;
  let totalCacheReads = 0;
  let totalInputs = 0;

  for (const e of filtered) {
    const c = costFor(e);
    total += c;
    byTag[e.tag] = (byTag[e.tag] ?? 0) + c;
    byModel[e.model] = (byModel[e.model] ?? 0) + c;
    totalCacheReads += e.cacheReadTokens;
    totalInputs += e.inputTokens + e.cacheReadTokens;
  }

  return {
    totalCallsUSD: total,
    byTag,
    byModel,
    cacheHitRate: totalInputs > 0 ? totalCacheReads / totalInputs : 0,
    eventCount: filtered.length,
  };
}

export function resetUsageTracking(): void {
  _events.length = 0;
}
