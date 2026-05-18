import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { InvoiceSchema, type Invoice } from './schema.js';
import { buildSystemBlocks, type FewShotExample } from './prompt.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

export interface ExtractInput {
  /** Image bytes for a single invoice page (jpeg/png) OR a PDF rendered to image. */
  imageBytes: Buffer;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Optional supplier-specific few-shot examples for learning. */
  examples?: FewShotExample[];
  /** Caller-controlled correlation id (used for traces / dedup). */
  docId?: string;
}

export interface ExtractResult {
  invoice: Invoice;
  raw: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
  sha256: string;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Extract a structured Invoice from a single image using Claude Vision.
 * Uses prompt caching on the system prefix + few-shot block.
 */
export async function extractInvoice(input: ExtractInput): Promise<ExtractResult> {
  const sha256 = createHash('sha256').update(input.imageBytes).digest('hex');
  const mediaType = input.mediaType || 'image/jpeg';

  const system = buildSystemBlocks(input.examples ?? []);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: input.imageBytes.toString('base64'),
            },
          },
          {
            type: 'text',
            text:
              'Extract this invoice into the canonical JSON schema. ' +
              'Return ONLY the JSON object - no prose, no fences.',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Vision returned no text content');
  }
  const raw = textBlock.text.trim();

  // Strip a possible ```json fence even though we asked for none.
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Vision returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  const invoice = InvoiceSchema.parse(parsed);

  const usage = response.usage as Anthropic.Usage & {
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };

  return {
    invoice,
    raw: cleaned,
    sha256,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    },
  };
}
