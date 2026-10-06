# UI Redesign — Design Foundation + Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Amplify's indigo/slate theme with the reference site's warm-cream + ink system (emerald accent) across the whole app, and rebuild the landing page (`/`) in that system's band layout.

**Architecture:** Global shadcn tokens in `src/index.css` and `tailwind.config.ts` are swapped so every page re-skins without layout edits. The landing page is a self-contained module in `src/components/landing/` whose colours come from a scoped "band" token system (`[data-landing] [data-band]` in `landing.css`), ported from the reference's `BitplazaLanding`. Motion is CSS (fail-open reveals) plus framer-motion only for the hero cards' scroll drift.

**Tech Stack:** React 18, TypeScript (loose: `strict: false`), Vite 5, Tailwind 3 + shadcn/ui, framer-motion 12, lucide-react. New dev-only: Vitest 3 + Testing Library + jsdom; Playwright (screenshots). Python 3 + Pillow + numpy (artwork script, already installed).

**Spec:** `docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md` — read it before starting; this plan implements it.

**Reference implementation (read-only, do not modify):** `~/Documents/Bitcoin Culture Hub/Opten/bitcoinculturehub/src/components/BitplazaLanding/` — `landing.css`, `chrome.tsx`, `reveal.tsx`, `button.tsx`, `faq.tsx`, `hero.tsx`, `core-features.tsx` are the sources ported below.

## Global Constraints

- Package manager is **npm** only (a stale `bun.lockb` exists; never use bun).
- **No new runtime dependencies.** Allowed new devDependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`, `playwright`. Remove `@fontsource/outfit`.
- Colours (exact): cream ground `#FAF6EE`, ink `#1B140F`, solid-button emerald `#0B7A5F` (`--primary`), brand emerald `#10A37F` (`--accent`), muted text `#6B645A`, secondary/muted surface `#F4F1E8`, hairline `#ECE7D8`, destructive `#C4483A`, amber `#F5A524`, hero ink ground `#0B1412`.
- Score bands: **≤ 45 low, 46–77 mid, ≥ 78 high** (inclusive, matching `backend/app/services/interview_engine.py` lines 32–33, 48–50).
- Fonts: **Inter only** (weights 400/500/600/700 via `@fontsource/inter`). `font-display` stays as a Tailwind key mapped to Inter.
- Import `cn` from `@/lib/utils` only — never from `@/lib/design-system`.
- Every rule in `landing.css` is scoped under `[data-landing]`.
- Copy rules: no testimonials, no user counts, no company logos; the sample-feedback band is visibly badged **"Example"**.
- Every animation stops under `prefers-reduced-motion: reduce`; content is visible if JS never runs.
- Gates on every task that touches code: `npm test` passes; `npm run typecheck` reports **0** errors; `npx eslint .` reports **≤ 79 problems** (baseline measured 2026-10-05: 79 = 61 errors + 18 warnings); `npm run build` passes.
- Do not touch `backend/`, the out-of-scope pages, or files with hardcoded palette classes (`InterviewResults`, `ChatBubble`, `SessionReview`, `AnalyticsDashboard`, `Insights`, `ProgressSidebar`, `ModernAnalyticsDashboard`).
- Stage files by explicit path in every commit (never `git add -A` / `git add .`). Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **A ground image that never decodes (background tab, stalled request)** — the hero must still appear within 900 ms, never stay blank. → Task 4, test "releases the entrance after the cap even if the ground image never decodes".
2. **The mobile menu portals outside the landing scope** — its links must still get band colours instead of rendering unstyled. → Task 5, test "keeps the mobile menu inside the landing colour scope".
3. **A 320 px phone** — no horizontal scroll anywhere on the page (the hero's overhanging cards are the usual culprit). → Task 10, overflow assertion in `scripts/screenshot-landing.mjs` at 320/375/768/1440.
4. **An artwork or hero-screenshot file missing from `public/`** — a broken image on the most important pixels of the page. → Task 3 + Task 10, `landing-assets.test.ts` checks every path the page references exists.
5. **A visitor opens a second FAQ answer, by mouse or keyboard** — the first closes, `aria-expanded` follows, Enter/Space work. → Task 8, FAQ tests.

---

## File Structure

```
package.json                                  + test scripts, dev deps; − @fontsource/outfit
vitest.config.ts                              NEW  jsdom, @/ alias, setup file
tailwind.config.ts                            REWRITE  tokens, band/score colours, type scale, radii
index.html                                    − Google Fonts link; new title/description/og
src/index.css                                 REWRITE  new :root tokens, re-toned helpers
src/test/setup.ts                             NEW  jest-dom matchers, cleanup, unstub globals
src/test/browser-mocks.ts                     NEW  matchMedia + controllable IntersectionObserver
src/test/tokens.test.ts                       NEW
src/test/landing-assets.test.ts               NEW
src/lib/score.ts (+ score.test.ts)            NEW  scoreBand(), thresholds, colour refs
src/components/landing/
  landing.css                                 NEW  scoped band system, motion, FAQ panel, fluid gradient
  kit.tsx                                     NEW  Band, Frame, Label, BandHeader, Panel, CardGlow, BrandMark, HEADING_GRADIENT
  cta.tsx (+ cta.test.tsx)                    NEW  LandingCta
  routes.ts                                   NEW  useLandingRoutes()
  motion.ts (+ motion.test.tsx)               NEW  useLandingMotion(), useRevealObserver(), ENTER_CAP_MS
  reveal.tsx                                  NEW  Reveal, Enter
  content.ts                                  NEW  every word + image paths + section ids
  shell.tsx                                   NEW  LandingShell
  nav.tsx (+ nav.test.tsx)                    NEW  LandingNav
  footer.tsx                                  NEW  LandingFooter
  hero.tsx (+ hero.test.tsx)                  NEW  LandingHero
  hero-shot.tsx                               NEW  HeroShot
  features.tsx                                NEW  Features
  sample-feedback.tsx (+ sections.test.tsx)   NEW  SampleFeedback  (sections.test covers features too)
  how-it-works.tsx                            NEW  HowItWorks
  faq.tsx (+ faq.test.tsx)                    NEW  Faq
  closing-cta.tsx (+ closing-cta.test.tsx)    NEW  ClosingCta
  HeroSection.tsx FeaturesSection.tsx HowItWorksSection.tsx CTASection.tsx   DELETE
src/pages/Index.tsx (+ Index.test.tsx)        REWRITE  composes the landing
src/components/{Hero,Features,HowItWorks}.tsx DELETE (dead)
src/components/layout/{Navbar,Footer}.tsx     DELETE (only importer was Index.tsx)
src/components/{Navbar,Footer}.tsx            DELETE if a fresh grep shows zero importers
scripts/retone-landing-art.py                 NEW
scripts/capture-hero-shot.mjs                 NEW
scripts/screenshot-landing.mjs                NEW
public/images/landing/{hero-ground,section-glow,grain,hero-interview}.webp   NEW
.gitignore                                    + .superpowers/
```

---

### Task 0: Branch setup

**Files:**
- Modify: `.gitignore`
- Commit: `docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md`, `docs/superpowers/plans/2026-10-05-ui-redesign-foundation-landing.md`

**Interfaces:** Produces: branch `feature/ui-redesign`.

- [ ] **Step 1: Confirm the backend-migration work is committed**

Run: `git status --porcelain`
Expected: only `?? .superpowers/` and `?? docs/superpowers/` (or nothing besides those). If ANY other path is listed, **STOP** and ask the user — the redesign must not be mixed into the migration commits.

- [ ] **Step 2: Create the branch**

```bash
git switch -c feature/ui-redesign
```

- [ ] **Step 3: Ignore the brainstorm/screenshot scratch directory**

Append to `.gitignore`:

```
# Brainstorm mockups and verification screenshots (superpowers)
.superpowers/
```

- [ ] **Step 4: Commit spec, plan and ignore rule**

```bash
git add .gitignore docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md docs/superpowers/plans/2026-10-05-ui-redesign-foundation-landing.md
git commit -m "$(cat <<'EOF'
docs: add UI redesign spec and plan (foundation + landing)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1: Test infrastructure + score scale

**Files:**
- Modify: `package.json` (scripts, devDependencies)
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/test/browser-mocks.ts`, `src/lib/score.ts`
- Test: `src/lib/score.test.ts`

**Interfaces:**
- Produces:
  - `scoreBand(score: number): ScoreBand` where `type ScoreBand = "low" | "mid" | "high"`
  - `SCORE_LOW_MAX = 45`, `SCORE_HIGH_MIN = 78`
  - `SCORE_COLORS: Record<ScoreBand, { fill: string; text: string }>` (CSS colour strings referencing `--score-*` vars defined in Task 2)
  - Test helpers: `mockMatchMedia({ reduced?: boolean })`, `installIntersectionObserver()`, `MockIntersectionObserver.fire(target: Element, isIntersecting: boolean)`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest@^3.2.4 jsdom@^26.1.0 @testing-library/react@^16.3.0 @testing-library/dom@^10.4.0 @testing-library/jest-dom@^6.9.1 @testing-library/user-event@^14.6.1
```

- [ ] **Step 2: Add test scripts to `package.json`**

In `"scripts"`, after `"typecheck"`, add:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Separate from vite.config.ts so the dev server config stays untouched. The
// alias must match vite.config.ts and tsconfig.app.json.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
```

- [ ] **Step 5: Create `src/test/browser-mocks.ts`**

```ts
import { vi } from "vitest";

/**
 * jsdom has no `matchMedia`. `reduced` answers the prefers-reduced-motion query;
 * every other query reports false.
 */
export function mockMatchMedia({ reduced = false }: { reduced?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduced : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

/**
 * jsdom has no `IntersectionObserver`. This one records what it observes so a
 * test can declare "this element is now on screen" with `fire()`. Wrap `fire`
 * in `act()` when it causes a React state update.
 */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly targets = new Set<Element>();
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = (target: Element) => {
    this.targets.add(target);
  };

  unobserve = (target: Element) => {
    this.targets.delete(target);
  };

  disconnect = () => {
    this.targets.clear();
  };

  takeRecords = () => [];

  static fire(target: Element, isIntersecting: boolean) {
    for (const observer of MockIntersectionObserver.instances) {
      if (!observer.targets.has(target)) continue;
      const entry = {
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
      } as IntersectionObserverEntry;
      observer.callback([entry], observer as unknown as IntersectionObserver);
    }
  }
}

export function installIntersectionObserver() {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
}
```

- [ ] **Step 6: Confirm the backend thresholds**

Run: `grep -n "DIFFICULTY_UP_THRESHOLD\|DIFFICULTY_DOWN_THRESHOLD" backend/app/services/interview_engine.py`
Expected: `= 78`, `= 45`, and comparisons `avg >= DIFFICULTY_UP_THRESHOLD` / `avg <= DIFFICULTY_DOWN_THRESHOLD`. If they differ, STOP and ask — the UI must mirror the engine.

- [ ] **Step 7: Write the failing test `src/lib/score.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { SCORE_COLORS, SCORE_HIGH_MIN, SCORE_LOW_MAX, scoreBand } from "./score";

describe("scoreBand", () => {
  it("mirrors the interview engine's difficulty-adaptation thresholds", () => {
    expect(SCORE_LOW_MAX).toBe(45);
    expect(SCORE_HIGH_MIN).toBe(78);
  });

  it.each([
    [0, "low"],
    [45, "low"],
    [46, "mid"],
    [77, "mid"],
    [78, "high"],
    [100, "high"],
  ] as const)("scores %d as %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });

  it("classifies fractional scores by value, not by rounding", () => {
    expect(scoreBand(45.5)).toBe("mid");
    expect(scoreBand(77.9)).toBe("mid");
  });

  it("exposes a fill and a text colour for every band", () => {
    for (const band of ["low", "mid", "high"] as const) {
      expect(SCORE_COLORS[band].fill).toBe(`hsl(var(--score-${band}))`);
      expect(SCORE_COLORS[band].text).toBe(`hsl(var(--score-${band}-text))`);
    }
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npm test -- src/lib/score.test.ts`
Expected: FAIL — `Failed to resolve import "./score"`.

- [ ] **Step 9: Implement `src/lib/score.ts`**

```ts
/**
 * The score scale every screen colours answers by.
 *
 * The thresholds mirror `backend/app/services/interview_engine.py`
 * (DIFFICULTY_DOWN_THRESHOLD = 45, DIFFICULTY_UP_THRESHOLD = 78, both inclusive):
 * the colour a user sees is the same signal the engine adapts difficulty on.
 * Change them there and here together.
 */
export const SCORE_LOW_MAX = 45;
export const SCORE_HIGH_MIN = 78;

export type ScoreBand = "low" | "mid" | "high";

export function scoreBand(score: number): ScoreBand {
  if (score >= SCORE_HIGH_MIN) return "high";
  if (score <= SCORE_LOW_MAX) return "low";
  return "mid";
}

/**
 * `fill` for rings, bars and dots; `text` for small type on light grounds
 * (each ≥ 4.5:1 on cream and white). Values live in src/index.css.
 */
export const SCORE_COLORS: Record<ScoreBand, { fill: string; text: string }> = {
  low: { fill: "hsl(var(--score-low))", text: "hsl(var(--score-low-text))" },
  mid: { fill: "hsl(var(--score-mid))", text: "hsl(var(--score-mid-text))" },
  high: { fill: "hsl(var(--score-high))", text: "hsl(var(--score-high-text))" },
};
```

- [ ] **Step 10: Run tests, typecheck, lint**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2`
Expected: tests PASS (9 tests); typecheck prints no errors; lint `✖ N problems` with N ≤ 79.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/test/browser-mocks.ts src/lib/score.ts src/lib/score.test.ts
git commit -m "$(cat <<'EOF'
test: add Vitest + Testing Library and the shared score scale

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Global design tokens and fonts

**Files:**
- Rewrite: `src/index.css`, `tailwind.config.ts`
- Modify: `index.html` (remove Google Fonts), `package.json` (remove `@fontsource/outfit`)
- Test: `src/test/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by every later task):
  - CSS vars `--background … --sidebar-ring`, `--score-{low,mid,high}`, `--score-{low,mid,high}-text`, `--card-shadow`
  - Tailwind: `font-display`/`font-sans`/`font-landing` → Inter; `text-display-1|2|3`, `text-body-lg`, `text-body-sm`; colours `band-*` (`ground raised fg muted faint signal signal-hover accent accent-hover on-accent rule rule-faint rule-strong`) and `score-*` (`low mid high low-text mid-text high-text`); radii `rounded-pill|panel|tile`; easing `ease-plaza`.

- [ ] **Step 1: Write the failing test `src/test/tokens.test.ts`**

```ts
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
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
    ["--primary", "165 83% 26%"],
    ["--primary-foreground", "0 0% 100%"],
    ["--accent", "165 82% 35%"],
    ["--muted-foreground", "35 9% 39%"],
    ["--border", "45 34% 89%"],
    ["--ring", "165 83% 26%"],
    ["--destructive", "6 54% 50%"],
    ["--score-low", "6 54% 50%"],
    ["--score-mid", "37 91% 55%"],
    ["--score-high", "165 82% 35%"],
    ["--score-low-text", "6 58% 42%"],
    ["--score-mid-text", "39 100% 27%"],
    ["--score-high-text", "165 83% 26%"],
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/test/tokens.test.ts`
Expected: FAIL — "drops Outfit entirely" fails (css contains Outfit) and token assertions fail.

