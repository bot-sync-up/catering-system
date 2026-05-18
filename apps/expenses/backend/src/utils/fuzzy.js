/**
 * Simple normalized similarity score [0,1] between two strings.
 * Uses Hebrew-aware tokenization + token overlap (Jaccard) + Levenshtein backup.
 */
function fuzzyScore(a, b) {
  const sa = normalize(a);
  const sb = normalize(b);
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;

  // token Jaccard
  const ta = tokenize(sa);
  const tb = tokenize(sb);
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = new Set([...ta].filter((x) => tb.has(x)));
  const uni = new Set([...ta, ...tb]);
  const jaccard = inter.size / uni.size;

  // partial substring boost
  const containsBoost = sb.includes(sa) || sa.includes(sb) ? 0.2 : 0;

  // levenshtein normalized
  const lev = 1 - levenshtein(sa, sb) / Math.max(sa.length, sb.length);

  return Math.max(0, Math.min(1, jaccard * 0.7 + lev * 0.3 + containsBoost));
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^֐-׿a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s) {
  return new Set(s.split(' ').filter((t) => t.length >= 2));
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

module.exports = { fuzzyScore, levenshtein };
