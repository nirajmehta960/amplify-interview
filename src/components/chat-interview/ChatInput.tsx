import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Square, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useVideoRecording } from '@/hooks/useVideoRecording';
import deepgramTranscriptionService from '@/services/deepgramTranscriptionService';

interface ChatInputProps {
  onSendMessage: (content: string, durationSeconds?: number) => void;
  disabled: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    startRecording,
    stopRecording,
    onAudioChunk,
    recordingTime,
  } = useVideoRecording();

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    onSendMessage(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '60px'; // Reset height
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-resize
    e.target.style.height = '60px';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsTranscribing(true);
      
      try {
        const _blob = await stopRecording();
        
        // Finalize Deepgram session if we had one running
        let finalTranscript = '';
        if ((window as any).__dgFinalize) {
          finalTranscript = await (window as any).__dgFinalize();
          delete (window as any).__dgFinalize;
        }

        if (finalTranscript) {
          setContent(prev => {
            const space = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + finalTranscript;
          });
        }
      } catch (e) {
        console.error("Failed to process recording", e);
      } finally {
        setIsTranscribing(false);
        setRecordingDuration(recordingTime);
      }
    } else {
      // Start recording
      try {
        await startRecording();
        setIsRecording(true);
        setRecordingDuration(0);

        // Setup Deepgram streaming session
        const session = deepgramTranscriptionService.createStreamingSession();

        const unsubscribe = onAudioChunk(async (chunk) => {
          try {
             await session.pushChunk(chunk);
          } catch (e) {
             console.warn("Deepgram chunk push failed", e);
          }
        });

        // Store finalizer
        (window as any).__dgFinalize = async () => {
          try {
            return await session.finalize();
          } finally {
            unsubscribe();
          }
        };

      } catch (e) {
        console.error("Failed to start recording", e);
      }
    }
  };

  // Format recording time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute -top-12 left-0 right-0 flex items-center justify-center pointer-events-none"
          >
            <div role="status" className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-1.5 shadow-[var(--card-shadow)]">
              <div aria-hidden="true" className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
              <span className="sr-only">Recording</span>
              <span className="w-12 text-sm font-medium tabular-nums text-destructive">
                {formatTime(recordingTime)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-[var(--card-shadow)] transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/20 ${
          isRecording ? 'border-destructive/40 ring-2 ring-destructive/15' : 'border-border'
        }`}
      >
        <div className="flex-1 min-h-[60px] relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            aria-label="Your answer"
            placeholder={isRecording ? "Listening..." : "Type your answer or use voice input..."}
            className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent pt-3 pb-3 px-4 text-base"
            disabled={disabled || isTranscribing}
          />
          
          {isTranscribing && (
            <div role="status" className="absolute inset-0 flex items-center justify-center rounded-md bg-card/80 backdrop-blur-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Transcribing...</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 items-center pb-1">
          <Button
            type="button"
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            className={`w-10 h-10 rounded-full transition-all ${isRecording ? 'animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={toggleRecording}
            aria-label={isRecording ? 'Stop recording' : 'Answer by voice'}
            aria-pressed={isRecording}
            disabled={disabled && !isRecording}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
          </Button>

          <AnimatePresence>
            {content.trim() && !isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  onClick={handleSend}
                  disabled={disabled}
                  size="icon"
                  className="w-10 h-10 rounded-full"
                  aria-label="Send answer"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          Press <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd> to send, <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10px]">Shift</kbd> + <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
