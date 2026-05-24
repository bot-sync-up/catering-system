// Mock של Anthropic SDK לשימוש בכל הבדיקות

import type Anthropic from "@anthropic-ai/sdk";
import { setAnthropicClient } from "../src/shared/anthropicClient.js";

export interface MockResponse {
  text?: string;
  toolUses?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
}

export function installAnthropicMock(
  responses: MockResponse[] | ((callIndex: number, req: unknown) => MockResponse),
): { callCount: () => number; lastRequest: () => unknown } {
  let callIndex = 0;
  let lastReq: unknown = null;

  const client = {
    messages: {
      create: async (req: unknown) => {
        lastReq = req;
        const r =
          typeof responses === "function"
            ? responses(callIndex, req)
            : responses[Math.min(callIndex, responses.length - 1)];
        callIndex++;
        const content: Anthropic.ContentBlock[] = [];
        if (r.text) {
          content.push({
            type: "text",
            text: r.text,
            citations: null,
          } as Anthropic.TextBlock);
        }
        if (r.toolUses) {
          for (const tu of r.toolUses) {
            content.push({
              type: "tool_use",
              id: tu.id,
              name: tu.name,
              input: tu.input,
            } as Anthropic.ToolUseBlock);
          }
        }
        return {
          id: `msg_${callIndex}`,
          type: "message",
          role: "assistant",
          model: "claude-opus-4-7",
          content,
          stop_reason: r.toolUses?.length ? "tool_use" : "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        } as Anthropic.Message;
      },
    },
  };
  setAnthropicClient(client as unknown as Anthropic);
  return { callCount: () => callIndex, lastRequest: () => lastReq };
}

export function clearAnthropicMock(): void {
  setAnthropicClient(null);
}
