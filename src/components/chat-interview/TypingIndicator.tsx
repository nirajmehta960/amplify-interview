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
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30">
        <Bot className="w-4 h-4 text-cyan-400" />
      </div>

      <div className="bg-card/80 border border-border/50 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-cyan-400/60"
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
          <span className="text-xs text-muted-foreground ml-2">
            Interviewer is thinking...
          </span>
        </div>
      </div>
    </motion.div>
  );
}
