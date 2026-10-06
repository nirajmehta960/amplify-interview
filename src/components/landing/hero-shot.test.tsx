import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroShot } from "./hero-shot";

describe("HeroShot", () => {
  it("masks only the screenshot frame, so the overhanging cards are never clipped", () => {
    // A CSS mask clips everything outside its element's box. The cards sit at
    // negative offsets, so a masked ancestor cuts them off at the frame edge.
    const { container } = render(<HeroShot />);
    const cards = container.querySelectorAll(".hero-shot-card");
    expect(cards).toHaveLength(2);
    cards.forEach((card) => expect(card.closest(".hero-shot-mask")).toBeNull());
    expect(container.querySelector(".hero-shot-mask img")).not.toBeNull();
  });
});
