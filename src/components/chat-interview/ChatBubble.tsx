import { motion } from 'framer-motion';
import { ArrowUpRight, Bot, Check, ChevronDown, ChevronUp, TrendingUp, User } from 'lucide-react';
import { useState } from 'react';
import { DifficultyChip } from '@/components/interview/DifficultyChip';
import { DimensionBar } from '@/components/interview/DimensionBar';
import { ScoreBadge } from '@/components/interview/ScoreBadge';
import { SCORE_COLORS } from '@/lib/score';
import type { ChatMessage, ResponseAnalysis } from '@/services/apiClient';

interface ChatBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
}

function InlineAnalysis({ analysis }: { analysis: ResponseAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-2 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-xs shadow-[var(--card-shadow)] transition-colors hover:bg-secondary"
      >
        <ScoreBadge score={analysis.score} outOf size="sm" />
        <span className="truncate text-muted-foreground">{analysis.brief_feedback.split('.')[0] || 'View feedback'}</span>
        {expanded ? (
          <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 rounded-xl border border-border bg-card p-4 text-left text-xs shadow-[var(--card-shadow)]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Communication</p>
              {Object.entries(analysis.communication_scores).map(([k, v]) => (
                <DimensionBar key={k} label={k} value={v} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Content</p>
              {Object.entries(analysis.content_scores).map(([k, v]) => (
                <DimensionBar key={k} label={k} value={v} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-3 sm:grid-cols-2">
            {analysis.strengths.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 font-medium" style={{ color: SCORE_COLORS.high.text }}>
                  <Check className="size-3.5" aria-hidden="true" /> Strengths
                </p>
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {analysis.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.improvements.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 font-medium" style={{ color: SCORE_COLORS.mid.text }}>
                  <TrendingUp className="size-3.5" aria-hidden="true" /> To improve
                </p>
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {analysis.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/** Interviewer on the left as a white card, the candidate on the right in soft blue. */
export default function ChatBubble({ message }: ChatBubbleProps) {
  const isInterviewer = message.role === 'interviewer';
  const isSystem = message.role === 'system';
  const meta = message.question_metadata;

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="my-4 flex justify-center">
        <div className="max-w-lg rounded-full border border-border bg-card px-4 py-2 text-center shadow-[var(--card-shadow)]">
          <p className="text-sm text-muted-foreground">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex items-start gap-3 ${isInterviewer ? '' : 'flex-row-reverse'}`}
    >
      <div
        aria-hidden="true"
        className={`grid size-8 shrink-0 place-items-center rounded-full ${
          isInterviewer ? 'bg-accent text-accent-foreground' : 'border border-border bg-card text-muted-foreground'
        }`}
      >
        {isInterviewer ? <Bot className="size-4" /> : <User className="size-4" />}
      </div>

      <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${isInterviewer ? '' : 'flex flex-col items-end'}`}>
        {isInterviewer && meta && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <DifficultyChip level={meta.difficulty} />
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">{meta.category}</span>
            {meta.is_followup && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-primary">
                <ArrowUpRight className="size-3" aria-hidden="true" />
                follow-up
              </span>
            )}
            <span className="text-xs text-muted-foreground">Q{meta.question_number}</span>
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-left ${
            isInterviewer
              ? 'rounded-tl-md border border-border bg-card shadow-[var(--card-shadow)]'
              : 'rounded-tr-md border border-primary/15 bg-primary/[0.07]'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
        </div>

        {!isInterviewer && message.analysis && <InlineAnalysis analysis={message.analysis} />}

        {/* `timestamp` is the serialized key the backend sends (CLAUDE.md, cross-layer rule 3). */}
        {message.timestamp && (
          <time dateTime={message.timestamp} className="mt-1 block px-1 text-[11px] text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        )}
      </div>
    </motion.div>
  );
}
