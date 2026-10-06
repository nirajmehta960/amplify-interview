/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pages rendered inside AppShell must not draw their own page chrome: the shell
 * owns the sidebar, the full-height frame and the way back.
 */
const SHELLED = ["InterviewSetup", "PracticeQuestions", "Progress", "Insights", "InterviewResults", "Dashboard"];

describe.each(SHELLED)("%s", (page) => {
  const source = readFileSync(resolve(process.cwd(), "src/pages", `${page}.tsx`), "utf8");

  it("does not mount a second sidebar", () => {
    expect(source).not.toMatch(/SidebarProvider|AppSidebar/);
  });

  it("does not draw a 'Back to Dashboard' header", () => {
    expect(source).not.toMatch(/Back to Dashboard/);
  });

  it("does not claim the full viewport height", () => {
    expect(source).not.toMatch(/min-h-screen|h-screen/);
  });

  it("titles itself with the shared PageHeader", () => {
    expect(source).toMatch(/<PageHeader/);
  });
});
