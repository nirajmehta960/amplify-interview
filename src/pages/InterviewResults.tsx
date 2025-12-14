import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
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
  ArrowLeft,
  Trophy,
  ChevronDown,
  ChevronUp,
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
  Tooltip,
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
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

  // Helper function to get interview type display name
  const getInterviewTypeDisplay = (sessionData: any): string => {
    // First try to get interview type from analysis data (most accurate)
    const analyses = (sessionData as any)?._analyses;

    if (analyses && analyses.length > 0) {
      const firstAnalysis = analyses[0];
      const interviewType = firstAnalysis.interview_type;
      const customDomain = firstAnalysis.custom_domain;

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
      console.log("Fetching AI analysis data for session:", sessionId);
      const { aiAnalysisService } = await import(
        "../services/aiAnalysisService"
      );

      const analyses = await aiAnalysisService.getSessionAnalyses(sessionId);

      const summary = await aiAnalysisService.getSummaryBySession(sessionId);

      if (analyses.length > 0 || summary) {
        // Store analysis data for later use
        (sessionData as any)._analyses = analyses;
        (sessionData as any)._summary = summary;

        // Update individual question responses with analysis scores
        if (analyses.length > 0) {
          console.log("Starting analysis mapping, analyses.length:", analyses.length);

          // Prefer mapping by interview_response_id, then fallback to question_id
          const byResponseId = new Map<string, any>();
          const byQuestionId = new Map<number, any>();

          analyses.forEach((a: any) => {
            if (a?.interview_response_id) {
              byResponseId.set(String(a.interview_response_id), a);
            }
            if (typeof a?.question_id === "number") {
              byQuestionId.set(a.question_id, a);
            }
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
                console.log(`Found analysis by response ID: ${rid}`);
              } else if (byQuestionId.has(qid)) {
                analysis = byQuestionId.get(qid);
                console.log(`Found analysis by question ID: ${qid}`);
              } else {
                // Fallback: try to match by index if we have the same number of analyses and responses
                if (idx < analyses.length) {
                  analysis = analyses[idx];
                  console.log(`Fallback - using analysis by index ${idx}`);
                } else {
                  console.log(`No analysis found for response ID: ${rid}, question ID: ${qid}`);
                }
              }


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

          console.log("Final mapped responses:", sessionData.questionResponses.map((r: any) => ({
            questionId: r.questionId,
            responseId: r.responseId,
            strengths: r.strengths,
            improvements: r.improvements,
            actionable_feedback: r.actionable_feedback,
            improved_example: r.improved_example,
          })));
        }
      }
    } catch (analysisError) {
      console.error("Could not fetch AI analysis data:", analysisError);
      console.error("Analysis error details:", {
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

        console.log("Loading scenario detection:", {
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
            "SCENARIO 1: Post-Interview Results (Direct Navigation)"
          );
          sessionData = location.state as any;
          finalSessionId = sessionData.sessionId;
          console.log("Using session data from location.state:", sessionData);
        }
        // SCENARIO 2: Historical Session View (View Details)
        else if (hasUrlParams && !hasLocationState) {
          console.log("SCENARIO 2: Historical Session View (View Details)");
          finalSessionId = sessionIdFromParams || sessionIdFromUrl;

          if (finalSessionId) {
            try {
              console.log(
                "Fetching session data from database:",
                finalSessionId
              );
              const dbSessionData =
                await interviewSessionService.fetchInterviewSession(
                  finalSessionId
                );
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
            "SCENARIO 3: Both present - prioritizing URL params (Historical View)"
          );
          finalSessionId = sessionIdFromParams || sessionIdFromUrl;

          if (finalSessionId) {
            try {
              console.log(
                "Fetching session data from database:",
                finalSessionId
              );
              const dbSessionData =
                await interviewSessionService.fetchInterviewSession(
                  finalSessionId
                );
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
          console.log("FALLBACK: Trying local storage");
          const fallbackSessionId =
            sessionIdFromParams ||
            sessionIdFromUrl ||
            localInterviewStorageService.getCurrentSessionId();

          if (fallbackSessionId) {
            try {
              const storedData =
                localInterviewStorageService.getSession(fallbackSessionId);
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
              "Attempting to fetch AI analysis data for session:",
              finalSessionId
            );
            const { aiAnalysisService } = await import(
              "../services/aiAnalysisService"
            );
            const analyses = await aiAnalysisService.getSessionAnalyses(
              finalSessionId
            );
            const summary = await aiAnalysisService.getSummaryBySession(
              finalSessionId
            );

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
                  "Starting analysis mapping, analyses.length:",
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
              "Could not fetch AI analysis data:",
              analysisError
            );
            console.error("Analysis error details:", {
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
        label: "Exceptional",
        classes:
          "bg-gradient-to-r from-accent-green to-accent-green/80 text-white",
      };
    if (score >= 80)
      return {
        label: "Excellent",
        classes:
          "bg-gradient-to-r from-primary-blue to-primary-blue/80 text-white",
      };
    if (score >= 70)
      return {
        label: "Strong",
        classes:
          "bg-gradient-to-r from-accent-green to-accent-green/80 text-white",
      };
    if (score >= 60)
      return {
        label: "Developing",
        classes:
          "bg-gradient-to-r from-accent-orange to-accent-orange/80 text-white",
      };
    return {
      label: "Building",
      classes: "bg-gradient-to-r from-accent-orange to-red-500 text-white",
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-green";
    if (score >= 60) return "text-primary-blue";
    if (score >= 40) return "text-accent-orange";
    return "text-red-500";
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

    // Debug logging removed to prevent infinite loop

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
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-primary";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Helper functions for new design
  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: "Excellent", variant: "default" as const };
    if (score >= 70) return { label: "Good", variant: "secondary" as const };
    if (score >= 50) return { label: "Fair", variant: "outline" as const };
    return { label: "Needs Work", variant: "destructive" as const };
  };

  const getReadinessBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "ready":
        return {
          label: "Ready",
          className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        };
      case "almost":
      case "almost ready":
        return {
          label: "Almost Ready",
          className: "bg-primary/20 text-primary border-primary/30",
        };
      default:
        return {
          label: "Needs Practice",
          className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        };
    }
  };

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  // Format date for new design
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!result) return null;

  const scoreBadge = getScoreBadge(result.overallScore);
  const readinessBadge = getReadinessBadge(result.readinessLevel || "ready");

  // Prepare performance data for chart
  const performanceData = result.responses.map((r, idx) => ({
    question: `Q${idx + 1}`,
    score: r.score || 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Interview Results - Amplify Interview</title>
        <meta
          name="description"
          content="View your interview analytics, performance scores, and improvement suggestions."
        />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm hidden sm:inline">Back</span>
            </Link>
            <div className="text-center flex-1">
              <h1 className="text-base sm:text-lg md:text-xl font-display font-bold text-foreground">
                Interview Analytics
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {getInterviewTypeDisplay(result.sessionData || {})} Mock Interview • {formatDate(result.completionTime)}
              </p>
            </div>
            <div className="w-12 sm:w-20 md:w-32" />
          </div>
        </div>
      </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Overall Score */}
          <div className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {scoreBadge.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl font-display font-bold ${
                    result.overallScore >= 85
                      ? "text-emerald-400"
                      : result.overallScore >= 70
                      ? "text-primary"
                      : result.overallScore >= 50
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {displayedScore}
                </span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Great performance!
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  Complete
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Duration</p>
              <p className="text-4xl font-display font-bold text-foreground">
                {result.duration > 0 && isFinite(result.duration)
                  ? `${Math.floor(result.duration / 60)}m ${Math.round(result.duration % 60)}s`
                  : "0m 0s"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Interview length</p>
            </div>
          </div>

          {/* Questions */}
          <div className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Complete
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Questions</p>
              <p className="text-4xl font-display font-bold text-foreground">
                {result.responses.length}
              </p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{
                    width: `${(result.responses.length / (result.responses.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Readiness Level */}
          <div className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <Badge className={readinessBadge.className}>
                  {readinessBadge.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Readiness Level</p>
              <p className="text-4xl font-display font-bold text-foreground capitalize">
                {result.readinessLevel || "ready"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Interview readiness</p>
            </div>
          </div>
        </motion.div>

        {/* Insights Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Superpower */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Superpower</h3>
                <p className="text-xs text-muted-foreground">Top Strength</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80">
              {result.strengths?.[0] || "Clear communication"}
            </p>
          </div>

          {/* Focus Area */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Focus On</h3>
                <p className="text-xs text-muted-foreground">Improvement Area</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80">
              {result.improvements?.[0] || "Tighter structure"}
            </p>
          </div>

          {/* Next Step */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-cyan-500/30 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Next Move</h3>
                <p className="text-xs text-muted-foreground">Action Step</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80">
              {result.nextSteps?.[0] || result.recommendations?.[0] || "Practice STAR examples for recent projects"}
            </p>
          </div>
        </motion.div>

        {/* Video and Chart Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
        >
          {/* Video Recording */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Play className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    Your Interview Recording
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Watch your performance and review your responses
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Complete
                </Badge>
                {totalDuration > 0 && isFinite(totalDuration) && (
                  <span className="text-sm text-muted-foreground">
                    {Math.floor(totalDuration / 60)}m {Math.round(totalDuration % 60)}s
                  </span>
                )}
              </div>
            </div>

            {/* Video Player Placeholder */}
            <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden mb-4 group cursor-pointer">
              {!videoUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-white font-medium">Video Not Available</p>
                  <p className="text-white/60 text-sm mt-2">
                    This interview was recorded locally and is not accessible in production.
                  </p>
                </div>
              ) : (
                <>
                  {isConverting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <div className="text-center text-white">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">Converting video to MP4...</p>
                      </div>
                    </div>
                  )}

                  {!videoPlaying && !isConverting && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-20"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.play();
                          setVideoPlaying(true);
                        }
                      }}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                      <p className="text-white mt-4 font-medium">Interview Recording</p>
                      <p className="text-white/60 text-sm">Click to play</p>
                    </div>
                  )}

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
                      setPlaybackRate((e.target as HTMLVideoElement).playbackRate)
                    }
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    style={{ display: videoPlaying ? "block" : "none" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </>
              )}
            </div>

            {/* Controls */}
            {videoUrl && (() => {
                const videoFormat = result?.videoMetadata?.format || "video/webm";
                const isMP4 = isMP4Format(videoFormat);
                const formatName = getFormatDisplayName(videoFormat);
                const fileExtension = getFileExtension(videoFormat);

                return (
                  <div className="flex items-center justify-between mb-4">
                    {isMP4 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = videoUrl;
                          link.download = `interview-${result.id}.${fileExtension}`;
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download {formatName}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = videoUrl;
                            link.download = `interview-${result.id}.${fileExtension}`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Download {formatName}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={async () => {
                            if (!videoUrl) return;
                            try {
                              setIsConverting(true);
                              toast({
                                title: "Converting Video",
                                description: "Converting to MP4 format for better compatibility...",
                              });

                              const response = await fetch(videoUrl);
                              const videoBlob = await response.blob();
                              const mp4Blob = await videoConversionService.convertWebMToMP4(videoBlob);

                              const link = document.createElement("a");
                              link.href = URL.createObjectURL(mp4Blob);
                              link.download = `interview-${result.id}.mp4`;
                              link.click();

                              toast({
                                title: "Download Complete",
                                description: "MP4 video downloaded successfully!",
                              });
                            } catch (error) {
                              console.error("MP4 conversion failed:", error);
                              toast({
                                title: "Conversion Failed",
                                description: "Failed to convert to MP4. Please try downloading the WebM version.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsConverting(false);
                            }
                          }}
                          disabled={isConverting}
                        >
                          <Download className="w-4 h-4" />
                          {isConverting ? "Converting..." : "Download MP4"}
                        </Button>
                      </>
                    )}
                    <div className="flex items-center gap-1">
                      {["0.75x", "1x", "1.25x", "1.5x"].map((speed) => (
                        <Button
                          key={speed}
                          variant={playbackRate === parseFloat(speed) ? "default" : "ghost"}
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.playbackRate = parseFloat(speed);
                              setPlaybackRate(parseFloat(speed));
                            }
                          }}
                        >
                          {speed}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={async () => {
                          try {
                            if (videoRef.current && (document as any).pictureInPictureEnabled) {
                              if ((document as any).pictureInPictureElement) {
                                await (document as any).exitPictureInPicture();
                              } else {
                                await (videoRef.current as any).requestPictureInPicture();
                              }
                            }
                          } catch {}
                        }}
                      >
                        PiP
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Chapters */}
              {videoUrl && chapters.length > 0 && totalDuration > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Chapters</span>
                    </div>
                    <span className="text-muted-foreground">
                      {Math.floor(currentTime)}s / {Math.floor(totalDuration)}s
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
                        className={`absolute top-0 h-full ${markerColor(ch.score)} hover:opacity-80 transition-opacity`}
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
                  <div className="flex justify-between text-xs text-muted-foreground">
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

            {/* Performance Trend */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Performance Trend</h3>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={chartType === "bar" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setChartType("bar")}
                  >
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Bar
                  </Button>
                  <Button
                    variant={chartType === "line" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setChartType("line")}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Line
                  </Button>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="question"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="question"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar
                        dataKey="score"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
        </motion.div>

        {/* Response Transcriptions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Response Transcriptions</h3>
          </div>

          <div className="space-y-3">
            {result.responses.map((response, index) => {
              const questionId = response.id || `q${index}`;
              const isExpanded = expandedQuestions.includes(questionId);
              const score = response.score || 0;
              
              return (
                <div
                  key={questionId}
                  className="border border-border/50 rounded-xl overflow-hidden bg-card/30"
                >
                  <button
                    onClick={() => toggleQuestion(questionId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        className={
                          score >= 85
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : score >= 70
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }
                      >
                        Q{index + 1}
                      </Badge>
                      <span className="text-foreground text-left">{response.question}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-semibold ${
                          score >= 85
                            ? "text-emerald-400"
                            : score >= 70
                            ? "text-primary"
                            : score >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {score}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 space-y-4"
                    >
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Your Response
                        </h4>
                        <p className="text-foreground/80 text-sm leading-relaxed">
                          {response.answer || "No response available"}
                        </p>
                      </div>
                      {response.actionable_feedback && (
                        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                          <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            AI Feedback
                          </h4>
                          <p className="text-foreground/80 text-sm">{response.actionable_feedback}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Readiness Assessment & Improvement Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Readiness Assessment */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">
                Your Readiness Assessment
              </h3>
            </div>
            <Badge className={`${readinessBadge.className} mb-4`}>
              {readinessBadge.label}
            </Badge>
            <p className="text-foreground/70 text-sm leading-relaxed">
              {result.insights?.[0] || result.recommendations?.[0] || "Your interview performance shows strong potential. Continue practicing to improve consistency and depth in your responses."}
            </p>
          </div>

          {/* Improvement Roadmap */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">
                Your Improvement Roadmap
              </h3>
            </div>

            <div className="space-y-3">
              {(result.improvements || result.recommendations || []).slice(0, 7).map((item: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-foreground/80 text-sm">{item}</p>
                </div>
              ))}
            </div>

            {result.estimatedPracticeTime && (
              <div className="mt-6 bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Estimated practice time:{" "}
                    <span className="text-emerald-300">{result.estimatedPracticeTime}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-8 text-center"
        >
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">
            Ready to level up?
          </h3>
          <p className="text-muted-foreground mb-6">
            Continue your interview preparation journey
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="hero" size="lg" className="gap-2" onClick={() => navigate("/interview/setup")}>
              <Calendar className="w-5 h-5" />
              Schedule Another Interview
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
              View All My Interviews
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default InterviewResults;
