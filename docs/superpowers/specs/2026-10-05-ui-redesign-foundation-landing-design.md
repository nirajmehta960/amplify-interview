# UI Redesign — Sub-project 1: Design Foundation + Landing Page

**Date:** 2026-10-05
**Status:** Approved in brainstorming; awaiting written-spec review
**Branch:** `feature/ui-redesign` (created after the in-flight backend-migration work is committed)

## 1. Context and intent

Amplify Interview's frontend is being redesigned to match the visual system of the
Bitplaza / Opten site (`~/Documents/Bitcoin Culture Hub/Opten/bitcoinculturehub`,
landing at `src/components/BitplazaLanding/`, app shell at
`src/components/BuilderHome/BuilderAppShell.tsx`). Both repos are the same stack
(Vite, React 18, Tailwind, shadcn/ui), so the system ports directly.

**Goal:** Amplify reads as the same design family as the reference — dark hero with
a painted glow resolving into warm cream bands, Inter throughout, pill CTAs with
layered warm shadows, damped reveal motion — but with **its own accent (emerald)**
so the two products are related, not confused.

**The full redesign is decomposed into five sub-projects**, each with its own
spec → plan → implementation cycle:

1. **Design foundation + landing page** ← this spec
2. Auth pages (SignIn, SignUp, ForgotPassword, ResetPassword)
3. App shell + Dashboard (shared sidebar layout on every protected page)
4. Interview flow (InterviewSetup, ChatInterviewSession, InterviewResults)
5. Analytics, Progress, Insights, PracticeQuestions (+ decide fate of mocked pages)

**Success criteria for this sub-project**

- The landing page (`/`) is rebuilt in the reference's band system with emerald accent.
- Global tokens are replaced, so every existing page immediately renders on the new
  palette (cream ground, ink text, emerald primary, warm hairlines) without layout edits.
- `npm run build` passes; `npm run lint` problem count does not rise above the
  baseline recorded before the change; the new Vitest suite passes.
- No interview-flow regression: sign-in, dashboard and interview session still load
  and function (visually checked; colour glitches logged, not fixed).

## 2. Decisions made during brainstorming

| Decision | Choice | Why |
|---|---|---|
| Brand relationship | Same system, own accent | Related to the reference, not a clone |
| Accent | Emerald `#10A37F` | User choice; reads as "pass/growth" for a scoring product |
| Rollout | Global tokens now, scoped landing kit | Whole app re-skins at once; later sub-projects fix layout, not colour |
| Solid button fill | Deep emerald `#0B7A5F` | White on `#10A37F` is 3.2:1 (fails AA); on `#0B7A5F` it is 5.3:1. Same hue family, reads as one colour |
| Score-colour collision | Score scale red → amber → emerald, thresholds 45/78 | Makes accent = "good" deliberately; thresholds match `interview_engine.py`'s difficulty-adaptation window |
| Landing bands | Hero, Features, Sample feedback, How it works, FAQ, Closing CTA | No testimonials/logos — Amplify has no real ones, and the reference removed its fake ones for the same reason |
| Hero visual | Real screenshot + HTML overhang cards | Most authentic; image path is content, so it is swapped after sub-project 4 |
| Smooth scroll | No Lenis | Avoids a dependency and the tuning the reference needed; native scroll + damped reveals keeps most of the feel |
| Motion library | framer-motion (already installed) for drift only; CSS for entrances/reveals | Matches the reference's fail-open CSS approach |

## 3. Design tokens (global — `src/index.css`, `tailwind.config.ts`)

### 3.1 shadcn variables (`:root`, stored as HSL like today)

