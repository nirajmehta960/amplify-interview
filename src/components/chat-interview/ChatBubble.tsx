import { motion } from 'framer-motion';
import { Bot, User, CheckCircle2, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ChatMessage, ResponseAnalysis } from '@/services/apiClient';
import { useState } from 'react';

interface ChatBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-cyan-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};

const scoreBg = (score: number) => {
  if (score >= 80) return 'bg-emerald-500/15 border-emerald-500/30';
  if (score >= 60) return 'bg-cyan-500/15 border-cyan-500/30';
  if (score >= 40) return 'bg-amber-500/15 border-amber-500/30';
  return 'bg-rose-500/15 border-rose-500/30';
};

const difficultyBadge = (diff: string) => {
  const colors: Record<string, string> = {
    easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    hard: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  return colors[diff] || colors.medium;
};

function InlineAnalysis({ analysis }: { analysis: ResponseAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-3 space-y-2"
    >
      {/* Score pill */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-[1.02] ${scoreBg(analysis.score)}`}
      >
        <span className={`text-sm font-bold ${scoreColor(analysis.score)}`}>
          {analysis.score}/100
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground truncate max-w-[200px]">
          {analysis.brief_feedback.split('.')[0] || 'View feedback'}
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-3 space-y-3 text-xs"
        >
          {/* Score bars */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground font-medium">Communication</span>
              <div className="flex gap-1 mt-1">
                {Object.entries(analysis.communication_scores).map(([k, v]) => (
                  <div key={k} className="flex-1">
                    <div className="text-[10px] text-muted-foreground capitalize">{k}</div>
                    <div className="progress-bar mt-0.5">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${v}%`, opacity: v > 0 ? 1 : 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Content</span>
              <div className="flex gap-1 mt-1">
                {Object.entries(analysis.content_scores).map(([k, v]) => (
                  <div key={k} className="flex-1">
                    <div className="text-[10px] text-muted-foreground capitalize">{k}</div>
                    <div className="progress-bar mt-0.5">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${v}%`, opacity: v > 0 ? 1 : 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-3">
            {analysis.strengths.length > 0 && (
              <div>
                <span className="text-emerald-400 font-medium">✓ Strengths</span>
                <ul className="mt-1 space-y-0.5">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-muted-foreground">{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.improvements.length > 0 && (
              <div>
                <span className="text-amber-400 font-medium">↑ Improve</span>
                <ul className="mt-1 space-y-0.5">
                  {analysis.improvements.map((s, i) => (
                    <li key={i} className="text-muted-foreground">{s}</li>
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

export default function ChatBubble({ message, isLatest }: ChatBubbleProps) {
  const isInterviewer = message.role === 'interviewer';
  const isSystem = message.role === 'system';
  const meta = message.question_metadata;

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="glass-card px-4 py-2.5 max-w-lg text-center">
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
      className={`flex gap-3 ${isInterviewer ? 'items-start' : 'items-start flex-row-reverse'} ${
        isLatest ? '' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isInterviewer
            ? 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30'
            : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30'
        }`}
      >
        {isInterviewer ? (
          <Bot className="w-4 h-4 text-cyan-400" />
        ) : (
          <User className="w-4 h-4 text-violet-400" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] min-w-0 ${isInterviewer ? '' : 'text-right'}`}>
        {/* Header badges */}
        {isInterviewer && meta && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] py-0 h-5 border ${difficultyBadge(meta.difficulty)}`}
            >
              {meta.difficulty}
            </Badge>
            <Badge variant="outline" className="text-[10px] py-0 h-5 text-muted-foreground capitalize">
              {meta.category}
            </Badge>
            {meta.is_followup && (
              <Badge variant="outline" className="text-[10px] py-0 h-5 text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                follow-up
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground/60">Q{meta.question_number}</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isInterviewer
              ? 'bg-card/80 border border-border/50 rounded-tl-md'
              : 'bg-primary/10 border border-primary/20 rounded-tr-md text-left'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Inline analysis for candidate messages */}
        {!isInterviewer && message.analysis && (
          <InlineAnalysis analysis={message.analysis} />
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className="text-[10px] text-muted-foreground/40 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </motion.div>
  );
}
