/**
 * Client-side product search for the header autocomplete.
 *
 * Intentionally dependency-free: the catalog is small enough to score in the
 * browser, and a hand-rolled matcher keeps the fuzzy behaviour predictable and
 * testable. Matching runs against several fields (name, category, materials,
 * audience, description) — not just the title — and tolerates typos via a
 * bounded Damerau-Levenshtein distance plus subsequence matching on a
 * space-collapsed form of the name (so "tshrt" still finds "T-Shirts").
 *
 * The product model has no dedicated tags/subcategory/keywords fields, so those
 * requested "fields" are covered by the closest real data we store: category,
 * materials, and audience.
 */

/** Lowercase, strip accents, and turn punctuation into word breaks. */
export const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const collapse = (value) => normalize(value).replace(/\s+/g, "");

const tokenize = (value) => normalize(value).split(" ").filter(Boolean);

/**
 * Damerau-Levenshtein distance, bounded: bails out early (returns max + 1) once
 * every cell in a row exceeds `max`, so a non-match on a long string is cheap.
 */
export const boundedEditDistance = (a, b, max) => {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prevPrev = new Array(bl + 1).fill(0);
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j += 1) prev[j] = j;

  for (let i = 1; i <= al; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1); // transposition
      }
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    const tmp = prevPrev;
    prevPrev = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[bl];
};

/** Is `q` an in-order subsequence of `text`? ("tshrt" ⊆ "tshirts") */
export const isSubsequence = (q, text) => {
  if (!q) return false;
  let i = 0;
  for (let j = 0; j < text.length && i < q.length; j += 1) {
    if (text[j] === q[i]) i += 1;
  }
  return i === q.length;
};

// Short words tolerate one typo; longer words tolerate two. Below 3 chars we
// require a clean prefix/substring (fuzzy on 1–2 chars is all noise).
const typoBudget = (q) => (q.length <= 2 ? 0 : q.length <= 4 ? 1 : 2);

/** Score a single query word against a single token. Higher is better. */
const scoreWord = (q, token) => {
  if (token === q) return 100;
  if (token.startsWith(q)) return 92;
  if (q.length >= 2 && token.includes(q)) return 74;
  const budget = typoBudget(q);
  if (budget > 0) {
    const distance = boundedEditDistance(q, token, budget);
    if (distance <= budget) return 64 - distance * 12;
  }
  if (q.length >= 3 && isSubsequence(q, token)) return 46;
  return -Infinity;
};

/** Build the searchable, pre-normalised shape of a product once. */
export const buildSearchDocument = (product) => {
  const nameTokens = tokenize(product.name);
  const secondaryTokens = [
    ...tokenize(product.category),
    ...tokenize(Array.isArray(product.materials) ? product.materials.join(" ") : ""),
    ...tokenize(product.audience),
    ...tokenize(product.badge),
  ];
  return {
    product,
    nameTokens,
    secondaryTokens: [...new Set(secondaryTokens)],
    collapsedName: collapse(product.name),
    normalizedName: normalize(product.name),
    normalizedDescription: normalize(product.description),
  };
};

const scoreQueryWord = (doc, word) => {
  let best = -Infinity;
  for (const token of doc.nameTokens) best = Math.max(best, scoreWord(word, token));
  for (const token of doc.secondaryTokens) best = Math.max(best, scoreWord(word, token) - 12);
  if (doc.collapsedName.includes(word)) best = Math.max(best, 78);
  else if (word.length >= 3 && isSubsequence(word, doc.collapsedName)) best = Math.max(best, 44);
  if (word.length >= 3 && doc.normalizedDescription.includes(word)) best = Math.max(best, 34);
  return best;
};

/**
 * Scores a document against the whole (multi-word) query. Every query word must
 * match something (AND semantics), so "business flyers" doesn't surface every
 * product that merely contains "business".
 */
export const scoreDocument = (doc, words, normalizedQuery) => {
  let total = 0;
  for (const word of words) {
    const wordScore = scoreQueryWord(doc, word);
    if (wordScore === -Infinity) return -Infinity;
    total += wordScore;
  }
  let score = total / words.length;
  // Phrase bonuses: a contiguous hit on the name ranks above scattered words.
  if (doc.normalizedName.startsWith(normalizedQuery)) score += 40;
  else if (doc.normalizedName.includes(normalizedQuery)) score += 20;
  return score;
};

/**
 * Returns highlight segments for a display string: a flat list of
 * `{ text, match }` where `match` marks the part(s) to emphasise. Highlights
 * each query word where it appears (exact substring first, then a fuzzy word
 * fallback so typo'd queries still bold the relevant word).
 */
export const getHighlightSegments = (text, query) => {
  const words = tokenize(query);
  if (!text || words.length === 0) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const flags = new Array(text.length).fill(false);

  const markWordAt = (start, length) => {
    for (let i = start; i < start + length && i < text.length; i += 1) flags[i] = true;
  };

  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx >= 0) {
      markWordAt(idx, word.length);
      continue;
    }
    // Fuzzy fallback: bold the best-matching span. Spans of up to three
    // adjacent word-runs are considered so a typo that crosses punctuation
    // (e.g. "tshrt" over "T-Shirts", split into "T" and "Shirts") still lands
    // on the whole term rather than nothing.
    const runs = [...text.matchAll(/[a-z0-9]+/gi)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
    let bestStart = -1;
    let bestEnd = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < runs.length; i += 1) {
      for (let j = i; j < Math.min(i + 3, runs.length); j += 1) {
        const spanStart = runs[i].start;
        const spanEnd = runs[j].end;
        const candidate = collapse(text.slice(spanStart, spanEnd));
        let s = scoreWord(word, candidate);
        if (isSubsequence(word, candidate)) s = Math.max(s, 40 - (j - i) * 4);
        if (s > bestScore) {
          bestScore = s;
          bestStart = spanStart;
          bestEnd = spanEnd;
        }
      }
    }
    if (bestStart >= 0 && bestScore > -Infinity) markWordAt(bestStart, bestEnd - bestStart);
  }

  // Collapse the flag array into contiguous segments.
  const segments = [];
  let cursor = 0;
  while (cursor < text.length) {
    const match = flags[cursor];
    let end = cursor;
    while (end < text.length && flags[end] === match) end += 1;
    segments.push({ text: text.slice(cursor, end), match });
    cursor = end;
  }
  return segments;
};

/**
 * Ranks documents for a query. `documents` are pre-built via
 * buildSearchDocument (memoise them — don't rebuild per keystroke).
 */
export const searchDocuments = (documents, query, { limit = 8 } = {}) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const words = normalizedQuery.split(" ").filter(Boolean);

  const scored = [];
  for (const doc of documents) {
    const score = scoreDocument(doc, words, normalizedQuery);
    if (score > -Infinity) scored.push({ product: doc.product, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name);
  });

  return scored.slice(0, limit).map((entry) => entry.product);
};
