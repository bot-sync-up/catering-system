/**
 * sandbox-rate-limits.ts
 *
 * Per-tenant rate limits for demo/sandbox tenants. Prevents abuse / spam.
 * Enforced by API gateway middleware (Fastify + redis token bucket).
 */

export interface DemoRateLimitProfile {
  api_calls_per_hour: number;
  whatsapp_messages_per_day: number;
  sms_per_day: number;
  emails_per_day: number;
  ocr_invocations_per_day: number;
  ai_questions_per_day: number;
  exports_per_day: number;
  webhooks_outbound_per_hour: number;
}

export const RATE_LIMIT_PROFILES: Record<string, DemoRateLimitProfile> = {
  // For 7-day trial — most generous, since prospect is engaged
  "trial-7d": {
    api_calls_per_hour: 2000,
    whatsapp_messages_per_day: 100,
    sms_per_day: 25,
    emails_per_day: 200,
    ocr_invocations_per_day: 50,
    ai_questions_per_day: 100,
    exports_per_day: 20,
    webhooks_outbound_per_hour: 500,
  },

  // For 14-day trial — standard usage
  "trial-14d": {
    api_calls_per_hour: 1000,
    whatsapp_messages_per_day: 50,
    sms_per_day: 10,
    emails_per_day: 100,
    ocr_invocations_per_day: 30,
    ai_questions_per_day: 50,
    exports_per_day: 10,
    webhooks_outbound_per_hour: 200,
  },

  // For 30-day trial — conservative (longer window)
  "trial-30d": {
    api_calls_per_hour: 800,
    whatsapp_messages_per_day: 30,
    sms_per_day: 5,
    emails_per_day: 50,
    ocr_invocations_per_day: 20,
    ai_questions_per_day: 30,
    exports_per_day: 5,
    webhooks_outbound_per_hour: 100,
  },

  // For internal sales demo (no end user) — strict but functional
  "internal-demo": {
    api_calls_per_hour: 500,
    whatsapp_messages_per_day: 20,
    sms_per_day: 3,
    emails_per_day: 20,
    ocr_invocations_per_day: 10,
    ai_questions_per_day: 15,
    exports_per_day: 3,
    webhooks_outbound_per_hour: 50,
  },
};

export interface QuotaCheck {
  resource: keyof DemoRateLimitProfile;
  used: number;
  limit: number;
  reset_at: string;
  blocked: boolean;
}

/**
 * Pure utility — given current usage and a profile, return blocking decision.
 * Returned for unit-testability; actual enforcement happens in the gateway.
 */
export function checkQuota(
  resource: keyof DemoRateLimitProfile,
  used: number,
  profile: DemoRateLimitProfile,
  resetAt: Date
): QuotaCheck {
  const limit = profile[resource];
  return {
    resource,
    used,
    limit,
    reset_at: resetAt.toISOString(),
    blocked: used >= limit,
  };
}

/**
 * Suggested rejection response body. Localized he-IL for end-users hitting the UI,
 * English for API consumers (header X-Lang determines).
 */
export function rateLimitResponse(check: QuotaCheck, lang: "he" | "en" = "he") {
  const messages = {
    he: `הגעת למכסת ${check.resource} בסביבת הדמו (${check.used}/${check.limit}). תוכל להמשיך אחרי ${check.reset_at}, או לעבור לחבילה מסחרית.`,
    en: `Demo quota exceeded for ${check.resource} (${check.used}/${check.limit}). Resets at ${check.reset_at}, or upgrade to a paid plan.`,
  };
  return {
    error: "rate_limit_exceeded",
    message: messages[lang],
    quota: check,
    upgrade_url: "https://syncup.co.il/pricing",
  };
}
