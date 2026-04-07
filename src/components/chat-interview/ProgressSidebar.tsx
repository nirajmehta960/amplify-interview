import { motion } from 'framer-motion';
import { Target, TrendingUp, CheckCircle2, MessageSquare, AlertCircle, Clock } from 'lucide-react';
import type { SessionProgress, ChatMessage } from '@/services/apiClient';

interface ProgressSidebarProps {
  progress: SessionProgress | null;
  lastAnalysis: ChatMessage['analysis'] | null;
}

const difficultyColor = (diff: string) => {
  const colors: Record<string, string> = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return colors[diff] || colors.medium;
};

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-cyan-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};

export default function ProgressSidebar({ progress, lastAnalysis }: ProgressSidebarProps) {
  if (!progress) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Overview Stats */}
      <div className="glass-card p-4 space-y-4">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Session Progress
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Completion */}
          <div className="bg-background/40 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Questions</div>
            <div className="text-xl font-bold font-outfit text-foreground flex items-baseline gap-1">
              {progress.questions_asked} <span className="text-xs text-muted-foreground font-normal">/ {progress.questions_total}</span>
            </div>
            <div className="progress-bar mt-2 h-1 text-primary">
              <div 
                className="progress-bar-fill bg-primary" 
                style={{ width: `${Math.min(100, (progress.questions_asked / progress.questions_total) * 100)}%` }}
              />
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-background/40 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Score</div>
            <div className={`text-xl font-bold font-outfit ${scoreColor(progress.average_score)}`}>
              {progress.average_score > 0 ? Math.round(progress.average_score) : '--'}
            </div>
          </div>
        </div>

        {/* Current Difficulty */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${difficultyColor(progress.current_difficulty)}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium capitalize">{progress.current_difficulty} Level</span>
          </div>
          {progress.current_difficulty === 'easy' && <motion.div animate={{ y: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 2 }}>↓</motion.div>}
          {progress.current_difficulty === 'hard' && <motion.div animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2 }}>↑</motion.div>}
          {progress.current_difficulty === 'medium' && <motion.div animate={{ x: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 2 }}>↔</motion.div>}
        </div>
      </div>

      {/* Topics Covered */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Topics Covered
        </h3>
        {progress.topics_covered.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {progress.topics_covered.map((topic, i) => (
              <span key={i} className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-md capitalize">
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No topics covered yet.</p>
        )}
      </div>

      {/* Last Feedback Snippet */}
      {lastAnalysis && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 space-y-3 border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400" />
          <h3 className="text-sm font-semibold tracking-wide text-cyan-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Latest Feedback
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {lastAnalysis.brief_feedback}
          </p>
          
          {lastAnalysis.improvements.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/50">
              <div className="flex items-start gap-1.5 text-xs text-amber-400/90">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Tip: {lastAnalysis.improvements[0]}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