| Token | Hex | Notes |
|---|---|---|
| `--background` | `#FAF6EE` | warm cream app ground |
| `--foreground` | `#1B140F` | ink |
| `--card`, `--popover` | `#FFFFFF` | white surfaces on cream |
| `--card-foreground`, `--popover-foreground` | `#1B140F` | |
| `--primary` | `#0B7A5F` | **solid fills with white labels** (shadcn `Button` default variant reads `bg-primary`) |
| `--primary-foreground` | `#FFFFFF` | 5.3:1 on primary |
| `--accent` | `#10A37F` | the brand emerald — glows, icons, rings, progress, charts, chips |
| `--accent-foreground` | `#FFFFFF` | only for large/decorative use; never small body text |
| `--secondary`, `--muted` | `#F4F1E8` | |
| `--secondary-foreground` | `#1B140F` | |
| `--muted-foreground` | `#6B645A` | ≥4.5:1 on cream and white |
| `--border`, `--input` | `#ECE7D8` | the reference's hairline |
| `--ring` | `#0B7A5F` | focus ring (visible on cream and white) |
| `--destructive` | `#C4483A` | |
| `--success` | `#10A37F` | |
| `--warning` | `#F5A524` | the reference app's amber |
| `--info` | `#3575EE` | |
| `--sidebar-*` | white ground, ink text, `#0B7A5F` primary, `#F4F1E8` accent, `#ECE7D8` border | |

Note the deliberate swap versus today: `--primary` becomes the *deep* emerald
(because shadcn renders buttons, links and switches from it), and `--accent` becomes
the *bright* brand emerald. Today `--accent` is teal used for success badges; the
`badge-success` helper keeps working because it reads `accent`.

### 3.2 Score scale (new tokens + one helper)

- `--score-low: #C4483A` (score ≤ 45), `--score-mid: #F5A524` (46–77), `--score-high: #10A37F` (≥ 78).
- Text variants for small text on light grounds: `--score-low-text: #A8382C`, `--score-mid-text: #8A5A00`, `--score-high-text: #0B7A5F`.
- `src/lib/score.ts` exports `scoreBand(score: number): "low" | "mid" | "high"` with the
  45/78 thresholds as named constants, documented as mirroring
  `backend/app/services/interview_engine.py`. Consumed by the landing's sample-feedback
  band now; by results/analytics pages in later sub-projects.

### 3.3 Typography

- **Inter only.** Import `@fontsource/inter` weights 400/500/600/700; remove the
  Outfit `@import`s, the `h1–h6 { font-family: Outfit }` rule, and the
  `@fontsource/outfit` dependency.
- `fontFamily.display` stays as a key but maps to Inter (≈50 existing `font-display`
  usages keep working unchanged). `fontFamily.sans` = Inter.
- Port the reference's fluid scale into `fontSize`: `display-1`, `display-2`,
  `display-3`, `body-lg`, `body-sm` (clamp values and paired line-heights verbatim).
- `.label` (11px, 600, 0.14em tracking, uppercase) lives in the scoped landing CSS;
  a global equivalent is deferred to sub-project 3 when the app needs it.

### 3.4 Shape and depth

- `borderRadius`: keep `lg/md/sm` from `--radius: 0.75rem`; add `pill: 999px`,
  `panel: 14px`, `tile: 10px`.
- Warm-tinted shadows (`rgb(61 40 23 / …)`) as CSS variables: `--card-shadow`,
  `--btn-shadow(-hover)`, `--btn-shadow-secondary(-hover)`. Multi-layer shadows are
  applied by class (`.landing-cta-primary` etc.), never Tailwind arbitrary values —
  the arbitrary-property parser can truncate comma-separated shadows.

### 3.5 Existing helper classes in `index.css`

Re-toned in place so pages using them re-skin without edits: `glass-card`,
`glass-card-hover` (hover border → `accent/40`, warm shadow), `gradient-text`
(`--gradient-primary` → `linear-gradient(90deg, #0B7A5F, #10A37F)`), `gradient-border`,
`hero-glow` (emerald), `progress-bar-fill`, `badge-*`. `--gradient-hero`,
`--glow-primary`, `--glow-subtle` re-toned to emerald/cream.

The `.dark` block is left as-is (unreachable today; dark mode is out of scope).

## 4. Landing page

### 4.1 File layout

