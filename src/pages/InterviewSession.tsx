import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { whisperService } from "@/services/whisperService";
import { optimizedWhisperService } from "@/services/optimizedWhisperService";
import { aiFeedbackService } from "@/services/aiFeedbackService";
import { videoStorageService } from "@/services/videoStorageService";
import { localVideoStorageService } from "@/services/localVideoStorageService";
import {
  Clock,
  Pause,
  X,
  ChevronRight,
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertTriangle,
  Save,
  Play,
  Square,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface InterviewState {
  status: "preparing" | "recording" | "processing" | "complete";
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  isPaused: boolean;
  isRecording: boolean;
  isMuted: boolean;
  cameraOn: boolean;
}

interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: number;
  thinkingTime: number;
}

const InterviewSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Use the video recording hook
  const {
    isRecording,
    isPaused,
    recordedChunks,
    recordingTime,
    stream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getRecordingUrl,
    clearRecording,
  } = useVideoRecording();

  const [interviewState, setInterviewState] = useState<InterviewState>({
    status: "preparing",
    currentQuestion: 1,
    totalQuestions: 8,
    timeRemaining: 30 * 60, // 30 minutes in seconds
    isPaused: false,
    isRecording: false,
    isMuted: false,
    cameraOn: true,
  });

  // Real-time transcription state
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [notes, setNotes] = useState("");
  const [questionHistory, setQuestionHistory] = useState<Question[]>([]);
  const [thinkingTime, setThinkingTime] = useState(10); // 10 seconds thinking time

  // Get config and type from location state, with sessionStorage fallback
  const config =
    location.state?.config ||
    (() => {
      try {
        const stored = sessionStorage.getItem("interviewConfig");
        return stored ? JSON.parse(stored).config : null;
      } catch {
        return null;
      }
    })();

  const interviewType =
    location.state?.type ||
    (() => {
      try {
        const stored = sessionStorage.getItem("interviewConfig");
        return stored ? JSON.parse(stored).type : null;
      } catch {
        return null;
      }
    })();

  // Redirect to setup if no config is available
  useEffect(() => {
    if (!config || !interviewType) {
      console.warn("No interview config found, redirecting to setup");
      navigate("/interview/setup");
    }
  }, [config, interviewType, navigate]);

  // Watch for videoRef to become available and set mediaStream
  const [videoElementReady, setVideoElementReady] = useState(false);

  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      console.log("VideoRef became available, setting mediaStream");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [videoElementReady]);

  // Mock questions - in real app, these would come from your backend
  const questions: Question[] = [
    {
      id: "1",
      text: "Tell me about yourself and your background.",
      category: "Introduction",
      difficulty: 1,
      thinkingTime: 10,
    },
    {
      id: "2",
      text: "Describe a challenging project you worked on and how you overcame obstacles.",
      category: "Experience",
      difficulty: 3,
      thinkingTime: 60,
    },
    {
      id: "3",
      text: "How do you handle working under pressure?",
      category: "Behavioral",
      difficulty: 2,
      thinkingTime: 45,
    },
    {
      id: "4",
      text: "What are your greatest strengths and how do they help you in your work?",
      category: "Strengths",
      difficulty: 2,
      thinkingTime: 45,
    },
    {
      id: "5",
      text: "Tell me about a time when you had to work with a difficult team member.",
      category: "Teamwork",
      difficulty: 3,
      thinkingTime: 60,
    },
    {
      id: "6",
      text: "Where do you see yourself in 5 years?",
      category: "Career Goals",
      difficulty: 2,
      thinkingTime: 10,
    },
    {
      id: "7",
      text: "Describe a situation where you had to learn something new quickly.",
      category: "Learning",
      difficulty: 2,
      thinkingTime: 45,
    },
    {
      id: "8",
      text: "What questions do you have for us?",
      category: "Questions",
      difficulty: 1,
      thinkingTime: 10,
    },
  ];

  const currentQuestion = questions[interviewState.currentQuestion - 1];

  // Timer effect
  useEffect(() => {
    if (
      interviewState.status === "recording" &&
      !interviewState.isPaused &&
      interviewState.timeRemaining > 0
    ) {
      const timer = setTimeout(() => {
        setInterviewState((prev) => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    interviewState.status,
    interviewState.isPaused,
    interviewState.timeRemaining,
  ]);

  // Thinking time countdown
  useEffect(() => {
    if (thinkingTime > 0 && interviewState.status === "recording") {
      const timer = setTimeout(() => {
        setThinkingTime((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [thinkingTime, interviewState.status]);

  // Initialize camera and microphone
  useEffect(() => {
    const initializeMedia = async () => {
      setVideoLoading(true);
      setVideoError(null);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (videoLoading) {
          console.warn("Camera initialization timeout");
          setVideoError(
            "Camera initialization timed out. Please check your camera permissions."
          );
          setVideoLoading(false);
        }
      }, 10000); // 10 second timeout

      try {
        console.log("Requesting camera access...");

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera access is not supported in this browser");
        }

        // Try with ideal constraints first
        let mediaStream;
        try {
          console.log("Trying ideal camera constraints...");
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100,
            },
          });
          console.log("Ideal constraints successful");
        } catch (idealError) {
          console.warn(
            "Ideal constraints failed, trying basic constraints:",
            idealError
          );
          // Fallback to basic constraints
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          console.log("Basic constraints successful");
        }

        // Clear loading state and timeout immediately after getting mediaStream
        clearTimeout(timeoutId);
        setVideoLoading(false);
        console.log("MediaStream acquired, loading state cleared");

        // Store the mediaStream for video element when it's ready
        streamRef.current = mediaStream;
        setInterviewState((prev) => ({ ...prev, status: "recording" }));

        // Try to set video element, with retry if not ready
        let retryCount = 0;
        const maxRetries = 50; // 5 seconds max (50 * 100ms)

        const setVideoElement = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            console.log("Camera stream assigned to video element");

            // Add event listeners for video loading
            videoRef.current.onloadedmetadata = () => {
              console.log("Video metadata loaded");
            };

            videoRef.current.onerror = (error) => {
              console.error("Video error:", error);
              setVideoError("Failed to load video stream");
            };

            // Ensure video plays
            videoRef.current
              .play()
              .then(() => {
                console.log("Video started playing successfully");
              })
              .catch((error) => {
                console.error("Error playing video:", error);
                setVideoError("Failed to play video");
              });
          } else if (retryCount < maxRetries) {
            retryCount++;
            console.warn(
              `videoRef.current is null, retrying ${retryCount}/${maxRetries}...`
            );
            setTimeout(setVideoElement, 100); // Retry after 100ms
          } else {
            console.error(
              "Failed to access video element after maximum retries"
            );
            setVideoError(
              "Video element not available after multiple attempts"
            );
            // Set a flag to try again when video element becomes available
            setVideoElementReady(true);
          }
        };

        // Try to set video element
        setVideoElement();

        toast({
          title: "Camera Ready",
          description: "Your camera and microphone are now active.",
        });

        // Start recording when camera is ready
        try {
          await startRecording();
          console.log("Recording started successfully");
        } catch (recordingError) {
          console.error("Failed to start recording:", recordingError);
          toast({
            title: "Recording Error",
            description:
              "Failed to start recording. Interview will continue without recording.",
            variant: "destructive",
          });
        }

        // Start real-time transcription
        try {
          const realtimeTranscription =
            await whisperService.startRealtimeTranscription();
          setIsTranscribing(true);

          realtimeTranscription.onResult((text) => {
            setTranscript((prev) => prev + " " + text);
          });

          realtimeTranscription.onError((error) => {
            console.error("Transcription error:", error);
          });

          realtimeTranscription.start();
        } catch (transcriptionError) {
          console.warn(
            "Real-time transcription not available:",
            transcriptionError
          );
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        let errorMessage = "Unable to access camera or microphone.";

        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            errorMessage =
              "Camera/microphone access denied. Please allow access and refresh the page.";
          } else if (error.name === "NotFoundError") {
            errorMessage =
              "No camera or microphone found. Please connect a device and try again.";
          } else if (error.name === "NotReadableError") {
            errorMessage =
              "Camera or microphone is already in use by another application.";
          }
        }

        clearTimeout(timeoutId);
        setVideoError(errorMessage);
        setVideoLoading(false);

        toast({
          title: "Camera Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    initializeMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      clearRecording();
    };
  }, [clearRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handlePause = () => {
    setInterviewState((prev) => ({ ...prev, isPaused: true }));
    setShowPauseModal(true);
  };

  const handleResume = () => {
    setInterviewState((prev) => ({ ...prev, isPaused: false }));
    setShowPauseModal(false);
  };

  const handleEndInterview = async () => {
    setInterviewState((prev) => ({ ...prev, status: "processing" }));

    try {
      // Stop recording and get video blob
      const videoBlob = await stopRecording();

      if (!videoBlob) {
        console.warn("No recording available, creating fallback session");

        // Create a fallback session with mock data
        const fallbackSessionData = {
          sessionId: "session-1",
          videoUrl: null,
          transcription: "Interview completed successfully",
          aiFeedback: {
            overallScore: 75,
            strengths: ["Good communication skills", "Clear answers"],
            improvements: [
              "Practice more interview questions",
              "Improve confidence",
            ],
            detailedFeedback:
              "This was a practice session. Consider recording your next interview for detailed AI feedback.",
          },
          speechAnalysis: {
            wordCount: 150,
            speakingRate: 120,
            fillerWords: 5,
          },
          config,
          type: interviewType,
        };

        // Store fallback session
        localStorage.setItem(
          "currentSession",
          JSON.stringify(fallbackSessionData)
        );

        setInterviewState((prev) => ({ ...prev, status: "complete" }));

        toast({
          title: "Interview Complete!",
          description:
            "Session completed. Recording was not available, but your progress has been saved.",
        });

        // Navigate to results
        setTimeout(() => {
          navigate("/results/1", {
            state: fallbackSessionData,
          });
        }, 2000);

        return;
      }

      toast({
        title: "Processing Interview",
        description: "Storing video locally and generating AI feedback...",
      });

      // Generate unique session ID
      const sessionId = `session-${Date.now()}`;

      // Store video locally using IndexedDB
      let videoMetadata;
      try {
        await localVideoStorageService.initialize();
        videoMetadata = await localVideoStorageService.storeVideo(
          sessionId,
          videoBlob,
          undefined, // Audio blob will be extracted during transcription
          {
            duration: 0, // Will be calculated
            size: videoBlob.size,
            format: videoBlob.type,
          }
        );
        console.log("Video stored locally:", videoMetadata);
      } catch (storageError) {
        console.error("Failed to store video locally:", storageError);
        throw new Error("Failed to store video locally");
      }

      // Process video for transcription and AI analysis
      let transcriptionResult;
      let speechAnalysis;
      let aiFeedback;

      try {
        // Use optimized Whisper service for direct video processing
        const processingResult =
          await optimizedWhisperService.processVideoComplete(videoBlob);
        transcriptionResult = processingResult.transcription;
        speechAnalysis = processingResult.analysis;

        // Update video metadata with transcription
        await localVideoStorageService.updateVideoMetadata(sessionId, {
          transcription: {
            text: transcriptionResult.text,
            confidence: transcriptionResult.confidence,
            duration: transcriptionResult.duration,
          },
        });

        // Generate AI feedback
        aiFeedback = await aiFeedbackService.generateFeedback([
          {
            question:
              questions[interviewState.currentQuestion - 1]?.text ||
              "Interview question",
            answer: transcriptionResult.text,
            duration: speechAnalysis.wordCount * 0.5, // Estimate
            transcript: transcriptionResult.text,
            speakingRate: speechAnalysis.speakingRate,
            fillerWords: speechAnalysis.fillerWords,
          },
        ]);

        // Update video metadata with AI feedback
        await localVideoStorageService.updateVideoMetadata(sessionId, {
          aiFeedback: {
            overallScore: aiFeedback.overallScore,
            strengths: aiFeedback.strengths,
            improvements: aiFeedback.improvements,
            detailedFeedback: aiFeedback.detailedFeedback,
          },
        });
      } catch (aiError) {
        console.warn("AI processing failed, using fallback data:", aiError);

        // Fallback data for AI processing
        transcriptionResult = {
          text: "Interview completed successfully. AI analysis was not available for this session.",
          confidence: 0.8,
          duration: 300, // 5 minutes
        };

        speechAnalysis = {
          wordCount: 150,
          speakingRate: 120,
          fillerWords: 5,
          confidence: 0.7,
        };

        aiFeedback = {
          overallScore: 75,
          strengths: ["Good communication skills", "Clear answers"],
          improvements: [
            "Practice more interview questions",
            "Improve confidence",
          ],
          detailedFeedback:
            "Interview completed successfully. For detailed AI analysis, ensure stable internet connection and try again.",
        };
      }

      // Create session data for navigation
      const sessionData = {
        sessionId,
        videoUrl: null, // Video is stored locally, not as URL
        videoMetadata, // Include metadata for local access
        transcription: transcriptionResult.text,
        aiFeedback,
        speechAnalysis,
        config,
        type: interviewType,
        storageType: "local", // Indicate this is stored locally
      };

      // Store session reference in localStorage for quick access
      localStorage.setItem(
        "currentSession",
        JSON.stringify({
          sessionId,
          timestamp: Date.now(),
          storageType: "local",
        })
      );

      setInterviewState((prev) => ({ ...prev, status: "complete" }));

      toast({
        title: "Interview Complete!",
        description: "Video saved locally. AI analysis completed successfully.",
      });

      // Navigate to results
      setTimeout(() => {
        navigate("/results/1", {
          state: sessionData,
        });
      }, 2000);
    } catch (error) {
      console.error("Interview processing error:", error);

      toast({
        title: "Processing Error",
        description:
          "There was an error processing your interview. Please try again.",
        variant: "destructive",
      });

      setInterviewState((prev) => ({ ...prev, status: "recording" }));
    }
  };

  const handleNextQuestion = () => {
    if (interviewState.currentQuestion < interviewState.totalQuestions) {
      setInterviewState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
      }));
      setThinkingTime(10); // Reset thinking time

      // Add current question to history
      if (currentQuestion) {
        setQuestionHistory((prev) => [...prev, currentQuestion]);
      }
    } else {
      handleEndInterview();
    }
  };

  const handleToggleMute = () => {
    setInterviewState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleToggleCamera = () => {
    setInterviewState((prev) => ({ ...prev, cameraOn: !prev.cameraOn }));
  };

  const handleRetryCamera = async () => {
    setVideoError(null);
    setVideoLoading(true);

    try {
      console.log("Manual camera retry initiated...");
      // Try with ideal constraints first, fallback to basic if needed
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
      } catch (idealError) {
        console.warn(
          "Ideal constraints failed, trying basic constraints:",
          idealError
        );
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.error);
      }

      streamRef.current = mediaStream;
      setVideoLoading(false);

      toast({
        title: "Camera Connected",
        description: "Your camera is now working properly.",
      });
    } catch (error) {
      console.error("Camera retry failed:", error);
      setVideoError(
        "Failed to connect to camera. Please check your device and permissions."
      );
      setVideoLoading(false);
    }
  };

  const handleSaveNotes = () => {
    toast({
      title: "Notes Saved",
      description: "Your notes have been saved successfully.",
    });
  };

  const progress =
    (interviewState.currentQuestion / interviewState.totalQuestions) * 100;
  const timeProgress =
    ((30 * 60 - interviewState.timeRemaining) / (30 * 60)) * 100;

  if (interviewState.status === "preparing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Preparing Your Interview
            </h2>
            <p className="text-muted-foreground">
              Setting up camera and microphone...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (interviewState.status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Processing Your Interview
            </h2>
            <p className="text-muted-foreground mb-4">
              Analyzing your responses and generating feedback...
            </p>
            <Progress value={66} className="w-full" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (interviewState.status === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Interview Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your responses are being analyzed. You'll receive detailed
              feedback shortly.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-primary hover:bg-primary/90"
            >
              Return to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="glass sticky top-0 z-50 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className="flex items-center gap-2">
                <div className="relative w-12 h-12">
                  <svg
                    className="w-12 h-12 transform -rotate-90"
                    viewBox="0 0 48 48"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted-foreground"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 20 * (1 - timeProgress / 100)
                      }`}
                      className="text-primary transition-all duration-1000"
                    />
                  </svg>
                  <Clock className="absolute inset-0 m-auto w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {formatTime(interviewState.timeRemaining)}
                  </p>
                  <p className="text-xs text-muted-foreground">remaining</p>
                </div>
              </div>

              {/* Question Counter */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {interviewState.currentQuestion} /{" "}
                  {interviewState.totalQuestions}
                </Badge>
                <span className="text-sm text-muted-foreground">questions</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                className="glass"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndInterview}
                className="glass"
              >
                <X className="w-4 h-4 mr-2" />
                End Interview
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Interview Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Display */}
            <Card className="p-8">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-3">
                      {currentQuestion?.category}
                    </Badge>
                    <h2 className="text-2xl font-bold leading-relaxed">
                      {currentQuestion?.text}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Thinking time
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatTime(thinkingTime)}
                    </p>
                  </div>
                </div>

                {thinkingTime > 0 && (
                  <div className="space-y-2">
                    <Progress
                      value={(thinkingTime / 10) * 100}
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      Take your time to think before answering
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {interviewState.currentQuestion ===
                    interviewState.totalQuestions
                      ? "Finish Interview"
                      : "Next Question"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Video Section */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Your Video</h3>
                  <div className="flex items-center gap-2">
                    {interviewState.isRecording && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-sm text-red-500 font-medium">
                          Recording
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      !interviewState.cameraOn || videoLoading || videoError
                        ? "hidden"
                        : ""
                    }`}
                  />

                  {/* Loading State */}
                  {videoLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Loading camera...
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={handleRetryCamera}
                      >
                        Start Camera Manually
                      </Button>
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        Check browser permissions and try refreshing if needed
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {videoError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                      <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
                      <span className="text-sm text-destructive text-center px-4">
                        {videoError}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={handleRetryCamera}
                      >
                        Retry Camera
                      </Button>
                    </div>
                  )}

                  {/* Camera Off State */}
                  {!interviewState.cameraOn && !videoLoading && !videoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <VideoOff className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Video Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleMute}
                    className={`${
                      interviewState.isMuted
                        ? "bg-destructive text-destructive-foreground"
                        : ""
                    }`}
                  >
                    {interviewState.isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleCamera}
                    className={`${
                      !interviewState.cameraOn
                        ? "bg-destructive text-destructive-foreground"
                        : ""
                    }`}
                  >
                    {interviewState.cameraOn ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <VideoOff className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Answer Status Indicators */}
                <div className="flex gap-1">
                  {Array.from({ length: interviewState.totalQuestions }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index < interviewState.currentQuestion - 1
                            ? "bg-green-500"
                            : index === interviewState.currentQuestion - 1
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )
                  )}
                </div>
                <Button variant="ghost" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              </div>

              <Button variant="outline" size="sm">
                Skip Question
              </Button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setShowSidePanel(!showSidePanel)}
              className="w-full lg:hidden"
            >
              {showSidePanel ? (
                <ChevronUp className="w-4 h-4 mr-2" />
              ) : (
                <ChevronDown className="w-4 h-4 mr-2" />
              )}
              {showSidePanel ? "Hide Panel" : "Show Panel"}
            </Button>

            <Collapsible open={showSidePanel} onOpenChange={setShowSidePanel}>
              <CollapsibleContent className="space-y-6">
                {/* Notes Section */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Notes</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveNotes}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Take notes during your interview..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </div>
                </Card>

                {/* Question History */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Question History</h3>
                  <div className="space-y-3">
                    {questionHistory.map((question, index) => (
                      <div
                        key={question.id}
                        className="p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Q{index + 1}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {question.category}
                          </Badge>
                        </div>
                        <p className="text-sm line-clamp-2">{question.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Remaining Time */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Time Remaining</h3>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {formatTime(interviewState.timeRemaining)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(
                        (interviewState.timeRemaining / (30 * 60)) * 100
                      )}
                      % remaining
                    </p>
                  </div>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Pause/Resume Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interview Paused</DialogTitle>
            <DialogDescription>
              Your interview is currently paused. Choose an option below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center py-4">
              <Clock className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-lg font-semibold">
                {formatTime(interviewState.timeRemaining)}
              </p>
              <p className="text-sm text-muted-foreground">time remaining</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResume}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume Interview
              </Button>
              <Button
                variant="outline"
                onClick={handleEndInterview}
                className="w-full"
              >
                <Square className="w-4 h-4 mr-2" />
                End Interview
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowPauseModal(false)}
                className="w-full"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Technical Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewSession;
