import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Mic,
  Brain,
  FileText,
  Video,
  Database,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
}

const ProcessingInterview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: "saving-responses",
      title: "Saving Responses",
      description: "Storing your answers in the database...",
      icon: <Database className="w-5 h-5" />,
      status: "processing",
      progress: 0,
    },
    {
      id: "transcription",
      title: "Generating Transcript",
      description: "Converting your speech to text...",
      icon: <Mic className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "ai-analysis",
      title: "AI Analysis",
      description: "Analyzing your performance with AI...",
      icon: <Brain className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "generating-report",
      title: "Generating Report",
      description: "Creating your detailed interview report...",
      icon: <FileText className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "finalizing",
      title: "Finalizing",
      description: "Preparing your results...",
      icon: <Sparkles className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
  ]);

  useEffect(() => {
    // Get session data from location state
    if (location.state) {
      setSessionData(location.state);
      startProcessing(location.state);
    } else {
      // If no session data, redirect to dashboard
      console.warn(
        "No session data found in location state, redirecting to dashboard"
      );
      navigate("/dashboard");
    }
  }, [location.state, navigate]);

  const updateStep = (stepId: string, updates: Partial<ProcessingStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  };

  const startProcessing = async (data: any) => {
    try {
      // Validate required data
      if (!data.sessionId) {
        throw new Error("No session ID provided");
      }
      if (!data.videoBlob) {
        throw new Error("No video blob provided");
      }

      // Step 1: Save responses to database
      updateStep("saving-responses", { status: "processing", progress: 0 });

      // Import services
      const { interviewSessionService } = await import(
        "@/services/interviewSessionService"
      );
      const { videoSegmentService } = await import(
        "@/services/videoSegmentService"
      );

      // Stop recording and get video blob
      const videoBlob = data.videoBlob;

      // End tracking for current question
      if (data.currentQuestion) {
        videoSegmentService.endQuestionSegment(
          data.currentQuestion.id,
          data.currentQuestion.text
        );
      }

      // Calculate total duration from the data passed from InterviewSession
      let totalDuration = data.totalDuration || 0;

      // If no duration was passed, calculate from recording time
      if (totalDuration === 0) {
        const recordingStartTime = videoSegmentService.getRecordingStartTime();
        const recordingEndTime = Date.now();

        if (recordingStartTime) {
          totalDuration = (recordingEndTime - recordingStartTime) / 1000;
        } else {
          const segments = videoSegmentService.getQuestionSegments();
          if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            totalDuration =
              (lastSegment.endTime - lastSegment.startTime) / 1000;
          }
        }
      }

      // Process video for transcription
      let questionResponses = [];
      let transcriptionResult;

      updateStep("saving-responses", { status: "completed", progress: 100 });
      setCurrentStep(1);
      setOverallProgress(20);

      // Step 3: Transcription
      updateStep("transcription", { status: "processing", progress: 0 });

      const { unifiedTranscriptionService } = await import(
        "@/services/unifiedTranscriptionService"
      );

      // Check for streamed transcription
      let streamed: any = null;
      if ((window as any).__dgFinalize) {
        try {
          streamed = await (window as any).__dgFinalize();
        } catch (e) {
          console.warn("Stream finalize failed, fallback to upload", e);
        }
      }

      // Process transcription using the passed question segments
      if (streamed) {
        const original = unifiedTranscriptionService.transcribeVideoDirectly;
        (unifiedTranscriptionService as any).transcribeVideoDirectly =
          async () => streamed;
        try {
          questionResponses =
            await videoSegmentService.transcribeQuestionSegments(
              videoBlob,
              data.questionSegments // Pass the segments from InterviewSession
            );
        } finally {
          (unifiedTranscriptionService as any).transcribeVideoDirectly =
            original;
        }
        transcriptionResult = streamed;
      } else {
        questionResponses =
          await videoSegmentService.transcribeQuestionSegments(
            videoBlob,
            data.questionSegments // Pass the segments from InterviewSession
          );
        transcriptionResult =
          await unifiedTranscriptionService.transcribeVideoDirectly(videoBlob);
      }

      // Save responses to database
      if (data.sessionId && questionResponses.length > 0) {
        for (const response of questionResponses) {
          await interviewSessionService.saveQuestionResponse(data.sessionId, {
            questionId: response.questionId, // Keep as string for user questions (UUID)
            questionText: response.questionText,
            responseText: response.answerText,
            duration: response.duration,
          });
        }
      }

      updateStep("transcription", { status: "completed", progress: 100 });
      setCurrentStep(2);
      setOverallProgress(40);

      // Step 4: AI Analysis
      updateStep("ai-analysis", { status: "processing", progress: 0 });

      let aiFeedback;
      try {
        const { analyzeInterviewSession } = await import(
          "@/services/coreAnalysisService"
        );
        const analysisResult = await analyzeInterviewSession(data.sessionId);

        aiFeedback = {
          overallScore: analysisResult.summary.average_score || 75,
          strengths: analysisResult.summary.overall_strengths || [
            "Good communication skills",
          ],
          improvements: analysisResult.summary.overall_improvements || [
            "Continue practicing",
          ],
          detailedFeedback:
            analysisResult.summary.role_specific_feedback ||
            "Analysis completed successfully.",
        };
      } catch (aiError) {
        console.warn("AI analysis failed, using fallback:", aiError);
        const { generateFallbackAnalysis } = await import(
          "@/services/aiAnalysisPrompts"
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
          ],
          improvements: fallbackAnalysis.improvements || [
            "Continue practicing",
          ],
          detailedFeedback:
            fallbackAnalysis.actionable_feedback ||
            "Analysis completed successfully.",
        };
      }

      updateStep("ai-analysis", { status: "completed", progress: 100 });
      setCurrentStep(3);
      setOverallProgress(60);

      // Step 5: Complete session and store video
      updateStep("generating-report", { status: "processing", progress: 0 });

      // Complete the interview session
      await interviewSessionService.completeInterviewSession(
        data.sessionId,
        totalDuration
      );

      // Store video locally
      const { localVideoStorageService } = await import(
        "@/services/localVideoStorageService"
      );
      await localVideoStorageService.initialize();
      await localVideoStorageService.storeVideo(
        data.sessionId,
        videoBlob,
        undefined,
        {
          duration: totalDuration,
          size: videoBlob.size,
          format: videoBlob.type,
        }
      );

      // Update video metadata
      await localVideoStorageService.updateVideoMetadata(data.sessionId, {
        transcription: {
          text: transcriptionResult.text,
          confidence: transcriptionResult.confidence,
          duration: transcriptionResult.duration,
        },
        aiFeedback: {
          overallScore: aiFeedback.overallScore,
          strengths: aiFeedback.strengths,
          improvements: aiFeedback.improvements,
          detailedFeedback: aiFeedback.detailedFeedback,
        },
      });

      updateStep("generating-report", { status: "completed", progress: 100 });
      setCurrentStep(4);
      setOverallProgress(80);

      // Step 6: Finalizing
      updateStep("finalizing", { status: "processing", progress: 0 });

      // Store session reference
      localStorage.setItem(
        "currentSession",
        JSON.stringify({
          sessionId: data.sessionId,
          timestamp: Date.now(),
          storageType: "database",
        })
      );

      updateStep("finalizing", { status: "completed", progress: 100 });
      setOverallProgress(100);

      // Navigate to results after a short delay
      setTimeout(() => {
        navigate(`/results/${data.sessionId}`, {
          state: {
            sessionId: data.sessionId,
            videoUrl: null,
            videoMetadata: {
              duration: totalDuration,
              size: videoBlob?.size,
              format: videoBlob?.type,
            },
            transcription: transcriptionResult.text,
            questionResponses,
            aiFeedback,
            config: data.config,
            type: data.interviewType,
            storageType: "database",
          },
        });
      }, 1500);
    } catch (error) {
      console.error("Processing error:", error);
      setError("Failed to process your interview. Please try again.");

      // Mark current step as error
      if (currentStep < steps.length) {
        updateStep(steps[currentStep].id, { status: "error", progress: 0 });
      }

      toast({
        title: "Processing Error",
        description:
          "There was an error processing your interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return step.icon;
    }
  };

  const getStepColor = (step: ProcessingStep) => {
    switch (step.status) {
      case "completed":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "processing":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Processing Failed
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <Brain className="w-8 h-8 text-blue-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Processing Your Interview
          </h1>
          <p className="text-gray-600 text-sm">
            We're analyzing your performance and generating detailed insights...
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="h-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Column - Overall Progress */}
            <div className="flex flex-col justify-center">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="text-center space-y-4">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg
                      className="w-32 h-32 transform -rotate-90"
                      viewBox="0 0 120 120"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 50 * (1 - overallProgress / 100)
                        }`}
                        className="text-blue-600 transition-all duration-500 ease-in-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {Math.round(overallProgress)}%
                        </div>
                        <div className="text-sm text-gray-500">Complete</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Overall Progress
                    </h3>
                    <p className="text-sm text-gray-600">
                      {currentStep < steps.length
                        ? `Currently: ${steps[currentStep]?.title}`
                        : "Processing complete!"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Processing Steps */}
            <div className="flex flex-col justify-center">
              <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Processing Steps
                  </h3>
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg border transition-all duration-300 ${getStepColor(
                        step
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">{getStepIcon(step)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {step.title}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">
                            {step.description}
                          </p>
                          {step.status === "processing" && (
                            <div className="mt-1">
                              <Progress value={step.progress} className="h-1" />
                            </div>
                          )}
                        </div>
                        {step.status === "completed" && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        {step.status === "error" && (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingInterview;
