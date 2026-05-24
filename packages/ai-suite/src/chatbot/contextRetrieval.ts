// RAG פשוט מבוסס BM25-לייט עבור FAQ ותפריט.
// אינו דורש vector DB — מתאים לבסיס ידע בינוני (עד כמה אלפי פריטים).
// אפשר להחליף בעתיד ל-pgvector/Pinecone דרך אותו interface.

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string; // עברית
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalResult {
  doc: KnowledgeDoc;
  score: number;
}

/**
 * טוקניזציה בסיסית לעברית — חיתוך לפי רווחים ופיסוק,
 * הסרת מילים נפוצות (stop words).
 */
const HEBREW_STOP_WORDS = new Set([
  "של",
  "את",
  "על",
  "עם",
  "אני",
  "אתה",
  "את",
  "הוא",
  "היא",
  "אנחנו",
  "אתם",
  "הם",
  "זה",
  "זו",
  "אלה",
  "מה",
  "מי",
  "איך",
  "למה",
  "כדי",
  "גם",
  "רק",
  "כל",
  "יש",
  "אין",
  "לא",
  "כן",
  "אם",
  "כי",
  "אבל",
  "או",
  "ה",
  "ו",
  "ב",
  "ל",
  "מ",
  "ש",
  "כ",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !HEBREW_STOP_WORDS.has(t));
}

/**
 * אינדקס in-memory עם דירוג BM25-לייט (TF*IDF פשוט).
 */
export class KnowledgeBase {
  private docs: KnowledgeDoc[] = [];
  private docFreq = new Map<string, number>();
  private docTokens = new Map<string, string[]>();

  add(doc: KnowledgeDoc): void {
    this.docs.push(doc);
    const tokens = tokenize(`${doc.title} ${doc.content}`);
    this.docTokens.set(doc.id, tokens);
    const unique = new Set(tokens);
    for (const t of unique) {
      this.docFreq.set(t, (this.docFreq.get(t) ?? 0) + 1);
    }
  }

  addMany(docs: KnowledgeDoc[]): void {
    for (const d of docs) this.add(d);
  }

  size(): number {
    return this.docs.length;
  }

  search(query: string, topK = 3): RetrievalResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const N = this.docs.length || 1;
    const scores: Array<{ doc: KnowledgeDoc; score: number }> = [];

    for (const doc of this.docs) {
      const tokens = this.docTokens.get(doc.id)!;
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

      let score = 0;
      for (const qt of queryTokens) {
        const f = tf.get(qt);
        if (!f) continue;
        const df = this.docFreq.get(qt) ?? 1;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        score += (f / (f + 1.2)) * idf;
      }
      if (score > 0) scores.push({ doc, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}

/**
 * עוזר לפורמט תוצאות החיפוש כקונטקסט להזרקה ל-prompt.
 */
export function formatResultsAsContext(results: RetrievalResult[]): string {
  if (results.length === 0) return "(לא נמצאו תוצאות רלוונטיות)";
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.doc.title}\n${r.doc.content}\n(ציון: ${r.score.toFixed(2)})`,
    )
    .join("\n\n");
}
