import { Activity, ArrowRight, Check, Flag, Gauge, TrendingUp } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  consistency,
  mostCommonReadiness,
  nextGoal,
  recurring,
  scoredTimeline,
  summaryStats,
  type Theme,
} from "@/components/analytics/analytics";
import { CARD } from "@/components/analytics/styles";
import { EmptyNote, Section, StatTileRow, StatTileSkeleton } from "@/components/analytics/ui";
import { useAnalytics } from "@/components/analytics/useAnalytics";
import { trendIcon } from "@/components/dashboard/format";
import { LoadError } from "@/components/dashboard/LoadError";
import { PageContainer, PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS } from "@/lib/score";
import { cn } from "@/lib/utils";

function ThemeList({ themes, tone }: { themes: Theme[]; tone: "high" | "mid" }) {
  const Icon = tone === "high" ? Check : TrendingUp;
  return (
    <ul className="mt-5 space-y-3">
      {themes.map((t) => (
        <li key={t.item} className="flex items-start gap-3 text-sm">
          <Icon className="mt-0.5 size-4 shrink-0" style={{ color: SCORE_COLORS[tone].text }} aria-hidden="true" />
          <span className="flex-1 text-foreground">{t.item}</span>
          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
            in {t.count} {t.count === 1 ? "interview" : "interviews"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SkillChips({ title, skills, filled }: { title: string; skills: string[]; filled: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {skills.map((s) => (
            <li
              key={s}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs",
                filled ? "bg-accent/10 font-medium text-primary" : "border border-border bg-card text-muted-foreground",
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Insights = () => {
  const { loading, error, overview, progress, skills, retry } = useAnalytics({ skills: true });

  const scored = scoredTimeline(progress?.score_timeline);
  const stats = summaryStats(overview, scored);
  const spread = consistency(scored);
  const readiness = mostCommonReadiness(overview?.readiness_distribution);
  const strengths = recurring(progress?.top_strengths);
  const improvements = recurring(progress?.top_improvements);
  const shown = skills?.skills_demonstrated ?? [];
  const toPractise = skills?.skills_to_practice ?? [];
  const TrendIcon = trendIcon(stats.trend);

  return (
    <PageContainer>
      <Helmet>
        <title>Insights — Amplify Interview</title>
      </Helmet>
      <PageHeader title="Insights" subtitle="Patterns across your interviews." />

      {error ? (
        <LoadError className="mt-8" message="We couldn't load your insights." onRetry={retry} />
      ) : loading ? (
        <div className="mt-8 space-y-6" role="status" aria-label="Loading insights">
          <StatTileSkeleton count={3} />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <StatTileRow
            tiles={[
              { label: "Score consistency", value: spread === null ? "—" : `±${spread}`, icon: Activity },
              { label: "Trend", value: stats.trend.label, icon: TrendIcon },
              { label: "Usual readiness", value: readiness ?? "—", icon: Gauge },
            ]}
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            Consistency is how far your scores usually sit from your average; it appears after three scored interviews.
          </p>

          <section
            aria-labelledby="next-goal-heading"
            className={cn(CARD, "flex flex-col gap-4 border-l-4 border-l-accent sm:flex-row sm:items-center")}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Flag className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="next-goal-heading" className="text-sm font-medium text-muted-foreground">
                  Next goal
                </h2>
                <p className="text-base font-semibold text-foreground">{nextGoal(overview, stats.scored)}</p>
              </div>
            </div>
            <Button asChild className="self-start sm:self-auto">
              <Link to="/interview/setup">Start an interview</Link>
            </Button>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section id="strengths" title="Recurring strengths" description="What your feedback praised most, across your last ten interviews.">
              {strengths.length === 0 ? (
                <EmptyNote>Strengths appear after your first scored interview.</EmptyNote>
              ) : (
                <ThemeList themes={strengths} tone="high" />
              )}
            </Section>

            <Section id="improvements" title="Recurring improvements" description="What your feedback asked for most often.">
              {improvements.length === 0 ? (
                <EmptyNote>Improvements appear after your first scored interview.</EmptyNote>
              ) : (
                <>
                  <ThemeList themes={improvements} tone="mid" />
                  <Link
                    to="/interview/setup"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Practise these in a new interview
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </>
              )}
            </Section>
          </div>

          <Section id="skills" title="Skills" description="Gaps between your résumé and the roles you practised for.">
            {shown.length === 0 && toPractise.length === 0 ? (
              <EmptyNote>Skill gaps appear after your first scored interview.</EmptyNote>
            ) : (
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <SkillChips title="Shown in interviews" skills={shown} filled />
                <SkillChips title="Still to practise" skills={toPractise} filled={false} />
              </div>
            )}
          </Section>
        </div>
      )}
    </PageContainer>
  );
};

export default Insights;
