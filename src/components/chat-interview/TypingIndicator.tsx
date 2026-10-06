import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

/**
 * Animated typing indicator shown while the AI is thinking.
 */
export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-start gap-3"
      role="status"
    >
      <div aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Bot className="size-4" />
      </div>

      <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 shadow-[var(--card-shadow)]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              aria-hidden="true"
              className="size-2 rounded-full bg-accent"
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">Interviewer is thinking…</span>
        </div>
      </div>
    </motion.div>
  );
}
