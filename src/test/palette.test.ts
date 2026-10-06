/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every hand-written component is coloured only by tokens and the shared score
 * scale. Raw Tailwind palette classes are how the old dark theme's
 * cyan/violet/rose/emerald leaked through, and `glass` / `font-outfit` are
 * classes that do not exist, so the elements using them rendered unstyled.
 * Generated shadcn primitives (components/ui) and tests are exempt.
 */
const FILES = (readdirSync(resolve(process.cwd(), "src"), { recursive: true }) as string[])
  .map((f) => `src/${f.split(sep).join("/")}`)
  .filter((f) => f.endsWith(".tsx") && !f.includes("/components/ui/") && !/\.test\.tsx$/.test(f) && !f.startsWith("src/test/"))
  .sort();

const PALETTE =
  /\b(?:bg|text|border|from|to|via|ring|fill|stroke|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

describe.each(FILES)("%s", (file) => {
  // Comments may say "glass frame"; only code is checked.
  const source = readFileSync(resolve(process.cwd(), file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("uses tokens, not raw palette colours", () => {
    expect(source.match(PALETTE)?.[0] ?? null).toBeNull();
  });

  it("uses no classes that do not exist", () => {
    expect(source).not.toMatch(/\bglass\b(?!-)|font-outfit|--custom-/);
  });
});

it("checks the whole app, not a hand-picked list", () => {
  expect(FILES.length).toBeGreaterThan(40);
});