- [ ] **Step 3: Rewrite `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        // Kept as a key: ~50 existing `font-display` usages keep working, now on Inter.
        display: ["Inter", "system-ui", "sans-serif"],
        landing: ["Inter", "system-ui", "sans-serif"],
      },
      // Fluid display scale from the reference. Each size carries its line height.
      fontSize: {
        "display-1": ["clamp(2.5rem, 1.2rem + 4.6vw, 5.25rem)", { lineHeight: "1.06" }],
        "display-2": ["clamp(2rem, 1.5rem + 2.4vw, 3.25rem)", { lineHeight: "1.04" }],
        "display-3": ["clamp(1.75rem, 1.35rem + 1.7vw, 2.5rem)", { lineHeight: "1.08" }],
        "body-lg": ["clamp(1.0625rem, 1rem + 0.4vw, 1.25rem)", { lineHeight: "1.55" }],
        "body-sm": ["clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)", { lineHeight: "1.6" }],
      },
      colors: {
        // Landing band system. Values are set per `data-band` in
        // src/components/landing/landing.css, so a component never names a colour.
        // RGB triplets so `<alpha-value>` works; the rules carry their own alpha.
        band: {
          ground: "rgb(var(--band-ground) / <alpha-value>)",
          raised: "rgb(var(--band-raised) / <alpha-value>)",
          fg: "rgb(var(--band-fg) / <alpha-value>)",
          muted: "rgb(var(--band-muted) / <alpha-value>)",
          faint: "rgb(var(--band-faint) / <alpha-value>)",
          signal: "rgb(var(--band-signal) / <alpha-value>)",
          "signal-hover": "rgb(var(--band-signal-hover) / <alpha-value>)",
          accent: "rgb(var(--band-accent) / <alpha-value>)",
          "accent-hover": "rgb(var(--band-accent-hover) / <alpha-value>)",
          "on-accent": "rgb(var(--band-on-accent) / <alpha-value>)",
          rule: "var(--band-rule)",
          "rule-faint": "var(--band-rule-faint)",
          "rule-strong": "var(--band-rule-strong)",
        },
        score: {
          low: "hsl(var(--score-low))",
          mid: "hsl(var(--score-mid))",
          high: "hsl(var(--score-high))",
          "low-text": "hsl(var(--score-low-text))",
          "mid-text": "hsl(var(--score-mid-text))",
          "high-text": "hsl(var(--score-high-text))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Concentric shape scale: a panel inside a panel steps down one rung.
        pill: "999px",
        panel: "14px",
        tile: "10px",
      },
      transitionTimingFunction: {
        plaza: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
        glow: "glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
```

- [ ] **Step 4: Rewrite `src/index.css`**

The `.dark` block below is identical to the current file's (dark mode is out of scope) — verify with `git diff` that only `:root` and the helpers changed inside `@layer base`/`@layer components`.

```css
@import url('@fontsource/inter/400.css');
@import url('@fontsource/inter/500.css');
@import url('@fontsource/inter/600.css');
@import url('@fontsource/inter/700.css');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Warm cream + ink + emerald, ported from the Bitplaza/Opten design system.
       Spec: docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md §3 */
    --background: 40 55% 96%;        /* #FAF6EE */
    --foreground: 25 29% 8%;         /* #1B140F */

    --card: 0 0% 100%;
    --card-foreground: 25 29% 8%;

    --popover: 0 0% 100%;
    --popover-foreground: 25 29% 8%;

    /* Deep emerald. shadcn draws solid buttons, links and switches from
       --primary, and white on this is 5.3:1. The bright brand emerald is
       --accent, which is 3.2:1 under white and so never carries small text. */
    --primary: 165 83% 26%;          /* #0B7A5F */
    --primary-foreground: 0 0% 100%;

    --secondary: 45 35% 93%;         /* #F4F1E8 */
    --secondary-foreground: 25 29% 8%;

    --muted: 45 35% 93%;
    --muted-foreground: 35 9% 39%;   /* #6B645A — 5.4:1 on cream */

    --accent: 165 82% 35%;           /* #10A37F — glows, icons, rings, charts */
    --accent-foreground: 0 0% 100%;

    --destructive: 6 54% 50%;        /* #C4483A */
    --destructive-foreground: 0 0% 100%;

    --border: 45 34% 89%;            /* #ECE7D8 */
    --input: 45 34% 89%;
    --ring: 165 83% 26%;

    --radius: 0.75rem;

    /* Custom tokens — warm, emerald-led */
    --gradient-primary: linear-gradient(90deg, hsl(165 83% 26%) 0%, hsl(165 82% 35%) 100%);
    --gradient-hero: linear-gradient(180deg, hsl(40 55% 96%) 0%, hsl(0 0% 100%) 100%);
    --gradient-card: linear-gradient(135deg, hsl(0 0% 100% / 0.9) 0%, hsl(40 55% 96% / 0.8) 100%);
    --glass-border: hsl(45 34% 89% / 0.8);
    --glass-bg: hsl(0 0% 100% / 0.75);
    --glow-primary: 0 20px 50px -20px hsl(165 82% 35% / 0.35);
    --glow-subtle: 0 10px 30px -12px hsl(165 82% 35% / 0.15);
    /* Warm-tinted: a neutral grey shadow on cream reads as dirt. */
    --card-shadow: 0 1px 2px rgb(61 40 23 / 0.04), 0 8px 24px -12px rgb(61 40 23 / 0.1);

    /* Status colors */
    --success: 165 82% 35%;
    --warning: 37 91% 55%;
    --info: 219 84% 57%;

    /* Score scale — thresholds in src/lib/score.ts. `-text` variants are for
       small type on light grounds (≥ 4.5:1). */
    --score-low: 6 54% 50%;          /* #C4483A */
    --score-mid: 37 91% 55%;         /* #F5A524 */
    --score-high: 165 82% 35%;       /* #10A37F */
    --score-low-text: 6 58% 42%;     /* #A8382C */
    --score-mid-text: 39 100% 27%;   /* #8A5A00 */
    --score-high-text: 165 83% 26%;  /* #0B7A5F */

    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 25 29% 8%;
    --sidebar-primary: 165 83% 26%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 45 35% 93%;
    --sidebar-accent-foreground: 25 29% 8%;
    --sidebar-border: 45 34% 89%;
    --sidebar-ring: 165 83% 26%;
  }

  /* Unchanged from before the redesign: dark mode is unreachable and out of scope. */
  .dark {
    --background: 222 47% 6%;
    --foreground: 210 40% 98%;
    --card: 222 47% 8%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 8%;
    --popover-foreground: 210 40% 98%;
    --primary: 231 72% 62%;
    --primary-foreground: 222 47% 6%;
    --secondary: 222 30% 14%;
    --secondary-foreground: 210 40% 98%;
    --muted: 222 30% 18%;
    --muted-foreground: 215 20% 65%;
    --accent: 172 72% 45%;
    --accent-foreground: 222 47% 6%;
    --destructive: 0 62.8% 40%;
    --destructive-foreground: 210 40% 98%;
    --border: 222 30% 18%;
    --input: 222 30% 14%;
    --ring: 231 72% 62%;
    --sidebar-background: 222 47% 6%;
    --sidebar-foreground: 210 40% 98%;
    --sidebar-primary: 231 72% 62%;
    --sidebar-primary-foreground: 222 47% 6%;
    --sidebar-accent: 222 30% 14%;
    --sidebar-accent-foreground: 210 40% 98%;
    --sidebar-border: 222 30% 18%;
    --sidebar-ring: 231 72% 62%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    scroll-behavior: smooth;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}

@layer components {
  .glass-card {
    @apply bg-card border border-border rounded-xl;
    box-shadow: var(--card-shadow);
  }

  .glass-card-hover {
    @apply glass-card transition-all duration-300;
  }

  .glass-card-hover:hover {
    @apply border-accent/40;
    box-shadow: var(--card-shadow), var(--glow-subtle);
    transform: translateY(-2px);
  }

  .gradient-text {
    @apply bg-clip-text text-transparent;
    background-image: var(--gradient-primary);
  }

  .gradient-border {
    position: relative;
  }

  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: var(--gradient-primary);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .hero-glow {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, hsl(165 82% 35% / 0.10) 0%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
  }

  .stat-card {
    @apply glass-card p-6 space-y-3;
  }

  .session-card {
    @apply glass-card-hover p-5 cursor-pointer;
  }

  .nav-link {
    @apply text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium;
  }

  .nav-link-active {
    @apply text-foreground;
  }

  .badge-success {
    @apply bg-accent/10 text-score-high-text border border-accent/20 text-xs px-2.5 py-0.5 rounded-full font-medium;
  }

  .badge-warning {
    @apply bg-warning/10 text-score-mid-text border border-warning/20 text-xs px-2.5 py-0.5 rounded-full font-medium;
  }

  .badge-info {
    @apply bg-info/10 text-info border border-info/20 text-xs px-2.5 py-0.5 rounded-full font-medium;
  }

  .progress-bar {
    @apply h-1.5 rounded-full bg-muted overflow-hidden;
  }

  .progress-bar-fill {
    @apply h-full rounded-full transition-all duration-500;
    background: var(--gradient-primary);
  }
}

@layer utilities {
  .animate-fade-up {
    animation: fadeUp 0.6s ease-out forwards;
  }

  .animate-fade-up-delay-1 {
    animation: fadeUp 0.6s ease-out 0.1s forwards;
    opacity: 0;
  }

  .animate-fade-up-delay-2 {
    animation: fadeUp 0.6s ease-out 0.2s forwards;
    opacity: 0;
  }

  .animate-fade-up-delay-3 {
    animation: fadeUp 0.6s ease-out 0.3s forwards;
    opacity: 0;
  }

  .animate-glow-pulse {
    animation: glowPulse 3s ease-in-out infinite;
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
```

Note: `badge-success`/`badge-warning` text moved to the `-text` score variants because the old `text-accent`/`text-warning` would now be < 4.5:1 on their tinted chips.

- [ ] **Step 5: Remove the Google Fonts link from `index.html`**

Delete these lines (Inter is self-hosted via `@fontsource/inter`; the CDN copy was a duplicate download):

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 6: Remove Outfit**

```bash
npm uninstall @fontsource/outfit
grep -rn "outfit\|Outfit" src index.html tailwind.config.ts
```
Expected: grep prints nothing.

- [ ] **Step 7: Run tests and all gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all tests PASS; 0 type errors; lint ≤ 79 problems; build succeeds. If `typecheck` complains about `tailwindcss-animate` having no types, add `declare module "tailwindcss-animate";` to `src/vite-env.d.ts` and re-run.

- [ ] **Step 8: Commit**

```bash
git add src/index.css tailwind.config.ts index.html package.json package-lock.json src/test/tokens.test.ts
git commit -m "$(cat <<'EOF'
feat(ui): replace theme tokens with cream/ink/emerald system, Inter only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Emerald artwork

**Files:**
- Create: `scripts/retone-landing-art.py`, `public/images/landing/hero-ground.webp`, `public/images/landing/section-glow.webp`, `public/images/landing/grain.webp`
- Test: `src/test/landing-assets.test.ts`

**Interfaces:** Produces the three files at `/images/landing/*.webp` (URL paths used by `content.ts`, `kit.tsx` and `landing.css`).

- [ ] **Step 1: Write the failing test `src/test/landing-assets.test.ts`**

```ts
/// <reference types="node" />
import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Every image the landing page references. Task 10 appends the hero screenshot. */
export const LANDING_ASSETS = ["hero-ground.webp", "section-glow.webp", "grain.webp"];

describe("landing artwork", () => {
  it.each(LANDING_ASSETS)("ships public/images/landing/%s", (name) => {
    const file = new URL(`../../public/images/landing/${name}`, import.meta.url);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(0);
  });
});
```

Note: exporting a constant from a test file is fine for lint (not a component file). If eslint flags it, drop the `export`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/test/landing-assets.test.ts`
Expected: FAIL — 3 failures, `existsSync` false.

- [ ] **Step 3: Create `scripts/retone-landing-art.py`**

