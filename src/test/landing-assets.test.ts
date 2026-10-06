/// <reference types="node" />
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Every image the landing page references. Task 10 adds the hero screenshot. */
const LANDING_ASSETS = ["hero-ground.webp", "section-glow.webp", "grain.webp"];

describe("landing artwork", () => {
  it.each(LANDING_ASSETS)("ships public/images/landing/%s", (name) => {
    const file = resolve(process.cwd(), "public/images/landing", name);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(0);
  });
});
