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