```python
#!/usr/bin/env python3
"""Re-tone the reference landing artwork from Bitplaza orange to Amplify emerald.

One-off, kept in the repo so the artwork can be regenerated if the accent changes.
Spec: docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md §5.

- Hue is rotated by a fixed amount (orange #FA6A3C -> emerald #10A37F).
- Saturation is untouched. Value is optionally scaled, weighted by saturation, so
  saturated pixels darken while neutral ones (the hero's white foot) do not move.
- Alpha is copied byte-for-byte.
- section-glow and grain are saved lossless (lossy posterizes low alpha into rings
  and blanks grain); hero-ground has no alpha and is lossy q90, as the reference's is.
"""
from __future__ import annotations

import argparse
import colorsys
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
DEFAULT_SRC = (
    Path.home()
    / "Documents/Bitcoin Culture Hub/Opten/bitcoinculturehub/public/images/opportunity-engine"
)
OUT = REPO / "public/images/landing"


def hue(hex_color: str) -> float:
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hsv(r, g, b)[0]


# PIL's HSV mode stores hue as 0-255 for 0-360 degrees.
SHIFT = round(((hue("#10A37F") - hue("#FA6A3C")) % 1.0) * 256) % 256


def retone(img: Image.Image, value_scale: float) -> Image.Image:
    alpha = img.getchannel("A") if img.mode == "RGBA" else None
    hsv = np.asarray(img.convert("RGB").convert("HSV")).astype(np.float64)
    hsv[..., 0] = (hsv[..., 0] + SHIFT) % 256
    saturation = hsv[..., 1] / 255.0
    hsv[..., 2] = np.clip(
        np.round(hsv[..., 2] * (1.0 - (1.0 - value_scale) * saturation)), 0, 255
    )
    out = Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB")
    if alpha is not None:
        out.putalpha(alpha)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument(
        "--hero-value", type=float, default=0.82,
        help="value scale for saturated hero pixels (1.0 = unchanged)",
    )
    parser.add_argument(
        "--glow-value", type=float, default=0.9,
        help="value scale for the section glow (1.0 = unchanged)",
    )
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    hero_src = Image.open(args.src / "hero-ground.webp")
    hero = retone(hero_src, args.hero_value)
    hero.save(OUT / "hero-ground.webp", "WEBP", quality=90, method=6)

    glow_src = Image.open(args.src / "section-glow.webp")
    glow = retone(glow_src, args.glow_value)
    glow.save(OUT / "section-glow.webp", "WEBP", lossless=True, quality=100, method=6)

    shutil.copyfile(args.src / "grain.webp", OUT / "grain.webp")

    # Self-checks: same geometry, and the glow's alpha survived untouched.
    assert hero.size == hero_src.size, "hero-ground changed size"
    reread = Image.open(OUT / "section-glow.webp")
    assert reread.size == glow_src.size, "section-glow changed size"
    assert reread.mode == "RGBA", "section-glow lost its alpha channel"
    assert np.array_equal(
        np.asarray(reread.getchannel("A")), np.asarray(glow_src.getchannel("A"))
    ), "section-glow alpha changed"

    for name in ("hero-ground.webp", "section-glow.webp", "grain.webp"):
        print(f"{name}: {(OUT / name).stat().st_size / 1024:.0f} KB")
    print(f"hue shift: {SHIFT}/256")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the script**

Run: `python3 scripts/retone-landing-art.py`
Expected: three size lines (hero-ground ≈ 300–700 KB, section-glow ≈ 30–80 KB, grain ≈ 15 KB) and `hue shift: 106/256` (±1). No assertion errors.

- [ ] **Step 5: Make previews and judge them by eye**

```bash
mkdir -p .superpowers/screens
python3 - <<'EOF'
from PIL import Image
hero = Image.open("public/images/landing/hero-ground.webp"); hero.thumbnail((1200, 1200))
hero.save(".superpowers/screens/hero-ground-preview.png")
glow = Image.open("public/images/landing/section-glow.webp").resize((1040, 648), Image.BILINEAR)
canvas = Image.new("RGBA", glow.size, (255, 255, 255, 255)); canvas.alpha_composite(glow)
canvas.convert("RGB").save(".superpowers/screens/section-glow-preview.png")
EOF
```

Open both PNGs (Read tool). Check against the chosen mockup (`.superpowers/brainstorm/*/content/accent.html`, option C):
- hero: near-black top, an **emerald** (not cyan, not neon mint) bloom, pure white at the foot;
- glow on white: a barely-there green wash, no visible rings.

If the bloom is too neon, re-run with `--hero-value 0.75`; too dull, `0.9`. Repeat Steps 4–5 until it matches. Record the final values in the script's argparse defaults.

- [ ] **Step 6: Run tests and gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2`
Expected: PASS; 0 type errors; lint ≤ 79.

- [ ] **Step 7: Commit**

```bash
git add scripts/retone-landing-art.py public/images/landing/hero-ground.webp public/images/landing/section-glow.webp public/images/landing/grain.webp src/test/landing-assets.test.ts
git commit -m "$(cat <<'EOF'
feat(landing): add emerald re-toned hero ground, section glow and grain

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Landing kit — scoped CSS, layout primitives, CTA, motion

**Files:**
- Create: `src/components/landing/landing.css`, `kit.tsx`, `cta.tsx`, `routes.ts`, `motion.ts`, `reveal.tsx`
- Test: `src/components/landing/motion.test.tsx`, `src/components/landing/cta.test.tsx`

**Interfaces:**
- Consumes: Tailwind `band-*` colours, `rounded-pill|panel|tile`, `ease-plaza` (Task 2); `/images/landing/section-glow.webp`, `/images/landing/grain.webp` (Task 3); `useAuth()` from `@/contexts/AuthContext` (returns `{ user: CustomUser | null, … }`, throws outside `AuthProvider`).
- Produces:
  - `kit.tsx`: `type BandTone = "ink" | "paper" | "cream" | "mint"`; `Band(props: section props & { id: string; tone: BandTone; ruled?: boolean })`; `Frame(props: div props & { width?: "default" | "wide" | "narrow" })`; `Label({ children, className?, as? })`; `HEADING_GRADIENT: string`; `BandHeader({ eyebrow?, heading: string | readonly string[], lead?, leadClassName?, headingClassName?, plainHeading?, align?: "start" | "center", className?, children? })`; `Panel(div props & { variant?: "raised" | "outline" })`; `CardGlow({ className? })`; `BrandMark({ className? })`
  - `cta.tsx`: `LandingCta({ to: string; variant?: "primary" | "secondary" | "ink"; size?: "sm" | "md" | "lg"; className?; onClick?; children; "aria-label"? })` — `to` starting with `#` renders `<a href>`, otherwise router `<Link>`
  - `routes.ts`: `useLandingRoutes(): { signedIn: boolean; start: string; signIn: string; signUp: string; dashboard: string }` — `start` is `/interview/setup` when signed in, else `/auth/signup`
  - `motion.ts`: `ENTER_CAP_MS = 900`; `useLandingMotion(root: RefObject<HTMLElement>, groundSrc: string): string` returning a class string from `landing-js`, `landing-enter`, `landing-entered`
  - `reveal.tsx`: `Reveal({ as?, delay?, className?, children })` (sets `data-reveal`); `Enter({ as?, delay?, rise?, className?, children })` (sets `data-enter`)
  - CSS classes: `.label`, `.stat`, `.net-grid`, `.landing-cta-primary|secondary|ink`, `.hero-shot-still`, `.hero-shot-card`, `.hero-shot-mask`, `.landing-faq-panel`, `.landing-fluid`, `.landing-fluid-a|b|c`, `.landing-fluid-core`, `.landing-grain`

- [ ] **Step 1: Write the failing motion test `src/components/landing/motion.test.tsx`**

```tsx
import { act, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MockIntersectionObserver,
  installIntersectionObserver,
  mockMatchMedia,
} from "@/test/browser-mocks";
import { ENTER_CAP_MS, useLandingMotion } from "./motion";
import { Reveal } from "./reveal";

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  const motionClass = useLandingMotion(ref, "/images/landing/hero-ground.webp");
  return (
    <div ref={ref} data-testid="root" className={motionClass}>
      <Reveal>Revealed copy</Reveal>
    </div>
  );
}

const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");

afterEach(() => {
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
});

describe("useLandingMotion", () => {
  it("hides nothing under reduced motion", () => {
    mockMatchMedia({ reduced: true });
    installIntersectionObserver();
    render(<Harness />);
    expect(screen.getByTestId("root").className).toBe("");
  });

  it("fails open: without IntersectionObserver the scroll reveals are never armed", () => {
    mockMatchMedia();
    render(<Harness />);
    const root = screen.getByTestId("root");
    expect(root).not.toHaveClass("landing-js");
    expect(root).toHaveClass("landing-enter");
  });

  it("arms reveals and releases the entrance once the hero is ready", async () => {
    mockMatchMedia();
    installIntersectionObserver();
    render(<Harness />);
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("landing-js", "landing-enter");
    await waitFor(() => expect(root).toHaveClass("landing-entered"));
  });

  it("releases the entrance after the cap even if the ground image never decodes", async () => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: () => new Promise<void>(() => {}),
    });
    mockMatchMedia();
    installIntersectionObserver();
    render(<Harness />);
    const root = screen.getByTestId("root");
    expect(root).not.toHaveClass("landing-entered");
    await act(async () => {
      vi.advanceTimersByTime(ENTER_CAP_MS);
    });
    expect(root).toHaveClass("landing-entered");
  });

  it("marks a reveal target when it scrolls into view", () => {
    mockMatchMedia();
    installIntersectionObserver();
    render(<Harness />);
    const target = screen.getByText("Revealed copy").closest("[data-reveal]");
    expect(target).not.toHaveAttribute("data-revealed");
    act(() => MockIntersectionObserver.fire(target as Element, true));
    expect(target).toHaveAttribute("data-revealed");
  });
});
```

- [ ] **Step 2: Write the failing CTA test `src/components/landing/cta.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LandingCta } from "./cta";

function renderAt(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={element} />
        <Route path="/auth/signup" element={<p>Signup page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LandingCta", () => {
  it("keeps in-page targets as plain anchors so the router does not reset scroll", () => {
    renderAt(<LandingCta to="#faq">FAQ</LandingCta>);
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#faq");
  });

  it("routes app destinations through the router", async () => {
    const user = userEvent.setup();
    renderAt(<LandingCta to="/auth/signup">Start</LandingCta>);
    await user.click(screen.getByRole("link", { name: "Start" }));
    expect(screen.getByText("Signup page")).toBeInTheDocument();
  });

  it("uses the band accent for the primary variant and the band ink for the ink variant", () => {
    renderAt(
      <>
        <LandingCta to="#a">Primary</LandingCta>
        <LandingCta to="#b" variant="ink">
          Ink
        </LandingCta>
      </>,
    );
    expect(screen.getByRole("link", { name: "Primary" })).toHaveClass("landing-cta-primary", "bg-band-accent");
    expect(screen.getByRole("link", { name: "Ink" })).toHaveClass("landing-cta-ink", "bg-band-fg");
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npm test -- src/components/landing`
Expected: FAIL — `Failed to resolve import "./motion"` and `"./cta"`.

- [ ] **Step 4: Create `src/components/landing/landing.css`**

```css
/* ═══ AMPLIFY LANDING ════════════════════════════════════════════════════
   Everything the landing page needs that is not a Tailwind utility. Ported
   from the Bitplaza landing (BitplazaLanding/landing.css) and re-toned to
   emerald. Spec: docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md §4.

   Every rule is nested under [data-landing], which only the landing root and
   the mobile menu's portal wrapper set, so nothing here reaches the app.

   `Band` sets `data-band`; every `band-*` utility resolves from the custom
   properties below. Solid colours are RGB triplets so `<alpha-value>` works. */

[data-landing] {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: rgb(var(--band-fg));
  /* Micro-interactions: hover lifts, colour cross-fades. */
  --ease-plaza: cubic-bezier(0.22, 1, 0.36, 1);
  /* Entrances: a critically damped spring's step response, p(t) = 1 - (1 + ωt)e^(-ωt). */
  --ease-damped: cubic-bezier(0.321, 0.664, 0.14, 1);
  --reveal-dur: 0.56s;
  --enter-dur: 0.72s;
}

@supports (animation-timing-function: linear(0, 1)) {
  [data-landing] {
    --ease-damped: linear(
      0,
      0.1098 6.3%,
      0.3105 12.5%,
      0.5035 18.8%,
      0.6583 25%,
      0.772 31.3%,
      0.8513 37.5%,
      0.9049 43.8%,
      0.9401 50%,
      0.9628 56.3%,
      0.9773 62.5%,
      0.9864 68.8%,
      0.9922 75%,
      0.9957 81.3%,
      0.9979 87.5%,
      0.9992 93.8%,
      1
    );
  }
}

/* The global `* { border-color: hsl(var(--border)) }` would paint every
   landing hairline in the app's border colour. `:where()` keeps this at zero
   specificity: it beats the global rule only by coming later in the bundle, and
   any `border-band-*` utility still wins. */
:where([data-landing] *),
:where([data-landing] *)::before,
:where([data-landing] *)::after {
  border-color: var(--band-rule);
}

/* Anchored bands clear the fixed 64px nav. */
[data-landing] section[id] {
  scroll-margin-top: 4.5rem;
}

/* ── BANDS ───────────────────────────────────────────────────────────
   Light bands, measured on the darkest light ground (cream #FAF6EE):
     fg     #1B140F ....... 16:1   AAA
     muted  #5E574D ....... 6.6:1  AA
     faint  #6B645A ....... 5.4:1  AA — the floor
     signal #0B7A5F ....... 4.9:1  AA (eyebrow labels; the reference's were 2.8:1) */
[data-landing] [data-band] {
  --band-fg: 27 20 15;
  --band-muted: 94 87 77;
  --band-faint: 107 100 90;
  --band-signal: 11 122 95;
  --band-signal-hover: 9 104 81;
  --band-rule: rgb(27 20 15 / 0.12);
  --band-rule-faint: rgb(27 20 15 / 0.035);
  --band-rule-strong: rgb(27 20 15 / 0.14);
  /* One emerald for solid fills on light grounds: white on it is 5.3:1. */
  --band-accent: 11 122 95;
  --band-accent-hover: 9 104 81;
  --band-on-accent: 255 255 255;
  /* Warm-tinted shadows: neutral grey over cream reads as dirt. */
  --btn-shadow:
    0 4px 14px rgb(61 40 23 / 0.06),
    0 16px 44px rgb(61 40 23 / 0.07),
    0 32px 80px rgb(61 40 23 / 0.09);
  --btn-shadow-hover:
    0 6px 18px rgb(61 40 23 / 0.07),
    0 20px 56px rgb(61 40 23 / 0.08),
    0 40px 96px rgb(61 40 23 / 0.1);
  --btn-shadow-secondary:
    0 2px 8px rgb(61 40 23 / 0.03),
    0 10px 28px rgb(61 40 23 / 0.03);
  --btn-shadow-secondary-hover:
    0 3px 10px rgb(61 40 23 / 0.035),
    0 12px 34px rgb(61 40 23 / 0.045);
  --card-shadow: 0 1px 2px rgb(61 40 23 / 0.04), 0 8px 24px -12px rgb(61 40 23 / 0.1);
}

/* Pure white: receives the hero's white foot, so no seam. */
[data-landing] [data-band="paper"] {
  --band-ground: 255 255 255;
  --band-raised: 255 255 255;
}

[data-landing] [data-band="cream"] {
  --band-ground: 250 246 238;
  --band-raised: 255 255 255;
}

/* The hero glow's echo, the role the reference's `peach` band played. */
[data-landing] [data-band="mint"] {
  --band-ground: 245 250 247;
  --band-raised: 255 255 255;
  --grid-dot: rgb(11 122 95 / 0.09);
}

/* MUST stay below the shared `[data-band]` block: same specificity, so source
   order decides which shadow set and accent the hero gets.
     fg     on ink ........ 17:1  AAA
     muted  on ink ........ 11:1  AAA
     faint  on ink ........ 7.3:1 AA
   The accent is the bright brand emerald; white on it is 3.2:1, accepted only
   for the hero's large pill CTAs (spec §2). */
[data-landing] [data-band="ink"] {
  --band-ground: 11 20 18;
  --band-raised: 20 34 30;
  --band-fg: 244 250 247;
  --band-muted: 191 211 203;
  --band-faint: 147 171 162;
  --band-signal: 16 163 127;
  --band-signal-hover: 47 211 162;
  --band-accent: 16 163 127;
  --band-accent-hover: 34 184 145;
  --band-on-accent: 255 255 255;
  --band-rule: rgb(244 250 247 / 0.12);
  --band-rule-faint: rgb(244 250 247 / 0.06);
  --band-rule-strong: rgb(244 250 247 / 0.22);
  --card-shadow: 0 0 #0000;
  --btn-shadow:
    0 4px 14px rgb(0 0 0 / 0.1),
    0 18px 48px rgb(0 0 0 / 0.08),
    0 32px 72px rgb(0 0 0 / 0.1);
  --btn-shadow-hover:
    0 6px 18px rgb(0 0 0 / 0.11),
    0 22px 58px rgb(0 0 0 / 0.09),
    0 40px 88px rgb(0 0 0 / 0.11);
  --btn-shadow-secondary:
    0 4px 16px rgb(0 0 0 / 0.08),
    0 20px 52px rgb(0 0 0 / 0.09);
  --btn-shadow-secondary-hover:
    0 6px 20px rgb(0 0 0 / 0.09),
    0 24px 64px rgb(0 0 0 / 0.1);
}

/* Multi-layer shadows live here, not in Tailwind arbitrary values: the
   arbitrary-property parser can truncate comma-separated shadows. */
[data-landing] .landing-cta-primary,
[data-landing] .landing-cta-ink {
  box-shadow: var(--btn-shadow);
}

[data-landing] .landing-cta-primary:hover,
[data-landing] .landing-cta-ink:hover {
  box-shadow: var(--btn-shadow-hover);
}

[data-landing] .landing-cta-primary:active,
[data-landing] .landing-cta-ink:active {
  box-shadow: var(--btn-shadow);
}

[data-landing] .landing-cta-secondary {
  box-shadow: var(--btn-shadow-secondary, none);
}

[data-landing] .landing-cta-secondary:hover {
  box-shadow: var(--btn-shadow-secondary-hover, var(--btn-shadow-secondary, none));
}

