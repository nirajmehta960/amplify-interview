import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
}

const InterviewResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Mock data - in real app, this would come from the interview session
  useEffect(() => {
    const mockResult: InterviewResult = {
      id: "1",
      overallScore: 78,
      performanceBadge: "Good",
      duration: 25,
      completionTime: new Date().toISOString(),
      responses: [
        {
          id: "1",
          question: "Tell me about yourself and your background.",
          answer:
            "I'm a software engineer with 5 years of experience in full-stack development. I've worked primarily with React, Node.js, and cloud technologies. I'm passionate about building scalable applications and leading technical teams.",
          score: 85,
          duration: 45,
          fillerWords: 3,
          confidence: 88,
          speakingPace: 145,
          eyeContact: 92,
        },
        {
          id: "2",
          question:
            "Describe a challenging project you worked on and how you overcame obstacles.",
          answer:
            "One challenging project was migrating our legacy system to microservices. We faced issues with data consistency and service communication. I led the team in implementing event-driven architecture and established clear communication protocols.",
          score: 72,
          duration: 90,
          fillerWords: 7,
          confidence: 75,
          speakingPace: 130,
          eyeContact: 85,
        },
        {
          id: "3",
          question: "How do you handle working under pressure?",
          answer:
            "I thrive under pressure by breaking down complex problems into manageable tasks. I prioritize effectively and communicate regularly with stakeholders about progress and potential blockers.",
          score: 80,
          duration: 60,
          fillerWords: 2,
          confidence: 82,
          speakingPace: 140,
          eyeContact: 88,
        },
      ],
      strengths: [
        "Clear communication and articulation",
        "Strong technical knowledge demonstration",
        "Good use of specific examples",
        "Confident speaking pace",
        "Excellent eye contact maintained",
      ],
      improvements: [
        "Reduce filler words (um, uh, like)",
        "Provide more quantifiable results in examples",
        "Elaborate more on impact and outcomes",
        "Practice more concise answers",
      ],
      insights: [
        "You demonstrated strong technical competency with specific examples",
        "Your communication style is clear and professional",
        "Consider practicing STAR method for behavioral questions",
        "Your confidence level was consistently high throughout",
      ],
      recommendations: [
        "Practice common behavioral questions using the STAR method",
        "Prepare quantifiable achievements for each experience",
        "Work on reducing filler words through deliberate practice",
        "Practice mock interviews to improve timing",
      ],
    };

    setTimeout(() => {
      setResult(mockResult);
      setIsLoading(false);
    }, 2000);
  }, []);

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
          </div>
        </motion.div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Summary Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Score Circle */}
              <div className="relative w-32 h-32">
                <svg
                  className="w-32 h-32 transform -rotate-90"
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
                    className="text-primary transition-all duration-2000"
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
                      className="text-3xl font-bold text-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                    >
                      {result.overallScore}
                    </motion.div>
                    <div className="text-sm text-muted-foreground">/100</div>
                  </div>
                </div>
              </div>

              {/* Performance Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <Badge
                    className={`${getPerformanceColor(
                      result.performanceBadge
                    )} text-lg px-4 py-2`}
                  >
                    {result.performanceBadge} Performance
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">{result.duration} min</p>
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

        {/* Detailed Analysis */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Response Transcriptions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
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
                          <Badge variant="outline">Q{index + 1}</Badge>
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
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2">Your Answer:</h4>
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            {response.answer}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
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
                          {response.audioUrl && (
                            <Button variant="outline" size="sm">
                              <Play className="w-4 h-4 mr-2" />
                              Play Audio
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Transcription
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </motion.div>

          {/* AI Feedback */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Strengths */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Strengths
              </h3>
              <div className="space-y-3">
                {result.strengths.map((strength, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Areas for Improvement */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Areas for Improvement
              </h3>
              <div className="space-y-3">
                {result.improvements.map((improvement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg"
                  >
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{improvement}</span>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* AI Insights */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Insights
              </h3>
              <div className="space-y-3">
                {result.insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary"
                  >
                    <span className="text-sm">{insight}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

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

            <div className="space-y-4">
              {result.responses.map((response, index) => (
                <div key={response.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      <span className="text-sm font-medium line-clamp-1 flex-1">
                        {response.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {response.duration}s
                      </span>
                      <span className="text-muted-foreground">
                        {response.fillerWords} fillers
                      </span>
                      <span
                        className={`font-bold ${getScoreColor(response.score)}`}
                      >
                        {response.score}%
                      </span>
                    </div>
                  </div>
                  <Progress value={response.score} className="h-2" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={handleScheduleAnother}
            className="bg-primary hover:bg-primary/90"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Another Interview
          </Button>
          <Button
            onClick={handleViewRecommendations}
            variant="outline"
            className="glass"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            View Recommendations
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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
              <Badge className={getPerformanceColor(result.performanceBadge)}>
                {result.performanceBadge} Performance
              </Badge>
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
