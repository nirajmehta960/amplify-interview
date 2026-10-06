import { motion } from 'framer-motion';
import { CheckCircle2, Lightbulb, MessageSquare, Target } from 'lucide-react';
import { DifficultyChip } from '@/components/interview/DifficultyChip';
import { ScoreBadge } from '@/components/interview/ScoreBadge';
import { SCORE_COLORS } from '@/lib/score';
import type { ChatMessage, SessionProgress } from '@/services/apiClient';

interface ProgressSidebarProps {
  progress: SessionProgress | null;
  lastAnalysis: ChatMessage['analysis'] | null;
}

const CARD = 'space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--card-shadow)]';
const HEADING = 'flex items-center gap-2 text-sm font-semibold text-foreground';

/** Live session progress: shown in the desktop side panel and in the phone sheet. */
export default function ProgressSidebar({ progress, lastAnalysis }: ProgressSidebarProps) {
  if (!progress) return null;
  const pct = progress.questions_total > 0 ? Math.min(100, (progress.questions_asked / progress.questions_total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <section className={CARD} aria-labelledby="session-progress-heading">
        <h3 id="session-progress-heading" className={HEADING}>
          <Target className="size-4 text-accent" aria-hidden="true" />
          Session progress
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/60 p-3">
            <div className="mb-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Questions</div>
            <div className="flex items-baseline gap-1 text-xl font-semibold text-foreground">
              <span>{progress.questions_asked}</span>
              <span className="text-xs font-normal text-muted-foreground">/ {progress.questions_total}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="rounded-xl bg-secondary/60 p-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Avg score</div>
            <ScoreBadge score={progress.average_score > 0 ? progress.average_score : null} size="lg" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-muted-foreground">Current difficulty</span>
          <DifficultyChip level={progress.current_difficulty} />
        </div>
      </section>

      <section className={CARD} aria-labelledby="topics-heading">
        <h3 id="topics-heading" className={HEADING}>
          <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
          Topics covered
        </h3>
        {progress.topics_covered.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {progress.topics_covered.map((topic, i) => (
              <span key={i} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No topics covered yet.</p>
        )}
      </section>

      {lastAnalysis && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} relative overflow-hidden`}
          aria-labelledby="latest-feedback-heading"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <h3 id="latest-feedback-heading" className={HEADING}>
            <MessageSquare className="size-4 text-accent" aria-hidden="true" />
            Latest feedback
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{lastAnalysis.brief_feedback}</p>
          {lastAnalysis.improvements.length > 0 && (
            <p className="flex items-start gap-1.5 border-t border-border pt-3 text-xs" style={{ color: SCORE_COLORS.mid.text }}>
              <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>Tip: {lastAnalysis.improvements[0]}</span>
            </p>
          )}
        </motion.section>
      )}
    </div>
  );
}
