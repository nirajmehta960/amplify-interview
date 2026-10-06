/// <reference types="node" />
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HERO } from "@/components/landing/content";

/** Every image the landing page references. */
const LANDING_ASSETS = ["hero-ground.webp", "section-glow.webp", "grain.webp", "hero-interview.webp"];

describe("landing artwork", () => {
  it.each(LANDING_ASSETS)("ships public/images/landing/%s", (name) => {
    const file = resolve(process.cwd(), "public/images/landing", name);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(0);
  });

  it("covers every image path the page references", () => {
    for (const path of [HERO.groundSrc, HERO.shot.src]) {
      expect(LANDING_ASSETS.map((name) => `/images/landing/${name}`)).toContain(path);
    }
  });
});
