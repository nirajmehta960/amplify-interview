import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
// Removed InterviewContext import - using direct configuration flow
import { useVideoRecording } from "@/hooks/useVideoRecording";
import deepgramTranscriptionService from "@/services/deepgramTranscriptionService";
// Removed whisperService import - using unifiedTranscriptionService instead
import { unifiedTranscriptionService } from "@/services/unifiedTranscriptionService";
// import { aiFeedbackService } from "@/services/aiFeedbackService";
import { localVideoStorageService } from "@/services/localVideoStorageService";
import { videoSegmentService } from "@/services/videoSegmentService";
import { localInterviewStorageService } from "@/services/localInterviewStorageService";
import { interviewSessionService } from "@/services/interviewSessionService";
import { useAuth } from "@/contexts/AuthContext";
import {
  getQuestionsForInterview,
  Question,
} from "@/services/questionBankService";
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
  status:
    | "preparing"
    | "recording"
    | "processing"
    | "complete"
    | "ready"
    | "error";
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  isPaused: boolean;
  isRecording: boolean;
  isMuted: boolean;
  cameraOn: boolean;
}

const InterviewSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  // Removed InterviewContext integration - using direct configuration flow
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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
    onAudioChunk,
  } = useVideoRecording();

  // State for questions
  const [questions, setQuestions] = useState<Question[]>([]);

  const [interviewState, setInterviewState] = useState<InterviewState>({
    status: "preparing",
    currentQuestion: 1,
    totalQuestions: 0, // Will be updated when questions are loaded
    timeRemaining: 30 * 60, // Will be updated from config
    isPaused: false,
    isRecording: false,
    isMuted: false,
    cameraOn: true,
  });

  // Real-time transcription state
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  // Question-specific tracking state
  const [questionResponses, setQuestionResponses] = useState<any[]>([]);
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

  // Redirect to setup if no session is available
  useEffect(() => {
    if (!config || !interviewType) {
      console.warn("No interview config found, redirecting to setup");
      navigate("/interview/setup");
    }
  }, [config, interviewType, navigate]);

  // Load questions based on configuration
  useEffect(() => {
    const loadQuestions = async () => {
      if (config && interviewType) {
        try {
          const allQuestions = await getQuestionsForInterview(
            interviewType.id,
            config.useCustomQuestions,
            config.customQuestions,
            config.selectedField
          );

          // Limit questions to the configured count
          const limitedQuestions = allQuestions.slice(0, config.questionCount);
          setQuestions(limitedQuestions);

          console.log(
            `Loaded ${limitedQuestions.length} questions for ${interviewType.id}`
          );

          // Create database session after questions are loaded
          if (user && config && interviewType) {
            try {
              const { sessionId } =
                await interviewSessionService.createInterviewSession({
                  userId: user.id,
                  interviewType: interviewType.id as any,
                  config: {
                    duration: config.duration,
                    questionCount: config.questionCount,
                    useCustomQuestions: config.useCustomQuestions,
                    customQuestions: config.customQuestions,
                    selectedField: config.selectedField,
                  },
                });
              setCurrentSessionId(sessionId);
              console.log("Created database session:", sessionId);
            } catch (error) {
              console.error("Error creating database session:", error);
              // Generate a fallback session ID for local storage
              const fallbackSessionId = `session-${Date.now()}`;
              setCurrentSessionId(fallbackSessionId);
              console.log("Using fallback session ID:", fallbackSessionId);
              // Don't show error toast here as interview can continue without database session
            }
          }
        } catch (error) {
          console.error("Error loading questions:", error);
          setQuestions([]);
        }
      } else {
        setQuestions([]);
      }
    };

    loadQuestions();
  }, [config, interviewType, user, toast]);

  // Initialize interview state from config and questions
  useEffect(() => {
    if (config && questions.length > 0) {
      console.log("Initializing interview state from config:", config);
      setInterviewState((prev) => ({
        ...prev,
        totalQuestions: questions.length,
        timeRemaining: config.duration * 60, // Convert minutes to seconds
        status: "ready", // Change status to ready when questions are loaded
      }));
    }
  }, [config, questions.length]);

  // Watch for videoRef to become available and set mediaStream
  const [videoElementReady, setVideoElementReady] = useState(false);

  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      console.log("VideoRef became available, setting mediaStream");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
      setVideoElementReady(false); // Reset the flag
    }
  }, [videoElementReady]);

  // Retry setting video element when it becomes available
  useEffect(() => {
    if (videoElementReady && streamRef.current) {
      console.log("Retrying video element setup after it became available");
      const retrySetVideoElement = () => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          setVideoElementReady(false);
        } else {
          setTimeout(retrySetVideoElement, 100);
        }
      };
      setTimeout(retrySetVideoElement, 100);
    }
  }, [videoElementReady]);

  const currentQuestion = questions[interviewState.currentQuestion - 1];

  // Start tracking the first question only once when interview begins
  const firstQuestionStartedRef = useRef(false);
  useEffect(() => {
    if (
      interviewState.status === "recording" &&
      currentQuestion &&
      !firstQuestionStartedRef.current
    ) {
      firstQuestionStartedRef.current = true;
      videoSegmentService.startQuestionSegment(
        currentQuestion.id,
        currentQuestion.text
      );
      console.log(
        `Started tracking first question ${currentQuestion.id}: ${currentQuestion.text}`
      );
    }
  }, [interviewState.status, currentQuestion]);

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
              setVideoLoading(false);
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
                setVideoLoading(false);
              })
              .catch((error) => {
                console.error("Error playing video:", error);
                setVideoError("Failed to play video");
                setVideoLoading(false);
              });

            // Fallback: set videoLoading to false after 2 seconds
            setTimeout(() => {
              setVideoLoading(false);
            }, 2000);
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

        // Wait for next tick to ensure video element is rendered
        setTimeout(() => {
          setVideoElement();
        }, 100);

        toast({
          title: "Camera Ready",
          description: "Your camera and microphone are now active.",
        });

        // Start recording when camera is ready
        try {
          await startRecording();
          console.log("Recording started successfully");
          // Mark recording start for precise transcript mapping
          videoSegmentService.markRecordingStart();
          // Ensure prep gap is 10s
          videoSegmentService.setPrepGapSeconds(10);

          // Start background streaming session for low-latency transcription
          const session = deepgramTranscriptionService.createStreamingSession();
          const unsubscribe = onAudioChunk(async (chunk) => {
            try {
              await session.pushChunk(chunk);
            } catch (e) {
              console.warn("Streaming push failed, continuing", e);
            }
          });
          // Save finalize on window for later
          (window as any).__dgFinalize = async () => {
            try {
              return await session.finalize();
            } finally {
              unsubscribe();
            }
          };
        } catch (recordingError) {
          console.error("Failed to start recording:", recordingError);
          toast({
            title: "Recording Error",
            description:
              "Failed to start recording. Interview will continue without recording.",
            variant: "destructive",
          });
        }

        // Real-time transcription not implemented - using Deepgram for post-processing
        console.log(
          "Real-time transcription not available - will transcribe after recording"
        );
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

      // Calculate total duration
      const recordingStartTime = videoSegmentService.getRecordingStartTime();
      const recordingEndTime = Date.now();
      let totalDuration = 0;

      if (recordingStartTime) {
        totalDuration = (recordingEndTime - recordingStartTime) / 1000;
      } else {
        // Fallback: calculate from question segments if available
        const segments = videoSegmentService.getQuestionSegments();
        if (segments.length > 0) {
          const lastSegment = segments[segments.length - 1];
          totalDuration = (lastSegment.endTime - lastSegment.startTime) / 1000;
        }
      }

      // End tracking for current question
      if (currentQuestion) {
        videoSegmentService.endQuestionSegment(
          currentQuestion.id,
          currentQuestion.text
        );
        console.log(`Ended tracking for final question ${currentQuestion.id}`);
      }

      // Process video for transcription and AI analysis
      let transcriptionResult;
      let speechAnalysis;
      let aiFeedback;
      let questionResponses = [];

      try {
        // Prefer background streaming transcript if available
        let streamed: any = null;
        if ((window as any).__dgFinalize) {
          try {
            streamed = await (window as any).__dgFinalize();
            console.log("Using streamed transcription result");
          } catch (e) {
            console.warn("Stream finalize failed, fallback to upload", e);
          }
        }

        // Process video for transcription and AI analysis
        console.log("Starting question segment transcription...");
        if (streamed) {
          // If we already have the full transcript with words, inject to segmenter
          const original = unifiedTranscriptionService.transcribeVideoDirectly;
          // Monkey patch just for this call: return streamed result
          (unifiedTranscriptionService as any).transcribeVideoDirectly =
            async () => streamed;
          try {
            questionResponses =
              await videoSegmentService.transcribeQuestionSegments(videoBlob);
          } finally {
            (unifiedTranscriptionService as any).transcribeVideoDirectly =
              original;
          }
          transcriptionResult = streamed;
        } else {
          // Fallback: upload entire video and then segment
          questionResponses =
            await videoSegmentService.transcribeQuestionSegments(videoBlob);
          console.log("Question segments transcribed:", questionResponses);
          console.log("Starting main video transcription...");
          transcriptionResult =
            await unifiedTranscriptionService.transcribeVideoDirectly(
              videoBlob
            );
        }
        console.log(
          "Main transcription complete:",
          transcriptionResult.text.substring(0, 100) + "..."
        );

        speechAnalysis = unifiedTranscriptionService.analyzeSpeechPatterns(
          transcriptionResult.text
        );
        console.log("Speech analysis complete");

        console.log(`Generated ${questionResponses.length} question responses`);

        // Save each response to the database FIRST
        if (currentSessionId && questionResponses.length > 0) {
          for (const response of questionResponses) {
            try {
              await interviewSessionService.saveQuestionResponse(
                currentSessionId,
                {
                  questionId: Number(response.questionId), // Convert to number for database int8
                  questionText: response.questionText,
                  responseText: response.answerText,
                  duration: response.duration,
                }
              );
              console.log(
                `Saved response for question ${response.questionId} to database`
              );
            } catch (error) {
              console.error(
                `Error saving response for question ${response.questionId}:`,
                error
              );
            }
          }
        }

        // Use real AI analysis with OpenRouter AFTER responses are saved
        try {
          console.log("Starting real AI analysis with OpenRouter...");

          // Only run AI analysis if we have a valid database session ID
          if (currentSessionId && !currentSessionId.startsWith("session-")) {
            // Import the core analysis service
            const { analyzeInterviewSession } = await import(
              "../services/coreAnalysisService"
            );

            // Run complete AI analysis for the session
            const analysisResult = await analyzeInterviewSession(
              currentSessionId
            );

            console.log("Real AI analysis completed:", {
              overallScore: analysisResult.summary.average_score,
              readinessLevel: analysisResult.summary.readiness_level,
              totalCost: analysisResult.totalCostCents,
              analysesCount: analysisResult.analyses.length,
            });

            // Use the real analysis results
            aiFeedback = {
              overallScore: analysisResult.summary.average_score || 75,
              strengths: analysisResult.summary.overall_strengths || [
                "Good communication skills",
              ],
              improvements: analysisResult.summary.overall_improvements || [
                "Continue practicing",
              ],
              detailedFeedback: "Analysis completed successfully.",
            };

            console.log("AI feedback generation complete with real analysis");
          } else {
            console.log(
              "Skipping AI analysis - using fallback for local session"
            );
            throw new Error("No valid database session for AI analysis");
          }
        } catch (aiError) {
          console.warn("Real AI analysis failed, using fallback:", aiError);

          // Use the fallback analysis from aiAnalysisPrompts
          const { generateFallbackAnalysis } = await import(
            "../services/aiAnalysisPrompts"
          );

          const fallbackAnalysis = generateFallbackAnalysis(
            transcriptionResult.text,
            totalDuration,
            "custom"
          );

          aiFeedback = {
            overallScore: fallbackAnalysis.overall_score || 75,
            strengths: fallbackAnalysis.strengths || [
              "Good communication skills",
              "Clear articulation",
            ],
            improvements: fallbackAnalysis.improvements || [
              "Consider providing more specific examples",
              "Practice reducing filler words for better delivery",
              "Add more quantitative results to strengthen your responses",
            ],
            detailedFeedback:
              fallbackAnalysis.actionable_feedback ||
              "Automated analysis could not be completed due to technical issues. A human reviewer will assess your response shortly. In the meantime, consider practicing with more specific examples and reducing filler words for better delivery.",
          };

          console.log(
            "Fallback AI feedback generated successfully:",
            aiFeedback
          );
        }

        // Complete the interview session in the database
        if (currentSessionId) {
          try {
            await interviewSessionService.completeInterviewSession(
              currentSessionId,
              totalDuration
            );
            console.log(`Completed session ${currentSessionId} in database`);
          } catch (error) {
            console.error(
              `Error completing session ${currentSessionId}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error("Processing error:", error);
        throw error;
      }

      // Generate unique session ID for local storage (keep for video storage)
      const sessionId = currentSessionId || `session-${Date.now()}`;

      // Store video locally for playback
      if (videoBlob) {
        try {
          await localVideoStorageService.initialize();
          await localVideoStorageService.storeVideo(
            sessionId,
            videoBlob,
            undefined,
            {
              duration: totalDuration,
              size: videoBlob.size,
              format: videoBlob.type,
            }
          );

          // Update video metadata with transcription
          await localVideoStorageService.updateVideoMetadata(sessionId, {
            transcription: {
              text: transcriptionResult.text,
              confidence: transcriptionResult.confidence,
              duration: transcriptionResult.duration,
            },
          });

          // Update video metadata with AI feedback
          try {
            await localVideoStorageService.updateVideoMetadata(sessionId, {
              aiFeedback: {
                overallScore: aiFeedback.overallScore,
                strengths: aiFeedback.strengths,
                improvements: aiFeedback.improvements,
                detailedFeedback: aiFeedback.detailedFeedback,
              },
            });
            console.log("AI feedback metadata updated");
          } catch (updateError) {
            console.warn("Failed to update AI feedback metadata:", updateError);
          }
        } catch (storageError) {
          console.error("Error storing video locally:", storageError);
        }
      }

      setInterviewState((prev) => ({ ...prev, status: "complete" }));

      toast({
        title: "Interview Complete!",
        description: "Video saved locally. AI analysis completed successfully.",
      });

      // Create session data for navigation
      const sessionData = {
        sessionId: currentSessionId || sessionId, // Use database session ID if available
        videoUrl: null, // Video is stored locally, not as URL
        videoMetadata: {
          duration: totalDuration,
          size: videoBlob?.size,
          format: videoBlob?.type,
        },
        transcription: transcriptionResult.text,
        questionResponses, // Include individual question responses
        aiFeedback,
        speechAnalysis,
        config,
        type: interviewType,
        storageType:
          currentSessionId && !currentSessionId.startsWith("session-")
            ? "database"
            : "local", // Indicate storage type
      };

      // Store session reference in localStorage for quick access
      localStorage.setItem(
        "currentSession",
        JSON.stringify({
          sessionId: currentSessionId || sessionId,
          timestamp: Date.now(),
          storageType:
            currentSessionId && !currentSessionId.startsWith("session-")
              ? "database"
              : "local",
        })
      );

      // Navigate to results
      setTimeout(() => {
        navigate(`/results/${sessionData.sessionId}`, {
          state: sessionData,
        });
      }, 2000);
    } catch (error) {
      console.error("Interview processing error:", error);
      setInterviewState((prev) => ({ ...prev, status: "error" }));

      toast({
        title: "Processing Error",
        description:
          "There was an error processing your interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextQuestion = async () => {
    // End tracking for current question
    if (currentQuestion) {
      videoSegmentService.endQuestionSegment(
        currentQuestion.id,
        currentQuestion.text
      );
      console.log(`Ended tracking for question ${currentQuestion.id}`);
    }

    if (interviewState.currentQuestion < interviewState.totalQuestions) {
      const nextQuestionIndex = interviewState.currentQuestion; // This is the next question index (1-indexed)
      setInterviewState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
      }));
      setThinkingTime(10); // Reset thinking time

      // Add current question to history
      if (currentQuestion) {
        setQuestionHistory((prev) => [...prev, currentQuestion]);
      }

      // Start tracking the next question after the 10s thinking time
      setTimeout(() => {
        const nextQuestion = questions[nextQuestionIndex]; // Use nextQuestionIndex directly (already 0-indexed for next question)
        if (nextQuestion) {
          videoSegmentService.startQuestionSegment(
            nextQuestion.id,
            nextQuestion.text
          );
          console.log(
            `Started tracking question ${nextQuestion.id}: ${nextQuestion.text}`
          );
        }
      }, 10000); // 10 seconds to honor prep gap and avoid overlap
    } else {
      handleEndInterview();
    }
  };

  const handleToggleMute = () => {
    setInterviewState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleToggleCamera = () => {
    setInterviewState((prev) => {
      const newCameraOn = !prev.cameraOn;
      console.log("Toggling camera:", prev.cameraOn, "->", newCameraOn);
      return { ...prev, cameraOn: newCameraOn };
    });
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
        console.log("Ideal constraints successful");
      } catch (idealError) {
        console.log("Ideal constraints failed, trying basic constraints");
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log("Basic constraints successful");
      }

      streamRef.current = mediaStream;
      setVideoLoading(false);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.error);
      }
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

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup video segment service when component unmounts
      videoSegmentService.clearSegments();
    };
  }, []);

  const progress =
    (interviewState.currentQuestion / interviewState.totalQuestions) * 100;
  const totalTimeSeconds = config?.duration ? config.duration * 60 : 30 * 60;
  const timeProgress =
    ((totalTimeSeconds - interviewState.timeRemaining) / totalTimeSeconds) *
    100;

  if (interviewState.status === "preparing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Preparing Interview</h2>
            <p className="text-muted-foreground">
              Setting up your interview environment...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Top Bar */}
      <header className="glass fixed top-0 left-0 right-0 z-50 border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <svg
                    className="w-8 h-8 transform -rotate-90"
                    viewBox="0 0 48 48"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted-foreground/20"
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
                      className="text-primary transition-all duration-300 ease-in-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {formatTime(interviewState.timeRemaining)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(timeProgress)}% used
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Question {interviewState.currentQuestion} of{" "}
                  {interviewState.totalQuestions}
                </span>
                <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-in-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleMute}
                className="flex items-center gap-2"
              >
                {interviewState.isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {interviewState.isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCamera}
                className="flex items-center gap-2"
              >
                {interviewState.cameraOn ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                {interviewState.cameraOn ? "Turn Off Camera" : "Turn On Camera"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePause}
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="container mx-auto px-4 py-1">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-4">
              {/* Interview Area */}
              <div className="space-y-2">
                {/* Question Card */}
                <Card className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {currentQuestion?.category}
                      </Badge>
                      {thinkingTime > 0 && (
                        <>
                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                          <span className="text-xs text-primary font-medium">
                            Thinking time: {formatTime(thinkingTime)}
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold leading-tight">
                      {currentQuestion?.text || "Loading question..."}
                    </h2>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000 ease-linear"
                        style={{
                          width:
                            thinkingTime > 0
                              ? `${(thinkingTime / 10) * 100}%`
                              : "100%",
                        }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Video Card */}
                <Card className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Your Video</h3>
                      <div className="flex items-center gap-2">
                        {interviewState.isRecording && (
                          <div className="flex items-center gap-2 text-red-500">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium">
                              Recording
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative aspect-[16/10] bg-muted rounded-lg overflow-hidden">
                      {videoLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                      ) : videoError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                          <AlertTriangle className="w-12 h-12 text-destructive" />
                          <div className="text-center">
                            <p className="font-medium text-destructive">
                              Camera Error
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {videoError}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRetryCamera}
                          >
                            Retry Camera
                          </Button>
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          muted={true}
                          playsInline
                          autoPlay
                        />
                      )}
                    </div>
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-center pt-2">
                  {interviewState.currentQuestion <
                  interviewState.totalQuestions ? (
                    <Button
                      onClick={handleNextQuestion}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      Next Question
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndInterview}
                      size="lg"
                      className="flex items-center gap-2"
                      variant="destructive"
                    >
                      <Square className="w-4 h-4" />
                      End Interview
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interview Paused</DialogTitle>
            <DialogDescription>
              Your interview has been paused. You can resume when you're ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleResume}>
              Resume Interview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewSession;
