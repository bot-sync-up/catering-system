import Anthropic from "@anthropic-ai/sdk";
import { trackUsage } from "../cost/costTracker.js";
import { acquireToken } from "../cost/rateLimit.js";

// המודל הראשי לכל החבילה. ניתן לדריסה דרך משתנה סביבה.
export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";

let _client: Anthropic | null = null;

/**
 * Singleton client. מאפשר הזרקה של client חלופי בבדיקות.
 */
export function getAnthropicClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY לא הוגדר. הגדר משתנה סביבה לפני שימוש ב-ai-suite.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * עבור בדיקות יחידה — מאפשר להזריק client מדומה.
 */
export function setAnthropicClient(client: Anthropic | null): void {
  _client = client;
}

export interface CreateMessageOptions {
  system?: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
  /** מזהה הקריאה לצורכי מעקב עלויות */
  callerTag?: string;
}

/**
 * עטיפה ל-messages.create המוסיפה:
 * - prompt caching אוטומטי על system + tools
 * - מעקב עלויות
 * - rate limiting
 */
export async function createMessage(
  opts: CreateMessageOptions,
): Promise<Anthropic.Message> {
  await acquireToken(opts.callerTag ?? "default");
  const client = getAnthropicClient();

  // הופך system למבנה בלוקים עם cache_control כדי לאפשר prompt caching
  let systemBlocks: Anthropic.TextBlockParam[] | undefined;
  if (typeof opts.system === "string") {
    systemBlocks = [
      {
        type: "text",
        text: opts.system,
        cache_control: { type: "ephemeral" },
      },
    ];
  } else if (opts.system) {
    systemBlocks = opts.system;
  }

  // הוספת cache_control לכלי האחרון מאפשרת cache גם של הגדרות הכלים
  let tools = opts.tools;
  if (tools && tools.length > 0) {
    tools = tools.map((t, i) =>
      i === tools!.length - 1
        ? { ...t, cache_control: { type: "ephemeral" } }
        : t,
    );
  }

  const response = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    system: systemBlocks,
    messages: opts.messages,
    tools,
  });

  trackUsage({
    tag: opts.callerTag ?? "default",
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  });

  return response;
}

/**
 * מחלץ טקסט מתגובה (מאחד בלוקי text).
 */
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * מחלץ tool_use blocks.
 */
export function extractToolUses(
  message: Anthropic.Message,
): Anthropic.ToolUseBlock[] {
  return message.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
}
