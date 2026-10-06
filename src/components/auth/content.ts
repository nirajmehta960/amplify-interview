import { FEATURES } from "@/components/landing/content";

/**
 * Copy for the auth pages' side panel. Same rule as the landing (spec §4.3):
 * no user counts, ratings or testimonials — the old panel's "50,000+
 * candidates", "4.9 / 5" and named quote were unsupported and are gone.
 */
export const AUTH_PANEL = {
  eyebrow: "AI mock interviews",
  heading: "Practise the interview before the interview.",
  lead: "An interviewer that reads your résumé and the role, adapts to your answers, and tells you exactly what to fix.",
  /** Three of the landing's feature titles, so the two pages never disagree. */
  features: [FEATURES.cards[1].title, FEATURES.cards[2].title, FEATURES.cards[3].title],
};