```
src/pages/Index.tsx                  composes the sections; Helmet title/description
src/components/landing/
  landing.css                        all non-utility CSS, every rule under [data-landing]
  content.ts                         every word on the page + hero image path
  kit.tsx                            Band, Frame, Label, BandHeader, Panel, CardGlow, BrandMark
  cta.tsx                            LandingCta (pill link; primary / secondary / ink)
  routes.ts                          useLandingRoutes(): signed-in vs signed-out destinations
  motion.ts                          useLandingMotion (enter + reveal observers) — hooks only
  reveal.tsx                         Reveal, Enter components (split so react-refresh lint stays quiet)
  shell.tsx                          LandingShell: scope root, skip link, nav, main, footer
  nav.tsx                            floating glass nav, band flip, mobile Sheet menu
  footer.tsx
  hero.tsx                           band 1
  hero-shot.tsx                      screenshot frame + two drifting overhang cards
  features.tsx                       band 2
  sample-feedback.tsx                band 3
  how-it-works.tsx                   band 4
  faq.tsx                            band 5
  closing-cta.tsx                    band 6
public/images/landing/
  hero-ground.webp  section-glow.webp  grain.webp  hero-interview.webp
scripts/retone-landing-art.py        one-off hue rotation of the reference artwork
```

**Deleted:** `src/components/landing/{HeroSection,FeaturesSection,HowItWorksSection,CTASection}.tsx`,
`src/components/{Hero,Features,HowItWorks}.tsx`, and `src/components/layout/{Navbar,Footer}.tsx`
(their only importer is `Index.tsx`). `src/components/{Navbar,Footer}.tsx` are deleted
if a fresh grep at implementation time still shows zero importers (including relative
imports).

### 4.2 Band system

Ported from the reference's `landing.css`. `Band` sets `data-band="<tone>"`; Tailwind
`band-*` colours resolve from RGB-triplet custom properties
(`rgb(var(--band-fg) / <alpha-value>)`), so components never name a colour.

