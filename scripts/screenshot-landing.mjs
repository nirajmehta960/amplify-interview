// Visual verification for the landing redesign. Requires `npm run dev` on :3000.
// Writes PNGs to .superpowers/screens and exits non-zero on hard failures
// (horizontal overflow, page errors on the landing, hero shot not loading).
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".superpowers/screens";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

async function shoot(name, opts) {
  const {
    width,
    height = 900,
    path = "/",
    reducedMotion = "reduce",
    fullPage = true,
    signedIn = false,
    strict = true,
    before,
  } = opts;
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  if (signedIn) await context.addInitScript(() => localStorage.setItem("amplify_id_token", "mock-user-token"));
  const page = await context.newPage();
  if (strict) page.on("pageerror", (err) => problems.push(`${name}: page error: ${err.message}`));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(reducedMotion === "reduce" ? 300 : 1600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (strict && overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  await context.close();
}

// Full pages with reduced motion, so every reveal is visible in the capture.
for (const width of [320, 375, 768, 1440]) await shoot(`landing-${width}`, { width });
// The real entrance, above the fold.
await shoot("landing-1440-motion", { width: 1440, reducedMotion: "no-preference", fullPage: false });
// Nav after scrolling past the hero (cream glass tone).
await shoot("landing-1440-scrolled", {
  width: 1440,
  fullPage: false,
  before: (page) => page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5)),
});
await shoot("landing-375-menu", {
  width: 375,
  fullPage: false,
  // The sheet portals outside [data-landing], so the landing's reduced-motion
  // rule does not shorten its 500ms slide-in; wait for it to land.
  before: async (page) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(700);
  },
});
await shoot("landing-1440-signed-in", { width: 1440, fullPage: false, signedIn: true });

// The hero screenshot must actually load.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const loaded = await page.evaluate(async () => {
    const img = document.querySelector('img[src="/images/landing/hero-interview.webp"]');
    if (!img) return false;
    await img.decode().catch(() => undefined);
    return img.naturalWidth > 0;
  });
  if (!loaded) problems.push("hero screenshot did not load");
  await context.close();
}

// The overhanging cards must sit inside the viewport at tablet-landscape widths,
// where the hero's overflow-clip would otherwise cut them.
for (const width of [1024, 1180, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll(".hero-shot-card")]
      .map((card) => card.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.left < 0 || r.right > window.innerWidth))
      .map((r) => `[${Math.round(r.left)}, ${Math.round(r.right)}]`),
  );
  if (clipped.length) problems.push(`hero cards clipped at ${width}px: ${clipped.join(" ")}`);
  await context.close();
}

// The nav must not be light-on-transparent over the light lower half of the hero.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  for (const y of [600, 800, 1000, 1200]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => ({
      band: document.querySelector("header")?.getAttribute("data-band"),
      shotTop: document.querySelector(".hero-shot-still")?.getBoundingClientRect().top ?? 0,
    }));
    if (state.shotTop < 64 && state.band !== "cream") {
      problems.push(`nav still ink at scroll ${y} with the screenshot under it`);
    }
  }
  await page.screenshot({ path: `${OUT}/landing-1440-nav-mid-hero.png` });
  await context.close();
}

