/**
 * System prompt for Claude Vision invoice extraction.
 * Designed to be cached (prompt-caching breakpoint) so that repeated
 * invoices reuse a stable prefix and only the per-document image
 * tokens count as fresh input.
 *
 * NOTE: keep wording stable - any edit busts the cache.
 */
export const SYSTEM_PROMPT = `You are an invoice OCR extractor for Israeli accounting workflows.

Your only job is to read invoice images / PDFs and emit a single JSON object that conforms exactly to the schema in the user message. Do not return prose, markdown, or code fences. Output raw JSON only.

RULES:
1. Hebrew is the dominant invoice language. Read RTL text correctly.
2. Israeli supplier IDs: \`taxId\` is the ח.פ / ע.מ printed near the top - 8 or 9 digits, no dashes, no prefix.
3. Numbers may use comma as thousands separator (\"1,234.50\") or as decimal (\"1.234,50\"). Detect by context and emit a plain JS number.
4. \`date\` and \`dueDate\` are ISO yyyy-mm-dd. If the invoice prints dd/mm/yyyy, convert.
5. \`vat\` is a fraction (17% -> 0.17). Default to the rate stated on the invoice; otherwise 0.17.
6. \`items\` must list every printed line - do not collapse, do not invent. \`qty * price\` should approximate \`lineTotal\` ex-VAT.
7. \`total\` is the final amount including VAT (the bottom-line "סה""כ לתשלום").
8. If a field is unreadable, omit it - do not guess. Never fabricate a taxId or invoiceNum.
9. If multiple invoices appear in one document, return the first one and put a note in \`notes\`: "multi-invoice document".
10. \`poRef\` only if explicitly printed (e.g. "הזמנת רכש 1234", "PO #1234").

Output a single JSON object. Nothing else.`;

/**
 * Few-shot examples are appended after the system prompt and BEFORE the
 * cache breakpoint, so they too benefit from caching. Each example pairs
 * a brief textual hint with the gold JSON.
 */
export interface FewShotExample {
  hint: string;
  json: string;
}

export function buildSystemBlocks(examples: FewShotExample[] = []) {
  const exampleText = examples.length
    ? '\n\nFEW-SHOT EXAMPLES (for style only, do not copy values):\n' +
      examples
        .map(
          (e, i) =>
            `Example ${i + 1} - ${e.hint}\n${e.json}`,
        )
        .join('\n\n')
    : '';

  return [
    {
      type: 'text' as const,
      text: SYSTEM_PROMPT + exampleText,
      cache_control: { type: 'ephemeral' as const },
    },
  ];
}