| Tone | Ground | Used by |
|---|---|---|
| `ink` | `#0B1412` (emerald-tinted near-black) | hero (text tokens only; ground comes from artwork) |
| `paper` | `#FFFFFF` | features (receives the hero's white foot — no seam) |
| `cream` | `#FAF6EE` | sample feedback, FAQ |
| `mint` | `#F5FAF7` | how it works (echo of the hero glow, as the reference's `peach`) |

Light-band text: `fg #1B140F`, `muted #5E574D`, `faint #6B645A`, `signal #0B7A5F`
(eyebrow labels — **≈4.9:1 on cream, 5.3:1 on white, AA**, improving on the reference's 2.8:1),
`accent #0B7A5F`, `rule rgb(27 20 15 / .12)`. Ink-band text: `fg #F4FAF7`,
`muted #BFD3CB`, `faint #93ABA2`, `accent #10A37F` (large hero pills only).
The scoped `[data-landing] * { border-color: var(--band-rule) }` override is kept so
the global `border-border` never paints landing hairlines.

### 4.3 Bands and copy

All copy lives in `content.ts`; strings below are the starting draft.

1. **Hero** (`ink`, `min-h-svh`, ground = `hero-ground.webp`, `bg-cover`, fading to
   white at its foot). Eyebrow `AI mock interviews`. Heading two lines: `Walk in
   prepared.` / `Walk out hired.` (second line `bg-clip-text` white → `#10A37F`, with
   `pb-[0.14em]` for descenders). Supporting: "Upload your résumé and the job
   description. Get an adaptive interview that scores every answer and tells you
   exactly what to fix." Primary CTA `Start a free interview →` (→ `/auth/signup`, or
   `/interview/setup` when `useAuth().user` is set). Secondary `See how it works`
   (→ `#how-it-works`, glass style). Then `HeroShot`.
2. **Features** (`paper`, `CardGlow` behind, bottom ramp into cream). Eyebrow `What
   you get`, heading `Practice that adapts to you`. Six cards, three across, icon tile
   (lucide, `text-accent`) + title + one sentence: tailored questions from your résumé
   and JD; adaptive difficulty; every answer scored on a rubric; answer by voice or
   text; structured end-of-session feedback; progress tracked over time.
3. **Sample feedback** (`cream`). Eyebrow `Example feedback`, heading `See exactly
   what to fix`. Two columns (stacked on mobile). Left `Panel`: a behavioural question
   and a 3–4 sentence answer excerpt. Right `Panel`: overall score 82 in a conic ring
   coloured by `scoreBand`, four rubric bars (Relevance, Structure, Specificity,
   Communication), two strengths, one improvement, a chip `Next question: harder`.
   Visibly badged **Example** — illustrative, never presented as a real user's result.
4. **How it works** (`mint`, `.net-grid` dot texture, `id="how-it-works"`). Vertical
   timeline, four steps: Upload résumé + JD → Take an adaptive interview → Get scored
   feedback → Track progress and go again.
5. **FAQ** (`cream`). Five Q&As: Is it free to start? Which roles does it cover? Is my
   résumé stored? Can I answer by voice? How are answers scored? Accordion uses the
   reference's `grid-template-rows: 0fr → 1fr` + timed `visibility` technique.
6. **Closing CTA** (`cream` band, inset rounded panel). Fluid gradient: three blobs —
   brand emerald `rgb(16 163 127)`, mint light `rgb(47 211 162)` (small, far corner),
   deep teal `rgb(8 92 74)` — over base `#06261F`, a static darkening core behind the
   type, and `grain.webp` at 0.32 opacity. Animations paused until the panel
   intersects the viewport. Heading `Your next interview starts here`, one CTA.

**Nav:** fixed, floating glass bar. Over the hero it uses `ink` tokens (light text);
an IntersectionObserver on the hero flips it to `cream` glass with ink text. Only
`color` transitions (0.5s), no layout movement. Links: Features, How it works, FAQ,
`Sign in`, pill CTA; when signed in, links collapse to `Go to dashboard`. Below `md`,
links move into the existing shadcn `Sheet`.

**Footer:** cream, logo, three short link columns, copyright line.

**Logo:** the existing `public/logo*.svg` files are multi-colour blue/violet and would
clash with emerald. The landing nav and footer use a local `BrandMark` (emerald tile
with a lucide `Mic` glyph + "Amplify Interview" wordmark). Re-drawing the real logo
files is a brand task deferred to sub-project 3; app pages keep the current SVGs.

### 4.4 Hero shot

- Glass frame (rounded `panel`, 1px `white/15` border, subtle backdrop) containing
  `hero-interview.webp` (2× capture, `fetchpriority="high"`, explicit width/height to
  avoid layout shift). Bottom ~240px masked to transparent so it dissolves into the
  white band.
- Two HTML overhang cards: score card (lower-left, "82 · Strong answer", ring via
  `scoreBand`) and next-question card (right, "Next question: harder"). Drift with
  framer-motion `useScroll` + `useTransform`, ±12px amplitude, disabled under
  `useReducedMotion()`. Hidden below `md`; the screenshot crops to the chat column.
- Card shadows are `box-shadow` (not `filter: drop-shadow`) — the reference measured
  the filter version as a per-frame cost.
- **Capture:** after the token swap, render `/interview/session` in a seeded state
  (mock auth + fixture conversation) and screenshot at 1440×900 @2× with Playwright
  (cached Chromium at `~/Library/Caches/ms-playwright/chromium-1194`), encoded to WebP.
  If the session page cannot be brought up without the backend, **stop and ask the
  user for a screenshot** — no placeholder art ships.

### 4.5 Motion

- `--ease-damped` (the reference's `linear()` critically-damped curve, with its
  cubic-bezier fallback) and `--ease-plaza` ported verbatim.
- **Enter** (hero load): `[data-enter]` elements stagger 0.07s, 0.72s, rise 22px (40px
  for the hero shot). Hidden class applied during render, released after first frame.
- **Reveal** (scroll): `[data-reveal]` fades + rises 18px via IntersectionObserver.
- **Fail-open:** content is visible by default; the hidden state exists only under a
  `.landing-js` class set by JS. No JS → fully readable page.
- `prefers-reduced-motion: reduce` flattens all durations, forces revealed state,
  stops drift and the fluid gradient, zeroes the FAQ visibility delay.

### 4.6 Accessibility and responsiveness

- Skip link to `#main`; `header` / `main` / `footer` landmarks; one `h1`.
- `:focus-visible` outline `2px solid #0B7A5F` (ink band: `#10A37F`).
- All body text and labels ≥ 4.5:1 on their band; decorative-only contrast is limited
  to the hero's large pill labels.
- FAQ: button with `aria-expanded` / `aria-controls`; closed panels `visibility:
  hidden` (out of the a11y tree and tab order).
- 16px side gutter on phones, no horizontal scroll (hero uses `overflow-clip`), fluid
  type.
- Helmet title `Amplify Interview — AI mock interviews that adapt to you` and a
  rewritten description (the current one mentions video analysis, which is not built).

## 5. Artwork

`scripts/retone-landing-art.py` (Pillow, already installed) copies
`hero-ground.webp`, `section-glow.webp` and `grain.webp` from the reference's
`public/images/opportunity-engine/` and rotates hue from the reference orange
(`#FA6A3C`) to emerald (`#10A37F`), preserving saturation, value and the alpha channel
byte-for-byte. `section-glow.webp` and `grain.webp` are written **lossless** WebP (lossy
compression posterizes the low-alpha glow into rings and blanks the grain);
`hero-ground.webp` has no alpha and is written lossy at quality 90, as the reference
stores its own (lossless would cost several MB on the page's largest image). The
value darkening is weighted by saturation so the artwork's white foot stays pure white. `section-glow.webp` stays at its
stored 480px width — the browser's upscale is what de-bands it. The hero ground's dark
end is re-tinted toward `#0B1412` so it matches the `ink` band. `grain.webp` is
neutral and copied unchanged.

## 6. Testing and verification

**New test infrastructure** (dev dependencies: `vitest`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`; `npm test`
script; `vitest.config.ts` with jsdom and the `@/` alias):

- `scoreBand` — boundaries at 45/46 and 77/78.
- Reveal fail-open — before the motion hook runs, `[data-reveal]` content is not hidden.
- Nav — renders `ink` tone while the hero intersects, `cream` after.
- FAQ — closed panel is not focusable/visible; opening sets `aria-expanded="true"`.
- Hero CTA — `/auth/signup` when signed out, `/interview/setup` when signed in.

**Gates:**

1. Record the `npm run lint` problem count **before** any change; after, it must not rise.
2. `npm run build` passes.
3. `npm test` passes.
4. Playwright screenshots of `/` at 375, 768, 1440 widths, reviewed by eye.
5. Visual smoke of `/auth/signin`, `/dashboard`, `/interview/session` under the new
   tokens; regressions are **listed** in the handoff, not fixed here.

## 7. Scope

**In:** global tokens and fonts; re-toned `index.css` helpers; `src/lib/score.ts`;
landing kit, sections, nav, footer, copy; re-toned artwork + script; hero screenshot;
deletion of dead landing/layout components; removal of `@fontsource/outfit`; Vitest.

**Out:** auth, app shell, dashboard, interview and analytics layouts (sub-projects
2–5); dark mode; backend; the files with hardcoded palette classes
(`InterviewResults`, `ChatBubble`, `SessionReview`, `AnalyticsDashboard`, `Insights`,
`ProgressSidebar`, `ModernAnalyticsDashboard`, and small counts elsewhere — ~195
occurrences), which stay half-migrated until their sub-project; the
`design-system.ts` cleanup.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Swapping `--primary` to deep emerald and `--accent` to bright emerald changes meaning for existing usages | Both are emerald, so no usage becomes off-brand; visual smoke in gate 5 catches contrast problems |
| Hero screenshot can't be captured without backend/auth | Stop and ask the user; no placeholder ships |
| Hue rotation leaves the glow looking off (orange→green shifts perceived brightness) | Script takes a value-scale parameter; tuned by eye against the mockup chosen in brainstorming |
| Two lockfiles drift | Use `npm` only, per CLAUDE.md |
| Fake-looking sample data | Band is explicitly badged "Example"; no names, no company logos, no user counts |
