# Frontend Phase 1 — Tooling and Build Setup

**What this covers:** Vite, TypeScript, path aliases, and linting — the conventions everything else assumes.
**Files:** `vite.config.ts`, `tsconfig.app.json`, `eslint.config.js`, `package.json`
**You need to know:** ES modules, bundlers, TypeScript compiler options

---

## Vite

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { host: "::", port: 3000, hmr: { clientPort: 3000 } },
  build: { outDir: "dist", sourcemap: true },
});
```

**Port 3000, not Vite's default 5173.** This must match the backend's `ALLOWED_ORIGINS`, or every request fails CORS.

**`host: "::"`** binds all interfaces (IPv6 form), so the dev server is reachable from other devices on your network — useful for testing camera and microphone capture on a phone.

**No proxy is configured.** The frontend calls the backend by absolute URL from `VITE_API_URL`. The alternative — a dev proxy making the API same-origin — would hide CORS problems until production. Calling cross-origin in development means you hit CORS issues immediately, which is the better failure mode.

**`sourcemap: true` in production builds.** It makes stack traces readable but publishes your original source. Fine for this project; a deliberate decision to make consciously.

The plugin is `@vitejs/plugin-react` (Babel), not `plugin-react-swc`. SWC is faster; this is the scaffold default and was never changed.

---

## The `@` alias must be declared twice

```ts
// vite.config.ts — so the bundler can resolve it
resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
```
```jsonc
// tsconfig.app.json — so TypeScript and your editor can resolve it
"paths": { "@/*": ["./src/*"] }
```

Two separate systems. Vite handles the runtime resolution; TypeScript handles type-checking and editor navigation. Configure only one and you get either red squiggles in a working app, or a clean editor and a broken build.

Every import in the codebase uses it: `import { Button } from "@/components/ui/button"`.

---

## TypeScript is deliberately loose

```jsonc
{
  "strict": false,
  "noImplicitAny": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "skipLibCheck": true,
  "jsx": "react-jsx",
  "moduleResolution": "bundler"
}
```

**This is the most consequential setting in the repo, and it is worth being honest about.**

With `strict: false`, `strictNullChecks` is off — so `user.name` type-checks even when `user` is `null`, and you find out at runtime. `noImplicitAny: false` means untyped parameters silently become `any`, disabling checking downstream.

The practical effect: `apiClient.ts` has excellent type definitions, and the type system will not enforce them at the boundaries where it matters most.

If you build something similar, **start with `strict: true`.** Retrofitting it later means fixing hundreds of errors at once; starting with it means fixing each as you write it. Turning it on here would be a worthwhile, and large, piece of work.

`jsx: "react-jsx"` is the modern transform — no `import React` needed in every file. `moduleResolution: "bundler"` lets TypeScript resolve imports the way Vite does (extensionless, `exports` maps).

There are three tsconfigs: `tsconfig.json` (references), `tsconfig.app.json` (your `src/`), `tsconfig.node.json` (config files). Splitting them lets browser code and Node-context config files have different `lib` and `module` settings.

---

## ESLint flat config

```js
export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
```

The flat config format (ESLint 9) replaces `.eslintrc`. Two plugins earn their place:

**`react-hooks`** enforces the rules of hooks and — more valuably — `exhaustive-deps`, which catches stale-closure bugs in `useEffect`. Given how much of this app is hand-rolled `useEffect` data fetching, this rule is doing real work.

**`react-refresh`** warns when a file exports something that breaks Fast Refresh.

`no-unused-vars: "off"` is consistent with the loose TS config, and means dead imports accumulate silently.

---

## npm scripts

```json
"dev":       "vite",
"build":     "vite build",
"build:dev": "vite build --mode development",
"lint":      "eslint .",
"typecheck": "tsc --noEmit -p tsconfig.app.json",
"preview":   "vite preview"
```

The Firebase deploy scripts were removed on 2026-08-10 — the target is S3 + CloudFront (deployment plan, Phase 10).

A `typecheck` script now exists but **is not wired into CI**, and `strict: false` means it catches less than it should. Add it to the pipeline (deployment plan, Phase 9) and turn on `strict` for the real payoff.

---

## Environment variables

Vite exposes only `VITE_`-prefixed variables, via `import.meta.env`:

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
```

Two things to internalize:

**They are inlined at build time**, not read at runtime. Changing one requires a rebuild, and a container cannot be reconfigured by environment variable the way the backend can.

**They are public.** Anything you inline is readable in the shipped JavaScript. `VITE_AWS_COGNITO_CLIENT_ID` is fine — a Cognito public client ID is designed to be public. An API secret would not be.

---

## 🧠 Check your understanding

1. Why must the `@` alias be configured in both Vite and tsconfig?
2. What specifically does `strict: false` stop catching, and why does it matter most at API boundaries?
3. Why is *not* having a dev proxy arguably better?
4. Why must the dev port match the backend's `ALLOWED_ORIGINS`?
5. Why are `VITE_` variables safe for a Cognito client ID but not for a secret?
6. What class of bug does `exhaustive-deps` prevent in this codebase specifically?

---

## ⚠️ Notes

`components.json` (the shadcn config) has `content` globs pointing at `./pages`, `./components`, and `./app` — directories that don't exist at the repo root. Harmless leftovers from the scaffold; the real globs are in `tailwind.config.ts`.

The package name is still `vite_react_shadcn_ts`, the scaffold default.

---

**Next:** [Phase 2 — Design system](PHASE_02_design_system.md)
