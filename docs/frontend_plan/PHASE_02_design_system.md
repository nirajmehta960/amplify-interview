# Frontend Phase 2 — The Design System

**What this covers:** the token system, Tailwind configuration, shadcn/ui, and the reusable component classes.
**Files:** `src/index.css`, `tailwind.config.ts`, `src/lib/utils.ts`, `src/components/ui/*`
**You need to know:** CSS custom properties, Tailwind, `clsx`/`tailwind-merge`

---

## HSL triplets without the wrapper

The core trick of the whole system:

```css
:root {
  --primary: 231 72% 52%;        /* NOT hsl(231 72% 52%) */
  --background: 0 0% 100%;
  --radius: 0.75rem;
}
```
```ts
// tailwind.config.ts
colors: {
  primary: "hsl(var(--primary))",
}
```

Storing the **components** rather than a complete color function lets Tailwind compose opacity:

```html
<div class="bg-primary/10 border-primary/20 text-primary">
```

Tailwind rewrites that to `hsl(var(--primary) / 0.1)`. If the variable held `#4338ca` or a full `hsl(...)`, opacity modifiers would not work at all. This is the standard shadcn convention and the reason it is worth following exactly.

Every semantic color routes through a token: `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `card`, `popover`, plus a full `sidebar.*` scale and flat `success`/`warning`/`info`.

Radii derive from one value:
```ts
borderRadius: {
  lg: "var(--radius)",
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
}
```
Change `--radius` once and the entire UI's roundness shifts coherently.

---

## `index.css` is the real design system

251 lines, ordered deliberately:

```css
@import "@fontsource/inter";        /* fonts first */
@import "@fontsource/outfit";

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base      { :root { …tokens… }  .dark { …tokens… } }
@layer components { .glass-card { … }  .stat-card { … } }
@layer utilities  { … }
@keyframes        { … }
```

`@layer` matters: it tells Tailwind where your custom CSS sits in the cascade, so utilities still override components. Custom CSS outside a layer wins specificity fights it shouldn't.

Beyond the shadcn defaults there are project-specific tokens — `--gradient-primary`, `--gradient-hero`, `--glass-border`, `--glass-bg`, `--glow-primary` — that back the visual identity.

### Component classes worth knowing

Used across nearly every page:

| Class | Purpose |
|---|---|
| `.glass-card` / `.glass-card-hover` | Frosted-glass panel (the dominant surface) |
| `.gradient-text` | Gradient-filled headings |
| `.gradient-border` | Gradient border via `mask-composite` |
| `.hero-glow` | Landing-page glow |
| `.stat-card`, `.session-card` | Dashboard tiles |
| `.nav-link` / `.nav-link-active` | Sidebar states |
| `.badge-success` / `-warning` / `-info` | Status pills |
| `.progress-bar` / `.progress-bar-fill` | Score bars |

Extracting these into `@layer components` rather than repeating twelve utility classes at each call site is the right call — they encode a *decision*, not just a style.

### Custom fonts and animations

```ts
fontFamily: { sans: ["Inter", ...], display: ["Outfit", ...] }
```
`font-display` (Outfit) for headings, Inter for body. Both self-hosted via `@fontsource` — no external font request, which matters under the strict CSP of a CDN deployment and removes a third-party dependency from first paint.

Custom keyframes beyond shadcn's accordion pair: `fade-up`, `fade-in`, `scale-in`, `slide-up`, `glow`. Note most page-level animation actually uses framer-motion instead (Phase 8); these CSS animations are used sparingly.

---

## shadcn/ui: copied, not installed

~45 primitives live in `src/components/ui/` as **your source code**, not `node_modules`. `components.json` records the configuration (`style: default`, `baseColor: slate`, `cssVariables: true`) that the CLI uses when adding more.

The trade-off is worth understanding: you own the code, so you can edit any primitive freely — but you also own updates, and there is no `npm update` for them. For a design-heavy app, that ownership is usually the right trade.

Underneath, Radix UI provides unstyled, accessible behaviour (focus traps, keyboard navigation, ARIA), and shadcn adds Tailwind styling on top. That is why the dependency list has ~25 `@radix-ui/*` packages.

---

## `cn()` — and the second one that shouldn't exist

```ts
// src/lib/utils.ts  — the correct one
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` handles conditionals; `twMerge` resolves Tailwind conflicts so the last class wins:

```ts
cn("px-4 py-2", "px-6")        // → "py-2 px-6"   (not "px-4 py-2 px-6")
```

Without `twMerge`, both `px-4` and `px-6` end up in the class list and CSS source order decides — which makes component prop overrides unreliable.

> ⚠️ **`src/lib/design-system.ts` exports a second, conflicting `cn()`:**
> ```ts
> export const cn = (...classes) => classes.filter(Boolean).join(" ");
> ```
> No `twMerge`. Importing `cn` from the wrong module silently breaks class overriding. **Always import from `@/lib/utils`.**

---

## ⚠️ `design-system.ts` is largely vestigial

It exports a `DESIGN_SYSTEM` object of Tailwind class strings plus framer-motion variant presets. Two real problems:

1. The conflicting `cn()` above.
2. Its color strings reference classes **that don't exist** in `tailwind.config.ts` — `primary-blue`, `accent-green`, `light-gray`, `dark-navy`, `shadow-professional`, `rounded-professional`. They're leftovers from an earlier theme.

Because Tailwind silently ignores unknown class names, pages still using them (`TabWrapper.tsx`, `AnalyticsDemo.tsx`) render with **no styling from those classes at all** — no error, no warning, just missing styles. If a component looks unstyled, check whether its classes exist in the config.

The framer-motion presets in this file are genuinely useful; most pages inline their own variants anyway.

---

## ⚠️ Dark mode: fully defined, never activated

```ts
darkMode: ["class"],      // tailwind.config.ts
```
```css
.dark { --background: 222 47% 11%; --foreground: …; /* complete token set */ }
```

A complete dark palette exists. **Nothing ever adds the `dark` class.** `next-themes` is imported in exactly one file — `src/components/ui/sonner.tsx`, from the shadcn template — and there is no `ThemeProvider` anywhere in the tree. Grep for `dark:` variants outside `ui/` returns nothing.

So dark mode is roughly 90% built and 0% reachable. Enabling it means wrapping the app in `next-themes`' `ThemeProvider` and adding a toggle — genuinely a small change, given the tokens are already there.

---

## 🧠 Check your understanding

1. Why store `231 72% 52%` instead of `hsl(231 72% 52%)`?
2. What breaks if you skip `twMerge` and use plain `clsx`?
3. Why does `@layer components` matter for the cascade?
4. What is the trade-off of shadcn copying components into your repo?
5. Why do the `primary-blue` classes in `design-system.ts` produce no error?
6. What single change would activate dark mode?
7. Why self-host fonts rather than use Google Fonts?

---

**Next:** [Phase 3 — App shell & routing](PHASE_03_app_shell.md)
