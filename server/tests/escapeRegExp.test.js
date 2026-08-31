import { describe, expect, it } from "vitest";
import { escapeRegExp } from "../utils/escapeRegExp.js";

describe("escapeRegExp", () => {
  it("escapes regex metacharacters so the value matches literally", () => {
    const escaped = escapeRegExp("a.b*c");
    expect(new RegExp(escaped).test("a.b*c")).toBe(true); // the literal string
    expect(new RegExp(escaped).test("axbxxc")).toBe(false); // '.' and '*' no longer special
  });

  it("neutralises a catastrophic-backtracking (ReDoS) pattern", () => {
    // Unescaped, `(a+)+$` against a long non-matching string hangs. Escaped, it's
    // a harmless literal that simply doesn't match, and returns immediately.
    const escaped = escapeRegExp("(a+)+$");
    const start = Date.now();
    const result = new RegExp(escaped, "i").test("a".repeat(40) + "!");
    expect(result).toBe(false);
    expect(Date.now() - start).toBeLessThan(50);
    // It still matches the literal text a user might actually search for.
    expect(new RegExp(escaped, "i").test("price is (a+)+$ today")).toBe(true);
  });

  it("handles nullish input without throwing", () => {
    expect(escapeRegExp(undefined)).toBe("");
    expect(escapeRegExp(null)).toBe("");
  });
});
