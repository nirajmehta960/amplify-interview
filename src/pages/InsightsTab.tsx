import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  MessageSquare,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import TabWrapper from "@/components/TabWrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface InsightsData {
  performancePatterns: {
    bestTimeOfDay: string;
    averageSessionLength: number;
    scoreVariation: number;
    consistencyScore: number;
  };
  speakingPatterns: {
    averageFillerWords: number;
    speakingPaceTrend: "improving" | "consistent" | "declining";
    confidenceTrend: "improving" | "consistent" | "declining";
    mostCommonFillerWords: Array<{ word: string; count: number }>;
  };
  questionAnalysis: {
    easiestQuestionTypes: string[];
    hardestQuestionTypes: string[];
    averageTimePerQuestion: number;
    timeEfficiency: number;
  };
  costAnalysis: {
    totalCost: number;
    averageCostPerInterview: number;
    tokenUsage: {
      total: number;
      average: number;
      trend: "increasing" | "decreasing" | "stable";
    };
  };
  strengthsAndWeaknesses: {
    topStrengths: string[];
    improvementAreas: string[];
    recurringFeedback: Array<{ feedback: string; frequency: number }>;
  };
  predictions: {
    readinessScore: number;
    nextMilestone: string;
    estimatedTimeToReady: string;
    recommendedFocus: string;
  };
}

