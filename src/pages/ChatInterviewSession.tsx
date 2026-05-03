import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Video, VideoOff, Settings, AlertTriangle, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useVideoRecording } from "@/hooks/useVideoRecording";
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
  const [cameraOn, setCameraOn] = useState(true);
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-background to-background pointer-events-none" />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-16 px-6 glass-card rounded-none border-t-0 border-x-0 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Live Interview Session</h1>
              <p className="text-xs text-muted-foreground">Amplify AI Interviewer</p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-rose-400" onClick={handleEndEarly}>
            <LogOut className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <ChatBubble 
                  key={msg.message_id || i} 
                  message={msg} 
                  isLatest={i === messages.length - 1} 
                />
              ))}
              
              {isProcessing && (
                <TypingIndicator key="typing" />
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            {progress?.is_complete ? (
              <div className="glass-card p-4 text-center">
                <p className="text-primary font-medium">Session Complete</p>
                <p className="text-sm text-muted-foreground mt-1">Generating your comprehensive feedback...</p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto mt-3 text-primary" />
              </div>
            ) : (
              <ChatInput 
                onSendMessage={handleSendMessage}
                disabled={isProcessing || !sessionId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-md flex flex-col shrink-0 z-10 p-4 gap-4 overflow-y-auto">
        {/* Camera Preview */}
        <div className="glass-card overflow-hidden relative aspect-video rounded-lg border-primary/20 group">
          {cameraOn && !videoError ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-[1.02] transform transition-transform"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-muted-foreground gap-2">
              {videoError ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <VideoOff className="w-5 h-5" />}
              <span className="text-xs">{videoError || "Camera Off"}</span>
            </div>
          )}
          
          {/* Camera controls overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="icon" 
              variant="secondary" 
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
              onClick={() => setCameraOn(!cameraOn)}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex-1">
          <ProgressSidebar 
            progress={progress} 
            lastAnalysis={lastAnalyzedMessage?.analysis || null} 
          />
        </div>
      </aside>
    </div>
  );
}
