import type { ChatMessage, SessionFeedback } from "@/services/apiClient";

/**
 * The radar chart's points: the six rubric dimensions the backend scores.
 * The old chart also plotted the overall score labelled "Communication";
 * that point is gone because it was a different number under the wrong name.
 */
export function buildRadarData(feedback: Pick<SessionFeedback, "communication_scores" | "content_scores">) {
  const c = feedback.communication_scores;
  const t = feedback.content_scores;
  return [
    { subject: "Clarity", score: c.clarity },
    { subject: "Structure", score: c.structure },
    { subject: "Conciseness", score: c.conciseness },
    { subject: "Relevance", score: t.relevance },
    { subject: "Depth", score: t.depth },
    { subject: "Specificity", score: t.specificity },
  ];
}

/** Each interviewer question with the candidate answer that follows it (if any). */
export function pairQuestions(messages: ChatMessage[]): { question: ChatMessage; answer: ChatMessage | null }[] {
  const pairs: { question: ChatMessage; answer: ChatMessage | null }[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role !== "interviewer") continue;
    const next = messages[i + 1];
    if (next && next.role === "candidate") {
      pairs.push({ question: messages[i], answer: next });
      i++;
    } else {
      pairs.push({ question: messages[i], answer: null });
    }
  }
  return pairs;
}
