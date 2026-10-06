/**
 * Every word on the landing page, plus the image paths. Components hold layout
 * only. Copy rules (spec §4.3): no testimonials, user counts or company logos;
 * the sample feedback is labelled as an example.
 *
 * "Free" claims are true as of 2026-10: there is no billing in the product.
 * Revisit FAQ.cost and the CTAs if pricing ships.
 */

export const SECTION_IDS = {
  hero: "top",
  features: "features",
  sample: "sample-feedback",
  how: "how-it-works",
  faq: "faq",
  closing: "start",
} as const;

export const META = {
  title: "Amplify Interview — AI mock interviews that adapt to you",
  description:
    "Practise with an AI interviewer that reads your résumé and the job description, adapts its difficulty to your answers, and scores every response with specific feedback.",
};

export const NAV_LINKS: readonly { label: string; href: string }[] = [
  { label: "Features", href: `#${SECTION_IDS.features}` },
  { label: "How it works", href: `#${SECTION_IDS.how}` },
  { label: "FAQ", href: `#${SECTION_IDS.faq}` },
];

export const HERO = {
  eyebrow: "AI mock interviews",
  heading: ["Walk in prepared.", "Walk out hired."] as const,
  supporting:
    "Upload your résumé and the job description. Get an adaptive interview that scores every answer and tells you exactly what to fix.",
  primaryCta: "Start a free interview",
  primaryCtaSignedIn: "Start an interview",
  secondaryCta: { label: "See how it works", href: `#${SECTION_IDS.how}` },
  groundSrc: "/images/landing/hero-ground.webp",
  shot: {
    src: "/images/landing/hero-interview.webp",
    width: 2880,
    height: 1800,
    alt: "An Amplify interview in progress: the interviewer's question, the candidate's answer with its score, and the session progress panel.",
  },
  scoreCard: { score: 82, label: "Strong answer", detail: "Clear structure, specific outcome" },
  nextCard: { label: "Next question", value: "Harder", detail: "Difficulty adapts to your recent answers" },
};

export const FEATURES = {
  eyebrow: "What you get",
  heading: "Practice that adapts to you",
  lead: "Every session is built from your résumé and the job you want, and it gets harder or easier based on how you actually answer.",
  cards: [
    {
      title: "Questions from your résumé",
      body: "Add your résumé and the job description; the interviewer asks about the experience and skills that role actually needs.",
    },
    {
      title: "Difficulty that adapts",
      body: "Strong answers raise the bar and weaker ones ease it off, so each question sits at the edge of what you can do.",
    },
    {
      title: "Every answer scored",
      body: "Each response is scored out of 100 on relevance, depth, specificity, clarity, structure and conciseness.",
    },
    {
      title: "Answer by voice or text",
      body: "Speak your answers as you would in the room, or type them when you want to think on the page.",
    },
    {
      title: "Feedback you can act on",
      body: "Every session ends with your strengths, specific improvements and where the points were lost.",
    },
    {
      title: "Progress over time",
      body: "Scores and topics are tracked across sessions, so you can see what is improving and what to practise next.",
    },
  ],
} as const;

export const SAMPLE = {
  eyebrow: "Example feedback",
  heading: "See exactly what to fix",
  lead: "This is the kind of breakdown you get after every answer. It is an illustrative example, not a real candidate's result.",
  badge: "Example",
  question:
    "Tell me about a time you had to deliver with an unclear scope. How did you decide what to build first?",
  answer:
    "On a billing migration, the brief was just “move us off the old provider”. I listed every flow that touched payments, ranked them by revenue at risk, and shipped the top three behind a flag in two weeks. We moved 80% of volume before tackling the long tail, and a Friday stakeholder update kept the scope from creeping.",
  overall: 82,
  verdict: "Strong answer",
  criteria: [
    { label: "Relevance", score: 90 },
    { label: "Specificity", score: 86 },
    { label: "Structure", score: 78 },
    { label: "Clarity", score: 64 },
  ],
  strengths: ["A concrete method: ranked by revenue at risk", "A quantified outcome: 80% of volume in two weeks"],
  improvement:
    "Name the trade-off you rejected. Saying what you chose not to build first shows judgement, not just execution.",
  next: "Next question: harder",
} as const;

export const HOW = {
  eyebrow: "How it works",
  heading: "From upload to interview-ready",
  lead: "Four steps, and the last one loops: every session makes the next one more useful.",
  steps: [
    {
      title: "Add your résumé and the job",
      body: "Upload your résumé and paste the job description. Amplify pulls out the skills and experience the role is asking for.",
    },
    {
      title: "Take an adaptive interview",
      body: "Answer by voice or text. The interviewer follows up when an answer is thin and adjusts difficulty as you go.",
    },
    {
      title: "Get scored feedback",
      body: "Every answer is scored with a short note on what worked, and the session ends with a full written review.",
    },
    {
      title: "Track progress and go again",
      body: "Your scores and topics build into a history, so the next session targets what still needs work.",
    },
  ],
} as const;

export interface FaqEntry {
  slug: string;
  question: string;
  answer: string;
}

export const FAQ: { eyebrow: string; heading: string; lead: string; entries: readonly FaqEntry[] } = {
  eyebrow: "FAQ",
  heading: "Questions, answered",
  lead: "The five things people ask before their first session.",
  entries: [
    {
      slug: "cost",
      question: "Is it free to start?",
      answer: "Yes. Create an account and run a complete interview, with scoring and feedback, without paying anything.",
    },
    {
      slug: "roles",
      question: "Which roles does it cover?",
      answer:
        "Any role with a written job description. Questions are generated from the description and your résumé, so a product manager and a backend engineer get very different interviews.",
    },
    {
      slug: "resume",
      question: "Is my résumé stored?",
      answer:
        "It is stored in your account so you can reuse it across sessions, and it is sent to our AI provider only to generate and score your own interviews.",
    },
    {
      slug: "voice",
      question: "Can I answer by voice?",
      answer:
        "Yes. Record an answer and it is transcribed before scoring, or type it if you prefer. You can switch on every question.",
    },
    {
      slug: "scoring",
      question: "How are answers scored?",
      answer:
        "Each answer is scored from 0 to 100 against a fixed rubric: relevance, depth, specificity, clarity, structure and conciseness. When your recent average reaches 78 or more the questions get harder; at 45 or below they get easier.",
    },
  ],
};

export const CLOSING = {
  heading: "Your next interview starts here",
  lead: "Ten minutes of practice today is one less surprise in the room.",
  cta: "Start a free interview",
  ctaSignedIn: "Start an interview",
};
