import { describe, it, expect, beforeEach } from "vitest";
import {
  trackUsage,
  getUsageSummary,
  costFor,
  resetUsageTracking,
} from "../src/cost/costTracker.js";
import {
  acquireToken,
  configureRateLimit,
  resetRateLimits,
} from "../src/cost/rateLimit.js";

describe("costTracker", () => {
  beforeEach(() => resetUsageTracking());

  it("מחשב עלות עבור Opus 4.7", () => {
    const c = costFor({
      tag: "test",
      model: "claude-opus-4-7",
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    expect(c).toBeCloseTo(15, 2);
  });

  it("מסכם usage לפי tag", () => {
    trackUsage({
      tag: "chatbot",
      model: "claude-opus-4-7",
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    trackUsage({
      tag: "sentiment",
      model: "claude-opus-4-7",
      inputTokens: 200,
      outputTokens: 100,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    const s = getUsageSummary();
    expect(s.eventCount).toBe(2);
    expect(Object.keys(s.byTag)).toContain("chatbot");
    expect(Object.keys(s.byTag)).toContain("sentiment");
  });

  it("מחשב cache hit rate", () => {
    trackUsage({
      tag: "x",
      model: "claude-opus-4-7",
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 0,
      cacheReadTokens: 900,
    });
    const s = getUsageSummary();
    expect(s.cacheHitRate).toBeCloseTo(0.9, 2);
  });
});

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("מאפשר רכישות עד הקיבולת", async () => {
    configureRateLimit("test", { capacity: 3, refillPerSecond: 100 });
    const start = Date.now();
    await acquireToken("test");
    await acquireToken("test");
    await acquireToken("test");
    expect(Date.now() - start).toBeLessThan(50);
  });
});