/* The screenshot frame never moves while the cards beside it do; its own layer
   stops it being re-rasterised every scroll frame. */
[data-landing] .hero-shot-still {
  will-change: transform;
}

/* The shot dissolves into the white band below over its last 240px. */
[data-landing] .hero-shot-mask {
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 240px), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 240px), transparent);
}

/* box-shadow, not filter: drop-shadow — the filter costs a blur pass per frame
   on elements that move every scroll frame. */
[data-landing] .hero-shot-card {
  box-shadow:
    0 2px 6px rgb(11 20 18 / 0.08),
    0 10px 26px rgb(11 20 18 / 0.1),
    0 22px 52px rgb(11 20 18 / 0.08);
}

[data-landing] ::selection {
  background-color: rgb(16 163 127 / 0.28);
  color: #1b140f;
}

/* The nav swaps `data-band` on scroll. Custom properties are not animatable,
   but the computed `color` they feed is, so the type cross-fades with the glass
   layer (0.5s). Colour only — a layout property here would move the bar. The CTA
   is excluded so its own transform/background transition survives. */
[data-landing] header,
[data-landing] header a:not(.landing-cta-primary):not(.landing-cta-ink),
[data-landing] header span,
[data-landing] header button,
[data-landing] header svg {
  transition: color 0.5s var(--ease-plaza);
}

/* The micro-label: separated from body text by tracking and case alone. */
[data-landing] .label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1.4;
  text-transform: uppercase;
}

[data-landing] .stat {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

/* Dot grid behind the how-it-works timeline. */
[data-landing] .net-grid {
  background-image: radial-gradient(circle, var(--grid-dot, rgb(28 22 17 / 0.09)) 1px, transparent 1px);
  background-size: 22px 22px;
  -webkit-mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, #000 25%, transparent 100%);
  mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, #000 25%, transparent 100%);
}

@media (prefers-reduced-transparency: reduce) {
  [data-landing] .net-grid {
    background-image: none;
  }
}

/* ── REVEAL ──────────────────────────────────────────────────────────
   Visible by DEFAULT. JS opts into hiding by adding `landing-js` to the root
   (see motion.ts), so if the script never runs the page is fully readable. */
[data-landing] [data-reveal] {
  transition:
    opacity var(--reveal-dur) var(--ease-damped),
    transform var(--reveal-dur) var(--ease-damped);
  transition-delay: var(--reveal-delay, 0s);
}

[data-landing].landing-js [data-reveal]:not([data-revealed]) {
  opacity: 0;
  transform: translateY(18px);
}

/* ── LOAD ENTRANCE ───────────────────────────────────────────────────
   The hero sequence. `landing-enter` is applied during React's first render so
   the hidden state is in the first committed DOM; `landing-entered` releases it
   once the ground image and fonts are ready, or after a 900ms cap. */
[data-landing] [data-enter] {
  transition:
    opacity var(--enter-dur) var(--ease-damped),
    transform var(--enter-dur) var(--ease-damped);
  transition-delay: var(--enter-delay, 0s);
}

[data-landing].landing-enter:not(.landing-entered) [data-enter] {
  opacity: 0;
  transform: translateY(var(--enter-rise, 22px));
}

[data-landing] :focus-visible {
  outline: 2px solid #0b7a5f;
  outline-offset: 2px;
}

[data-landing] [data-band="ink"] :focus-visible {
  outline-color: #10a37f;
}

/* ── FAQ ACCORDION ───────────────────────────────────────────────────
   `grid-template-rows: 0fr -> 1fr` animates to the answer's natural height with
   no measuring. `visibility` is delayed on close so the text does not blank in
   frame one, and a closed answer leaves the tab order and the a11y tree.
   Keep the two 0.32s values in step. */
[data-landing] .landing-faq-panel {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows 0.32s var(--ease-plaza),
    visibility 0s linear 0.32s;
}

[data-landing] .landing-faq-panel[data-open] {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows 0.32s var(--ease-plaza),
    visibility 0s;
}

/* ── CLOSING PANEL: FLUID GRADIENT ───────────────────────────────────
   Three soft-stop radial blobs (pre-blurred, so no filter pass), a static
   darkening core behind the type, and two-tone alpha grain to dither banding.
   Blobs run only while `[data-animate-live]` is set by motion.ts's idle
   observer, i.e. only while the panel is near the viewport. */
@keyframes landing-fluid-a {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  33% {
    transform: translate3d(7%, -5%, 0) scale(1.14);
  }
  66% {
    transform: translate3d(-4%, 4%, 0) scale(0.94);
  }
}

@keyframes landing-fluid-b {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1.06);
  }
  40% {
    transform: translate3d(-6%, -7%, 0) scale(0.92);
  }
  70% {
    transform: translate3d(5%, 3%, 0) scale(1.12);
  }
}

@keyframes landing-fluid-c {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(-8%, 6%, 0) scale(1.18);
  }
}

[data-landing] .landing-fluid {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

[data-landing] .landing-fluid > span {
  position: absolute;
  display: block;
  animation-play-state: paused;
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
}

[data-landing] .landing-fluid[data-animate-live] > span {
  animation-play-state: running;
  will-change: transform;
}

/* Brand emerald, lower left, the largest. */
[data-landing] .landing-fluid-b {
  left: -28%;
  bottom: -34%;
  width: 92%;
  height: 118%;
  animation-name: landing-fluid-b;
  animation-duration: 34s;
  background: radial-gradient(
    closest-side circle,
    rgb(16 163 127 / 0.88) 0%,
    rgb(16 163 127 / 0.7) 18%,
    rgb(16 163 127 / 0.49) 34%,
    rgb(16 163 127 / 0.29) 50%,
    rgb(16 163 127 / 0.14) 66%,
    rgb(16 163 127 / 0.04) 82%,
    rgb(16 163 127 / 0) 100%
  );
}

/* Mint: the light. Small, and in the corner furthest from the type. */
[data-landing] .landing-fluid-a {
  left: -14%;
  bottom: -20%;
  width: 54%;
  height: 74%;
  animation-name: landing-fluid-a;
  animation-duration: 26s;
  background: radial-gradient(
    closest-side circle,
    rgb(47 211 162 / 0.62) 0%,
    rgb(47 211 162 / 0.46) 18%,
    rgb(47 211 162 / 0.3) 34%,
    rgb(47 211 162 / 0.16) 50%,
    rgb(47 211 162 / 0.07) 66%,
    rgb(47 211 162 / 0.02) 82%,
    rgb(47 211 162 / 0) 100%
  );
}

/* Deep teal answering blob, upper right, a step weaker so the light has a direction. */
[data-landing] .landing-fluid-c {
  right: -18%;
  top: -30%;
  width: 84%;
  height: 116%;
  animation-name: landing-fluid-c;
  animation-duration: 41s;
  background: radial-gradient(
    closest-side circle,
    rgb(8 92 74 / 0.8) 0%,
    rgb(8 92 74 / 0.62) 18%,
    rgb(8 92 74 / 0.42) 34%,
    rgb(8 92 74 / 0.24) 50%,
    rgb(8 92 74 / 0.1) 66%,
    rgb(8 92 74 / 0.03) 82%,
    rgb(8 92 74 / 0) 100%
  );
}

/* Static, above the blobs: the heading's contrast is a property of the layout,
   not of where the animation happens to be. */
[data-landing] .landing-fluid-core {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    52% 58% at 50% 44%,
    rgb(3 20 16 / 0.5) 0%,
    rgb(3 20 16 / 0.28) 45%,
    rgb(3 20 16 / 0.08) 75%,
    rgb(3 20 16 / 0) 100%
  );
}

[data-landing] .landing-grain {
  position: absolute;
  inset: 0;
  background-image: url("/images/landing/grain.webp");
  background-repeat: repeat;
  background-size: 128px 128px;
  opacity: 0.32;
}

/* ── REDUCED MOTION ──────────────────────────────────────────────────
   motion.ts already never hides anything under reduced motion; this is the
   belt to those braces. */
@media (prefers-reduced-motion: reduce) {
  [data-landing] *,
  [data-landing] *::before,
  [data-landing] *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  [data-landing] [data-reveal],
  [data-landing] [data-enter] {
    opacity: 1 !important;
    transform: none !important;
  }

  [data-landing] .landing-faq-panel,
  [data-landing] .landing-faq-panel[data-open] {
    transition-delay: 0s !important;
  }

  [data-landing] .landing-fluid > span {
    animation: none;
  }
}
```

- [ ] **Step 5: Create `src/components/landing/kit.tsx`**

```tsx
import { Mic } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing page's structural kit. `Band` sets `data-band`, which resolves
 * every `band-*` colour inside it (landing.css), so no component names a colour.
 */

/** `ink` exists for the hero only; everything else is a light step. */
export type BandTone = "ink" | "paper" | "cream" | "mint";

