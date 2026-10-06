/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

// Vitest runs from the repo root; under jsdom `import.meta.url` is not a file: URL.
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
const extend = config.theme?.extend as {
  fontFamily: Record<string, string[]>;
  colors: Record<string, Record<string, string> | string>;
  borderRadius: Record<string, string>;
};

describe("design tokens", () => {
  it("drops Outfit entirely", () => {
    expect(css).not.toMatch(/outfit/i);
  });

  it.each([
    ["--background", "40 55% 96%"],
    ["--foreground", "25 29% 8%"],
    ["--primary", "221 67% 49%"],
    ["--primary-foreground", "0 0% 100%"],
    ["--accent", "219 84% 57%"],
    ["--muted-foreground", "35 9% 39%"],
    ["--border", "45 34% 89%"],
    ["--ring", "221 67% 49%"],
    ["--destructive", "6 54% 50%"],
    ["--score-low", "6 54% 50%"],
    ["--score-mid", "37 91% 55%"],
    ["--score-high", "165 82% 35%"],
    ["--score-low-text", "6 58% 42%"],
    ["--score-mid-text", "39 100% 27%"],
    ["--score-high-text", "165 83% 26%"],
    ["--sidebar-background", "223 47% 7%"],
    ["--sidebar-foreground", "220 37% 81%"],
    ["--sidebar-primary", "219 84% 57%"],
    ["--sidebar-accent", "221 48% 17%"],
    ["--sidebar-accent-foreground", "0 0% 100%"],
    ["--sidebar-border", "223 33% 16%"],
    ["--sidebar-ring", "221 100% 71%"],
  ])("sets %s to %s", (token, value) => {
    expect(css).toContain(`${token}: ${value};`);
  });

  it("maps sans, display and landing to Inter so existing font-display usages keep working", () => {
    for (const key of ["sans", "display", "landing"]) {
      expect(extend.fontFamily[key][0]).toBe("Inter");
    }
  });

  it("exposes band colours with an alpha slot and score colours", () => {
    const band = extend.colors.band as Record<string, string>;
    const score = extend.colors.score as Record<string, string>;
    expect(band.ground).toBe("rgb(var(--band-ground) / <alpha-value>)");
    expect(band.rule).toBe("var(--band-rule)");
    expect(score.high).toBe("hsl(var(--score-high))");
    expect(score["mid-text"]).toBe("hsl(var(--score-mid-text))");
  });

  it("adds the reference's shape scale", () => {
    expect(extend.borderRadius).toMatchObject({ pill: "999px", panel: "14px", tile: "10px" });
  });
});