// The hero's supporting copy is white on the glow: measure the ground behind it
// (text hidden) and require 4.5:1 against white at its brightest 5%.
for (const width of [375, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const copy = page.locator("#top p", { hasText: "Upload your résumé" });
  await copy.evaluate((el) => (el.style.color = "transparent"));
  const png = `${OUT}/contrast-${width}.png`;
  await copy.screenshot({ path: png });
  const ratio = Number(
    execFileSync("python3", [
      "-c",
      [
        "import sys",
        "from PIL import Image",
        "def lin(c):",
        "    c /= 255",
        "    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4",
        "px = list(Image.open(sys.argv[1]).convert('RGB').getdata())",
        "lum = sorted(0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) for r, g, b in px)",
        "print(round(1.05 / (lum[int(len(lum) * 0.95)] + 0.05), 2))",
      ].join("\n"),
      png,
    ]).toString(),
  );
  console.log(`hero copy contrast at ${width}px: ${ratio}:1`);
  if (ratio < 4.5) problems.push(`hero supporting copy ${ratio}:1 at ${width}px (needs 4.5)`);
  await context.close();
}

// The hero must stay readable if its ground image never arrives.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route("**/hero-ground.webp", (route) => route.abort());
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/landing-1440-no-ground.png` });
  await context.close();
}

// Auth pages (sub-project 2): redesigned, so held to the same overflow and
// page-error checks as the landing.
for (const path of ["/auth/signin", "/auth/signup", "/auth/forgot-password", "/auth/reset-password"]) {
  for (const width of [375, 1440]) {
    await shoot(`auth${path.slice(5).replaceAll("/", "-")}-${width}`, { width, path, fullPage: width === 375 });
  }
}

// ── Sub-project 3: the shell and dashboard, with API fixtures so the
// populated state renders without a backend.
const API_CORS = {
  "access-control-allow-origin": BASE,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};
const fulfil = (json) => (route) =>
  route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: API_CORS })
    : route.fulfill({ status: 200, headers: API_CORS, json });

const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
const POPULATED = {
  profile: { uid: "u1", display_name: "Ada Lovelace", email: "ada@example.com" },
  sessions: [82, 74, 69, 61, 77].map((score, i) => ({
    session_id: `s${i}`,
    status: "completed",
    mode: ["behavioral", "technical", "mixed", "behavioral", "technical"][i],
    created_at: day(i),
    question_count: 8,
    overall_score: score,
  })),
  overview: {
    total_sessions: 5,
    completed_sessions: 5,
    average_score: 72.6,
    highest_score: 82,
    performance_trend: "improving",
    recent_scores: [82, 74, 69, 61, 77],
  },
  progress: {
    score_timeline: [61, 69, 74, 77, 82].map((score, i) => ({ date: day(4 - i), score, mode: "mixed", readiness: "ready" })),
    top_improvements: [
      { item: "Quantify the impact of your work", count: 4 },
      { item: "Name the trade-off you rejected", count: 3 },
      { item: "Open with the outcome, then the context", count: 2 },
    ],
  },
};
const EMPTY = {
  sessions: [],
  overview: { total_sessions: 0, completed_sessions: 0, average_score: 0, performance_trend: "consistent", recent_scores: [] },
  progress: { score_timeline: [], top_improvements: [] },
};

async function shootApp(name, { width, path = "/dashboard", data, fullPage = true, before }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript(() => localStorage.setItem("amplify_id_token", "mock-user-token"));
  const page = await context.newPage();
  page.on("pageerror", (err) => problems.push(`${name}: page error: ${err.message}`));
  const d = data ?? EMPTY;
  await page.route("**/api/**", fulfil({}));
  if (d.profile) await page.route("**/api/user/profile", fulfil(d.profile));
  await page.route("**/api/interview/sessions**", fulfil(d.sessions));
  await page.route("**/api/analytics/overview", fulfil(d.overview));
  await page.route("**/api/analytics/progress", fulfil(d.progress));
  await page.route("**/api/analytics/skills", fulfil(d.skills ?? { resume_skills: [], skills_demonstrated: [], skills_to_practice: [] }));
  await page.route("**/api/questions**", fulfil(d.questions ?? []));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  await context.close();
}

for (const width of [375, 1440]) {
  await shootApp(`app-dashboard-${width}`, { width, data: POPULATED });
  await shootApp(`app-dashboard-empty-${width}`, { width });
}
await shootApp("app-dashboard-collapsed-1440", {
  width: 1440,
  data: POPULATED,
  fullPage: false,
  before: async (page) => {
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    await page.waitForTimeout(400);
    // Every rail child must fit the 48px icon rail (the brand tile once overflowed it).
    const clipped = await page.evaluate(() => {
      const rail = document.querySelector('[data-sidebar="sidebar"]').getBoundingClientRect();
      return [...document.querySelectorAll('[data-sidebar="sidebar"] a, [data-sidebar="sidebar"] button')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.right > rail.right + 0.5).length;
    });
    if (clipped) problems.push(`collapsed rail: ${clipped} control(s) overflow the icon rail`);
  },
});
await shootApp("app-nav-open-375", {
  width: 375,
  data: POPULATED,
  fullPage: false,
  before: async (page) => {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.waitForTimeout(600);
  },
});
for (const path of ["/interview/setup", "/dashboard/practice-questions", "/dashboard/progress", "/dashboard/insights"]) {
  await shootApp(`app${path.replaceAll("/", "-")}-1440`, { width: 1440, path, fullPage: false });
}

// ── Sub-project 4: the interview flow, fed with fixtures (no backend).
const SESSION_START = {
  session_id: "demo-session",
  first_message: {
    message_id: "m1",
    role: "interviewer",
    content: "Tell me about a time you had to deliver with an unclear scope. How did you decide what to build first?",
    timestamp: day(0),
    question_metadata: { difficulty: "medium", category: "behavioral", is_followup: false, question_number: 1 },
  },
  progress: { questions_asked: 1, questions_total: 8, current_difficulty: "medium", topics_covered: ["prioritisation"], average_score: 0, is_complete: false, time_elapsed_seconds: 60 },
};
const FEEDBACK = {
  session_id: "demo-session",
  overall_score: 82,
  communication_scores: { clarity: 64, structure: 78, conciseness: 80 },
  content_scores: { relevance: 90, depth: 84, specificity: 86 },
  strengths: ["A concrete prioritisation method", "Quantified outcomes"],
  improvements: ["Name the trade-off you rejected", "Open with the result, then the context"],
  actionable_feedback: "Strong, specific answers with clear methods. Lead with outcomes and say what you chose not to do.",
  readiness_level: "Interview Ready",
  readiness_score: 82,
  next_steps: [],
  performance_trend: "consistent",
  skill_gaps_addressed: [],
  skill_gaps_remaining: [],
  total_questions: 2,
  questions_answered: 1,
  total_cost_cents: 3,
};
const TRANSCRIPT = [
  SESSION_START.first_message,
  {
    message_id: "m2",
    role: "candidate",
    content: "On a billing migration I ranked every payment flow by revenue at risk and shipped the top three first.",
    timestamp: day(0),
    analysis: {
      score: 82,
      communication_scores: { clarity: 64, structure: 78, conciseness: 80 },
      content_scores: { relevance: 90, depth: 84, specificity: 86 },
      strengths: ["Concrete method"],
      improvements: ["Name the trade-off you rejected"],
      brief_feedback: "Strong, specific answer. Name the trade-off.",
    },
  },
  { message_id: "m3", role: "interviewer", content: "What would you do differently next time?", timestamp: day(0) },
];

async function shootFlow(name, { width, path, before, fullPage = false }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    localStorage.setItem("amplify_id_token", "mock-user-token");
    sessionStorage.setItem("interviewConfig", JSON.stringify({ config: { mode: "behavioral", questionCount: 8 } }));
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => problems.push(`${name}: page error: ${err.message}`));
  await page.route("**/api/**", fulfil({}));
  await page.route("**/api/interview/session", fulfil(SESSION_START));
  await page.route("**/api/feedback/**", fulfil(FEEDBACK));
  await page.route("**/api/interview/session/*/messages", fulfil({ messages: TRANSCRIPT }));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  await context.close();
}

for (const width of [375, 1440]) {
  await shootFlow(`flow-session-${width}`, { width, path: "/interview/session" });
  await shootFlow(`flow-results-${width}`, { width, path: "/results/demo-session", fullPage: true });
}
await shootFlow("flow-session-progress-375", {
  width: 375,
  path: "/interview/session",
  before: async (page) => {
    await page.getByRole("button", { name: "Show progress" }).click();
    await page.waitForTimeout(600);
  },
});
await shootFlow("flow-results-expanded-1440", {
  width: 1440,
  path: "/results/demo-session",
  fullPage: true,
  before: (page) => page.getByRole("button", { name: /Tell me about a time/ }).click(),
});

// ── Sub-project 5: Progress, Insights and Practice questions, empty and populated.
const ANALYTICS = {
  ...POPULATED,
  overview: {
    ...POPULATED.overview,
    completed_sessions: 7,
    average_score: 71.4,
    recent_scores: [82, 77, 74, 69, 61, 66, 71],
    readiness_distribution: { "Nearly Ready": 4, "Interview Ready": 2, "Needs Practice": 1 },
  },
  progress: {
    score_timeline: [66, 61, 71, 69, 74, 77, 82].map((score, i) => ({
      date: day(12 - i * 2),
      score,
      mode: ["behavioral", "technical", "behavioral", "mixed", "technical", "behavioral", "behavioral"][i],
      readiness: "Nearly Ready",
    })),
    communication_timeline: [
      [58, 55, 62],
      [60, 58, 66],
      [66, 61, 70],
      [64, 66, 68],
      [70, 69, 74],
      [74, 72, 77],
      [78, 76, 81],
    ].map(([clarity, structure, conciseness], i) => ({ date: day(12 - i * 2), clarity, structure, conciseness })),
    top_strengths: [
      { item: "Concrete examples from real projects", count: 5 },
      { item: "Clear prioritisation method", count: 4 },
      { item: "Calm, structured delivery", count: 2 },
    ],
    top_improvements: POPULATED.progress.top_improvements,
  },
  skills: {
    resume_skills: ["SQL", "Python"],
    skills_demonstrated: ["SQL", "Stakeholder management", "A/B testing"],
    skills_to_practice: ["Kubernetes", "System design at scale"],
  },
  questions: [
    ["Tell me about a time you disagreed with your manager.", "Behavioral"],
    ["Design a rate limiter for a public API.", "Technical"],
    ["How do you decide what not to build?", "Product Manager"],
    ["Walk me through a project you led end to end.", "Leadership"],
  ].map(([question_text, category], i) => ({ id: `q${i}`, question_text, category, created_at: day(i * 3), user_id: "u1" })),
};
for (const path of ["/dashboard/progress", "/dashboard/insights", "/dashboard/practice-questions"]) {
  const slug = path.split("/").pop();
  for (const width of [375, 1440]) {
    await shootApp(`analytics-${slug}-${width}`, { width, path, data: ANALYTICS });
    await shootApp(`analytics-${slug}-empty-${width}`, { width, path });
  }
}

// ── Finishing pass: 404 (signed in and out) and print without the rail.
for (const width of [375, 1440]) {
  await shootApp(`notfound-${width}`, { width, path: "/dashboard/analytics", fullPage: false });
}
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/no-such-page`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/notfound-signed-out-1440.png` });
  await context.close();
}
await shootApp("print-progress-1440", {
  width: 1440,
  path: "/dashboard/progress",
  data: ANALYTICS,
  before: async (page) => {
    await page.emulateMedia({ media: "print" });
    const rail = await page.evaluate(() => {
      const el = document.querySelector('[data-sidebar="sidebar"]');
      return el ? getComputedStyle(el.closest(".peer") ?? el).display : "none";
    });
    if (rail !== "none") problems.push(`print: rail still shown (display ${rail})`);
  },
});

await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Screens written to ${OUT}`);
