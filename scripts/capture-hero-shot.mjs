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
    ground.addColorStop(0, "#1b2236");
    ground.addColorStop(1, "#38425c");
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
// The camera is opt-in; turn the self-view on so the hero shows it.
await page.getByRole("button", { name: "Show camera" }).click();
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
