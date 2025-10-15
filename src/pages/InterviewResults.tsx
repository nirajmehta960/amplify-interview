import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { localVideoStorageService } from "@/services/localVideoStorageService";
import { localInterviewStorageService } from "@/services/localInterviewStorageService";
import { interviewSessionService } from "@/services/interviewSessionService";
import { videoConversionService } from "@/services/videoConversionService";
import {
  getFormatDisplayName,
  getFileExtension,
  isMP4Format,
  getActualVideoFormat,
} from "@/utils/videoFormatSupport";
import {
  CheckCircle,
  AlertCircle,
  Play,
  Edit,
  Download,
  Calendar,
  Lightbulb,
  Share2,
  Clock,
  Target,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Eye,
  Mic,
  Timer,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface VideoMetadataInfo {
  duration: number;
  format: string;
  size: number;
  hasAudio: boolean;
}

interface InterviewResult {
  id: string;
  overallScore: number;
  performanceBadge: string;
  duration: number;
  completionTime: string;
  responses: QuestionResponse[];
  strengths: string[];
  improvements: string[];
  insights: string[];
  recommendations: string[];
  readinessLevel?: string;
  nextSteps?: string[];
  estimatedPracticeTime?: string;
  videoMetadata?: VideoMetadataInfo;
}

interface QuestionResponse {
  id: string;
  question: string;
  answer: string;
  score: number;
  duration: number;
  fillerWords: number;
  confidence: number;
  speakingPace: number;
  eyeContact?: number;
  audioUrl?: string;
  strengths?: string[];
  improvements?: string[];
  responseId?: string;
  communication_scores?: {
    clarity: number;
    structure: number;
    conciseness: number;
  };
  content_scores?: {
    relevance: number;
    depth: number;
    specificity: number;
  };
}

const InterviewResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: sessionIdFromParams } = useParams<{ sessionId: string }>();
  const { toast } = useToast();

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);

  // Debug: Track isConverting state changes (disabled)
  // useEffect(() => {
  // }, [isConverting]);
  const [seekableVideoUrl, setSeekableVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);

  // Reset conversion state when component loads
  useEffect(() => {
    setIsConverting(false);
  }, []);

  // Load real interview data from local storage
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const loadInterviewData = async () => {
      // Add timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.error("Loading timeout - forcing error state");
        setError("Loading timeout. Please try refreshing the page.");
        setIsLoading(false);
      }, 30000); // 30 second timeout

      try {
        let sessionData = location.state as any;
        const sessionIdFromUrl = new URLSearchParams(
          window.location.search
        ).get("sessionId");

        // Get sessionId from URL params (for "View Details" navigation) or other sources
        const sessionId =
          sessionIdFromParams || sessionIdFromUrl || sessionData?.sessionId;

        if (!sessionData || !sessionData.sessionId) {
          console.error("No session data found in location.state");

          // If we have a sessionId from URL params, try to fetch from database first
          if (sessionIdFromParams) {
              "Attempting to fetch session data from database for:",
              sessionIdFromParams
            );
            try {
              const dbSessionData =
                await interviewSessionService.fetchInterviewSession(
                  sessionIdFromParams
                );
              if (dbSessionData) {
                // Create session data structure from database response
                sessionData = {
                  sessionId: sessionIdFromParams,
                  storageType: "database",
                  questionResponses: dbSessionData.responses.map(
                    (response: any) => {
                      const question = dbSessionData.questions.find(
                        (q: any) => q.question_id === response.question_id
                      );
                      return {
                        responseId: String(
                          response.id || response.interview_response_id || ""
                        ),
                        questionId: response.question_id.toString(),
                        questionText: question
                          ? question.question_text
                          : `Question ${response.question_id}`,
                        answerText: response.response_text,
                        duration: response.duration,
                        analysis: {
                          confidence: 0.8,
                          speakingRate: 150,
                          fillerWords: 0,
                        },
                      };
                    }
                  ),
                };
                  "Successfully loaded session data from database:",
                  sessionData
                );

                // Try to fetch AI analysis data for database session
                try {
                  const { aiAnalysisService } = await import(
                    "../services/aiAnalysisService"
                  );
                  const analyses = await aiAnalysisService.getSessionAnalyses(
                    sessionIdFromParams
                  );
                  const summary = await aiAnalysisService.getSummaryBySession(
                    sessionIdFromParams
                  );

                  if (analyses.length > 0 || summary) {
                      "Found AI analysis data for database session:",
                      {
                        analyses: analyses.length,
                        summary: !!summary,
                      }
                    );
                    // Store analysis data for later use
                    (sessionData as any)._analyses = analyses;
                    (sessionData as any)._summary = summary;

                    // Update individual question responses with analysis scores
                    if (analyses.length > 0) {
                        analyses.length
                      );

                      // Prefer mapping by interview_response_id, then fallback to question_id
                      const byResponseId = new Map<string, any>();
                      const byQuestionId = new Map<number, any>();

                      analyses.forEach((a: any) => {
                          interview_response_id: a?.interview_response_id,
                          question_id: a?.question_id,
                          strengths: a?.strengths,
                          improvements: a?.improvements,
                        });
                        if (a?.interview_response_id) {
                          byResponseId.set(String(a.interview_response_id), a);
                        }
                        if (typeof a?.question_id === "number") {
                          byQuestionId.set(a.question_id, a);
                        }
                      });

                        byResponseIdSize: byResponseId.size,
                        byQuestionIdSize: byQuestionId.size,
                        responseIdKeys: Array.from(byResponseId.keys()),
                        questionIdKeys: Array.from(byQuestionId.keys()),
                      });

                      sessionData.questionResponses =
                        sessionData.questionResponses.map(
                          (response: any, idx: number) => {
                            const rid = String(
                              (response as any).responseId ||
                                (response as any).id ||
                                ""
                            );
                            const qid =
                              Number(response.questionId) ||
                              response.question_id;

                            // Try to match by response ID first, then by question ID
                            let analysis = null;
                            if (rid && byResponseId.has(rid)) {
                              analysis = byResponseId.get(rid);
                                `Found analysis by response ID: ${rid}`
                              );
                            } else if (byQuestionId.has(qid)) {
                              analysis = byQuestionId.get(qid);
                                `Found analysis by question ID: ${qid}`
                              );
                            } else {
                              // Fallback: try to match by index if we have the same number of analyses and responses
                              if (idx < analyses.length) {
                                analysis = analyses[idx];
                                  `Fallback: using analysis by index ${idx}`
                                );
                              } else {
                                  `No analysis found for response ID: ${rid}, question ID: ${qid}`
                                );
                              }
                            }

                              responseId: rid,
                              questionId: qid,
                              foundAnalysis: !!analysis,
                              analysisStrengths: analysis?.strengths,
                              analysisImprovements: analysis?.improvements,
                            });

                            if (analysis) {
                              return {
                                ...response,
                                responseId:
                                  rid ||
                                  (analysis.interview_response_id &&
                                    String(analysis.interview_response_id)),
                                score: analysis.overall_score,
                                strengths: analysis.strengths || [],
                                improvements: analysis.improvements || [],
                                communication_scores:
                                  analysis.communication_scores || null,
                                content_scores: analysis.content_scores || null,
                                analysis: {
                                  confidence: analysis.confidence_score || 0.8,
                                  speakingRate: 150,
                                  fillerWords:
                                    analysis.filler_words?.total || 0,
                                },
                              };
                            }
                            return response;
                          }
                        );

                        sessionData.questionResponses.map((r: any) => ({
                          questionId: r.questionId,
                          responseId: r.responseId,
                          strengths: r.strengths,
                          improvements: r.improvements,
                        }))
                      );
                    }
                  }
                } catch (analysisError) {
                  console.warn(
                    "Could not fetch AI analysis data:",
                    analysisError
                  );
                  // Continue without analysis data
                }
              } else {
                console.error(
                  "No database session found for:",
                  sessionIdFromParams
                );
                setError("Session not found in database.");
                setIsLoading(false);
                return;
              }
            } catch (dbError) {
              console.error("Error fetching from database:", dbError);
              setError("Failed to load session data from database.");
              setIsLoading(false);
              return;
            }
          } else {
            // Try to get session data from local storage as fallback
            const fallbackSessionId =
              sessionId || localInterviewStorageService.getCurrentSessionId();
            if (fallbackSessionId) {
              try {
                const localSession =
                  localInterviewStorageService.getSession(fallbackSessionId);
                if (localSession) {
                  sessionData =
                    localInterviewStorageService.createSessionData(
                      fallbackSessionId
                    );
                    "Using session data from local storage:",
                    sessionData
                  );
                } else {
                  setError(
                    "Session not found. Please complete an interview first."
                  );
                  setIsLoading(false);
                  return;
                }
              } catch (parseError) {
                console.error(
                  "Failed to get session data from local storage:",
                  parseError
                );
                setError(
                  "No interview data available. Please complete an interview first."
                );
                setIsLoading(false);
                return;
              }
            } else {
              setError(
                "No interview data available. Please complete an interview first."
              );
              setIsLoading(false);
              return;
            }
          }
        }

        // Use the sessionId we determined earlier
        const finalSessionId = sessionId || sessionData.sessionId;


        // If session is stored in database, fetch additional data (only if not already fetched above)
        if (sessionData.storageType === "database" && !sessionIdFromParams) {
          try {
            const dbSessionData =
              await interviewSessionService.fetchInterviewSession(
                finalSessionId
              );
            if (dbSessionData) {
              // Merge database session data with existing session data
              sessionData.questionResponses = dbSessionData.responses.map(
                (response) => {
                  // Find the corresponding question text from the fetched questions
                  const question = dbSessionData.questions.find(
                    (q) => q.question_id === response.question_id
                  );
                  const questionText = question
                    ? question.question_text
                    : `Question ${response.question_id}`;

                  const responseId = String(
                    (response as any).id ||
                      (response as any).interview_response_id ||
                      ""
                  );

                    question_id: response.question_id,
                    response_id: responseId,
                    response_object: response,
                  });

                  return {
                    // Ensure we keep the DB response id for accurate analysis mapping
                    responseId: responseId,
                    questionId: response.question_id.toString(), // Keep as string for display
                    questionText: questionText, // Use actual question text from database
                    answerText: response.response_text,
                    duration: response.duration,
                    analysis: {
                      confidence: 0.8,
                      speakingRate: 150,
                      fillerWords: 0,
                    },
                  };
                }
              );
                "Enhanced session data with database responses:",
                sessionData.questionResponses
              );

              // Try to fetch AI analysis data if available (or use pre-fetched data)
              try {
                let analyses, summary;

                // Use pre-fetched data if available, otherwise fetch
                if (
                  (sessionData as any)._analyses &&
                  (sessionData as any)._summary
                ) {
                  analyses = (sessionData as any)._analyses;
                  summary = (sessionData as any)._summary;
                } else {
                  const { aiAnalysisService } = await import(
                    "../services/aiAnalysisService"
                  );
                  analyses = await aiAnalysisService.getSessionAnalyses(
                    finalSessionId
                  );
                  summary = await aiAnalysisService.getSummaryBySession(
                    finalSessionId
                  );
                }

                if (analyses.length > 0 || summary) {
                    analyses: analyses.length,
                    summary: !!summary,
                    firstAnalysis: analyses[0]
                      ? {
                          id: analyses[0].id,
                          interview_response_id:
                            analyses[0].interview_response_id,
                          question_id: analyses[0].question_id,
                          strengths: analyses[0].strengths,
                          improvements: analyses[0].improvements,
                        }
                      : null,
                  });

                  // Update session data with real AI analysis
                  if (summary) {
                    sessionData.aiFeedback = {
                      overallScore:
                        summary.average_score ||
                        sessionData.aiFeedback?.overallScore ||
                        75,
                      strengths: summary.overall_strengths ||
                        sessionData.aiFeedback?.strengths || [
                          "Good communication",
                        ],
                      improvements: summary.overall_improvements ||
                        sessionData.aiFeedback?.improvements || [
                          "Continue practicing",
                        ],
                      detailedFeedback:
                        summary.role_specific_feedback ||
                        sessionData.aiFeedback?.detailedFeedback ||
                        "Analysis completed",
                    };

                    // Attach summary extras for UI
                    (sessionData as any)._summaryExtras = {
                      readinessLevel: summary.readiness_level,
                      nextSteps: summary.next_steps || [],
                      estimatedPracticeTime:
                        summary.estimated_practice_time || "",
                    };
                  }

                  // Update individual question responses with analysis scores
                  if (analyses.length > 0) {
                    // Prefer mapping by interview_response_id, then fallback to question_id
                    const byResponseId = new Map<string, any>();
                    const byQuestionId = new Map<number, any>();
                    analyses.forEach((a: any) => {
                        interview_response_id: a?.interview_response_id,
                        question_id: a?.question_id,
                        strengths: a?.strengths,
                        improvements: a?.improvements,
                      });
                      if (a?.interview_response_id) {
                        byResponseId.set(String(a.interview_response_id), a);
                      }
                      if (typeof a?.question_id === "number") {
                        byQuestionId.set(a.question_id, a);
                      }
                    });

                      byResponseIdSize: byResponseId.size,
                      byQuestionIdSize: byQuestionId.size,
                      responseIdKeys: Array.from(byResponseId.keys()),
                      questionIdKeys: Array.from(byQuestionId.keys()),
                    });

                    sessionData.questionResponses =
                      sessionData.questionResponses.map(
                        (response: any, idx: number) => {
                          const rid = String(
                            (response as any).responseId ||
                              (response as any).id ||
                              ""
                          );
                          const qid =
                            Number(response.questionId) || response.question_id;
                          // Try to match by response ID first, then by question ID
                          let analysis = null;
                          if (rid && byResponseId.has(rid)) {
                            analysis = byResponseId.get(rid);
                              `Found analysis by response ID: ${rid}`
                            );
                          } else if (byQuestionId.has(qid)) {
                            analysis = byQuestionId.get(qid);
                              `Found analysis by question ID: ${qid}`
                            );
                          } else {
                            // Fallback: try to match by index if we have the same number of analyses and responses
                            if (idx < analyses.length) {
                              analysis = analyses[idx];
                                `Fallback: using analysis by index ${idx}`
                              );
                            } else {
                                `No analysis found for response ID: ${rid}, question ID: ${qid}`
                              );
                            }
                          }

                            responseId: rid,
                            questionId: qid,
                            foundAnalysis: !!analysis,
                            analysisStrengths: analysis?.strengths,
                            analysisImprovements: analysis?.improvements,
                          });

                          if (analysis) {
                            return {
                              ...response,
                              responseId:
                                rid ||
                                (analysis.interview_response_id &&
                                  String(analysis.interview_response_id)),
                              score: analysis.overall_score,
                              strengths: analysis.strengths || [],
                              improvements: analysis.improvements || [],
                              communication_scores:
                                analysis.communication_scores || null,
                              content_scores: analysis.content_scores || null,
                              analysis: {
                                confidence: analysis.confidence_score || 0.8,
                                speakingRate: 150,
                                fillerWords: analysis.filler_words?.total || 0,
                              },
                            };
                          }
                          return response;
                        }
                      );

                      sessionData.questionResponses.map((r: any) => ({
                        questionId: r.questionId,
                        responseId: r.responseId,
                        strengths: r.strengths,
                        improvements: r.improvements,
                      }))
                    );
                  }
                }
              } catch (analysisError) {
                console.warn(
                  "Could not fetch AI analysis data:",
                  analysisError
                );
              }
            }
          } catch (error) {
            console.error("Error fetching database session data:", error);
            // Continue with existing session data if database fetch fails
          }
        }

        // Initialize local storage service
        await localVideoStorageService.initialize();

        // Get video data from local storage
        const videoData = await localVideoStorageService.getVideo(
          finalSessionId
        );

        if (!videoData) {
          console.error("No video data found for session:", finalSessionId);
          // If no video data but we have sessionId from params, continue without video
          if (sessionIdFromParams) {
          } else {
            setIsLoading(false);
            return;
          }
        }


        let videoBlob: Blob | null = null;
        let actualFormat = "video/webm";
        let isMP4 = false;

        if (videoData) {
          // Create video URL for playback
          videoBlob = new Blob([videoData.videoBlob], {
            type: videoData.metadata.format,
          });
          const videoObjectUrl = URL.createObjectURL(videoBlob);
          setVideoUrl(videoObjectUrl);

          // Set the video URL for immediate playback
          setSeekableVideoUrl(videoObjectUrl);

          // Check if video is already in MP4 format - no conversion needed!
          actualFormat = getActualVideoFormat(
            videoData.metadata.format,
            videoBlob.type
          );
          isMP4 = isMP4Format(actualFormat);
        }

        // Debug: Video format detection (disabled)
        //   metadataFormat: videoData.metadata.format,
        //   blobType: videoBlob.type,
        //   actualFormat: actualFormat,
        //   isMP4: isMP4,
        //   videoData: videoData,
        // });

        if (isMP4) {
          // Video is already MP4, so we can use it directly
        } else {
          // Only attempt conversion for non-MP4 formats
            "Video is in",
            videoData.metadata.format,
            "format - conversion may be needed for optimal playback"
          );
          // Note: We'll keep the original video for now and let users choose
        }

        // Create result from real data
        const realResult: InterviewResult = {
          id: finalSessionId,
          overallScore:
            sessionData.aiFeedback?.overallScore ||
            videoData?.metadata.aiFeedback?.overallScore ||
            75,
          performanceBadge:
            sessionData.aiFeedback?.overallScore ||
            videoData?.metadata.aiFeedback?.overallScore
              ? (sessionData.aiFeedback?.overallScore ||
                  videoData?.metadata.aiFeedback?.overallScore) >= 80
                ? "Excellent"
                : (sessionData.aiFeedback?.overallScore ||
                    videoData?.metadata.aiFeedback?.overallScore) >= 70
                ? "Good"
                : (sessionData.aiFeedback?.overallScore ||
                    videoData?.metadata.aiFeedback?.overallScore) >= 60
                ? "Fair"
                : "Needs Improvement"
              : "Good",
          duration:
            sessionData.videoMetadata?.duration ||
            videoData?.metadata.duration ||
            0,
          completionTime: videoData?.metadata.timestamp
            ? new Date(videoData.metadata.timestamp).toISOString()
            : new Date().toISOString(),
          responses:
            sessionData.questionResponses &&
            sessionData.questionResponses.length > 0
              ? sessionData.questionResponses.map(
                  (response: any, index: number) => ({
                    id: response.questionId || (index + 1).toString(),
                    question: response.questionText || `Question ${index + 1}`,
                    answer: response.answerText || "No transcription available",
                    score:
                      typeof response.score === "number"
                        ? Math.round(response.score)
                        : Math.round(
                            (response.analysis?.confidence || 0.75) * 100
                          ),
                    duration: Math.round(response.duration || 60),
                    fillerWords: response.analysis?.fillerWords || 0,
                    confidence:
                      response.transcription?.confidence ||
                      response.analysis?.confidence ||
                      0.8,
                    speakingPace: response.analysis?.speakingRate || 150,
                    eyeContact: 85,
                    strengths: Array.isArray(response.strengths)
                      ? response.strengths
                      : [],
                    improvements: Array.isArray(response.improvements)
                      ? response.improvements
                      : [],
                    communication_scores: response.communication_scores || null,
                    content_scores: response.content_scores || null,
                  })
                )
              : [
                  {
                    id: "1",
                    question: "Tell me about yourself and your background.",
                    answer:
                      videoData?.metadata.transcription?.text ||
                      "No transcription available",
                    score:
                      sessionData.aiFeedback?.overallScore ||
                      videoData?.metadata.aiFeedback?.overallScore ||
                      75,
                    duration: Math.round(
                      videoData?.metadata.transcription?.duration || 60
                    ),
                    fillerWords: 0,
                    confidence:
                      videoData?.metadata.transcription?.confidence || 0.8,
                    speakingPace: 150,
                    eyeContact: 85,
                  },
                ],
          strengths: sessionData.aiFeedback?.strengths ||
            videoData?.metadata.aiFeedback?.strengths || [
              "Clear communication",
            ],
          improvements: sessionData.aiFeedback?.improvements ||
            videoData?.metadata.aiFeedback?.improvements || ["Practice more"],
          insights: [
            sessionData.aiFeedback?.detailedFeedback ||
              "Interview completed successfully",
          ],
          recommendations: ["Continue practicing interview skills"],
          readinessLevel: (sessionData as any)._summaryExtras?.readinessLevel,
          nextSteps: (sessionData as any)._summaryExtras?.nextSteps,
          estimatedPracticeTime: (sessionData as any)._summaryExtras
            ?.estimatedPracticeTime,
          videoMetadata: videoData
            ? {
                duration: videoData.metadata.duration || 0,
                format: actualFormat, // Use the actual detected format
                size: videoBlob?.size || 0,
                hasAudio: Boolean(videoData.audioBlob),
              }
            : undefined,
        };

        setResult(realResult);
        setIsLoading(false);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error("Error loading interview data:", error);
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    };

    loadInterviewData();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [location.state]);

  // Animate score count-up
  useEffect(() => {
    if (!result) return;
    const target = Math.max(0, Math.min(100, Math.round(result.overallScore)));
    let raf: number;
    const start = performance.now();
    const duration = 1500;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayedScore(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result?.overallScore]);

  // Cleanup video URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (seekableVideoUrl) {
        URL.revokeObjectURL(seekableVideoUrl);
      }
    };
  }, [videoUrl, seekableVideoUrl]);

  // Keyboard shortcuts for video controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
      } else if (e.code === "ArrowRight") {
        videoRef.current.currentTime = Math.min(
          (videoRef.current.currentTime || 0) + 5,
          videoRef.current.duration || 0
        );
      } else if (e.code === "ArrowLeft") {
        videoRef.current.currentTime = Math.max(
          (videoRef.current.currentTime || 0) - 5,
          0
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Handle missing data properly
  useEffect(() => {
    if (!isLoading && !result) {
      console.error("No interview data found");
      setError(
        "No interview data available. Please complete an interview first."
      );
      return;
    }
  }, [isLoading, result]);

  const getPerformanceColor = (badge: string) => {
    switch (badge.toLowerCase()) {
      case "excellent":
        return "bg-green-500 text-green-50";
      case "good":
        return "bg-blue-500 text-blue-50";
      case "needs work":
        return "bg-orange-500 text-orange-50";
      default:
        return "bg-gray-500 text-gray-50";
    }
  };

  const getTierBadge = (score: number): { label: string; classes: string } => {
    if (score >= 90)
      return {
        label: "Exceptional 🏆",
        classes: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
      };
    if (score >= 80)
      return {
        label: "Excellent ⭐",
        classes: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
      };
    if (score >= 70)
      return {
        label: "Strong 💪",
        classes: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
      };
    if (score >= 60)
      return {
        label: "Developing 📈",
        classes: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white",
      };
    return {
      label: "Building 🎯",
      classes: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const handleDownloadReport = () => {
    toast({
      title: "Report Download",
      description:
        "Your interview report is being generated and will download shortly.",
    });
  };

  const handleScheduleAnother = () => {
    navigate("/interview/setup");
  };

  const handleViewRecommendations = () => {
    navigate("/dashboard/analytics");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Analyzing Your Interview
            </h2>
            <p className="text-muted-foreground">
              Generating detailed feedback...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">
              Unable to Load Results
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90"
            >
              Refresh Page
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Build chapters from response durations (compute safely even when result is null)
  const responsesForCalcs = result?.responses || [];
  const chapters = (() => {
    const items = responsesForCalcs;
    let cursor = 0;
    return items.map((r, idx) => {
      const start = cursor;
      const dur = Math.max(1, r.duration || 0);
      const end = start + dur;
      cursor = end;
      return {
        index: idx + 1,
        question: r.question,
        start,
        end,
        score: r.score || 0,
        duration: dur,
      };
    });
  })();

  const totalDuration = (() => {
    const base = result?.duration || 0;
    return chapters.length ? chapters[chapters.length - 1].end : base;
  })();

  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(time, videoRef.current.duration || time)
    );
    videoRef.current.play().catch(() => {});
  };

  const markerColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (!result) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Quota Alert - Show if using mock transcriptions */}
      <div className="container mx-auto px-6 py-8">
        {/* Summary Header - Redesigned Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/20">
            <div className="flex flex-col lg:flex-row items-center gap-8 w-full">
              {/* Animated Score Ring */}
              <div className="relative w-40 h-40">
                <svg
                  className="w-40 h-40 transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 40 * (1 - result.overallScore / 100)
                    }`}
                    className="text-primary drop-shadow-sm"
                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 40 * (1 - result.overallScore / 100),
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      className="text-4xl font-bold text-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                    >
                      {displayedScore}
                    </motion.div>
                    <div className="text-sm text-muted-foreground">/100</div>
                  </div>
                </div>
              </div>

              {/* Performance Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <span
                    className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${
                      getTierBadge(result.overallScore).classes
                    }`}
                  >
                    {getTierBadge(result.overallScore).label}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">
                        {result.duration > 0 && isFinite(result.duration)
                          ? `${Math.floor(result.duration / 60)}m ${Math.round(
                              result.duration % 60
                            )}s`
                          : "0m 0s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="font-semibold">{result.responses.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Completion
                      </p>
                      <p className="font-semibold">100%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Readiness</p>
                      <p className="font-semibold">
                        {result.readinessLevel || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setShowShareDialog(true)}
                  variant="outline"
                  className="glass"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Results
                </Button>
                <Button
                  onClick={handleDownloadReport}
                  variant="outline"
                  className="glass"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Insights Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-x-auto">
            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10">
              <div className="text-sm font-semibold mb-1">
                Your Superpower 🌟
              </div>
              <div className="text-sm text-muted-foreground">Top Strength</div>
              <div className="mt-2 font-medium">
                {result.strengths?.[0] || "Clear communication"}
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/10">
              <div className="text-sm font-semibold mb-1">Focus On 🎯</div>
              <div className="text-sm text-muted-foreground">
                Improvement Area
              </div>
              <div className="mt-2 font-medium">
                {result.improvements?.[0] || "Tighter structure"}
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/10">
              <div className="text-sm font-semibold mb-1">
                Your Next Move 🚀
              </div>
              <div className="text-sm text-muted-foreground">Action Step</div>
              <div className="mt-2 font-medium">
                {result.nextSteps?.[0] ||
                  "Practice STAR examples for recent projects"}
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Video Player */}
        {videoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">
                    Your Interview Recording
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Watch your interview performance and review your responses
                </p>
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {isConverting &&
                    (() => {
                      const videoFormat =
                        result?.videoMetadata?.format || "video/webm";
                      const isMP4 = isMP4Format(videoFormat);

                      // Only show conversion overlay if we're actually converting (not MP4)
                      if (!isMP4) {
                        return (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                            <div className="text-center text-white">
                              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm">
                                Converting video to MP4...
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  <video
                    controls
                    className="w-full h-full"
                    src={seekableVideoUrl || videoUrl}
                    poster=""
                    preload="metadata"
                    ref={videoRef}
                    onTimeUpdate={(e) =>
                      setCurrentTime((e.target as HTMLVideoElement).currentTime)
                    }
                    onRateChange={(e) =>
                      setPlaybackRate(
                        (e.target as HTMLVideoElement).playbackRate
                      )
                    }
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                {/* Playback controls */}
                <div className="flex gap-2 items-center flex-wrap">
                  {(() => {
                    const videoFormat =
                      result?.videoMetadata?.format || "video/webm";
                    const isMP4 = isMP4Format(videoFormat);
                    const formatName = getFormatDisplayName(videoFormat);
                    const fileExtension = getFileExtension(videoFormat);

                    // Debug: Download button logic (disabled)
                    //   videoFormat,
                    //   isMP4,
                    //   formatName,
                    //   fileExtension,
                    //   result: result,
                    //   videoMetadata: result?.videoMetadata,
                    // });

                    if (isMP4) {
                      // Video is already MP4 - show single download button
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = videoUrl;
                            link.download = `interview-${result.id}.${fileExtension}`;
                            link.click();
                          }}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download {formatName}
                        </Button>
                      );
                    } else {
                      // Video is not MP4 - show both options
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = videoUrl;
                              link.download = `interview-${result.id}.${fileExtension}`;
                              link.click();
                            }}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download {formatName}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!videoUrl) return;

                              try {
                                setIsConverting(true);
                                toast({
                                  title: "Converting Video",
                                  description:
                                    "Converting to MP4 format for better compatibility...",
                                });

                                // Get the original video blob
                                const response = await fetch(videoUrl);
                                const videoBlob = await response.blob();

                                // Convert to MP4
                                const mp4Blob =
                                  await videoConversionService.convertWebMToMP4(
                                    videoBlob
                                  );

                                // Download MP4
                                const link = document.createElement("a");
                                link.href = URL.createObjectURL(mp4Blob);
                                link.download = `interview-${result.id}.mp4`;
                                link.click();

                                toast({
                                  title: "Download Complete",
                                  description:
                                    "MP4 video downloaded successfully!",
                                });
                              } catch (error) {
                                console.error("MP4 conversion failed:", error);
                                toast({
                                  title: "Conversion Failed",
                                  description:
                                    "Failed to convert to MP4. Please try downloading the WebM version.",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsConverting(false);
                              }
                            }}
                            disabled={isConverting}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {isConverting ? "Converting..." : "Download MP4"}
                          </Button>
                        </>
                      );
                    }
                  })()}

                  {/* Speed controls */}
                  <div className="ml-auto flex items-center gap-1">
                    {[0.75, 1, 1.25, 1.5].map((rate) => (
                      <Button
                        key={rate}
                        variant={playbackRate === rate ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.playbackRate = rate;
                            setPlaybackRate(rate);
                          }
                        }}
                      >
                        {rate}x
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          if (
                            videoRef.current &&
                            (document as any).pictureInPictureEnabled
                          ) {
                            if ((document as any).pictureInPictureElement) {
                              await (document as any).exitPictureInPicture();
                            } else {
                              await (
                                videoRef.current as any
                              ).requestPictureInPicture();
                            }
                          }
                        } catch {}
                      }}
                    >
                      PiP
                    </Button>
                  </div>
                </div>

                {/* Chapter timeline */}
                {chapters.length > 0 && totalDuration > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Chapters
                      <span className="ml-auto text-xs">
                        {Math.floor(currentTime)}s / {Math.floor(totalDuration)}
                        s
                      </span>
                    </div>
                    <div className="relative h-4 w-full bg-muted rounded overflow-hidden">
                      {chapters.map((ch, i) => (
                        <button
                          key={i}
                          title={`Q${ch.index}: ${ch.question}`}
                          onClick={() => seekTo(ch.start)}
                          style={{
                            left: `${(ch.start / totalDuration) * 100}%`,
                            width: `${(ch.duration / totalDuration) * 100}%`,
                          }}
                          className={`absolute top-0 h-full ${markerColor(
                            ch.score
                          )} hover:opacity-80 transition-opacity`}
                        />
                      ))}
                      {/* Playhead */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-black/60 dark:bg-white/60"
                        style={{
                          left: `${(currentTime / totalDuration) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      {chapters.map((ch, i) => (
                        <span
                          key={i}
                          className="truncate"
                          style={{
                            width: `${(ch.duration / totalDuration) * 100}%`,
                          }}
                        >
                          Q{ch.index}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Performance at a Glance - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> 📈 Your Performance
              Trend
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.responses.map((r, i) => ({
                    name: `Q${i + 1}`,
                    score: r.score,
                  }))}
                  margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 14 }} />
                  <ReTooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={() =>
                      result.responses.reduce((s, r) => s + (r.score || 0), 0) /
                      Math.max(1, result.responses.length)
                    }
                    stroke="#9CA3AF"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
        {/* Response Transcriptions - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Response Transcriptions
            </h3>
            <Accordion type="single" collapsible className="space-y-4">
              {result.responses.map((response, index) => (
                <AccordionItem key={response.id} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className={badgeVariants({ variant: "outline" })}>
                          Q{index + 1}
                        </div>
                        <span className="font-medium line-clamp-1">
                          {response.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${getScoreColor(
                            response.score
                          )}`}
                        >
                          {response.score}%
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Tabs defaultValue="response">
                      <TabsList className="mb-6">
                        <TabsTrigger value="response">
                          Your Response
                        </TabsTrigger>
                        <TabsTrigger value="analysis">
                          Detailed Analysis
                        </TabsTrigger>
                        <TabsTrigger value="feedback">Feedback</TabsTrigger>
                        <TabsTrigger value="coach">AI Coach</TabsTrigger>
                      </TabsList>

                      <TabsContent value="response" className="space-y-6">
                        <div className="flex items-center gap-2 text-sm">
                          <div
                            className={badgeVariants({ variant: "secondary" })}
                          >
                            {response.duration < 45
                              ? "Too Short"
                              : response.duration > 180
                              ? "Too Long"
                              : "Appropriate"}
                          </div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {response.answer}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-muted-foreground" />
                            <span>{response.duration}s</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mic className="w-4 h-4 text-muted-foreground" />
                            <span>{response.fillerWords} fillers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span>{response.speakingPace} wpm</span>
                          </div>
                          {response.eyeContact && (
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-muted-foreground" />
                              <span>{response.eyeContact}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Transcription
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="analysis" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div>
                            <div className="text-lg font-semibold mb-4">
                              Communication
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>Clarity</span>
                                <span className="font-semibold">
                                  {response.communication_scores?.clarity
                                    ? Math.round(
                                        response.communication_scores.clarity
                                      )
                                    : Math.round(
                                        (response.confidence || 0.8) * 100
                                      )}
                                  /100
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>Structure</span>
                                <span className="font-semibold">
                                  {response.communication_scores?.structure
                                    ? Math.round(
                                        response.communication_scores.structure
                                      )
                                    : Math.round((response.score / 12) * 100)}
                                  /100
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>Conciseness</span>
                                <span className="font-semibold">
                                  {response.communication_scores?.conciseness
                                    ? Math.round(
                                        response.communication_scores
                                          .conciseness
                                      )
                                    : Math.round(7 * 10)}
                                  /100
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold mb-4">
                              Content
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>Relevance</span>
                                <span className="font-semibold">
                                  {response.content_scores?.relevance
                                    ? Math.round(
                                        response.content_scores.relevance
                                      )
                                    : Math.round(response.score)}
                                  /100
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>Depth</span>
                                <span className="font-semibold">
                                  {response.content_scores?.depth
                                    ? Math.round(response.content_scores.depth)
                                    : Math.round(7 * 10)}
                                  /100
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>Specificity</span>
                                <span className="font-semibold">
                                  {response.content_scores?.specificity
                                    ? Math.round(
                                        response.content_scores.specificity
                                      )
                                    : Math.round(7 * 10)}
                                  /100
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="feedback">
                        <div className="grid lg:grid-cols-2 gap-6">
                          <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10">
                            <div className="font-semibold mb-3 text-green-700 dark:text-green-300">
                              What Worked ✅
                            </div>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                              {response.strengths &&
                              response.strengths.length > 0 ? (
                                response.strengths
                                  .slice(0, 3)
                                  .map((s, i) => <li key={i}>{s}</li>)
                              ) : (
                                <li className="text-gray-500 italic">
                                  No specific strengths identified for this
                                  question.
                                </li>
                              )}
                            </ul>
                          </div>
                          <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10">
                            <div className="font-semibold mb-3 text-orange-700 dark:text-orange-300">
                              Growth Opportunities 💡
                            </div>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                              {response.improvements &&
                              response.improvements.length > 0 ? (
                                response.improvements
                                  .slice(0, 3)
                                  .map((s, i) => <li key={i}>{s}</li>)
                              ) : (
                                <li className="text-gray-500 italic">
                                  No specific improvements identified for this
                                  question.
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="coach" className="space-y-4">
                        <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                          <div className="font-semibold mb-2">
                            AI Coach Feedback
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.insights?.[0] ||
                              "Keep refining structure and metrics for stronger impact."}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="font-semibold mb-2">
                            See It Done Better
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            For example: Emphasize actions and measurable
                            outcomes using the STAR method to tighten your
                            narrative.
                          </p>
                          <Button variant="outline" size="sm">
                            Copy Example
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </motion.div>

        {/* Comprehensive Feedback & Action Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 grid lg:grid-cols-2 gap-8"
        >
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/10">
            <h3 className="text-xl font-bold mb-4">
              Your Readiness Assessment 🎯
            </h3>
            <div className="flex items-center gap-4">
              <div
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  getTierBadge(result.overallScore).classes
                }`}
              >
                {result.readinessLevel || "Assessment Ready"}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {result.insights?.[0] ||
                "Consistent structure and relevant examples. Keep refining metrics and conciseness for even stronger impact."}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">
              Your Personalized Improvement Roadmap 🚀
            </h3>
            <div className="space-y-3">
              {(result.nextSteps && result.nextSteps.length > 0
                ? result.nextSteps
                : [
                    "Draft 2 STAR stories with quantifiable results",
                    "Practice concise openings under 30 seconds",
                    "Collect metrics for 2 recent projects",
                  ]
              ).map((step, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 p-3 rounded border bg-card/50 cursor-pointer"
                >
                  <input type="checkbox" className="mt-1" />
                  <span className="text-sm">
                    {i + 1}. {step}
                  </span>
                </label>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Estimated practice time:{" "}
              {result.estimatedPracticeTime || "~30–45 minutes"}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline">Export Action Plan</Button>
              <Button variant="outline">Copy to Clipboard</Button>
            </div>
          </Card>
        </motion.div>

        {/* Question-by-Question Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Question-by-Question Breakdown
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={result.responses.map((r, i) => ({
                    name: `Q${i + 1}`,
                    score: r.score,
                  }))}
                  layout="vertical"
                  margin={{ left: 24, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <ReTooltip />
                  <Bar dataKey="score" fill="#8B5CF6"></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <div className="text-center">
            <div className="text-lg font-semibold mb-3">
              Ready to level up? 🚀
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={handleScheduleAnother}
                className="bg-primary hover:bg-primary/90"
              >
                <Calendar className="w-4 h-4 mr-2" /> Schedule Another Interview
              </Button>
              <Button
                onClick={handleViewRecommendations}
                variant="outline"
                className="glass"
              >
                View All My Interviews
              </Button>
              <Button
                onClick={() => setShowShareDialog(true)}
                variant="outline"
                className="glass"
              >
                Share Results
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Results</DialogTitle>
            <DialogDescription>
              Share your interview performance with others
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-primary mb-2">
                {result.overallScore}%
              </div>
              <div
                className={`${getPerformanceColor(
                  result.performanceBadge
                )} inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`}
              >
                {result.performanceBadge} Performance
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link Copied",
                    description: "Share link copied to clipboard",
                  });
                }}
                className="flex-1"
              >
                Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Email Sent",
                    description: "Results will be emailed shortly",
                  });
                }}
                className="flex-1"
              >
                Email Results
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewResults;