const InsightsTab = () => {
  const { user } = useAuth();
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInsightsData();
    }
  }, [user]);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);

      // Fetch all relevant data
      const [summariesResult, sessionsResult, analysesResult] =
        await Promise.all([
          supabase
            .from("interview_summary")
            .select("*")
            .eq("user_id", user?.id),
          supabase
            .from("interview_sessions")
            .select("*")
            .eq("user_id", user?.id),
          supabase
            .from("interview_analysis")
            .select("*")
            .eq("user_id", user?.id),
        ]);

      if (
        summariesResult.error ||
        sessionsResult.error ||
        analysesResult.error
      ) {
        console.error("Error fetching insights data:", {
          summaries: summariesResult.error,
          sessions: sessionsResult.error,
          analyses: analysesResult.error,
        });
        return;
      }

      const summaries = summariesResult.data || [];
      const sessions = sessionsResult.data || [];
      const analyses = analysesResult.data || [];

      console.log("🔍 INSIGHTS DATA VERIFICATION:", {
        summaries: summaries.length,
        sessions: sessions.length,
        analyses: analyses.length,
        summaryData: summaries.slice(0, 2), // Show first 2 summaries
        analysisData: analyses.slice(0, 2), // Show first 2 analyses
        sessionData: sessions.slice(0, 2), // Show first 2 sessions
      });

      const processedData = processInsightsData(summaries, sessions, analyses);
      console.log("📊 PROCESSED INSIGHTS DATA:", processedData);
      setInsightsData(processedData);
    } catch (error) {
      console.error("Error fetching insights data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processInsightsData = (
    summaries: any[],
    sessions: any[],
    analyses: any[]
  ): InsightsData => {
    // Performance Patterns
    const performancePatterns = {
      bestTimeOfDay: getBestTimeOfDay(sessions),
      averageSessionLength:
        summaries.length > 0
          ? summaries.reduce(
              (sum, s) => sum + (s.total_duration_seconds || 0),
              0
            ) /
            summaries.length /
            60
          : 0,
      scoreVariation: calculateScoreVariation(summaries),
      consistencyScore: calculateConsistencyScore(summaries),
    };

    // Speaking Patterns
    const speakingPatterns = {
      averageFillerWords:
        analyses.length > 0
          ? analyses.reduce((sum, a) => {
              const fillerWords =
                typeof a.filler_words === "string"
                  ? JSON.parse(a.filler_words)
                  : a.filler_words;
              return sum + (fillerWords?.total || 0);
            }, 0) / analyses.length
          : 0,
      speakingPaceTrend: calculateSpeakingPaceTrend(analyses),
      confidenceTrend: calculateConfidenceTrend(analyses),
      mostCommonFillerWords: getMostCommonFillerWords(analyses),
    };

    // Question Analysis
    const questionAnalysis = {
      easiestQuestionTypes: getEasiestQuestionTypes(summaries, sessions),
      hardestQuestionTypes: getHardestQuestionTypes(summaries, sessions),
      averageTimePerQuestion:
        summaries.length > 0
          ? summaries.reduce(
              (sum, s) => sum + (s.average_time_per_question || 0),
              0
            ) / summaries.length
          : 0,
      timeEfficiency: calculateTimeEfficiency(summaries),
    };

    // Cost Analysis
    const costAnalysis = {
      totalCost:
        summaries.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0) / 100,
      averageCostPerInterview:
        summaries.length > 0
          ? summaries.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0) /
            summaries.length /
            100
          : 0,
      tokenUsage: {
        total: summaries.reduce((sum, s) => sum + (s.total_tokens || 0), 0),
        average:
          summaries.length > 0
            ? summaries.reduce((sum, s) => sum + (s.total_tokens || 0), 0) /
              summaries.length
            : 0,
        trend: "stable" as const, // Simplified
      },
    };

    // Strengths and Weaknesses
    const strengthsAndWeaknesses = {
      topStrengths: getTopStrengths(analyses),
      improvementAreas: getImprovementAreas(analyses),
      recurringFeedback: getRecurringFeedback(analyses),
    };

    // Predictions
    const predictions = {
      readinessScore:
        summaries.length > 0
          ? summaries[summaries.length - 1]?.readiness_score || 0
          : 0,
      nextMilestone: getNextMilestone(summaries),
      estimatedTimeToReady: getEstimatedTimeToReady(summaries),
      recommendedFocus: getRecommendedFocus(analyses),
    };

    return {
      performancePatterns,
      speakingPatterns,
      questionAnalysis,
      costAnalysis,
      strengthsAndWeaknesses,
      predictions,
    };
  };

  // Helper functions
  const getBestTimeOfDay = (sessions: any[]): string => {
    if (sessions.length === 0) return "Morning";

    const timeSlots = {
      "Early Morning": 0, // 6-9 AM
      Morning: 0, // 9-12 PM
      Afternoon: 0, // 12-5 PM
      Evening: 0, // 5-8 PM
      Night: 0, // 8-11 PM
    };

    sessions.forEach((session) => {
      const hour = new Date(session.created_at).getHours();
      if (hour >= 6 && hour < 9) timeSlots["Early Morning"]++;
      else if (hour >= 9 && hour < 12) timeSlots["Morning"]++;
      else if (hour >= 12 && hour < 17) timeSlots["Afternoon"]++;
      else if (hour >= 17 && hour < 20) timeSlots["Evening"]++;
      else timeSlots["Night"]++;
    });

    return Object.entries(timeSlots).sort((a, b) => b[1] - a[1])[0][0];
  };

  const calculateScoreVariation = (summaries: any[]): number => {
    if (summaries.length < 2) return 0;
    const scores = summaries.map((s) => s.average_score || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;
    return Math.sqrt(variance);
  };

  const calculateConsistencyScore = (summaries: any[]): number => {
    if (summaries.length < 2) return 100;
    const variation = calculateScoreVariation(summaries);
    return Math.max(0, 100 - variation);
  };

  const calculateSpeakingPaceTrend = (
    analyses: any[]
  ): "improving" | "consistent" | "declining" => {
    if (analyses.length < 2) return "consistent";
    const recent =
      analyses.slice(-3).reduce((sum, a) => sum + (a.speaking_pace || 2), 0) /
      3;
    const earlier =
      analyses.slice(0, 3).reduce((sum, a) => sum + (a.speaking_pace || 2), 0) /
      3;
    if (recent < earlier) return "improving";
    if (recent > earlier) return "declining";
    return "consistent";
  };

  const calculateConfidenceTrend = (
    analyses: any[]
  ): "improving" | "consistent" | "declining" => {
    if (analyses.length < 2) return "consistent";
    const recent =
      analyses
        .slice(-3)
        .reduce((sum, a) => sum + (a.confidence_score || 0), 0) / 3;
    const earlier =
      analyses
        .slice(0, 3)
        .reduce((sum, a) => sum + (a.confidence_score || 0), 0) / 3;
    if (recent > earlier) return "improving";
    if (recent < earlier) return "declining";
    return "consistent";
  };

  const getMostCommonFillerWords = (
    analyses: any[]
  ): Array<{ word: string; count: number }> => {
    const wordCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      const fillerWords =
        typeof a.filler_words === "string"
          ? JSON.parse(a.filler_words)
          : a.filler_words;
      if (fillerWords?.words) {
        fillerWords.words.forEach((word: string) => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
      }
    });
    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getEasiestQuestionTypes = (
    summaries: any[],
    sessions: any[]
  ): string[] => {
    const typeScores: Record<string, number[]> = {};
    summaries.forEach((summary) => {
      const session = sessions.find((s) => s.id === summary.session_id);
      if (session) {
        const type = session.interview_type;
        if (!typeScores[type]) typeScores[type] = [];
        typeScores[type].push(summary.average_score || 0);
      }
    });
    return Object.entries(typeScores)
      .map(([type, scores]) => ({
        type,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 2)
      .map((item) => item.type);
  };

  const getHardestQuestionTypes = (
    summaries: any[],
    sessions: any[]
  ): string[] => {
    const typeScores: Record<string, number[]> = {};
    summaries.forEach((summary) => {
      const session = sessions.find((s) => s.id === summary.session_id);
      if (session) {
        const type = session.interview_type;
        if (!typeScores[type]) typeScores[type] = [];
        typeScores[type].push(summary.average_score || 0);
      }
    });
    return Object.entries(typeScores)
      .map(([type, scores]) => ({
        type,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 2)
      .map((item) => item.type);
  };

  const calculateTimeEfficiency = (summaries: any[]): number => {
    if (summaries.length === 0) return 0;
    const avgTime =
      summaries.reduce(
        (sum, s) => sum + (s.average_time_per_question || 0),
        0
      ) / summaries.length;
    // Assume 2-3 minutes per question is optimal
    return Math.max(0, 100 - (avgTime - 150) / 2);
  };

  const getTopStrengths = (analyses: any[]): string[] => {
    const strengthCounts: Record<string, number> = {};
    const strengthScores: Record<string, number[]> = {};

    analyses.forEach((a) => {
      const strengths =
        typeof a.strengths === "string" ? JSON.parse(a.strengths) : a.strengths;
      if (Array.isArray(strengths)) {
        strengths.forEach((strength: string) => {
          const normalizedStrength = strength.toLowerCase().trim();
          strengthCounts[normalizedStrength] =
            (strengthCounts[normalizedStrength] || 0) + 1;

          // Also track the score associated with this strength
          if (!strengthScores[normalizedStrength]) {
            strengthScores[normalizedStrength] = [];
          }
          strengthScores[normalizedStrength].push(a.overall_score || 0);
        });
      }
    });

    // Calculate weighted scores (frequency * average score)
    const weightedStrengths = Object.entries(strengthCounts).map(
      ([strength, count]) => {
        const avgScore = strengthScores[strength]
          ? strengthScores[strength].reduce((sum, score) => sum + score, 0) /
            strengthScores[strength].length
          : 0;
        const weight = count * (avgScore / 100); // Normalize score to 0-1
        return { strength, count, weight };
      }
    );

    return weightedStrengths
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(
        ({ strength }) => strength.charAt(0).toUpperCase() + strength.slice(1)
      );
  };

  const getImprovementAreas = (analyses: any[]): string[] => {
    const improvementCounts: Record<string, number> = {};
    const improvementScores: Record<string, number[]> = {};

    analyses.forEach((a) => {
      const improvements =
        typeof a.improvements === "string"
          ? JSON.parse(a.improvements)
          : a.improvements;
      if (Array.isArray(improvements)) {
        improvements.forEach((improvement: string) => {
          const normalizedImprovement = improvement.toLowerCase().trim();
          improvementCounts[normalizedImprovement] =
            (improvementCounts[normalizedImprovement] || 0) + 1;

          // Track the score associated with this improvement area
          if (!improvementScores[normalizedImprovement]) {
            improvementScores[normalizedImprovement] = [];
          }
          improvementScores[normalizedImprovement].push(a.overall_score || 0);
        });
      }
    });

    // Calculate priority scores (frequency * inverse of average score)
    // Lower scores indicate more critical improvement areas
    const priorityImprovements = Object.entries(improvementCounts).map(
      ([improvement, count]) => {
        const avgScore = improvementScores[improvement]
          ? improvementScores[improvement].reduce(
              (sum, score) => sum + score,
              0
            ) / improvementScores[improvement].length
          : 0;
        const priority = count * ((100 - avgScore) / 100); // Higher priority for lower scores
        return { improvement, count, priority };
      }
    );

    return priorityImprovements
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(
        ({ improvement }) =>
          improvement.charAt(0).toUpperCase() + improvement.slice(1)
      );
  };

  const getRecurringFeedback = (
    analyses: any[]
  ): Array<{ feedback: string; frequency: number }> => {
    const feedbackCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      if (a.actionable_feedback) {
        const feedback = a.actionable_feedback.toLowerCase();
        feedbackCounts[feedback] = (feedbackCounts[feedback] || 0) + 1;
      }
    });
    return Object.entries(feedbackCounts)
      .map(([feedback, frequency]) => ({ feedback, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);
  };

  const getNextMilestone = (summaries: any[]): string => {
    if (summaries.length === 0) return "Complete your first interview";
    if (summaries.length < 3) return "Complete 3 interviews";
    if (summaries.length < 5) return "Complete 5 interviews";
    if (summaries.length < 10) return "Complete 10 interviews";

    const avgScore =
      summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) /
      summaries.length;
    if (avgScore < 70) return "Achieve 70+ average score";
    if (avgScore < 80) return "Achieve 80+ average score";
    if (avgScore < 90) return "Achieve 90+ average score";
    if (summaries.some((s) => (s.average_score || 0) >= 95))
      return "Achieve perfect score";
    return "Maintain excellence";
  };

  const getEstimatedTimeToReady = (summaries: any[]): string => {
    if (summaries.length === 0) return "2-3 weeks";
    const avgScore =
      summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) /
      summaries.length;

    // Calculate improvement trend
    const recentScores = summaries.slice(-3).map((s) => s.average_score || 0);
    const earlierScores = summaries
      .slice(0, 3)
      .map((s) => s.average_score || 0);
    const recentAvg =
      recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const earlierAvg =
      earlierScores.reduce((sum, score) => sum + score, 0) /
      earlierScores.length;
    const improvementRate = recentAvg - earlierAvg;

    if (avgScore >= 85) return "Ready now";
    if (avgScore >= 80) return "1 week";
    if (avgScore >= 75) return "1-2 weeks";
    if (avgScore >= 70) return "2-3 weeks";
    if (improvementRate > 5) return "2-3 weeks";
    return "3-4 weeks";
  };

  const getRecommendedFocus = (analyses: any[]): string => {
    if (analyses.length === 0) return "Start with basic communication skills";

    const avgConfidence =
      analyses.reduce((sum, a) => sum + (a.confidence_score || 0), 0) /
      analyses.length;
    const avgScore =
      analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) /
      analyses.length;

    // Analyze communication vs content scores
    const commScores = analyses
      .map((a) => {
        const comm =
          typeof a.communication_scores === "string"
            ? JSON.parse(a.communication_scores)
            : a.communication_scores;
        return comm
          ? (comm.clarity + comm.structure + comm.conciseness) / 3
          : 0;
      })
      .filter((score) => score > 0);

    const contentScores = analyses
      .map((a) => {
        const content =
          typeof a.content_scores === "string"
            ? JSON.parse(a.content_scores)
            : a.content_scores;
        return content
          ? (content.relevance + content.depth + content.specificity) / 3
          : 0;
      })
      .filter((score) => score > 0);

    const avgCommScore =
      commScores.length > 0
        ? commScores.reduce((sum, score) => sum + score, 0) / commScores.length
        : 0;
    const avgContentScore =
      contentScores.length > 0
        ? contentScores.reduce((sum, score) => sum + score, 0) /
          contentScores.length
        : 0;

    if (avgConfidence < 5)
      return "Focus on building confidence and reducing nervousness";
    if (avgCommScore < 70) return "Work on communication clarity and structure";
    if (avgContentScore < 70)
      return "Improve content depth and specific examples";
    if (avgScore < 75) return "Practice with more challenging questions";
    return "Maintain excellence and help others improve";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No insights data available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete a few interviews to see detailed insights!
        </p>
      </div>
    );
  }

  const costData = [
    {
      name: "Total Spent",
      value: insightsData.costAnalysis.totalCost,
      color: "#3b82f6",
    },
    {
      name: "Avg per Interview",
      value: insightsData.costAnalysis.averageCostPerInterview,
      color: "#10b981",
    },
  ];

  const performanceData = [
    {
      metric: "Consistency",
      value: insightsData.performancePatterns.consistencyScore,
    },
    {
      metric: "Time Efficiency",
      value: insightsData.questionAnalysis.timeEfficiency,
    },
    {
      metric: "Confidence",
      value:
        insightsData.speakingPatterns.confidenceTrend === "improving" ? 80 : 60,
    },
  ];

  return (
    <TabWrapper
      title="Insights"
      description="Deep analysis of your interview performance and personalized recommendations"
    >
      <div className="space-y-6">
        {/* Key Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  Consistency Score
                </div>
                <div className="text-2xl font-bold text-dark-navy">
                  {Math.round(
                    insightsData.performancePatterns.consistencyScore
                  )}
                </div>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <Progress
              value={insightsData.performancePatterns.consistencyScore}
              className="mt-2"
            />
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  Avg Filler Words
                </div>
                <div className="text-2xl font-bold text-dark-navy">
                  {Math.round(insightsData.speakingPatterns.averageFillerWords)}
                </div>
              </div>
              <MessageSquare className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {insightsData.speakingPatterns.speakingPaceTrend === "improving"
                ? "Improving"
                : "Needs work"}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-2xl font-bold text-dark-navy">
                  ${insightsData.costAnalysis.totalCost.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ${insightsData.costAnalysis.averageCostPerInterview.toFixed(2)}{" "}
              per interview
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Patterns */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Performance Patterns
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Best Time to Practice</span>
                <Badge variant="outline">
                  {insightsData.performancePatterns.bestTimeOfDay}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Session Length</span>
                <span className="font-medium">
                  {Math.round(
                    insightsData.performancePatterns.averageSessionLength
                  )}{" "}
                  min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Score Variation</span>
                <span className="font-medium">
                  {Math.round(insightsData.performancePatterns.scoreVariation)}
                </span>
              </div>
            </div>
          </Card>

          {/* Speaking Patterns */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Speaking Patterns
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Confidence Trend</span>
                <div className="flex items-center">
                  {insightsData.speakingPatterns.confidenceTrend ===
                  "improving" ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : insightsData.speakingPatterns.confidenceTrend ===
                    "declining" ? (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <Activity className="w-4 h-4 text-gray-500 mr-1" />
                  )}
                  <span className="text-sm capitalize">
                    {insightsData.speakingPatterns.confidenceTrend}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  Most Common Filler Words:
                </span>
                <div className="flex flex-wrap gap-1">
                  {insightsData.speakingPatterns.mostCommonFillerWords
                    .slice(0, 3)
                    .map((item, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {item.word} ({item.count})
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strengths & Weaknesses */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Strengths & Areas for Improvement
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  Top Strengths
                </h4>
                <div className="space-y-1">
                  {insightsData.strengthsAndWeaknesses.topStrengths.map(
                    (strength, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        {strength}
                      </div>
                    )
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-orange-700 mb-2">
                  Focus Areas
                </h4>
                <div className="space-y-1">
                  {insightsData.strengthsAndWeaknesses.improvementAreas.map(
                    (area, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <AlertCircle className="w-3 h-3 text-orange-500 mr-2" />
                        {area}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* AI Predictions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              AI Predictions & Recommendations
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Readiness Score</span>
                <span className="font-bold text-lg">
                  {insightsData.predictions.readinessScore}/100
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">Next Milestone:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {insightsData.predictions.nextMilestone}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">
                  Estimated Time to Ready:
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {insightsData.predictions.estimatedTimeToReady}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Recommended Focus:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {insightsData.predictions.recommendedFocus}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Question Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Question Type Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">
                Your Strongest Areas
              </h4>
              <div className="space-y-2">
                {insightsData.questionAnalysis.easiestQuestionTypes.map(
                  (type, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-green-50 rounded"
                    >
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="outline" className="text-green-700">
                        Strong
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-orange-700 mb-2">
                Areas to Improve
              </h4>
              <div className="space-y-2">
                {insightsData.questionAnalysis.hardestQuestionTypes.map(
                  (type, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-orange-50 rounded"
                    >
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="outline" className="text-orange-700">
                        Focus
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </TabWrapper>
  );
};

export default InsightsTab;
