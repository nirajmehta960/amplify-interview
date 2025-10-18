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
  sessionData?: any; // Store session data for interview type access
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
  actionable_feedback?: string;
  improved_example?: string;
}

const InterviewResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: sessionIdFromParams } = useParams<{ sessionId: string }>();
  const { toast } = useToast();

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);

  // Debug: Track isConverting state changes (disabled)
  // useEffect(() => {
  //   console.log("isConverting state changed to:", isConverting);
  // }, [isConverting]);
  const [seekableVideoUrl, setSeekableVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  // Helper function to get interview type display name
  const getInterviewTypeDisplay = (sessionData: any): string => {
    // First try to get interview type from analysis data (most accurate)
    const analyses = (sessionData as any)?._analyses;
    console.log("🔍 getInterviewTypeDisplay - sessionData:", sessionData);
    console.log("🔍 getInterviewTypeDisplay - analyses:", analyses);

    if (analyses && analyses.length > 0) {
      const firstAnalysis = analyses[0];
      const interviewType = firstAnalysis.interview_type;
      const customDomain = firstAnalysis.custom_domain;

      console.log("🔍 getInterviewTypeDisplay - firstAnalysis:", firstAnalysis);
      console.log("🔍 getInterviewTypeDisplay - interviewType:", interviewType);
      console.log("🔍 getInterviewTypeDisplay - customDomain:", customDomain);

      if (interviewType) {
        switch (interviewType.toLowerCase()) {
          case "behavioral":
            return "Behavioral Mock Interview";
          case "technical":
            return "Technical Mock Interview";
          case "leadership":
            return "Leadership Mock Interview";
          case "custom":
            return customDomain
              ? `${customDomain
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())} Mock Interview`
              : "Custom Mock Interview";
          default:
            return `${interviewType} Mock Interview`;
        }
      }
    }

    // Fallback to session data
    const interviewType =
      sessionData?.interviewType ||
      sessionData?.interview_type ||
      sessionData?.type;
    const customField =
      sessionData?.customField ||
      sessionData?.custom_field ||
      sessionData?.custom_domain ||
      sessionData?.field;

    if (interviewType) {
      switch (interviewType.toLowerCase()) {
        case "behavioral":
          return "Behavioral Mock Interview";
        case "technical":
          return "Technical Mock Interview";
        case "leadership":
          return "Leadership Mock Interview";
        case "custom":
          return customField
            ? `${customField
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())} Mock Interview`
            : "Custom Mock Interview";
        default:
          return `${interviewType} Mock Interview`;
      }
    }

    if (customField) {
      return `${customField
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())} Mock Interview`;
    }

    // Default fallback
    return "Mock Interview";
  };

  // Helper function to format date and time
  const formatInterviewDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      return date.toLocaleDateString("en-US", options);
    } catch (error) {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  // Reset conversion state when component loads
  useEffect(() => {
    setIsConverting(false);
  }, []);

  // Unified function to fetch and map analysis data for both scenarios
  const fetchAndMapAnalysisData = async (
    sessionId: string,
    sessionData: any
  ) => {
    try {
      console.log(
        "🔍 UNIFIED: Fetching AI analysis data for session:",
        sessionId
      );
      const { aiAnalysisService } = await import(
        "../services/aiAnalysisService"
      );
      console.log("🔍 UNIFIED: aiAnalysisService imported successfully");

      const analyses = await aiAnalysisService.getSessionAnalyses(sessionId);
      console.log("🔍 UNIFIED: getSessionAnalyses result:", analyses);

      const summary = await aiAnalysisService.getSummaryBySession(sessionId);
      console.log("🔍 UNIFIED: getSummaryBySession result:", summary);

      if (analyses.length > 0 || summary) {
        console.log("🔍 UNIFIED: Found AI analysis data:", {
          analyses: analyses.length,
          summary: !!summary,
        });

        // Store analysis data for later use
        (sessionData as any)._analyses = analyses;
        (sessionData as any)._summary = summary;

        // Update individual question responses with analysis scores
        if (analyses.length > 0) {
          console.log(
            "🔧 UNIFIED: Starting analysis mapping - analyses.length:",
            analyses.length
          );

          // Prefer mapping by interview_response_id, then fallback to question_id
          const byResponseId = new Map<string, any>();
          const byQuestionId = new Map<number, any>();

          analyses.forEach((a: any) => {
            console.log("🔍 UNIFIED: Indexing analysis:", {
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

          console.log("🔍 UNIFIED: Analysis maps created:", {
            byResponseIdSize: byResponseId.size,
            byQuestionIdSize: byQuestionId.size,
            responseIdKeys: Array.from(byResponseId.keys()),
            questionIdKeys: Array.from(byQuestionId.keys()),
          });

          sessionData.questionResponses = sessionData.questionResponses.map(
            (response: any, idx: number) => {
              const rid = String(
                (response as any).responseId || (response as any).id || ""
              );
              const qid = Number(response.questionId) || response.question_id;

              // Try to match by response ID first, then by question ID
              let analysis = null;
              if (rid && byResponseId.has(rid)) {
                analysis = byResponseId.get(rid);
                console.log(
                  `🔍 UNIFIED: Found analysis by response ID: ${rid}`
                );
              } else if (byQuestionId.has(qid)) {
                analysis = byQuestionId.get(qid);
                console.log(
                  `🔍 UNIFIED: Found analysis by question ID: ${qid}`
                );
              } else {
                // Fallback: try to match by index if we have the same number of analyses and responses
                if (idx < analyses.length) {
                  analysis = analyses[idx];
                  console.log(
                    `🔍 UNIFIED: Fallback - using analysis by index ${idx}`
                  );
                } else {
                  console.log(
                    `🔍 UNIFIED: No analysis found for response ID: ${rid}, question ID: ${qid}`
                  );
                }
              }

              // Debug logs removed - issue fixed

              if (analysis) {
                return {
                  ...response,
                  responseId:
                    rid ||
                    (analysis.interview_response_id &&
                      String(analysis.interview_response_id)),
                  questionId:
                    response.questionId ||
                    response.question_id ||
                    qid.toString(),
                  score: analysis.overall_score,
                  strengths: analysis.strengths || [],
                  improvements: analysis.improvements || [],
                  communication_scores: analysis.communication_scores || null,
                  content_scores: analysis.content_scores || null,
                  analysis: {
                    confidence: analysis.confidence_score || 0.8,
                    speakingRate: 150,
                    fillerWords: analysis.filler_words?.total || 0,
                  },
                };
              }
              return {
                ...response,
                questionId:
                  response.questionId || response.question_id || qid.toString(),
              };
            }
          );

          console.log(
            "🔍 UNIFIED: Final mapped responses:",
            sessionData.questionResponses.map((r: any) => ({
              questionId: r.questionId,
              responseId: r.responseId,
              strengths: r.strengths,
              improvements: r.improvements,
              actionable_feedback: r.actionable_feedback,
              improved_example: r.improved_example,
            }))
          );
        }
      }
    } catch (analysisError) {
      console.error(
        "❌ UNIFIED: Could not fetch AI analysis data:",
        analysisError
      );
      console.error("❌ UNIFIED: Analysis error details:", {
        message: analysisError.message,
        stack: analysisError.stack,
        sessionId: sessionId,
      });
      // Continue without analysis data
    }
  };

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
        const sessionIdFromUrl = new URLSearchParams(
          window.location.search
        ).get("sessionId");

        // Determine which scenario we're in
        const hasLocationState = !!(location.state as any)?.sessionId;
        const hasUrlParams = !!sessionIdFromParams || !!sessionIdFromUrl;

        console.log("🔍 Loading scenario detection:", {
          hasLocationState,
          hasUrlParams,
          sessionIdFromParams,
          sessionIdFromUrl,
          locationState: !!(location.state as any),
        });

        let sessionData: any = null;
        let finalSessionId: string | null = null;

        // SCENARIO 1: Post-Interview Results (Direct Navigation)
        if (hasLocationState && !hasUrlParams) {
          console.log(
            "📊 SCENARIO 1: Post-Interview Results (Direct Navigation)"
          );
          sessionData = location.state as any;
          finalSessionId = sessionData.sessionId;
          console.log("Using session data from location.state:", sessionData);
        }
        // SCENARIO 2: Historical Session View (View Details)
        else if (hasUrlParams && !hasLocationState) {
          console.log("📊 SCENARIO 2: Historical Session View (View Details)");
          finalSessionId = sessionIdFromParams || sessionIdFromUrl;

          if (finalSessionId) {
            try {
              console.log(
                "🔍 Fetching session data from database:",
                finalSessionId
              );
              const dbSessionData =
                await interviewSessionService.fetchInterviewSession(
                  finalSessionId
                );
              console.log("🔍 Database session fetch result:", dbSessionData);
              if (dbSessionData) {
                // Create session data structure from database response
                sessionData = {
                  sessionId: finalSessionId,
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
                console.log(
                  "Successfully loaded session data from database:",
                  sessionData
                );
              } else {
                console.error("No database session found for:", finalSessionId);
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
            setError("No session ID provided.");
            setIsLoading(false);
            return;
          }
        }
        // SCENARIO 3: Both location state and URL params present (prioritize URL params)
        else if (hasLocationState && hasUrlParams) {
          console.log(
            "📊 SCENARIO 3: Both present - prioritizing URL params (Historical View)"
          );
          finalSessionId = sessionIdFromParams || sessionIdFromUrl;

          if (finalSessionId) {
            try {
              console.log(
                "🔍 Fetching session data from database:",
                finalSessionId
              );
              const dbSessionData =
                await interviewSessionService.fetchInterviewSession(
                  finalSessionId
                );
              console.log("🔍 Database session fetch result:", dbSessionData);
              if (dbSessionData) {
                // Create session data structure from database response
                sessionData = {
                  sessionId: finalSessionId,
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
                console.log(
                  "Successfully loaded session data from database:",
                  sessionData
                );
              } else {
                console.error("No database session found for:", finalSessionId);
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
            setError("No session ID provided.");
            setIsLoading(false);
            return;
          }
        }
        // FALLBACK: Try local storage
        else {
          console.log("📊 FALLBACK: Trying local storage");
          const fallbackSessionId =
            sessionIdFromParams ||
            sessionIdFromUrl ||
            localInterviewStorageService.getCurrentSessionId();

          if (fallbackSessionId) {
            try {
              const storedData =
                localInterviewStorageService.getInterviewResult(
                  fallbackSessionId
                );
              if (storedData) {
                sessionData = storedData;
                finalSessionId = fallbackSessionId;
                console.log(
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

        // Determine final session ID
        if (!finalSessionId) {
          finalSessionId =
            sessionIdFromParams || sessionIdFromUrl || sessionData?.sessionId;
        }

        console.log("Loading interview data for session:", finalSessionId);
        console.log("Session data:", sessionData);
        console.log("Question responses:", sessionData?.questionResponses);

        // UNIFIED ANALYSIS DATA FETCHING - Works for both scenarios
        if (finalSessionId && sessionData) {
          await fetchAndMapAnalysisData(finalSessionId, sessionData);
        }

        // Always fetch analysis data if we have a session ID
        if (finalSessionId) {
          try {
            console.log(
              "🔍 Attempting to fetch AI analysis data for session:",
              finalSessionId
            );
            const { aiAnalysisService } = await import(
              "../services/aiAnalysisService"
            );
            console.log("🔍 aiAnalysisService imported successfully");
            const analyses = await aiAnalysisService.getSessionAnalyses(
              finalSessionId
            );
            console.log("🔍 getSessionAnalyses result:", analyses);
            const summary = await aiAnalysisService.getSummaryBySession(
              finalSessionId
            );
            console.log("🔍 getSummaryBySession result:", summary);

            if (analyses.length > 0 || summary) {
              console.log("Found AI analysis data for session:", {
                analyses: analyses.length,
                summary: !!summary,
              });
              // Store analysis data for later use
              (sessionData as any)._analyses = analyses;
              (sessionData as any)._summary = summary;

              // Update individual question responses with analysis scores
              if (analyses.length > 0) {
                console.log(
                  "🔧 STARTING ANALYSIS MAPPING - analyses.length:",
                  analyses.length
                );

                // Prefer mapping by interview_response_id, then fallback to question_id
                const byResponseId = new Map<string, any>();
                const byQuestionId = new Map<number, any>();

                analyses.forEach((a: any) => {
                  console.log("Indexing analysis:", {
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

                console.log("Analysis maps created:", {
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
                        console.log(`Found analysis by response ID: ${rid}`);
                      } else if (byQuestionId.has(qid)) {
                        analysis = byQuestionId.get(qid);
                        console.log(`Found analysis by question ID: ${qid}`);
                      } else {
                        // Fallback: try to match by index if we have the same number of analyses and responses
                        if (idx < analyses.length) {
                          analysis = analyses[idx];
                          console.log(
                            `Fallback: using analysis by index ${idx}`
                          );
                        } else {
                          console.log(
                            `No analysis found for response ID: ${rid}, question ID: ${qid}`
                          );
                        }
                      }

                      console.log(`Mapping response ${idx}:`, {
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
                          questionId:
                            response.questionId ||
                            response.question_id ||
                            qid.toString(),
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
                      return {
                        ...response,
                        questionId:
                          response.questionId ||
                          response.question_id ||
                          qid.toString(),
                      };
                    }
                  );

                console.log(
                  "Final mapped responses:",
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
            console.error(
              "❌ Could not fetch AI analysis data:",
              analysisError
            );
            console.error("❌ Analysis error details:", {
              message: analysisError.message,
              stack: analysisError.stack,
              sessionId: finalSessionId,
            });
            // Continue without analysis data
          }
        }

        // Always fetch analysis data if we have a session ID (regardless of storage type)
        if (finalSessionId) {
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

                  console.log("Database response mapping:", {
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
              console.log(
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
                  console.log("Using pre-fetched AI analysis data");
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
                  console.log("Found AI analysis data:", {
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
                      console.log("Indexing analysis:", {
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

                    console.log("Analysis maps created:", {
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
                            console.log(
                              `Found analysis by response ID: ${rid}`
                            );
                          } else if (byQuestionId.has(qid)) {
                            analysis = byQuestionId.get(qid);
                            console.log(
                              `Found analysis by question ID: ${qid}`
                            );
                          } else {
                            // Fallback: try to match by index if we have the same number of analyses and responses
                            if (idx < analyses.length) {
                              analysis = analyses[idx];
                              console.log(
                                `Fallback: using analysis by index ${idx}`
                              );
                            } else {
                              console.log(
                                `No analysis found for response ID: ${rid}, question ID: ${qid}`
                              );
                            }
                          }

                          console.log(`Mapping response ${idx}:`, {
                            responseId: rid,
                            questionId: qid,
                            foundAnalysis: !!analysis,
                            analysisStrengths: analysis?.strengths,
                            analysisImprovements: analysis?.improvements,
                            analysisActionableFeedback:
                              analysis?.actionable_feedback,
                            analysisImprovedExample: analysis?.improved_example,
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
                              actionable_feedback:
                                analysis.actionable_feedback || "",
                              improved_example: analysis.improved_example || "",
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

                    console.log(
                      "Final mapped responses:",
                      sessionData.questionResponses.map((r: any) => ({
                        questionId: r.questionId,
                        responseId: r.responseId,
                        strengths: r.strengths,
                        improvements: r.improvements,
                      }))
                    );
                  }
                }

                // Update result with analysis data for dynamic header
                setResult((prevResult) => {
                  if (prevResult) {
                    return {
                      ...prevResult,
                      sessionData: sessionData,
                    };
                  }
                  return prevResult;
                });
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
          console.log(
            "Continuing without video data - video card will show error message"
          );
          // Always continue, even without video data
        }

        console.log("Video data loaded:", videoData);

        let videoBlob: Blob | null = null;
        let actualFormat = "video/webm";
        let isMP4 = false;

        if (videoData) {
          // Create video URL for playback
          videoBlob = new Blob([videoData.videoBlob], {
            type: videoData?.metadata?.format || "video/mp4",
          });
          const videoObjectUrl = URL.createObjectURL(videoBlob);
          setVideoUrl(videoObjectUrl);

          // Set the video URL for immediate playback
          setSeekableVideoUrl(videoObjectUrl);

          // Check if video is already in MP4 format - no conversion needed!
          actualFormat = getActualVideoFormat(
            videoData?.metadata?.format || "video/mp4",
            videoBlob.type
          );
          isMP4 = isMP4Format(actualFormat);
        }

        // Debug: Video format detection (disabled)
        // console.log("Video format detection:", {
        //   metadataFormat: videoData.metadata.format,
        //   blobType: videoBlob.type,
        //   actualFormat: actualFormat,
        //   isMP4: isMP4,
        //   videoData: videoData,
        // });

        if (isMP4) {
          console.log("Video is already in MP4 format - no conversion needed!");
          // Video is already MP4, so we can use it directly
        } else {
          // Only attempt conversion for non-MP4 formats
          console.log(
            "Video is in",
            videoData?.metadata?.format || "unknown",
            "format - conversion may be needed for optimal playback"
          );
          // Note: We'll keep the original video for now and let users choose
        }

        // Create result from real data
        const realResult: InterviewResult = {
          id: finalSessionId,
          sessionData: sessionData, // Store session data for interview type access
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
          duration: (() => {
            // Calculate duration from response durations (database source of truth)
            const responseDurationSum =
              sessionData.questionResponses?.reduce(
                (sum: number, response: any) => {
                  return sum + (response.duration || 0);
                },
                0
              ) || 0;

            // Use response duration sum if available, otherwise fall back to video metadata
            return responseDurationSum > 0
              ? responseDurationSum
              : sessionData.videoMetadata?.duration ||
                  videoData?.metadata.duration ||
                  0;
          })(),
          completionTime: videoData?.metadata?.timestamp
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
                    actionable_feedback: response.actionable_feedback || "",
                    improved_example: response.improved_example || "",
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
                duration: (() => {
                  // Use response duration sum for consistency with duration card
                  const responseDurationSum =
                    sessionData.questionResponses?.reduce(
                      (sum: number, response: any) => {
                        return sum + (response.duration || 0);
                      },
                      0
                    ) || 0;

                  return responseDurationSum > 0
                    ? responseDurationSum
                    : videoData?.metadata?.duration || 0;
                })(),
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
        classes:
          "bg-gradient-to-r from-accent-green to-accent-green/80 text-white",
      };
    if (score >= 80)
      return {
        label: "Excellent ⭐",
        classes:
          "bg-gradient-to-r from-primary-blue to-primary-blue/80 text-white",
      };
    if (score >= 70)
      return {
        label: "Strong 💪",
        classes:
          "bg-gradient-to-r from-accent-green to-accent-green/80 text-white",
      };
    if (score >= 60)
      return {
        label: "Developing 📈",
        classes:
          "bg-gradient-to-r from-accent-orange to-accent-orange/80 text-white",
      };
    return {
      label: "Building 🎯",
      classes: "bg-gradient-to-r from-accent-orange to-red-500 text-white",
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-green";
    if (score >= 60) return "text-primary-blue";
    if (score >= 40) return "text-accent-orange";
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
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 border-4 border-primary-blue border-t-transparent rounded-full animate-spin mx-auto" />
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
              className="bg-primary-blue hover:bg-primary-blue/90 text-white rounded-professional"
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
    // Calculate total duration from response durations (in seconds)
    const responseDurationSum = responsesForCalcs.reduce((sum, response) => {
      return sum + (response.duration || 0);
    }, 0);

    // Debug logging
    console.log("🔍 Duration Debug:", {
      responseDurationSum,
      resultDuration: result?.duration,
      responsesForCalcs: responsesForCalcs.map((r) => ({
        id: r.id,
        duration: r.duration,
      })),
      finalDuration:
        responseDurationSum > 0 ? responseDurationSum : result?.duration || 0,
    });

    // Use response duration sum if available, otherwise fall back to result duration
    return responseDurationSum > 0
      ? responseDurationSum
      : result?.duration || 0;
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
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <div className="bg-white border-b border-light-gray">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark-navy font-display">
                Interview Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                {getInterviewTypeDisplay(result.sessionData || {})} •{" "}
                {formatInterviewDateTime(result.completionTime)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-professional"
                onClick={handleDownloadReport}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Score Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Overall Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-blue/10 rounded-professional">
                  <Target className="w-6 h-6 text-primary-blue" />
                </div>
                <Badge
                  className={`${
                    getTierBadge(result.overallScore).classes.includes(
                      "accent-green"
                    )
                      ? "bg-accent-green"
                      : getTierBadge(result.overallScore).classes.includes(
                          "primary-blue"
                        )
                      ? "bg-primary-blue"
                      : "bg-accent-orange"
                  } text-white`}
                >
                  {getTierBadge(result.overallScore).label.split(" ")[0]}
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Overall Score
                </h3>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${getScoreColor(
                      result.overallScore
                    )}`}
                  >
                    {displayedScore}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-4 h-4 text-accent-green" />
                  <span className="text-accent-green font-medium">
                    Great performance!
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Duration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-orange/10 rounded-professional">
                  <Clock className="w-6 h-6 text-accent-orange" />
                </div>
                <Badge className="bg-accent-orange text-white">Complete</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Duration
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-dark-navy">
                    {result.duration > 0 && isFinite(result.duration)
                      ? `${Math.floor(result.duration / 60)}m ${Math.round(
                          result.duration % 60
                        )}s`
                      : "0m 0s"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Interview length
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-green/10 rounded-professional">
                  <MessageSquare className="w-6 h-6 text-accent-green" />
                </div>
                <Badge className="bg-accent-green text-white">Complete</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Questions
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-dark-navy">
                    {result.responses.length}
                  </span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </Card>
          </motion.div>

          {/* Readiness */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-professional">
                  <Award className="w-6 h-6 text-purple-500" />
                </div>
                <Badge className="bg-primary-blue text-white">Ready</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Readiness Level
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-dark-navy">
                    {result.readinessLevel || "Ready"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Interview readiness
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Quick Insights Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent-green/10 rounded-professional">
                  <Sparkles className="w-5 h-5 text-accent-green" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-dark-navy">
                    Your Superpower
                  </h3>
                  <p className="text-xs text-muted-foreground">Top Strength</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.strengths?.[0] || "Clear communication"}
              </p>
            </Card>

            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent-orange/10 rounded-professional">
                  <Target className="w-5 h-5 text-accent-orange" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-dark-navy">
                    Focus On
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Improvement Area
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.improvements?.[0] || "Tighter structure"}
              </p>
            </Card>

            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-blue/10 rounded-professional">
                  <ArrowRight className="w-5 h-5 text-primary-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-dark-navy">
                    Your Next Move
                  </h3>
                  <p className="text-xs text-muted-foreground">Action Step</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.nextSteps?.[0] ||
                  "Practice STAR examples for recent projects"}
              </p>
            </Card>
          </div>
        </motion.div>

        {/* Video Player and Performance Trend - Horizontal Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-blue/10 rounded-professional">
                      <Play className="w-5 h-5 text-primary-blue" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-dark-navy font-display">
                        Your Interview Recording
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Watch your interview performance and review your
                        responses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent-green text-white">
                      Complete
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {totalDuration > 0 && isFinite(totalDuration)
                        ? `${Math.floor(totalDuration / 60)}m ${Math.round(
                            totalDuration % 60
                          )}s`
                        : "0m 0s"}
                    </span>
                  </div>
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {!videoUrl ? (
                    // Show error message when video is not available
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          Video Not Available
                        </h3>
                        <p className="text-white/70">
                          This interview was recorded locally and is not
                          accessible in production.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
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

                      {/* Black overlay with play button when video is not playing */}
                      {!videoPlaying && !isConverting && (
                        <div
                          className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer z-20"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.play();
                              setVideoPlaying(true);
                            }
                          }}
                        >
                          <div className="text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                              <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">
                              Interview Recording
                            </h3>
                            <p className="text-white/70">Click to play</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {videoUrl && (
                    <video
                      controls
                      className="w-full h-full"
                      src={seekableVideoUrl || videoUrl}
                      poster=""
                      preload="metadata"
                      ref={videoRef}
                      onTimeUpdate={(e) =>
                        setCurrentTime(
                          (e.target as HTMLVideoElement).currentTime
                        )
                      }
                      onRateChange={(e) =>
                        setPlaybackRate(
                          (e.target as HTMLVideoElement).playbackRate
                        )
                      }
                      onPlay={() => setVideoPlaying(true)}
                      onPause={() => setVideoPlaying(false)}
                      style={{ display: videoPlaying ? "block" : "none" }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                {/* Playback controls */}
                {videoUrl && (
                  <div className="flex gap-2 items-center flex-wrap">
                    {(() => {
                      const videoFormat =
                        result?.videoMetadata?.format || "video/webm";
                      const isMP4 = isMP4Format(videoFormat);
                      const formatName = getFormatDisplayName(videoFormat);
                      const fileExtension = getFileExtension(videoFormat);

                      // Debug: Download button logic (disabled)
                      // console.log("Download button logic:", {
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

                                // console.log("MP4 conversion button clicked - starting conversion");
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
                                  console.error(
                                    "MP4 conversion failed:",
                                    error
                                  );
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
                          variant={
                            playbackRate === rate ? "default" : "outline"
                          }
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
                )}

                {/* Chapter timeline */}
                {videoUrl && chapters.length > 0 && totalDuration > 0 && (
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

            {/* Performance Trend */}
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-blue/10 rounded-professional">
                    <BarChart3 className="w-5 h-5 text-primary-blue" />
                  </div>
                  <h3 className="text-xl font-bold text-dark-navy font-display">
                    Performance Trend
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChartType("bar")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartType === "bar"
                        ? "bg-primary-blue text-white"
                        : "bg-light-gray text-muted-foreground hover:bg-light-gray/80"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType("line")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartType === "line"
                        ? "bg-primary-blue text-white"
                        : "bg-light-gray text-muted-foreground hover:bg-light-gray/80"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Line
                  </button>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart
                      data={result.responses.map((r, i) => ({
                        name: `Q${i + 1}`,
                        score: r.score,
                      }))}
                      margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F7FA" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        tick={{
                          fontSize: result.responses.length > 10 ? 10 : 12,
                        }}
                        interval={
                          result.responses.length > 10 ? "preserveStartEnd" : 0
                        }
                      />
                      <YAxis domain={[0, 100]} stroke="#64748B" />
                      <ReTooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #F5F7FA",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3871C2"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#3871C2" }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={result.responses.map((r, i) => ({
                        name: `Q${i + 1}`,
                        score: r.score,
                      }))}
                      margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F7FA" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        tick={{
                          fontSize: result.responses.length > 10 ? 10 : 12,
                        }}
                        interval={
                          result.responses.length > 10 ? "preserveStartEnd" : 0
                        }
                      />
                      <YAxis domain={[0, 100]} stroke="#64748B" />
                      <ReTooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #F5F7FA",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar
                        dataKey="score"
                        fill="#3871C2"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Response Transcriptions - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-8"
        >
          <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-accent-orange/10 rounded-professional">
                <MessageSquare className="w-5 h-5 text-accent-orange" />
              </div>
              <h3 className="text-xl font-bold text-dark-navy font-display">
                Response Transcriptions
              </h3>
            </div>
            <Accordion type="single" collapsible className="space-y-4">
              {result.responses.map((response, index) => (
                <AccordionItem key={response.id} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            index === 0
                              ? "bg-primary-blue text-white"
                              : index === 1
                              ? "bg-accent-green text-white"
                              : "bg-accent-orange text-white"
                          }`}
                        >
                          Q{index + 1}
                        </div>
                        <span className="font-medium line-clamp-1">
                          {response.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-lg ${getScoreColor(
                            response.score
                          )}`}
                        >
                          {response.score}%
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6 pt-6">
                    <Tabs defaultValue="response" className="w-full">
                      {/* Improved Tab Design with Better Alignment */}
                      <TabsList className="flex w-full mb-6 bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <TabsTrigger
                          value="response"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 hover:text-blue-600/80 rounded-md relative"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="whitespace-nowrap">
                            Your Response
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="analysis"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 hover:text-blue-600/80 rounded-md relative"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span className="whitespace-nowrap">
                            Detailed Analysis
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="feedback"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 hover:text-blue-600/80 rounded-md relative"
                        >
                          <Lightbulb className="w-4 h-4" />
                          <span className="whitespace-nowrap">Feedback</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="coach"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 hover:text-blue-600/80 rounded-md relative"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="whitespace-nowrap">AI Coach</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="response" className="space-y-6">
                        {/* Response Quality Badge */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              response.duration < 45
                                ? "bg-red-100 text-red-700"
                                : response.duration > 180
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {response.duration < 45
                              ? "Too Short"
                              : response.duration > 180
                              ? "Too Long"
                              : "Appropriate"}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{response.duration}s duration</span>
                          </div>
                        </div>

                        {/* Response Text */}
                        <div className="bg-gradient-to-br from-light-gray/30 to-white p-6 rounded-professional border border-light-gray/50">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-primary-blue/10 rounded-professional">
                              <MessageSquare className="w-4 h-4 text-primary-blue" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-dark-navy mb-1">
                                Your Response
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Transcribed from your interview
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-dark-navy leading-relaxed bg-white p-4 rounded-lg border border-light-gray/30">
                            {response.answer}
                          </p>
                        </div>

                        {/* Performance Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded-professional border border-light-gray/50 hover:shadow-professional transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Timer className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-dark-navy">
                                Duration
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-primary-blue">
                              {response.duration}s
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Response length
                            </p>
                          </div>

                          <div className="bg-white p-4 rounded-professional border border-light-gray/50 hover:shadow-professional transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <Mic className="w-4 h-4 text-orange-600" />
                              </div>
                              <span className="text-sm font-medium text-dark-navy">
                                Fillers
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-accent-orange">
                              {response.fillerWords}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Filler words used
                            </p>
                          </div>

                          <div className="bg-white p-4 rounded-professional border border-light-gray/50 hover:shadow-professional transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-dark-navy">
                                Speaking Pace
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-accent-green">
                              {response.speakingPace}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Words per minute
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="analysis" className="space-y-6">
                        {/* Skill Breakdown Header */}
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-primary-blue/10 rounded-professional">
                            <BarChart3 className="w-5 h-5 text-primary-blue" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-dark-navy">
                              Skill Breakdown
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Detailed performance analysis
                            </p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          {/* Communication Skills */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-1 bg-blue-100 rounded">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                              </div>
                              <h5 className="text-lg font-semibold text-dark-navy">
                                Communication
                              </h5>
                            </div>

                            <div className="space-y-4">
                              <div className="bg-white p-4 rounded-professional border border-light-gray/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-dark-navy">
                                    Clarity
                                  </span>
                                  <span className="font-bold text-primary-blue">
                                    {response.communication_scores?.clarity
                                      ? Math.round(
                                          response.communication_scores.clarity
                                        )
                                      : Math.round(
                                          (response.confidence || 0.8) * 100
                                        )}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-light-gray rounded-full h-2">
                                  <div
                                    className="bg-primary-blue h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${
                                        response.communication_scores?.clarity
                                          ? Math.round(
                                              response.communication_scores
                                                .clarity
                                            )
                                          : Math.round(
                                              (response.confidence || 0.8) * 100
                                            )
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-professional border border-light-gray/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-dark-navy">
                                    Structure
                                  </span>
                                  <span className="font-bold text-accent-green">
                                    {response.communication_scores?.structure
                                      ? Math.round(
                                          response.communication_scores
                                            .structure
                                        )
                                      : Math.round((response.score / 12) * 100)}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-light-gray rounded-full h-2">
                                  <div
                                    className="bg-accent-green h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${
                                        response.communication_scores?.structure
                                          ? Math.round(
                                              response.communication_scores
                                                .structure
                                            )
                                          : Math.round(
                                              (response.score / 12) * 100
                                            )
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-professional border border-light-gray/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-dark-navy">
                                    Conciseness
                                  </span>
                                  <span className="font-bold text-accent-orange">
                                    {response.communication_scores?.conciseness
                                      ? Math.round(
                                          response.communication_scores
                                            .conciseness
                                        )
                                      : Math.round(7 * 10)}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-light-gray rounded-full h-2">
                                  <div
                                    className="bg-accent-orange h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${
                                        response.communication_scores
                                          ?.conciseness
                                          ? Math.round(
                                              response.communication_scores
                                                .conciseness
                                            )
                                          : Math.round(7 * 10)
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Content Skills */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-1 bg-green-100 rounded">
                                <Target className="w-4 h-4 text-green-600" />
                              </div>
                              <h5 className="text-lg font-semibold text-dark-navy">
                                Content
                              </h5>
                            </div>

                            <div className="space-y-4">
                              <div className="bg-white p-4 rounded-professional border border-light-gray/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-dark-navy">
                                    Relevance
                                  </span>
                                  <span className="font-bold text-primary-blue">
                                    {response.content_scores?.relevance
                                      ? Math.round(
                                          response.content_scores.relevance
                                        )
                                      : Math.round(response.score)}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-light-gray rounded-full h-2">
                                  <div
                                    className="bg-primary-blue h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${
                                        response.content_scores?.relevance
                                          ? Math.round(
                                              response.content_scores.relevance
                                            )
                                          : Math.round(response.score)
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-professional border border-light-gray/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-dark-navy">
                                    Depth
                                  </span>
                                  <span className="font-bold text-accent-green">
                                    {response.content_scores?.depth
                                      ? Math.round(
                                          response.content_scores.depth
                                        )
                                      : Math.round(7 * 10)}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-light-gray rounded-full h-2">
                                  <div
                                    className="bg-accent-green h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${
                                        response.content_scores?.depth
                                          ? Math.round(
                                              response.content_scores.depth
                                            )
                                          : Math.round(7 * 10)
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-professional border border-light-gray/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-dark-navy">
                                    Specificity
                                  </span>
                                  <span className="font-bold text-accent-orange">
                                    {response.content_scores?.specificity
                                      ? Math.round(
                                          response.content_scores.specificity
                                        )
                                      : Math.round(7 * 10)}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-light-gray rounded-full h-2">
                                  <div
                                    className="bg-accent-orange h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${
                                        response.content_scores?.specificity
                                          ? Math.round(
                                              response.content_scores
                                                .specificity
                                            )
                                          : Math.round(7 * 10)
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="feedback" className="space-y-6">
                        <div className="grid lg:grid-cols-2 gap-6">
                          {/* What Worked */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-professional border border-green-200/50">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-green-100 rounded-professional">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-green-700">
                                  What Worked
                                </h4>
                                <p className="text-sm text-green-600">
                                  Your strengths in this response
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {response.strengths &&
                              response.strengths.length > 0 ? (
                                response.strengths
                                  .slice(0, 3)
                                  .map((strength, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-green-200/30"
                                    >
                                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <p className="text-sm text-green-800 leading-relaxed">
                                        {strength}
                                      </p>
                                    </div>
                                  ))
                              ) : (
                                <div className="p-4 bg-white/70 rounded-lg border border-green-200/30">
                                  <p className="text-sm text-green-700 italic text-center">
                                    No specific strengths identified for this
                                    question.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Growth Opportunities */}
                          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-professional border border-orange-200/50">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-orange-100 rounded-professional">
                                <Lightbulb className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-orange-700">
                                  Growth Opportunities
                                </h4>
                                <p className="text-sm text-orange-600">
                                  Areas for improvement
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {response.improvements &&
                              response.improvements.length > 0 ? (
                                response.improvements
                                  .slice(0, 3)
                                  .map((improvement, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-orange-200/30"
                                    >
                                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <p className="text-sm text-orange-800 leading-relaxed">
                                        {improvement}
                                      </p>
                                    </div>
                                  ))
                              ) : (
                                <div className="p-4 bg-white/70 rounded-lg border border-orange-200/30">
                                  <p className="text-sm text-orange-700 italic text-center">
                                    No specific improvements identified for this
                                    question.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="coach" className="space-y-6">
                        {/* AI Coach Feedback */}
                        <div className="bg-gradient-to-br from-primary-blue/5 to-primary-blue/10 p-6 rounded-professional border-l-4 border-primary-blue">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-primary-blue/20 rounded-professional">
                              <Sparkles className="w-5 h-5 text-primary-blue" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-dark-navy mb-2">
                                AI Coach Feedback
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {response.actionable_feedback ||
                                  "Keep refining structure and metrics for stronger impact."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Your Next Response */}
                        <div className="bg-gradient-to-br from-accent-green/5 to-accent-green/10 p-6 rounded-professional border border-accent-green/20">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-accent-green/20 rounded-professional">
                              <Lightbulb className="w-5 h-5 text-accent-green" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-dark-navy mb-2">
                                Your Next Response
                              </h4>
                              <p className="text-sm text-muted-foreground mb-1">
                                Here's an improved version:
                              </p>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg border border-accent-green/20 mb-4">
                            <p className="text-sm text-dark-navy leading-relaxed">
                              {response.improved_example ||
                                "For example: Emphasize actions and measurable outcomes using the STAR method to tighten your narrative."}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-professional"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  response.improved_example || ""
                                );
                                // You could add a toast notification here
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Copy Example
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-professional"
                              onClick={() => {
                                // Add functionality to save as template
                              }}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              Save as Template
                            </Button>
                          </div>
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
          <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-accent-green/10 rounded-professional">
                <Target className="w-5 h-5 text-accent-green" />
              </div>
              <h3 className="text-xl font-bold text-dark-navy font-display">
                Your Readiness Assessment
              </h3>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <Badge
                className={`${
                  getTierBadge(result.overallScore).classes.includes(
                    "accent-green"
                  )
                    ? "bg-accent-green"
                    : getTierBadge(result.overallScore).classes.includes(
                        "primary-blue"
                      )
                    ? "bg-primary-blue"
                    : "bg-accent-orange"
                } text-white`}
              >
                {result.readinessLevel || "Assessment Ready"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.insights?.[0] ||
                "Consistent structure and relevant examples. Keep refining metrics and conciseness for even stronger impact."}
            </p>
          </Card>

          <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-blue/10 rounded-professional">
                <Lightbulb className="w-5 h-5 text-primary-blue" />
              </div>
              <h3 className="text-xl font-bold text-dark-navy font-display">
                Your Improvement Roadmap
              </h3>
            </div>
            <div className="space-y-4">
              {(result.nextSteps && result.nextSteps.length > 0
                ? result.nextSteps
                : [
                    "Draft 2 STAR stories with quantifiable results",
                    "Practice concise openings under 30 seconds",
                    "Collect metrics for 2 recent projects",
                  ]
              ).map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-light-gray rounded-professional hover:bg-light-gray/80 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-navy">{step}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-light-gray rounded-professional">
              <p className="text-sm text-muted-foreground">
                <strong>Estimated practice time:</strong>{" "}
                {result.estimatedPracticeTime || "~30–45 minutes"}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="rounded-professional">
                Export Action Plan
              </Button>
              <Button variant="outline" className="rounded-professional">
                Copy to Clipboard
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-8"
        >
          <Card className="p-8 bg-white rounded-professional shadow-professional border-0 text-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-dark-navy font-display mb-2">
                  Ready to level up?
                </h3>
                <p className="text-muted-foreground">
                  Continue your interview preparation journey
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button
                  onClick={handleScheduleAnother}
                  className="bg-primary-blue hover:bg-primary-blue/90 text-white rounded-professional px-8 py-3"
                >
                  <Calendar className="w-4 h-4 mr-2" /> Schedule Another
                  Interview
                </Button>
                <Button
                  onClick={handleViewRecommendations}
                  variant="outline"
                  className="rounded-professional px-6 py-3"
                >
                  View All My Interviews
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default InterviewResults;
