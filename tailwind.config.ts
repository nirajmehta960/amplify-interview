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
