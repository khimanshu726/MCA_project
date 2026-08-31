/**
 * Escape a user-supplied string for safe use inside a RegExp.
 *
 * Product search built its filter with `new RegExp(q, "i")` straight from the
 * query string. An unescaped user regex is both a correctness bug (special
 * characters change what matches) and a denial-of-service vector: a crafted
 * pattern like `(a+)+$` triggers catastrophic backtracking that pins the event
 * loop. Escaping turns the input into a literal substring match — which is all
 * the search was ever meant to be.
 */
export const escapeRegExp = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
