import { describe, it, expect } from "vitest";
import * as lucide from "lucide-react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Every icon this app imports from lucide-react must actually exist in the
 * installed version.
 *
 * lucide-react removed its brand glyphs (Instagram, Youtube, Twitter,
 * Linkedin, Facebook). Importing one of those names does not fail loudly — the
 * binding resolves to nothing and the module that imported it breaks at
 * runtime. Because SiteFooter is rendered by AppLayout, that took every page
 * in the app to a blank screen, and the unit suite stayed green because the
 * component holding the icon was never rendered under test.
 *
 * A missing icon is a build-time fact, so this checks it as one rather than
 * waiting for a page to go blank.
 */

const SRC = path.resolve(process.cwd(), "src");

const collectFiles = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "tests") continue;
      out.push(...collectFiles(full));
    } else if (/\.(js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
};

const importedIconNames = () => {
  const names = new Map();

  for (const file of collectFiles(SRC)) {
    const source = readFileSync(file, "utf8");
    // Only the named-import form, which is how every icon here is pulled in.
    const match = source.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/s);
    if (!match) continue;

    match[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean)
      .forEach((name) => {
        if (!names.has(name)) names.set(name, path.relative(SRC, file));
      });
  }

  return names;
};

describe("lucide-react icon imports", () => {
  it("finds icon imports to check", () => {
    expect(importedIconNames().size).toBeGreaterThan(5);
  });

  it("every imported icon exists in the installed lucide-react", () => {
    const missing = [];

    for (const [name, file] of importedIconNames()) {
      if (typeof lucide[name] === "undefined") {
        missing.push(`${name} (imported by ${file})`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("confirms the brand icons really are gone, so nobody re-adds them", () => {
    // Documents the constraint that caused the outage. If a future lucide
    // version restores these, this test fails and the comment above can be
    // revisited deliberately rather than by accident.
    for (const brand of ["Instagram", "Youtube", "Twitter", "Linkedin", "Facebook"]) {
      expect(lucide[brand]).toBeUndefined();
    }
  });
});
