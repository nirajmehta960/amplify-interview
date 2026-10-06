import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronUp, Clock, ListChecks, MessageSquare, RefreshCw, Save, TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";

import { VERDICT } from "@/components/dashboard/format";
import { DimensionBar } from "@/components/interview/DimensionBar";
import { ScoreBadge } from "@/components/interview/ScoreBadge";
import { buildRadarData, pairQuestions } from "@/components/interview/results";
import { PageContainer, PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { scoreBand, SCORE_COLORS } from "@/lib/score";
import { interviewApi, feedbackApi, SessionFeedback, ChatMessage } from "@/services/apiClient";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)]";
const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

export default function InterviewResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedQs, setExpandedQs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!sessionId) return;
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      // Try to get existing feedback
      let fb;
      try {
        fb = await feedbackApi.get(sessionId!);
      } catch (e: any) {
        if (e.status === 404) {
          // Generate new feedback
          setGenerating(true);
          fb = await feedbackApi.generate(sessionId!);
          setGenerating(false);
        } else {
          throw e; // rethrow
        }
      }
      
      const { messages } = await interviewApi.getMessages(sessionId!);
      
      setFeedback(fb);
      setMessages(messages);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load results", description: "There was an error loading your feedback.", variant: "destructive" });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  if (loading || generating) {
    return (
      <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div aria-hidden="true" className="mb-6 size-14 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          {generating ? "Analysing your interview" : "Loading results"}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {generating
            ? "Writing feedback from your answers, your résumé and the target role…"
            : "Getting your session data…"}
        </p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-4 size-10 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-foreground">Results not found</h1>
        <p className="mt-1 text-muted-foreground">We couldn't load feedback for this interview.</p>
        {/* A link, not history.back(): Results is often opened in a new tab, where "back" goes nowhere. */}
        <Button asChild variant="outline" className="mt-6">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const radarData = buildRadarData(feedback);
  const qaPairs = pairQuestions(messages);
  const overallBand = scoreBand(feedback.overall_score);

  const toggleQuestion = (id: string) => {
    setExpandedQs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PageContainer className="max-w-7xl pb-20">
      <Helmet>
        <title>Interview results — Amplify Interview</title>
      </Helmet>

      <PageHeader
        title="Interview results"
        subtitle={
          <span className="flex items-center gap-2 text-sm">
            <Clock className="size-3.5" aria-hidden="true" />
            Session {sessionId?.split("-")[0].toUpperCase()}
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Save className="mr-2 size-4" aria-hidden="true" /> Export
            </Button>
            <Button asChild>
              <Link to="/interview/setup">
                <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Start new
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-8 space-y-6">
        {/* Score, shape and dimensions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section aria-labelledby="overall-heading" className={`${CARD} flex flex-col items-center justify-center text-center`}>
            <h2 id="overall-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Overall score
            </h2>
            <ScoreBadge score={feedback.overall_score} outOf size="lg" className="mt-3 px-4 py-2 text-3xl" />
            <p className="mt-3 text-lg font-semibold" style={{ color: SCORE_COLORS[overallBand].text }}>
              {VERDICT[overallBand]}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium text-primary">{feedback.readiness_level}</span>
              <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                {feedback.questions_answered} of {feedback.total_questions} answered
              </span>
            </div>
          </section>

          <section aria-labelledby="breakdown-heading" className={`${CARD} lg:col-span-2`}>
            <h2 id="breakdown-heading" className="text-lg font-semibold text-foreground">
              Breakdown
            </h2>
            <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
              <div aria-hidden="true" className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius="72%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={AXIS_TICK} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.22} />
                    <ChartTooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {radarData.map((d) => (
                  <DimensionBar key={d.subject} label={d.subject} value={d.score} />
                ))}
              </div>
            </div>
          </section>
        </div>

        <section aria-labelledby="summary-heading" className={`${CARD} relative overflow-hidden`}>
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <h2 id="summary-heading" className="mb-2 flex items-center gap-2 text-lg font-semibold text-foreground">
            <MessageSquare className="size-5 text-accent" aria-hidden="true" /> Summary
          </h2>
          <p className="leading-relaxed text-muted-foreground">{feedback.actionable_feedback}</p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="strengths-heading" className={CARD}>
            <h2 id="strengths-heading" className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: SCORE_COLORS.high.text }}>
              <Check className="size-5" aria-hidden="true" /> Strengths
            </h2>
            <ul className="space-y-3">
              {feedback.strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0" style={{ color: SCORE_COLORS.high.fill }} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="improvements-heading" className={CARD}>
            <h2 id="improvements-heading" className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: SCORE_COLORS.mid.text }}>
              <TrendingUp className="size-5" aria-hidden="true" /> To improve
            </h2>
            <ul className="space-y-3">
              {feedback.improvements.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <TrendingUp className="mt-0.5 size-4 shrink-0" style={{ color: SCORE_COLORS.mid.fill }} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="questions-heading">
          <h2 id="questions-heading" className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
            <ListChecks className="size-5 text-accent" aria-hidden="true" /> Question by question
          </h2>
          <ul className="space-y-3">
            {qaPairs.map(({ question, answer }, index) => {
              const qId = question.message_id || `q-${index}`;
              const isExpanded = expandedQs[qId] || false;
              const score = answer?.analysis?.score;
              const panelId = `answer-${qId}`;

              return (
                <li key={qId} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--card-shadow)]">
                  <button
                    type="button"
                    onClick={() => toggleQuestion(qId)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-secondary/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        Question {index + 1}
                        {question.question_metadata?.is_followup && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-primary">Follow-up</span>
                        )}
                      </span>
                      <span className="block font-medium text-foreground">{question.content}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {answer ? (
                        <ScoreBadge score={score ?? null} />
                      ) : (
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">Unanswered</span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                  </button>

                  {isExpanded && answer && (
                    <div id={panelId} className="space-y-4 border-t border-border bg-secondary/30 p-5">
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Your answer</h3>
                        <p className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm text-foreground">{answer.content}</p>
                      </div>
                      {answer.analysis && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-border bg-card p-4">
                            <h3 className="mb-2 text-sm font-medium" style={{ color: SCORE_COLORS.high.text }}>
                              What you did well
                            </h3>
                            <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                              {answer.analysis.strengths.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4">
                            <h3 className="mb-2 text-sm font-medium" style={{ color: SCORE_COLORS.mid.text }}>
                              How to improve
                            </h3>
                            <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                              {answer.analysis.improvements.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PageContainer>
  );
}