export function Band({
  id,
  tone,
  ruled = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  id: string;
  tone: BandTone;
  /** A hairline at the top edge, for two bands that share a ground. */
  ruled?: boolean;
}) {
  return (
    <section
      id={id}
      data-band={tone}
      className={cn(
        "relative isolate bg-band-ground text-band-fg",
        "py-20 sm:py-28 lg:py-32",
        ruled && "border-t border-band-rule",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function Frame({
  width = "default",
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { width?: "default" | "wide" | "narrow" }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full px-4 sm:px-8 lg:px-12",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-[84rem]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  className,
  as: Component = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  return <Component className={cn("label text-band-signal", className)}>{children}</Component>;
}

/**
 * Ink running into the band's own signal colour. `pb` is required: bg-clip-text
 * clips to the text box and would shear descenders at display leading.
 */
export const HEADING_GRADIENT =
  "bg-[linear-gradient(90deg,rgb(var(--band-fg))_8%,rgb(var(--band-signal))_88%)] bg-clip-text pb-[0.12em] text-transparent";

/**
 * A band opening. Two-line headings render as ONE <h2> with block spans — two
 * <h2>s for one thought would mislead a screen reader.
 */
export function BandHeader({
  eyebrow,
  heading,
  lead,
  leadClassName,
  headingClassName,
  plainHeading = false,
  align = "start",
  className,
  children,
}: {
  eyebrow?: string;
  heading: string | readonly string[];
  lead?: string;
  leadClassName?: string;
  headingClassName?: string;
  plainHeading?: boolean;
  align?: "start" | "center";
  className?: string;
  children?: ReactNode;
}) {
  const lines = typeof heading === "string" ? [heading] : heading;
  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      {eyebrow ? <Label>{eyebrow}</Label> : null}
      <h2
        className={cn(
          "max-w-[46rem] font-display tracking-[-0.02em] text-band-fg",
          headingClassName ?? "text-display-2 font-bold",
        )}
      >
        {lines.map((line, i) => (
          <span key={line} className={cn("block", i > 0 && !plainHeading && HEADING_GRADIENT)}>
            {line}
            {i < lines.length - 1 ? " " : null}
          </span>
        ))}
      </h2>
      {lead ? (
        <p className={cn("max-w-[38rem] leading-relaxed", leadClassName ?? "text-body-lg text-band-muted")}>{lead}</p>
      ) : null}
      {children}
    </div>
  );
}

/** A card. `raised` sits on the band ground; `outline` contains other cards. */
export function Panel({
  variant = "raised",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & { variant?: "raised" | "outline" }) {
  return (
    <div
      className={cn(
        "rounded-panel border border-band-rule",
        variant === "raised" && "bg-band-raised shadow-[var(--card-shadow)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The faint colour wash behind a section. A painted PNG whose alpha peaks near
 * 31/255, stored at 480px on purpose: the browser's upscale interpolates the
 * in-between values the source lacks, which is what de-bands it. Do not export
 * it larger.
 */
export function CardGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-1/2 top-[66%] -z-10 w-[min(1600px,84%)] -translate-x-1/2 -translate-y-1/2",
        className,
      )}
      style={{ aspectRatio: "480 / 299" }}
    >
      <img
        src="/images/landing/section-glow.webp"
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </div>
  );
}

/**
 * Landing-only logo lockup. The public/logo*.svg files are multi-colour blue
 * and are re-drawn in a later sub-project; until then the landing uses this.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-[9px] bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
      >
        <Mic className="size-4" strokeWidth={2} />
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Amplify Interview</span>
    </span>
  );
}
```

- [ ] **Step 6: Create `src/components/landing/cta.tsx`**

```tsx
import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type CtaVariant = "primary" | "secondary" | "ink";
type CtaSize = "sm" | "md" | "lg";

/** One control shape for every landing CTA, so radius, height and weight never drift. */
function control(variant: CtaVariant, size: CtaSize) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-pill font-medium",
    "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-plaza",
    size === "sm" && "h-9 px-4 text-[0.8125rem]",
    size === "md" && "h-11 px-5 text-[0.9375rem]",
    size === "lg" && "h-12 px-6 text-[0.9375rem] sm:h-[3.25rem] sm:px-7 sm:text-base",
    variant === "primary" &&
      "landing-cta-primary bg-band-accent text-band-on-accent hover:-translate-y-0.5 hover:bg-band-accent-hover active:translate-y-0",
    variant === "secondary" &&
      "landing-cta-secondary border border-band-rule-strong text-band-fg hover:-translate-y-0.5 hover:bg-band-fg/5 active:translate-y-0",
    // The band's own ink as a fill: near-black on light bands, near-white on ink.
    variant === "ink" &&
      "landing-cta-ink bg-band-fg text-band-ground hover:-translate-y-0.5 hover:bg-band-fg/90 active:translate-y-0",
  );
}

/**
 * Hash targets stay real `<a href="#…">`: routing one through `<Link>` under
 * BrowserRouter turns an in-page scroll into a navigation that resets scroll.
 */
export function LandingCta({
  to,
  variant = "primary",
  size = "md",
  className,
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  to: string;
  variant?: CtaVariant;
  size?: CtaSize;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const classes = cn(control(variant, size), className);
  if (to.startsWith("#")) {
    return (
      <a href={to} className={classes} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
```

- [ ] **Step 7: Create `src/components/landing/routes.ts`**

```ts
import { useAuth } from "@/contexts/AuthContext";

export interface LandingRoutes {
  signedIn: boolean;
  /** Where "start" CTAs go: straight to setup for members, sign-up for visitors. */
  start: string;
  signIn: string;
  signUp: string;
  dashboard: string;
}

export function useLandingRoutes(): LandingRoutes {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  return {
    signedIn,
    start: signedIn ? "/interview/setup" : "/auth/signup",
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    dashboard: "/dashboard",
  };
}
```

- [ ] **Step 8: Create `src/components/landing/motion.ts`**

```ts
import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

/** The longest the hero entrance waits for its ground image and fonts. */
export const ENTER_CAP_MS = 900;

/**
 * Scroll reveals (one-shot) and idle animations (two-way) under `root`.
 * Only runs when `enabled`, which useLandingMotion sets only when motion is
 * wanted AND IntersectionObserver exists — so the failure mode is "visible".
 */
function useRevealObserver(root: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const node = root.current;
    if (!enabled || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          // One-shot: re-animating on the way back up reads as flicker.
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    node.querySelectorAll("[data-reveal]").forEach((target) => observer.observe(target));

    // Two-way: the closing panel's blobs run only while it is near the viewport.
    const idle = node.querySelectorAll("[data-animate-idle]");
    const idleObserver = idle.length
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) entry.target.setAttribute("data-animate-live", "");
              else entry.target.removeAttribute("data-animate-live");
            }
          },
          { rootMargin: "100% 0px 100% 0px" },
        )
      : undefined;
    idle.forEach((target) => idleObserver?.observe(target));

    return () => {
      observer.disconnect();
      idleObserver?.disconnect();
    };
  }, [root, enabled]);
}

/**
 * The landing root's motion classes — the ONLY owner of them, because React
 * rewrites `className` on every render and a `classList.add` elsewhere would be
 * erased.
 *
 *   ""                                   reduced motion: nothing is ever hidden
 *   "landing-enter"                      hero hidden, waiting (set during render)
 *   "landing-js landing-enter landing-entered"   released; reveals armed
 *
 * The release waits for the hero ground image and fonts, raced against
 * ENTER_CAP_MS — `decode()` can hang in a background tab, and a blank hero is
 * worse than a late one. No requestAnimationFrame: rAF does not fire in
 * background tabs.
 */
export function useLandingMotion(root: RefObject<HTMLElement>, groundSrc: string): string {
  const [{ animate, observe }] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return { animate: false, observe: false };
    }
    const wanted = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return { animate: wanted, observe: wanted && typeof IntersectionObserver !== "undefined" };
  });
  const [entered, setEntered] = useState(false);

  useRevealObserver(root, observe);

  useEffect(() => {
    if (!animate) return;
    let cancelled = false;

    const ground = new Image();
    ground.src = groundSrc;
    const settled = Promise.all([
      typeof ground.decode === "function" ? ground.decode().catch(() => undefined) : Promise.resolve(),
      document.fonts?.ready ?? Promise.resolve(),
    ]);
    const capped = new Promise<void>((resolve) => setTimeout(resolve, ENTER_CAP_MS));

    void Promise.race([settled, capped]).then(() => {
      if (!cancelled) setEntered(true);
    });

    return () => {
      cancelled = true;
    };
  }, [animate, groundSrc]);

  return cn(observe && "landing-js", animate && "landing-enter", entered && "landing-entered");
}
```

- [ ] **Step 9: Create `src/components/landing/reveal.tsx`**

```tsx
import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One element in the hero's load sequence. `rise` overrides travel for large elements. */
export function Enter({
  as: Component = "div",
  delay = 0,
  rise,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  rise?: number;
  className?: string;
  children: ReactNode;
}) {
  const style: Record<string, string> = {};
  if (delay) style["--enter-delay"] = `${delay}s`;
  if (rise !== undefined) style["--enter-rise"] = `${rise}px`;
  return (
    <Component
      data-enter=""
      style={Object.keys(style).length ? (style as CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

/** One scroll-revealed element. Delay is a custom property so any stagger works. */
export function Reveal({
  as: Component = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component
      data-reveal=""
      style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm test -- src/components/landing`
Expected: PASS — 5 motion tests, 3 CTA tests.

- [ ] **Step 11: Gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS; 0 type errors; lint ≤ 79; build succeeds.

- [ ] **Step 12: Commit**

```bash
git add src/components/landing/landing.css src/components/landing/kit.tsx src/components/landing/cta.tsx src/components/landing/routes.ts src/components/landing/motion.ts src/components/landing/reveal.tsx src/components/landing/motion.test.tsx src/components/landing/cta.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add scoped band system, layout kit, CTA and fail-open motion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Content, shell, nav, footer

**Files:**
- Create: `src/components/landing/content.ts`, `shell.tsx`, `nav.tsx`, `footer.tsx`
- Test: `src/components/landing/nav.test.tsx`

**Interfaces:**
- Consumes: Task 4's `Band`, `Frame`, `BrandMark`, `LandingCta`, `useLandingRoutes`, `useLandingMotion`; `Sheet`, `SheetClose`, `SheetContent`, `SheetTitle`, `SheetTrigger` from `@/components/ui/sheet`.
- Produces:
  - `content.ts`: `SECTION_IDS = { hero: "top", features: "features", sample: "sample-feedback", how: "how-it-works", faq: "faq", closing: "start" }`; `META`; `NAV_LINKS: readonly { label: string; href: string }[]`; `HERO`; `FEATURES`; `SAMPLE`; `HOW`; `FAQ` (+ `interface FaqEntry { slug; question; answer }`); `CLOSING`
  - `LandingShell({ children })`, `LandingNav()`, `LandingFooter()`; `NAV_HEIGHT = 64` (local to nav.tsx)

- [ ] **Step 1: Create `src/components/landing/content.ts`**

```ts
/**
 * Every word on the landing page, plus the image paths. Components hold layout
 * only. Copy rules (spec §4.3): no testimonials, user counts or company logos;
 * the sample feedback is labelled as an example.
 *
 * "Free" claims are true as of 2026-10: there is no billing in the product.
 * Revisit FAQ.cost and the CTAs if pricing ships.
 */

export const SECTION_IDS = {
  hero: "top",
  features: "features",
  sample: "sample-feedback",
  how: "how-it-works",
  faq: "faq",
  closing: "start",
} as const;

export const META = {
  title: "Amplify Interview — AI mock interviews that adapt to you",
  description:
    "Practise with an AI interviewer that reads your résumé and the job description, adapts its difficulty to your answers, and scores every response with specific feedback.",
};

export const NAV_LINKS: readonly { label: string; href: string }[] = [
  { label: "Features", href: `#${SECTION_IDS.features}` },
  { label: "How it works", href: `#${SECTION_IDS.how}` },
  { label: "FAQ", href: `#${SECTION_IDS.faq}` },
];

export const HERO = {
  eyebrow: "AI mock interviews",
  heading: ["Walk in prepared.", "Walk out hired."] as const,
  supporting:
    "Upload your résumé and the job description. Get an adaptive interview that scores every answer and tells you exactly what to fix.",
  primaryCta: "Start a free interview",
  primaryCtaSignedIn: "Start an interview",
  secondaryCta: { label: "See how it works", href: `#${SECTION_IDS.how}` },
  groundSrc: "/images/landing/hero-ground.webp",
  shot: {
    src: "/images/landing/hero-interview.webp",
    width: 2880,
    height: 1800,
    alt: "An Amplify interview in progress: the interviewer's question, the candidate's answer with its score, and the session progress panel.",
  },
  scoreCard: { score: 82, label: "Strong answer", detail: "Clear structure, specific outcome" },
  nextCard: { label: "Next question", value: "Harder", detail: "Difficulty adapts to your recent answers" },
};

export const FEATURES = {
  eyebrow: "What you get",
  heading: "Practice that adapts to you",
  lead: "Every session is built from your résumé and the job you want, and it gets harder or easier based on how you actually answer.",
  cards: [
    {
      title: "Questions from your résumé",
      body: "Add your résumé and the job description; the interviewer asks about the experience and skills that role actually needs.",
    },
    {
      title: "Difficulty that adapts",
      body: "Strong answers raise the bar and weaker ones ease it off, so each question sits at the edge of what you can do.",
    },
    {
      title: "Every answer scored",
      body: "Each response is scored out of 100 on relevance, depth, specificity, clarity, structure and conciseness.",
    },
    {
      title: "Answer by voice or text",
      body: "Speak your answers as you would in the room, or type them when you want to think on the page.",
    },
    {
      title: "Feedback you can act on",
      body: "Every session ends with your strengths, specific improvements and where the points were lost.",
    },
    {
      title: "Progress over time",
      body: "Scores and topics are tracked across sessions, so you can see what is improving and what to practise next.",
    },
  ],
} as const;

export const SAMPLE = {
  eyebrow: "Example feedback",
  heading: "See exactly what to fix",
  lead: "This is the kind of breakdown you get after every answer. It is an illustrative example, not a real candidate's result.",
  badge: "Example",
  question:
    "Tell me about a time you had to deliver with an unclear scope. How did you decide what to build first?",
  answer:
    "On a billing migration, the brief was just “move us off the old provider”. I listed every flow that touched payments, ranked them by revenue at risk, and shipped the top three behind a flag in two weeks. We moved 80% of volume before tackling the long tail, and a Friday stakeholder update kept the scope from creeping.",
  overall: 82,
  verdict: "Strong answer",
  criteria: [
    { label: "Relevance", score: 90 },
    { label: "Specificity", score: 86 },
    { label: "Structure", score: 78 },
    { label: "Clarity", score: 64 },
  ],
  strengths: ["A concrete method: ranked by revenue at risk", "A quantified outcome: 80% of volume in two weeks"],
  improvement:
    "Name the trade-off you rejected. Saying what you chose not to build first shows judgement, not just execution.",
  next: "Next question: harder",
} as const;

export const HOW = {
  eyebrow: "How it works",
  heading: "From upload to interview-ready",
  lead: "Four steps, and the last one loops: every session makes the next one more useful.",
  steps: [
    {
      title: "Add your résumé and the job",
      body: "Upload your résumé and paste the job description. Amplify pulls out the skills and experience the role is asking for.",
    },
    {
      title: "Take an adaptive interview",
      body: "Answer by voice or text. The interviewer follows up when an answer is thin and adjusts difficulty as you go.",
    },
    {
      title: "Get scored feedback",
      body: "Every answer is scored with a short note on what worked, and the session ends with a full written review.",
    },
    {
      title: "Track progress and go again",
      body: "Your scores and topics build into a history, so the next session targets what still needs work.",
    },
  ],
} as const;

export interface FaqEntry {
  slug: string;
  question: string;
  answer: string;
}

export const FAQ: { eyebrow: string; heading: string; lead: string; entries: readonly FaqEntry[] } = {
  eyebrow: "FAQ",
  heading: "Questions, answered",
  lead: "The five things people ask before their first session.",
  entries: [
    {
      slug: "cost",
      question: "Is it free to start?",
      answer: "Yes. Create an account and run a complete interview, with scoring and feedback, without paying anything.",
    },
    {
      slug: "roles",
      question: "Which roles does it cover?",
      answer:
        "Any role with a written job description. Questions are generated from the description and your résumé, so a product manager and a backend engineer get very different interviews.",
    },
    {
      slug: "resume",
      question: "Is my résumé stored?",
      answer:
        "It is stored in your account so you can reuse it across sessions, and it is sent to our AI provider only to generate and score your own interviews.",
    },
    {
      slug: "voice",
      question: "Can I answer by voice?",
      answer:
        "Yes. Record an answer and it is transcribed before scoring, or type it if you prefer. You can switch on every question.",
    },
    {
      slug: "scoring",
      question: "How are answers scored?",
      answer:
        "Each answer is scored from 0 to 100 against a fixed rubric: relevance, depth, specificity, clarity, structure and conciseness. When your recent average reaches 78 or more the questions get harder; at 45 or below they get easier.",
    },
  ],
};

export const CLOSING = {
  heading: "Your next interview starts here",
  lead: "Ten minutes of practice today is one less surprise in the room.",
  cta: "Start a free interview",
  ctaSignedIn: "Start an interview",
};
```

- [ ] **Step 2: Write the failing nav test `src/components/landing/nav.test.tsx`**

```tsx
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockIntersectionObserver, installIntersectionObserver } from "@/test/browser-mocks";
import { LandingNav } from "./nav";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function renderNav() {
  return render(
    <MemoryRouter>
      <div data-landing="">
        <section id="top" data-testid="hero" />
        <LandingNav />
      </div>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
  installIntersectionObserver();
});

describe("LandingNav", () => {
  it("uses the dark tone over the hero and the cream tone after it", () => {
    renderNav();
    const header = screen.getByRole("banner");
    const hero = screen.getByTestId("hero");
    expect(header).toHaveAttribute("data-band", "ink");
    act(() => MockIntersectionObserver.fire(hero, false));
    expect(header).toHaveAttribute("data-band", "cream");
    act(() => MockIntersectionObserver.fire(hero, true));
    expect(header).toHaveAttribute("data-band", "ink");
  });

  it("offers sign-in and sign-up to visitors", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/signin");
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/auth/signup");
  });

  it("offers the dashboard to signed-in users instead", () => {
    auth.user = { uid: "u1" };
    renderNav();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("keeps the mobile menu inside the landing colour scope", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    const faq = within(dialog).getByRole("link", { name: "FAQ" });
    expect(faq.closest("[data-landing]")).not.toBeNull();
    expect(faq.closest("[data-band]")).toHaveAttribute("data-band", "cream");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/components/landing/nav.test.tsx`
Expected: FAIL — `Failed to resolve import "./nav"`.

- [ ] **Step 4: Create `src/components/landing/nav.tsx`**

```tsx
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS, SECTION_IDS } from "./content";
import { LandingCta } from "./cta";
import { BrandMark } from "./kit";
import { useLandingRoutes } from "./routes";

const NAV_HEIGHT = 64;

/**
 * Floating glass bar. Over the hero it takes the `ink` tone (light type on a
 * transparent bar); once the hero has scrolled under it, the `cream` tone and a
 * glass layer fade in. Only colour and the glass layer's opacity change — the
 * bar never moves.
 */
export function LandingNav() {
  const routes = useLandingRoutes();
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const hero = document.getElementById(SECTION_IDS.hero);
    if (!hero) {
      setOverHero(false);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      const onScroll = () => setOverHero(hero.getBoundingClientRect().bottom > NAV_HEIGHT);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const observer = new IntersectionObserver(([entry]) => setOverHero(entry.isIntersecting), {
      rootMargin: `-${NAV_HEIGHT}px 0px 0px 0px`,
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header data-band={overHero ? "ink" : "cream"} className="fixed inset-x-0 top-0 z-50 text-band-fg">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 border-b border-band-rule bg-band-ground/80 backdrop-blur-md transition-opacity duration-500 ease-plaza",
          overHero ? "opacity-0" : "opacity-100",
        )}
      />
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-16 w-full max-w-[84rem] items-center justify-between gap-6 px-4 sm:px-8 lg:px-12"
      >
        <Link to="/" aria-label="Amplify Interview home" className="rounded-pill">
          <BrandMark />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm font-medium text-band-muted transition-colors hover:text-band-fg">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          {routes.signedIn ? (
            <LandingCta to={routes.dashboard} size="sm">
              Go to dashboard
            </LandingCta>
          ) : (
            <>
              <Link
                to={routes.signIn}
                className="text-sm font-medium text-band-muted transition-colors hover:text-band-fg"
              >
                Sign in
              </Link>
              <LandingCta to={routes.start} size="sm">
                Start free
              </LandingCta>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="grid size-10 place-items-center rounded-pill text-band-fg md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" aria-describedby={undefined} className="w-[min(20rem,85vw)] border-0 p-0">
            {/* The sheet portals to <body>, outside the landing root, so it
                re-establishes the scope itself: one element for the scope, a
                child for the band (the CSS uses a descendant selector). */}
            <div data-landing="" className="h-full">
              <div data-band="cream" className="flex h-full flex-col gap-8 bg-band-ground px-6 pb-8 pt-16 text-band-fg">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <SheetClose asChild>
                        <a
                          href={link.href}
                          className="block rounded-tile px-3 py-3 text-base font-medium hover:bg-band-fg/5"
                        >
                          {link.label}
                        </a>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-col gap-3">
                  {routes.signedIn ? (
                    <LandingCta to={routes.dashboard}>Go to dashboard</LandingCta>
                  ) : (
                    <>
                      <LandingCta to={routes.start}>Start free</LandingCta>
                      <LandingCta to={routes.signIn} variant="secondary">
                        Sign in
                      </LandingCta>
                    </>
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
```

- [ ] **Step 5: Create `src/components/landing/footer.tsx`**

```tsx
import { Link } from "react-router-dom";
import { NAV_LINKS } from "./content";
import { Frame, BrandMark } from "./kit";
import { useLandingRoutes } from "./routes";

function FooterLink({ to, children }: { to: string; children: string }) {
  const className = "text-sm text-band-muted transition-colors hover:text-band-fg";
  return to.startsWith("#") ? (
    <a href={to} className={className}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export function LandingFooter() {
  const routes = useLandingRoutes();
  const columns = [
    { title: "Product", links: NAV_LINKS.map((link) => ({ label: link.label, to: link.href })) },
    {
      title: "Practice",
      links: [
        { label: "Start an interview", to: routes.start },
        { label: "Practice questions", to: "/dashboard/practice-questions" },
      ],
    },
    {
      title: "Account",
      links: routes.signedIn
        ? [{ label: "Dashboard", to: routes.dashboard }]
        : [
            { label: "Sign in", to: routes.signIn },
            { label: "Create account", to: routes.signUp },
          ],
    },
  ];

  return (
    <footer data-band="cream" className="border-t border-band-rule bg-band-ground text-band-fg">
      <Frame width="wide" className="flex flex-col gap-12 py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <BrandMark />
            <p className="max-w-[18rem] text-sm leading-relaxed text-band-muted">
              Adaptive AI mock interviews, scored answer by answer.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <p className="label text-band-faint">{column.title}</p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink to={link.to}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="border-t border-band-rule pt-6 text-xs text-band-faint">
          © {new Date().getFullYear()} Amplify Interview
        </p>
      </Frame>
    </footer>
  );
}
```

- [ ] **Step 6: Create `src/components/landing/shell.tsx`**

```tsx
import { useRef, type ReactNode } from "react";
import { HERO } from "./content";
import { LandingFooter } from "./footer";
import { useLandingMotion } from "./motion";
import { LandingNav } from "./nav";

import "./landing.css";

/**
 * The landing root. Two elements, and it has to be two: landing.css declares
 * bands as `[data-landing] [data-band]` (a DESCENDANT selector), so one element
 * carrying both attributes would match nothing and every band colour would be
 * undefined.
 */
export function LandingShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const motionClass = useLandingMotion(root, HERO.groundSrc);

  return (
    <div ref={root} data-landing="" className={motionClass || undefined}>
      {/* White, so fractional-pixel seams between bands blend invisibly. */}
      <div data-band="paper" className="flex min-h-screen flex-col bg-white font-landing text-band-fg antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-band-accent focus:px-5 focus:py-3 focus:text-band-on-accent"
        >
          Skip to content
        </a>
        <LandingNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run the nav test to verify it passes**

Run: `npm test -- src/components/landing/nav.test.tsx`
Expected: PASS (4 tests). If Radix logs a "Missing `Description`" warning, it is silenced by `aria-describedby={undefined}`; if the dialog test cannot find `role="dialog"`, confirm `SheetContent` in `src/components/ui/sheet.tsx` wraps `SheetPrimitive.Content` (Radix Dialog sets the role).

- [ ] **Step 8: Gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS; 0 type errors; lint ≤ 79; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/landing/content.ts src/components/landing/shell.tsx src/components/landing/nav.tsx src/components/landing/footer.tsx src/components/landing/nav.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add copy, shell, glass nav with band flip, and footer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Hero and hero shot

**Files:**
- Create: `src/components/landing/hero.tsx`, `src/components/landing/hero-shot.tsx`
- Test: `src/components/landing/hero.test.tsx`

**Interfaces:**
- Consumes: `Band`, `Frame` (kit), `Enter` (reveal), `LandingCta`, `useLandingRoutes`, `HERO`, `SECTION_IDS` (content), `scoreBand`, `SCORE_COLORS` (`@/lib/score`); framer-motion `motion`, `useScroll`, `useTransform`, `useReducedMotion`.
- Produces: `LandingHero()`, `HeroShot({ className? })`.

- [ ] **Step 1: Write the failing test `src/components/landing/hero.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HERO } from "./content";
import { LandingHero } from "./hero";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
// framer-motion's scroll tracking is not what is under test here.
vi.mock("./hero-shot", () => ({ HeroShot: () => null }));

function renderHero() {
  return render(
    <MemoryRouter>
      <LandingHero />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
});

describe("LandingHero", () => {
  it("reads the headline as one sentence pair under a single h1", () => {
    renderHero();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Walk in prepared. Walk out hired.");
  });

  it("sends visitors to sign-up", () => {
    renderHero();
    expect(screen.getByRole("link", { name: HERO.primaryCta })).toHaveAttribute("href", "/auth/signup");
  });

  it("sends signed-in users straight to interview setup", () => {
    auth.user = { uid: "u1" };
    renderHero();
    expect(screen.getByRole("link", { name: HERO.primaryCtaSignedIn })).toHaveAttribute("href", "/interview/setup");
  });

  it("links the secondary action to the timeline in-page", () => {
    renderHero();
    expect(screen.getByRole("link", { name: HERO.secondaryCta.label })).toHaveAttribute("href", "#how-it-works");
  });

  it("is the band the nav watches", () => {
    const { container } = renderHero();
    expect(container.querySelector("section#top")).toHaveAttribute("data-band", "ink");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/landing/hero.test.tsx`
Expected: FAIL — `Failed to resolve import "./hero"`.

- [ ] **Step 3: Create `src/components/landing/hero-shot.tsx`**

```tsx
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import { HERO } from "./content";

/**
 * The product, framed: a real screenshot in a glass frame that dissolves into
 * the white band below, plus two HTML cards overhanging its edges that drift a
 * few pixels on scroll. The cards are markup, not part of the image, so they
 * stay sharp and are edited in content.ts. Below `md` the cards are hidden and
 * the screenshot crops to its left (chat) column.
 *
 * No entrance transform beyond the shared Enter fade: a perspective rotation
 * on a product screenshot reads as a slide-deck build.
 */
export function HeroShot({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const driftScore = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [12, -12]);
  const driftNext = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-8, 16]);

  const band = scoreBand(HERO.scoreCard.score);

  return (
    <div ref={ref} className={cn("relative mx-auto w-full max-w-[72rem] px-4 sm:px-8", className)}>
      <div className="hero-shot-mask relative">
        <div className="hero-shot-still rounded-panel border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm sm:p-2">
          <img
            src={HERO.shot.src}
            alt={HERO.shot.alt}
            width={HERO.shot.width}
            height={HERO.shot.height}
            decoding="async"
            {...{ fetchpriority: "high" }}
            className="block h-auto w-full rounded-tile bg-background object-cover object-left-top max-md:aspect-[4/5]"
          />
        </div>

        <motion.div
          data-band="paper"
          style={{ y: driftScore }}
          className="hero-shot-card absolute -left-4 top-[34%] hidden w-60 rounded-tile bg-band-raised p-4 text-left text-band-fg md:block lg:-left-12"
        >
          <div className="flex items-center gap-3">
            <span
              data-score-band={band}
              className="grid size-12 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(${SCORE_COLORS[band].fill} 0 ${HERO.scoreCard.score}%, hsl(var(--border)) 0)`,
              }}
            >
              <span className="grid size-[38px] place-items-center rounded-full bg-band-raised text-sm font-semibold tabular-nums">
                {HERO.scoreCard.score}
              </span>
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{HERO.scoreCard.label}</span>
              <span className="text-xs leading-snug text-band-muted">{HERO.scoreCard.detail}</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          data-band="paper"
          style={{ y: driftNext }}
          className="hero-shot-card absolute -right-4 top-[14%] hidden w-56 rounded-tile bg-band-raised p-4 text-left text-band-fg md:block lg:-right-12"
        >
          <p className="label text-band-signal">{HERO.nextCard.label}</p>
          <p className="mt-1 text-base font-semibold">
            {HERO.nextCard.value} <span aria-hidden="true">↑</span>
          </p>
          <p className="mt-1 text-xs leading-snug text-band-muted">{HERO.nextCard.detail}</p>
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/landing/hero.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { HERO, SECTION_IDS } from "./content";
import { LandingCta } from "./cta";
import { HeroShot } from "./hero-shot";
import { Band, Frame } from "./kit";
import { Enter } from "./reveal";
import { useLandingRoutes } from "./routes";

/**
 * Band 1: one label, one headline, one sentence, two actions, then the product.
 *
 * The dark comes entirely from `hero-ground.webp`, which runs near-black at the
 * top through the emerald bloom to pure white at its foot. `bg-white` overrides
 * the band's ink ground so whatever the image stops covering is white, not ink —
 * otherwise a dark strip appears under the screenshot. `bg-cover` is load-
 * bearing: it scales by height so the white foot always lands on the band's
 * bottom edge. `overflow-clip` (not hidden) cuts the overhanging cards without
 * making this a scroll container.
 */
export function LandingHero() {
  const routes = useLandingRoutes();

  return (
    <Band
      id={SECTION_IDS.hero}
      tone="ink"
      className="z-10 flex min-h-svh flex-col overflow-clip bg-white pb-0 pt-28 sm:pt-32 lg:pt-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO.groundSrc})` }}
      />

      <Frame width="wide" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Enter>
          <p className="label text-band-fg">{HERO.eyebrow}</p>
        </Enter>

        <Enter delay={0.07}>
          <h1 className="font-display text-display-1 font-medium tracking-[-0.035em] text-band-fg">
            {HERO.heading.map((line, i) => (
              <span
                key={line}
                className={cn(
                  "block",
                  // White running into the brand emerald. Transparent fill is the
                  // price of gradient type; pb keeps descenders inside the clip.
                  i === 1 && "bg-[linear-gradient(90deg,#ffffff_14%,#10a37f_96%)] bg-clip-text pb-[0.14em] text-transparent",
                )}
              >
                {line}
                {i === 0 ? " " : null}
              </span>
            ))}
          </h1>
        </Enter>

        <Enter delay={0.14}>
          <p className="max-w-[34rem] text-pretty text-body-sm text-white/90">{HERO.supporting}</p>
        </Enter>

        <Enter delay={0.21} className="mt-1 flex flex-wrap items-center justify-center gap-3">
          <LandingCta to={routes.start}>
            {routes.signedIn ? HERO.primaryCtaSignedIn : HERO.primaryCta}
            <span aria-hidden="true">→</span>
          </LandingCta>
          <LandingCta
            to={HERO.secondaryCta.href}
            variant="secondary"
            className="border-white/20 bg-white/5 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/10"
          >
            {HERO.secondaryCta.label}
          </LandingCta>
        </Enter>
      </Frame>

      <Enter delay={0.3} rise={40}>
        <HeroShot className="mt-12 sm:mt-14 lg:mt-16" />
      </Enter>
    </Band>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/landing/hero.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS; 0 type errors; lint ≤ 79; build succeeds. (The `fetchpriority` spread avoids React 18's unknown-camelCase-prop warning.)

- [ ] **Step 7: Commit**

```bash
git add src/components/landing/hero.tsx src/components/landing/hero-shot.tsx src/components/landing/hero.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add hero band and framed product shot with drifting cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Features and sample-feedback bands

**Files:**
- Create: `src/components/landing/features.tsx`, `src/components/landing/sample-feedback.tsx`
- Test: `src/components/landing/sections.test.tsx`

**Interfaces:**
- Consumes: `Band`, `BandHeader`, `CardGlow`, `Frame`, `Panel` (kit); `Reveal`; `FEATURES`, `SAMPLE`, `SECTION_IDS`; `scoreBand`, `SCORE_COLORS`.
- Produces: `Features()`, `SampleFeedback()`.

- [ ] **Step 1: Write the failing test `src/components/landing/sections.test.tsx`**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FEATURES, SAMPLE } from "./content";
import { Features } from "./features";
import { SampleFeedback } from "./sample-feedback";

describe("Features", () => {
  it("renders six cards, each titled by an h3", () => {
    render(<Features />);
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      FEATURES.cards.map((card) => card.title),
    );
  });
});

describe("SampleFeedback", () => {
  it("is visibly badged as an example", () => {
    render(<SampleFeedback />);
    expect(screen.getByText(SAMPLE.badge)).toBeInTheDocument();
  });

  it("colours the overall score and each criterion by the shared score scale", () => {
    render(<SampleFeedback />);
    expect(screen.getByRole("img", { name: "Score 82 out of 100" })).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("Clarity").closest("li")).toHaveAttribute("data-score-band", "mid");
    expect(screen.getByText("Structure").closest("li")).toHaveAttribute("data-score-band", "high");
  });

  it("keeps every example score inside 0–100", () => {
    for (const score of [SAMPLE.overall, ...SAMPLE.criteria.map((c) => c.score)]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/landing/sections.test.tsx`
Expected: FAIL — cannot resolve `./features`.

- [ ] **Step 3: Create `src/components/landing/features.tsx`**

```tsx
import { BarChart3, ClipboardList, FileText, Gauge, Mic, TrendingUp, type LucideIcon } from "lucide-react";
import { FEATURES, SECTION_IDS } from "./content";
import { Band, BandHeader, CardGlow, Frame } from "./kit";
import { Reveal } from "./reveal";

/** Parallel to FEATURES.cards by position. Icons are decorative; the h3 carries meaning. */
const ICONS: readonly LucideIcon[] = [FileText, TrendingUp, Gauge, Mic, ClipboardList, BarChart3];

if (import.meta.env.DEV && ICONS.length !== FEATURES.cards.length) {
  console.warn(`[features] ${FEATURES.cards.length} cards but ${ICONS.length} icons.`);
}

/**
 * Band 2. `paper` because it receives the hero's white foot. The bottom ramp
 * starts transparent and ends on the exact cream of the next band, so the
 * boundary is cream-on-cream and cannot show an edge. Its height tracks this
 * band's bottom padding — change one, change both.
 */
export function Features() {
  return (
    <Band id={SECTION_IDS.features} tone="paper" className="pb-40 sm:pb-48 lg:pb-56">
      <CardGlow />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_bottom,rgb(250_246_238/0)_0%,rgb(250_246_238/0.1)_22%,rgb(250_246_238/0.34)_46%,rgb(250_246_238/0.66)_70%,rgb(250_246_238/0.9)_87%,rgb(250_246_238)_100%)] sm:h-48 lg:h-56"
      />

      <Frame width="wide" className="flex max-w-[90rem] flex-col gap-[72px] px-4 sm:px-10 lg:px-20">
        <Reveal>
          <BandHeader
            eyebrow={FEATURES.eyebrow}
            heading={FEATURES.heading}
            headingClassName="text-[clamp(2.25rem,1.65rem+2.7vw,3.5rem)] font-medium leading-[1.04]"
            plainHeading
            lead={FEATURES.lead}
            leadClassName="text-body-sm text-band-muted"
            align="center"
            className="mx-auto"
          />
        </Reveal>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.cards.map((card, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal as="li" key={card.title} delay={Math.min(i, 2) * 0.05}>
                <div className="flex h-full flex-col gap-9 rounded-xl border border-band-rule bg-white/70 p-6">
                  {Icon ? (
                    <span className="grid size-[52px] shrink-0 place-items-center rounded-tile border-[1.5px] border-band-rule bg-white">
                      <Icon className="size-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  ) : null}
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xl font-medium leading-tight text-band-fg">{card.title}</h3>
                    <p className="text-[15px] leading-relaxed text-band-muted">{card.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Frame>
    </Band>
  );
}
```

- [ ] **Step 4: Create `src/components/landing/sample-feedback.tsx`**

```tsx
import { ArrowUpRight, Check } from "lucide-react";
import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { SAMPLE, SECTION_IDS } from "./content";
import { Band, BandHeader, Frame, Panel } from "./kit";
import { Reveal } from "./reveal";

function ScoreRing({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span
      role="img"
      aria-label={`Score ${score} out of 100`}
      data-score-band={band}
      className="grid size-16 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${SCORE_COLORS[band].fill} 0 ${score}%, hsl(var(--border)) 0)` }}
    >
      <span
        aria-hidden="true"
        className="grid size-[52px] place-items-center rounded-full bg-band-raised text-lg font-semibold tabular-nums text-band-fg"
      >
        {score}
      </span>
    </span>
  );
}

function CriterionBar({ label, score }: { label: string; score: number }) {
  const band = scoreBand(score);
  return (
    <li data-score-band={band} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm">
      <span className="text-band-muted">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-pill bg-band-fg/10">
        <span className="block h-full rounded-pill" style={{ width: `${score}%`, background: SCORE_COLORS[band].fill }} />
      </span>
      <span className="text-right font-semibold tabular-nums" style={{ color: SCORE_COLORS[band].text }}>
        {score}
      </span>
    </li>
  );
}

/**
 * Band 3, in place of the reference's organisations/opportunities proof bands:
 * Amplify has no real customers to show, so the product argues for itself with
 * one illustrative, clearly badged example.
 */
export function SampleFeedback() {
  return (
    <Band id={SECTION_IDS.sample} tone="cream">
      <Frame width="wide" className="flex max-w-[90rem] flex-col gap-14 px-4 sm:px-10 lg:px-20">
        <Reveal>
          <BandHeader
            eyebrow={SAMPLE.eyebrow}
            heading={SAMPLE.heading}
            lead={SAMPLE.lead}
            leadClassName="text-body-sm text-band-muted"
            headingClassName="text-display-2 font-medium"
          />
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Reveal>
            <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
              <p className="label text-band-signal">Question</p>
              <p className="text-lg font-medium leading-snug text-band-fg">{SAMPLE.question}</p>
              <div className="border-t border-band-rule pt-6">
                <p className="label text-band-faint">Answer excerpt</p>
                <p className="mt-3 text-[15px] leading-relaxed text-band-muted">{SAMPLE.answer}</p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.05}>
            <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={SAMPLE.overall} />
                  <div>
                    <p className="text-lg font-semibold text-band-fg">{SAMPLE.verdict}</p>
                    <p className="text-sm text-band-muted">Overall score</p>
                  </div>
                </div>
                <span className="rounded-pill border border-band-rule-strong px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-band-muted">
                  {SAMPLE.badge}
                </span>
              </div>

              <ul className="flex flex-col gap-3">
                {SAMPLE.criteria.map((criterion) => (
                  <CriterionBar key={criterion.label} label={criterion.label} score={criterion.score} />
                ))}
              </ul>

              <div className="grid gap-6 border-t border-band-rule pt-6 sm:grid-cols-2">
                <div>
                  <p className="label text-band-signal">Strengths</p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {SAMPLE.strengths.map((strength) => (
                      <li key={strength} className="flex gap-2 text-sm leading-relaxed text-band-fg">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" strokeWidth={2} />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label" style={{ color: SCORE_COLORS.mid.text }}>
                    To improve
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-band-fg">{SAMPLE.improvement}</p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-accent/10 px-3 py-1.5 text-sm font-semibold text-score-high-text">
                {SAMPLE.next}
                <ArrowUpRight className="size-4" aria-hidden="true" strokeWidth={2} />
              </span>
            </Panel>
          </Reveal>
        </div>
      </Frame>
    </Band>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/landing/sections.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS; 0 type errors; lint ≤ 79; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/landing/features.tsx src/components/landing/sample-feedback.tsx src/components/landing/sections.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add features grid and example feedback band

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: How it works, FAQ, closing CTA

**Files:**
- Create: `src/components/landing/how-it-works.tsx`, `faq.tsx`, `closing-cta.tsx`
- Test: `src/components/landing/faq.test.tsx`, `src/components/landing/closing-cta.test.tsx`

**Interfaces:**
- Consumes: kit, `Reveal`, `LandingCta`, `useLandingRoutes`, `HOW`, `FAQ`, `FaqEntry`, `CLOSING`, `SECTION_IDS`.
- Produces: `HowItWorks()`, `Faq()`, `ClosingCta()`.

- [ ] **Step 1: Write the failing FAQ test `src/components/landing/faq.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FAQ } from "./content";
import { Faq } from "./faq";

function questions() {
  return FAQ.entries.map((entry) => screen.getByRole("button", { name: entry.question }));
}

describe("Faq", () => {
  it("opens the first answer by default and keeps only one open at a time", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const [first, second] = questions();
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");

    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });

  it("ties each question to its answer region and marks closed answers", () => {
    render(<Faq />);
    const second = questions()[1];
    const region = document.getElementById(second.getAttribute("aria-controls") ?? "");
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("aria-labelledby", second.id);
    expect(region).not.toHaveAttribute("data-open");
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const third = questions()[2];
    third.focus();
    await user.keyboard("{Enter}");
    expect(third).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(third).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 2: Write the failing closing-CTA test `src/components/landing/closing-cta.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClosingCta } from "./closing-cta";
import { CLOSING } from "./content";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function renderClosing() {
  return render(
    <MemoryRouter>
      <ClosingCta />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
});

describe("ClosingCta", () => {
  it("sends visitors to sign-up and members to setup", () => {
    const { unmount } = renderClosing();
    expect(screen.getByRole("link", { name: CLOSING.cta })).toHaveAttribute("href", "/auth/signup");
    unmount();
    auth.user = { uid: "u1" };
    renderClosing();
    expect(screen.getByRole("link", { name: CLOSING.ctaSignedIn })).toHaveAttribute("href", "/interview/setup");
  });

  it("marks the gradient as idle-animated so it only runs near the viewport", () => {
    const { container } = renderClosing();
    expect(container.querySelector(".landing-fluid")).toHaveAttribute("data-animate-idle");
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npm test -- src/components/landing/faq.test.tsx src/components/landing/closing-cta.test.tsx`
Expected: FAIL — cannot resolve `./faq` and `./closing-cta`.

- [ ] **Step 4: Create `src/components/landing/how-it-works.tsx`**

```tsx
import { HOW, SECTION_IDS } from "./content";
import { Band, BandHeader, Frame } from "./kit";
import { Reveal } from "./reveal";

/** Band 4: a vertical timeline. The <ol> carries the order; the numbers are decorative. */
export function HowItWorks() {
  return (
    <Band id={SECTION_IDS.how} tone="mint">
      <div aria-hidden="true" className="net-grid pointer-events-none absolute inset-0 -z-10" />
      <Frame
        width="wide"
        className="grid max-w-[90rem] gap-14 px-4 sm:px-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20 lg:px-20"
      >
        <Reveal>
          <BandHeader
            eyebrow={HOW.eyebrow}
            heading={HOW.heading}
            lead={HOW.lead}
            leadClassName="text-body-sm text-band-muted"
            headingClassName="text-display-2 font-medium"
          />
        </Reveal>

        <ol className="flex flex-col">
          {HOW.steps.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={Math.min(i, 2) * 0.05}
              className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-5 pb-12 last:pb-0"
            >
              {i < HOW.steps.length - 1 ? (
                <span aria-hidden="true" className="absolute bottom-1 left-5 top-12 w-px -translate-x-1/2 bg-band-fg/10" />
              ) : null}
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full border border-band-rule bg-band-raised text-sm font-semibold tabular-nums text-band-signal shadow-[var(--card-shadow)]"
              >
                {i + 1}
              </span>
              <div className="pt-1.5">
                <h3 className="text-xl font-medium text-band-fg">{step.title}</h3>
                <p className="mt-2 max-w-[34rem] text-[15px] leading-relaxed text-band-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Frame>
    </Band>
  );
}
```

- [ ] **Step 5: Create `src/components/landing/faq.tsx`**

```tsx
import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FAQ, SECTION_IDS, type FaqEntry } from "./content";
import { Band, BandHeader, Frame } from "./kit";
import { Reveal } from "./reveal";

function FaqRow({
  entry,
  open,
  onToggle,
  delay,
}: {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const questionId = `faq-${entry.slug}-q`;
  const answerId = `faq-${entry.slug}-a`;

  return (
    <li className="border-t border-band-rule">
      <Reveal delay={delay}>
        {/* The h3 wraps the button: headings list gives the questions, and the
            same element is what gets pressed. */}
        <h3>
          <button
            type="button"
            id={questionId}
            aria-expanded={open}
            aria-controls={answerId}
            onClick={onToggle}
            className="group flex w-full items-start justify-between gap-6 rounded-[0.25rem] py-6 text-left sm:gap-10"
          >
            <span className="text-[1.0625rem] font-medium leading-[1.45] tracking-[-0.011em] text-band-fg sm:text-[1.1875rem]">
              {entry.question}
            </span>
            <Plus
              aria-hidden="true"
              strokeWidth={1.5}
              className={cn(
                "mt-1 size-5 shrink-0 transition-[transform,color] duration-300 ease-plaza",
                open ? "rotate-45 text-band-signal" : "text-band-faint group-hover:text-band-fg",
              )}
            />
          </button>
        </h3>
        {/* Height and visibility are owned by .landing-faq-panel in landing.css. */}
        <div
          id={answerId}
          role="region"
          aria-labelledby={questionId}
          data-open={open ? "" : undefined}
          className="landing-faq-panel"
        >
          <div className="overflow-hidden">
            <p className="max-w-[44rem] pb-7 pr-6 text-[0.9375rem] leading-[1.7] text-band-muted sm:pr-14">
              {entry.answer}
            </p>
          </div>
        </div>
      </Reveal>
    </li>
  );
}

/** Band 5: after the argument, not inside it. */
export function Faq() {
  const [openSlug, setOpenSlug] = useState<string | null>(FAQ.entries[0]?.slug ?? null);

  return (
    <Band id={SECTION_IDS.faq} tone="cream">
      <Frame width="wide" className="max-w-[90rem] px-4 sm:px-10 lg:px-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-x-20">
          <Reveal>
            <BandHeader
              eyebrow={FAQ.eyebrow}
              heading={FAQ.heading}
              plainHeading
              lead={FAQ.lead}
              leadClassName="text-body-sm text-band-muted"
              headingClassName="text-display-3 font-medium"
            />
          </Reveal>

          <ul className="border-b border-band-rule">
            {FAQ.entries.map((entry, i) => (
              <FaqRow
                key={entry.slug}
                entry={entry}
                open={openSlug === entry.slug}
                onToggle={() => setOpenSlug(openSlug === entry.slug ? null : entry.slug)}
                delay={Math.min(i, 2) * 0.05}
              />
            ))}
          </ul>
        </div>
      </Frame>
    </Band>
  );
}
```

- [ ] **Step 6: Create `src/components/landing/closing-cta.tsx`**

```tsx
import { CLOSING, SECTION_IDS } from "./content";
import { LandingCta } from "./cta";
import { Band, Frame } from "./kit";
import { Reveal } from "./reveal";
import { useLandingRoutes } from "./routes";

/**
 * Band 6: the close, on an inset panel with a slowly drifting emerald field.
 * The panel is an `ink` band, so the ink CTA inverts to near-white on it.
 * Blobs are paused until motion.ts's idle observer marks the field live.
 */
export function ClosingCta() {
  const routes = useLandingRoutes();

  return (
    <Band id={SECTION_IDS.closing} tone="cream" className="pt-0 sm:pt-0 lg:pt-0">
      <Frame width="wide" className="max-w-[90rem] px-4 sm:px-10 lg:px-20">
        <Reveal>
          <div
            data-band="ink"
            className="relative isolate overflow-hidden rounded-[20px] bg-[#06261F] px-6 py-20 text-center sm:px-12 sm:py-28"
          >
            <div aria-hidden="true" data-animate-idle="" className="landing-fluid">
              <span className="landing-fluid-b" />
              <span className="landing-fluid-a" />
              <span className="landing-fluid-c" />
            </div>
            <div aria-hidden="true" className="landing-fluid-core" />
            <div aria-hidden="true" className="landing-grain" />

            <div className="relative flex flex-col items-center gap-6">
              <h2 className="max-w-[40rem] text-display-2 font-medium tracking-[-0.02em] text-band-fg">
                {CLOSING.heading}
              </h2>
              <p className="max-w-[32rem] text-body-sm text-band-muted">{CLOSING.lead}</p>
              <LandingCta to={routes.start} variant="ink" size="lg">
                {routes.signedIn ? CLOSING.ctaSignedIn : CLOSING.cta}
                <span aria-hidden="true">→</span>
              </LandingCta>
            </div>
          </div>
        </Reveal>
      </Frame>
    </Band>
  );
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- src/components/landing/faq.test.tsx src/components/landing/closing-cta.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 8: Gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS; 0 type errors; lint ≤ 79; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/landing/how-it-works.tsx src/components/landing/faq.tsx src/components/landing/closing-cta.tsx src/components/landing/faq.test.tsx src/components/landing/closing-cta.test.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add how-it-works timeline, FAQ accordion and closing CTA

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Compose the page, update metadata, delete the old landing

**Files:**
- Rewrite: `src/pages/Index.tsx`
- Modify: `index.html` (title, description, og/twitter text)
- Delete: `src/components/landing/{HeroSection,FeaturesSection,HowItWorksSection,CTASection}.tsx`, `src/components/{Hero,Features,HowItWorks}.tsx`, `src/components/layout/{Navbar,Footer}.tsx`; conditionally `src/components/{Navbar,Footer}.tsx`
- Test: `src/pages/Index.test.tsx`

**Interfaces:**
- Consumes: every landing export; `META`, `NAV_LINKS`, `SECTION_IDS`; `HelmetProvider`/`Helmet` from `react-helmet-async`.
- Produces: default export `Index` (route `/`, unchanged in `App.tsx`).

- [ ] **Step 1: Write the failing page test `src/pages/Index.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NAV_LINKS, SECTION_IDS } from "@/components/landing/content";
import Index from "./Index";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/landing/hero-shot", () => ({ HeroShot: () => null }));

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Landing page", () => {
  it("has exactly one h1 and the three landmarks", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("offers a skip link to the main content", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  });

  it("renders every band, and every nav link points at one", () => {
    renderPage();
    for (const id of Object.values(SECTION_IDS)) {
      expect(document.getElementById(id), `#${id}`).not.toBeNull();
    }
    for (const link of NAV_LINKS) {
      expect(document.querySelector(link.href), link.href).not.toBeNull();
    }
  });

  it("scopes the page for landing.css", () => {
    const { container } = renderPage();
    expect(container.querySelector("[data-landing] > [data-band='paper']")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/pages/Index.test.tsx`
Expected: FAIL — the old Index renders no `#main`, no skip link, no `[data-landing]`.

- [ ] **Step 3: Rewrite `src/pages/Index.tsx`**

```tsx
import { Helmet } from "react-helmet-async";
import { ClosingCta } from "@/components/landing/closing-cta";
import { META } from "@/components/landing/content";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { LandingHero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleFeedback } from "@/components/landing/sample-feedback";
import { LandingShell } from "@/components/landing/shell";

/**
 * The landing page: six bands in the reference's band system.
 * Spec: docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md §4.
 * The hero's white foot meets the white features band, so no seam treatment
 * belongs between them.
 */
const Index = () => (
  <>
    <Helmet>
      <title>{META.title}</title>
      <meta name="description" content={META.description} />
    </Helmet>
    <LandingShell>
      <LandingHero />
      <Features />
      <SampleFeedback />
      <HowItWorks />
      <Faq />
      <ClosingCta />
    </LandingShell>
  </>
);

export default Index;
```

- [ ] **Step 4: Run the page test to verify it passes**

Run: `npm test -- src/pages/Index.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Update `index.html` metadata**

Replace the `<title>`, `description`, `og:title`, `og:description` values with:

```html
    <title>Amplify Interview — AI mock interviews that adapt to you</title>
    <meta
      name="description"
      content="Practise with an AI interviewer that reads your résumé and the job description, adapts its difficulty to your answers, and scores every response with specific feedback."
    />
```

and

```html
    <meta property="og:title" content="Amplify Interview — AI mock interviews that adapt to you" />
    <meta
      property="og:description"
      content="Practise with an AI interviewer that reads your résumé and the job description, adapts its difficulty to your answers, and scores every response with specific feedback."
    />
```

(The old copy advertised video analysis and real-time coaching, which are not built.)

- [ ] **Step 6: Delete the old landing and its dead neighbours**

```bash
git rm src/components/landing/HeroSection.tsx src/components/landing/FeaturesSection.tsx src/components/landing/HowItWorksSection.tsx src/components/landing/CTASection.tsx
git rm src/components/Hero.tsx src/components/Features.tsx src/components/HowItWorks.tsx
git rm src/components/layout/Navbar.tsx src/components/layout/Footer.tsx
```

- [ ] **Step 7: Check the two conditional deletions**

Run: `grep -rnE "components/(Navbar|Footer)['\"]|from ['\"]\./(Navbar|Footer)['\"]|from ['\"]\.\./(Navbar|Footer)['\"]" src`
Expected: no output. If there is none, `git rm src/components/Navbar.tsx src/components/Footer.tsx`. If anything prints, keep those files and note it in the handoff.

Then confirm nothing references the deleted files:
Run: `grep -rnE "landing/(HeroSection|FeaturesSection|HowItWorksSection|CTASection)|components/(Hero|Features|HowItWorks)['\"]|layout/(Navbar|Footer)" src`
Expected: no output.

- [ ] **Step 8: Gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS; 0 type errors; lint ≤ 79 (deletions may lower it — record the new number); build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Index.tsx src/pages/Index.test.tsx index.html
git commit -m "$(cat <<'EOF'
feat(landing): compose the new landing page and remove the old one

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

(`git rm` already staged the deletions; they are included in this commit.)

---

### Task 10: Hero screenshot, visual verification, smoke check

**Files:**
- Modify: `package.json` (devDependency `playwright`)
- Create: `scripts/capture-hero-shot.mjs`, `scripts/screenshot-landing.mjs`, `public/images/landing/hero-interview.webp`
- Modify test: `src/test/landing-assets.test.ts`

**Interfaces:**
- Consumes: dev server on `http://localhost:3000`; `HERO.shot` (`src`, `width: 2880`, `height: 1800`); the session page's API calls `POST /api/interview/session` → `StartSessionResponse` and `POST /api/interview/session/{id}/message` → `SendMessageResponse` (types in `src/services/apiClient.ts`); mock auth via `localStorage.amplify_id_token = "mock-user-token"`; setup via `sessionStorage.interviewConfig`.
- Produces: `public/images/landing/hero-interview.webp` (2880×1800); screenshots in `.superpowers/screens/`.

- [ ] **Step 1: Extend the asset test so the hero shot is required (failing)**

In `src/test/landing-assets.test.ts`, change the list and add a check that the page's own paths are covered:

```ts
/// <reference types="node" />
import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HERO } from "@/components/landing/content";

const LANDING_ASSETS = ["hero-ground.webp", "section-glow.webp", "grain.webp", "hero-interview.webp"];

describe("landing artwork", () => {
  it.each(LANDING_ASSETS)("ships public/images/landing/%s", (name) => {
    const file = new URL(`../../public/images/landing/${name}`, import.meta.url);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(0);
  });

  it("covers every image path the page references", () => {
    for (const path of [HERO.groundSrc, HERO.shot.src]) {
      expect(LANDING_ASSETS.map((name) => `/images/landing/${name}`)).toContain(path);
    }
  });
});
```

Run: `npm test -- src/test/landing-assets.test.ts`
Expected: FAIL — `hero-interview.webp` does not exist.

- [ ] **Step 2: Install Playwright and its Chromium**

```bash
npm install -D playwright
npx playwright install chromium
```

- [ ] **Step 3: Create `scripts/capture-hero-shot.mjs`**

```js
// Captures the interview session screen for the landing hero.
// Requires `npm run dev` on :3000. The backend is NOT needed: API calls are
// intercepted with fixtures, auth uses the dev mock token, and the camera is a
// canvas stream so no permission prompt or test pattern appears.
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PNG = ".superpowers/screens/hero-interview.png";
const WEBP = "public/images/landing/hero-interview.webp";

const QUESTION_1 =
  "Tell me about a time you had to deliver with an unclear scope. How did you decide what to build first?";
const ANSWER =
  "On a billing migration, the brief was just “move us off the old provider”. I listed every flow that touched payments, ranked them by revenue at risk, and shipped the top three behind a flag in two weeks. We moved 80% of volume before tackling the long tail, and a Friday stakeholder update kept the scope from creeping.";
const QUESTION_2 =
  "You ranked flows by revenue at risk. Walk me through a time that ranking conflicted with what a senior stakeholder wanted.";

const now = new Date().toISOString();
const progress = (asked, average) => ({
  questions_asked: asked,
  questions_total: 8,
  current_difficulty: asked > 1 ? "hard" : "medium",
  topics_covered: ["Prioritisation", "Stakeholder management"].slice(0, asked),
  average_score: average,
  is_complete: false,
  time_elapsed_seconds: 240 * asked,
});

const START = {
  session_id: "demo-session",
  first_message: { message_id: "m1", role: "interviewer", content: QUESTION_1, timestamp: now },
  progress: progress(1, 0),
};

const REPLY = {
  candidate_message: {
    message_id: "m2",
    role: "candidate",
    content: ANSWER,
    timestamp: now,
    analysis: {
      score: 82,
      communication_scores: { clarity: 64, structure: 78, conciseness: 80 },
      content_scores: { relevance: 90, depth: 84, specificity: 86 },
      strengths: ["A concrete method: ranked by revenue at risk", "A quantified outcome: 80% of volume in two weeks"],
      improvements: ["Name the trade-off you rejected."],
      brief_feedback: "Strong, specific answer with a clear prioritisation method. Name the trade-off you rejected.",
    },
  },
  interviewer_message: { message_id: "m3", role: "interviewer", content: QUESTION_2, timestamp: now },
  session_progress: progress(2, 82),
};

const CORS = {
  "access-control-allow-origin": BASE,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

const respond = (json) => (route) =>
  route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: CORS })
    : route.fulfill({ status: 200, headers: CORS, json });

await mkdir(".superpowers/screens", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

await context.addInitScript(() => {
  localStorage.setItem("amplify_id_token", "mock-user-token");
  sessionStorage.setItem(
    "interviewConfig",
    JSON.stringify({
      config: { mode: "behavioral", questionCount: 8, duration: 30, adaptiveDifficulty: true, enableFollowups: true },
    }),
  );
  navigator.mediaDevices.getUserMedia = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const g = canvas.getContext("2d");
    const ground = g.createLinearGradient(0, 0, 640, 360);
    ground.addColorStop(0, "#1f2a26");
    ground.addColorStop(1, "#3b4a44");
    g.fillStyle = ground;
    g.fillRect(0, 0, 640, 360);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.beginPath();
    g.arc(320, 150, 60, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(320, 330, 130, 90, 0, 0, Math.PI * 2);
    g.fill();
    return canvas.captureStream(5);
  };
});

const page = await context.newPage();
// Later routes win: catch-all first, specific fixtures after.
await page.route("**/api/**", respond({}));
await page.route("**/api/interview/session", respond(START));
await page.route("**/api/interview/session/*/message", respond(REPLY));

await page.goto(`${BASE}/interview/session`, { waitUntil: "networkidle" });
await page.getByText(QUESTION_1).waitFor({ timeout: 15000 });
await page.getByPlaceholder("Type your answer or use voice input...").fill(ANSWER);
await page.keyboard.press("Enter");
await page.getByText(QUESTION_2).waitFor({ timeout: 15000 });
await page.waitForTimeout(800); // let entrance animations settle
await page.screenshot({ path: PNG });
await browser.close();

execFileSync("python3", [
  "-c",
  "import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert('RGB'); assert im.size == (2880, 1800), im.size; im.save(sys.argv[2], 'WEBP', quality=88, method=6)",
  PNG,
  WEBP,
]);
console.log(`Wrote ${WEBP} (from ${PNG})`);
```

- [ ] **Step 4: Start the dev server (background) and capture**

Run in background: `npm run dev`
Then: `node scripts/capture-hero-shot.mjs`
Expected: `Wrote public/images/landing/hero-interview.webp`.

**If the script fails** (redirect to `/interview/setup`, a selector timeout, a page error): fix only the script (selectors, fixture shape) — never the app code. If it still cannot produce the screen, **STOP and ask the user for a 2880×1800 screenshot** of the session page. Do not ship a placeholder.

- [ ] **Step 5: Look at the capture**

Open `.superpowers/screens/hero-interview.png` (Read tool). Check: question, answer with its score chip, follow-up question, progress sidebar, and the canvas "camera" tile are visible; no error toast; no "Setup Missing" message.

`ChatBubble.tsx` and `ChatInterviewSession.tsx` still carry some hardcoded cyan/rose classes (out of scope until sub-project 4). If those make the shot look clearly off-brand next to the emerald hero, **do not edit those files** — note it in the handoff for the user to decide.

- [ ] **Step 6: Create `scripts/screenshot-landing.mjs`**

```js
// Visual verification for the landing redesign. Requires `npm run dev` on :3000.
// Writes PNGs to .superpowers/screens and exits non-zero on hard failures
// (horizontal overflow, page errors on the landing, hero shot not loading).
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".superpowers/screens";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

async function shoot(name, opts) {
  const {
    width,
    height = 900,
    path = "/",
    reducedMotion = "reduce",
    fullPage = true,
    signedIn = false,
    strict = true,
    before,
  } = opts;
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  if (signedIn) await context.addInitScript(() => localStorage.setItem("amplify_id_token", "mock-user-token"));
  const page = await context.newPage();
  if (strict) page.on("pageerror", (err) => problems.push(`${name}: page error: ${err.message}`));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(reducedMotion === "reduce" ? 300 : 1600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (strict && overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  await context.close();
}

// Full pages with reduced motion, so every reveal is visible in the capture.
for (const width of [320, 375, 768, 1440]) await shoot(`landing-${width}`, { width });
// The real entrance, above the fold.
await shoot("landing-1440-motion", { width: 1440, reducedMotion: "no-preference", fullPage: false });
// Nav after scrolling past the hero (cream glass tone).
await shoot("landing-1440-scrolled", {
  width: 1440,
  fullPage: false,
  before: (page) => page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5)),
});
await shoot("landing-375-menu", {
  width: 375,
  fullPage: false,
  before: (page) => page.getByRole("button", { name: "Open menu" }).click(),
});
await shoot("landing-1440-signed-in", { width: 1440, fullPage: false, signedIn: true });

// The hero screenshot must actually load.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const loaded = await page.evaluate(async () => {
    const img = document.querySelector('img[src="/images/landing/hero-interview.webp"]');
    if (!img) return false;
    await img.decode().catch(() => undefined);
    return img.naturalWidth > 0;
  });
  if (!loaded) problems.push("hero screenshot did not load");
  await context.close();
}

// Smoke the token change on existing pages. Reviewed by eye, never failed on:
// the backend may not be running.
for (const path of ["/auth/signin", "/dashboard", "/interview/setup"]) {
  await shoot(`smoke${path.replaceAll("/", "-")}`, {
    width: 1440,
    path,
    fullPage: false,
    signedIn: path !== "/auth/signin",
    strict: false,
  });
}

await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Screens written to ${OUT}`);
```

- [ ] **Step 7: Run it**

Run (dev server still running): `node scripts/screenshot-landing.mjs`
Expected: `Screens written to .superpowers/screens`, exit 0. On an overflow failure, find the overflowing element (usually the hero cards or a fixed-width grid) and fix it in the landing component — then re-run.

- [ ] **Step 8: Review every screenshot by eye**

Open each PNG in `.superpowers/screens/` and check against the spec:
- `landing-1440-motion.png`: dark hero with an emerald bloom fading to white; light nav type; headline second line white→emerald; two pills; framed screenshot with two cards overhanging.
- `landing-1440.png`: band order hero → features (white, faint green wash, six cards) → sample feedback (cream, "Example" badge, ring + bars in green/amber) → how it works (mint, dot grid, numbered timeline) → FAQ (first answer open) → closing panel (deep green, readable white heading) → footer.
- `landing-1440-scrolled.png`: nav is cream glass with dark type.
- `landing-320.png` / `landing-375.png`: 16px gutters, no cut-off text, hero cards hidden, screenshot cropped to the chat column.
- `landing-375-menu.png`: menu sheet on cream with styled links and CTAs.
- `landing-1440-signed-in.png`: nav shows "Go to dashboard".
- `smoke-*.png`: emerald buttons, cream ground. List anything broken or half-migrated — **do not fix**.

Fix any landing defect found, re-run Step 7, and re-check.

- [ ] **Step 9: Stop the dev server, run all gates**

Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`
Expected: all PASS (asset test now green); 0 type errors; lint ≤ 79; build succeeds.

Also confirm the production bundle ships Inter and not Outfit:
Run: `ls dist/assets | grep -iE "inter|outfit"`
Expected: `inter-*` font files only.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json scripts/capture-hero-shot.mjs scripts/screenshot-landing.mjs public/images/landing/hero-interview.webp src/test/landing-assets.test.ts
git commit -m "$(cat <<'EOF'
feat(landing): add hero product screenshot and visual verification scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 11: Handoff report**

Report to the user:
1. Final lint count vs. the 79 baseline; test count.
2. The artwork value settings chosen in Task 3.
3. Smoke-check findings on `/auth/signin`, `/dashboard`, `/interview/setup` (half-migrated colours, contrast problems) — these feed sub-projects 2–4.
4. Whether the hero screenshot shows hardcoded off-brand colours from `ChatBubble`/`ChatInterviewSession`.
5. Open items: the blue `public/logo*.svg` files (landing uses `BrandMark` meanwhile); "free" copy must change if pricing ships; whether `src/components/{Navbar,Footer}.tsx` were deleted.
