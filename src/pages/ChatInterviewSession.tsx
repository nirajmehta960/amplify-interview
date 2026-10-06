import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Loader2, LogOut, Mic, Video, VideoOff } from "lucide-react";
import { ScoreBadge } from "@/components/interview/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { interviewApi, ChatMessage, SessionProgress } from "@/services/apiClient";
import ChatBubble from "@/components/chat-interview/ChatBubble";
import TypingIndicator from "@/components/chat-interview/TypingIndicator";
import ProgressSidebar from "@/components/chat-interview/ProgressSidebar";
import ChatInput from "@/components/chat-interview/ChatInput";

export default function ChatInterviewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Opt-in self-view: nothing is recorded, so the camera stays off (and no
  // permission prompt appears) until the candidate asks for it.
  const [cameraOn, setCameraOn] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const storedSetup = (() => {
    try {
      const stored = sessionStorage.getItem("interviewConfig");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // Initialize from location state (InterviewSetup sets this up) with sessionStorage fallback
  const config = location.state?.config || storedSetup?.config || null;

  // { config, type, resumeId, jdId } (resumeId/jdId are needed for personalization)
  const setupData = location.state || storedSetup || {};

  // ── Session Initialization ──
  useEffect(() => {
    if (!config) {
      toast({ title: "Setup Missing", description: "Please configure your interview first.", variant: "destructive" });
      navigate("/interview/setup");
      return;
    }

    const initSession = async () => {
      setIsProcessing(true);
      try {
        const res = await interviewApi.createSession({
          mode: config.mode || 'mixed',
          question_count: config.questionCount || 10,
          duration_minutes: config.duration || 30,
          starting_difficulty: 'medium',
          adaptive_difficulty: config.adaptiveDifficulty ?? true,
          enable_followups: config.enableFollowups ?? true,
          resume_id: setupData.resumeId,
          jd_id: setupData.jdId,
        });

        setSessionId(res.session_id);
        setMessages([res.first_message]);
        setProgress(res.progress);
      } catch (err: any) {
        console.error("Failed to init session", err);
        toast({ title: "Session Error", description: err.message || "Failed to start interview.", variant: "destructive" });
      } finally {
        setIsProcessing(false);
      }
    };

    initSession();
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing]);

  // ── Camera Initialization ──
  useEffect(() => {
    const initCamera = async () => {
      if (!cameraOn) return;
      try {
        // Video only: the self-view needs no microphone (voice answers use their own).
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      } catch (err) {
        console.error("Camera access error", err);
        setVideoError("Could not access camera. Check permissions.");
        setCameraOn(false);
      }
    };
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraOn]);

  // ── Send Message ──
  const handleSendMessage = async (content: string, durationSeconds?: number) => {
    if (!sessionId) return;

    // Optimistically add candidate message
    const tempMsg: ChatMessage = { role: 'candidate', content };
    setMessages(prev => [...prev, tempMsg]);
    setIsProcessing(true);

    try {
      const res = await interviewApi.sendMessage(sessionId, content, durationSeconds);
      
      // Update with analyzed candidate message + new interviewer message
      setMessages(prev => [
        ...prev.slice(0, -1), // remove optimstic
        res.candidate_message,
        res.interviewer_message
      ]);
      setProgress(res.session_progress);

      if (res.session_progress.is_complete) {
        setTimeout(() => {
          navigate(`/results/${sessionId}`);
        }, 3000);
      }

    } catch (err: any) {
      console.error("Error sending message", err);
      toast({ title: "Error", description: "Failed to process your response. Please try again.", variant: "destructive" });
      // Remove optimistic message on fail
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndEarly = async () => {
    if (!sessionId) return;
    setIsProcessing(true);
    try {
      await interviewApi.endSession(sessionId);
      navigate(`/results/${sessionId}`);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not end session properly.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  // Get last analysis for the sidebar
  const lastAnalyzedMessage = [...messages].reverse().find(m => m.role === 'candidate' && m.analysis);

  const toggleCamera = () => {
    setVideoError(null);
    setCameraOn((on) => !on);
  };

  const progressPanel = (
    <ProgressSidebar progress={progress} lastAnalysis={lastAnalyzedMessage?.analysis || null} />
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Focus mode: no app rail. The brand is not a link, so a stray click
          cannot walk away from a live session. */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
          <Mic className="size-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">Live interview</h1>
          <p className="truncate text-xs text-muted-foreground">
            {progress ? `Question ${progress.questions_asked} of ${progress.questions_total}` : "Starting…"}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {progress && progress.average_score > 0 ? (
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex lg:hidden">
              Avg <ScoreBadge score={progress.average_score} size="sm" />
            </span>
          ) : null}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden" aria-label="Show progress">
                <BarChart3 className="size-4" aria-hidden="true" />
                <span className="ml-1.5 hidden sm:inline">Progress</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" aria-describedby={undefined} className="w-[min(22rem,90vw)] overflow-y-auto bg-background p-4 pt-12">
              <SheetTitle className="sr-only">Session progress</SheetTitle>
              {progressPanel}
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={handleEndEarly}
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="ml-1.5">End session</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <ChatBubble key={msg.message_id || i} message={msg} isLatest={i === messages.length - 1} />
                ))}
                {isProcessing && <TypingIndicator key="typing" />}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background/95 px-4 pb-4 pt-5 sm:px-6">
            <div className="mx-auto max-w-3xl">
              {progress?.is_complete ? (
                <div role="status" className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--card-shadow)]">
                  <p className="font-medium text-foreground">Interview complete</p>
                  <p className="mt-1 text-sm text-muted-foreground">Generating your feedback…</p>
                  <Loader2 className="mx-auto mt-3 size-6 animate-spin text-accent" aria-hidden="true" />
                </div>
              ) : (
                <ChatInput onSendMessage={handleSendMessage} disabled={isProcessing || !sessionId} />
              )}
            </div>
          </div>
        </main>

        <aside
          aria-label="Session details"
          className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-secondary/30 p-4 lg:flex"
        >
          <section aria-labelledby="camera-heading" className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between gap-2">
              <h3 id="camera-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Video className="size-4 text-accent" aria-hidden="true" />
                Camera
              </h3>
              <Button variant="ghost" size="sm" onClick={toggleCamera}>
                {cameraOn ? <VideoOff className="size-4" aria-hidden="true" /> : <Video className="size-4" aria-hidden="true" />}
                <span className="ml-1.5">{cameraOn ? "Hide camera" : "Show camera"}</span>
              </Button>
            </div>
            {cameraOn && !videoError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video w-full rounded-xl bg-foreground/90 object-cover"
                />
                <p className="text-xs text-muted-foreground">Only you can see this — nothing is recorded</p>
              </>
            ) : videoError ? (
              <p role="alert" className="text-xs text-destructive">
                {videoError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Off. Turn it on to practise eye contact.</p>
            )}
          </section>
          {progressPanel}
        </aside>
      </div>
    </div>
  );
}
