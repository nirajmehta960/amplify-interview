import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Target,
  Calendar,
  Award,
  Clock,
  BarChart3,
  Activity,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
} from "recharts";

interface ProgressData {
  averageScore: number;
  totalInterviews: number;
  improvementTrend: number;
  skillBreakdown: {
    communication: number;
    content: number;
    confidence: number;
    structure: number;
  };
  interviewTypePerformance: {
    behavioral: number;
    technical: number;
    leadership: number;
    custom: number;
  };
  timelineData: Array<{
    date: string;
    score: number;
    interviewType: string;
  }>;
  milestones: Array<{
    title: string;
    description: string;
    achieved: boolean;
    date?: string;
  }>;
  practiceConsistency: {
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    averagePerWeek: number;
  };
}

const ProgressTab = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProgressData();
    }
  }, [user]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        throw new Error("User ID is required");
      }

      // Fetch interview summaries for progress analysis
      const { data: summaries, error: summariesError } = await supabase
        .from("interview_summary")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (summariesError) {
        console.error("Error fetching summaries:", summariesError);
        if (summariesError.code === "PGRST301" || summariesError.message?.includes("network") || summariesError.message?.includes("fetch")) {
          throw new Error("Network error: Unable to fetch summaries. Please check your connection.");
        }
        throw new Error(`Failed to fetch summaries: ${summariesError.message}`);
      }

      // Fetch interview sessions for timeline data
      const { data: sessions, error: sessionsError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
        if (sessionsError.code === "PGRST301" || sessionsError.message?.includes("network") || sessionsError.message?.includes("fetch")) {
          throw new Error("Network error: Unable to fetch sessions. Please check your connection.");
        }
        throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
      }

      // Fetch interview analysis for skill breakdown
      const { data: analyses, error: analysesError } = await supabase
        .from("interview_analysis")
        .select("*")
        .eq("user_id", user.id);

      if (analysesError) {
        console.error("Error fetching analyses:", analysesError);
        if (analysesError.code === "PGRST301" || analysesError.message?.includes("network") || analysesError.message?.includes("fetch")) {
          throw new Error("Network error: Unable to fetch analyses. Please check your connection.");
        }
        // Don't throw for analyses error - we can still show progress without it
        console.warn("Analyses fetch failed, continuing without skill breakdown data");
      }

      // Process the data
      const processedData = processProgressData(summaries || [], sessions || [], analyses || []);
      setProgressData(processedData);
    } catch (error: any) {
      console.error("Error fetching progress data:", error);
      
      // Set empty data on error to show empty state
      setProgressData({
        averageScore: 0,
        improvementTrend: 0,
        skillBreakdown: {
          communication: 0,
          content: 0,
          confidence: 0,
          structure: 0,
        },
        timeline: [],
      });
      
      // Show user-friendly error message
      if (error?.message?.includes("network") || error?.message?.includes("fetch") || error?.name === "TypeError") {
        // Network error - could show toast notification if toast is available
      }
    } finally {
      setLoading(false);
    }
  };

  const processProgressData = (
    summaries: any[],
    sessions: any[],
    analyses: any[]
  ): ProgressData => {
    // Calculate average score
    const averageScore =
      summaries.length > 0
        ? summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) /
          summaries.length
        : 0;

    // Calculate improvement trend
    const improvementTrend =
      summaries.length >= 2
        ? (summaries[summaries.length - 1]?.average_score || 0) -
          (summaries[0]?.average_score || 0)
        : 0;

    // Calculate skill breakdown from analyses
    const skillBreakdown = {
      communication: 0,
      content: 0,
      confidence: 0,
      structure: 0,
    };

    if (analyses.length > 0) {
      const commScores = analyses
        .map((a) => a.communication_scores)
        .filter(Boolean)
        .map((cs) => {
          if (typeof cs === "string") return JSON.parse(cs);
          return cs;
        });

      const contentScores = analyses
        .map((a) => a.content_scores)
        .filter(Boolean)
        .map((cs) => {
          if (typeof cs === "string") return JSON.parse(cs);
          return cs;
        });

      if (commScores.length > 0) {
        skillBreakdown.communication =
          commScores.reduce(
            (sum, cs) => sum + (cs.clarity + cs.structure + cs.conciseness) / 3,
            0
          ) / commScores.length;
      }

      if (contentScores.length > 0) {
        skillBreakdown.content =
          contentScores.reduce(
            (sum, cs) => sum + (cs.relevance + cs.depth + cs.specificity) / 3,
            0
          ) / contentScores.length;
      }

      // Calculate confidence score more robustly
      const confidenceScores = analyses
        .map((a) => a.confidence_score)
        .filter((score) => score !== null && score !== undefined && score > 0);

      if (confidenceScores.length > 0) {
        skillBreakdown.confidence =
          confidenceScores.reduce((sum, score) => sum + score, 0) /
          confidenceScores.length;
      } else {
        // Fallback: use communication score as proxy for confidence if no confidence data
        skillBreakdown.confidence = skillBreakdown.communication;
      }

      skillBreakdown.structure = skillBreakdown.communication; // Use communication structure as proxy
    }

    // Ensure all skill scores are properly bounded and reasonable
    skillBreakdown.communication = Math.max(
      0,
      Math.min(100, skillBreakdown.communication)
    );
    skillBreakdown.content = Math.max(0, Math.min(100, skillBreakdown.content));
    skillBreakdown.confidence = Math.max(
      0,
      Math.min(100, skillBreakdown.confidence)
    );
    skillBreakdown.structure = Math.max(
      0,
      Math.min(100, skillBreakdown.structure)
    );

    // If confidence is still very low (less than 20), use a more reasonable fallback
    if (skillBreakdown.confidence < 20) {
      skillBreakdown.confidence = Math.max(
        skillBreakdown.communication * 0.8,
        30
      );
    }

    // Calculate skill breakdown
      structure: skillBreakdown.structure,
      analysesCount: analyses.length,
      confidenceScores: analyses.map((a) => a.confidence_score),
    });

    // Calculate interview type performance
    const interviewTypePerformance = {
      behavioral: 0,
      technical: 0,
      leadership: 0,
      custom: 0,
    };

    summaries.forEach((summary) => {
      const session = sessions.find((s) => s.id === summary.session_id);
      if (session) {
        const type =
          session.interview_type as keyof typeof interviewTypePerformance;
        if (interviewTypePerformance.hasOwnProperty(type)) {
          interviewTypePerformance[type] = summary.average_score || 0;
        }
      }
    });

    // Create timeline data
    const timelineData = summaries.map((summary, index) => {
      const session = sessions.find((s) => s.id === summary.session_id);
      return {
        date: new Date(summary.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: summary.average_score || 0,
        interviewType: session?.interview_type || "unknown",
      };
    });

    // Calculate practice consistency
    const practiceConsistency = {
      currentStreak: 1, // Simplified calculation
      longestStreak: 1,
      totalDays: new Set(
        sessions.map((s) => new Date(s.created_at).toDateString())
      ).size,
      averagePerWeek:
        sessions.length /
        Math.max(
          1,
          (Date.now() -
            new Date(sessions[0]?.created_at || Date.now()).getTime()) /
            (1000 * 60 * 60 * 24 * 7)
        ),
    };

    // Define comprehensive milestones
    const milestones = [
      {
        title: "First Interview",
        description: "Complete your first mock interview",
        achieved: summaries.length > 0,
        date: summaries.length > 0 ? summaries[0].created_at : undefined,
        icon: "",
        points: 10,
      },
      {
        title: "Consistent Practice",
        description: "Complete 3 interviews",
        achieved: summaries.length >= 3,
        date: summaries.length >= 3 ? summaries[2].created_at : undefined,
        icon: "",
        points: 25,
      },
      {
        title: "High Performer",
        description: "Achieve an average score of 80 or higher",
        achieved: averageScore >= 80,
        date: summaries.find((s) => (s.average_score || 0) >= 80)?.created_at,
        icon: "",
        points: 50,
      },
      {
        title: "Interview Ready",
        description: "Achieve 'Interview Ready' status",
        achieved: summaries.some((s) => s.readiness_level === "ready"),
        date: summaries.find((s) => s.readiness_level === "ready")?.created_at,
        icon: "",
        points: 75,
      },
      {
        title: "Practice Champion",
        description: "Complete 10 interviews",
        achieved: summaries.length >= 10,
        date: summaries.length >= 10 ? summaries[9].created_at : undefined,
        icon: "",
        points: 100,
      },
      {
        title: "Excellence Seeker",
        description: "Achieve a perfect score (95+)",
        achieved: summaries.some((s) => (s.average_score || 0) >= 95),
        date: summaries.find((s) => (s.average_score || 0) >= 95)?.created_at,
        icon: "",
        points: 150,
      },
      {
        title: "Communication Master",
        description: "Achieve 90+ in communication skills",
        achieved: skillBreakdown.communication >= 90,
        date: summaries.find((s) => {
          // Check if any analysis has high communication scores
          return analyses.some((a) => {
            const comm =
              typeof a.communication_scores === "string"
                ? JSON.parse(a.communication_scores)
                : a.communication_scores;
            return (
              comm &&
              (comm.clarity + comm.structure + comm.conciseness) / 3 >= 90
            );
          });
        })?.created_at,
        icon: "",
        points: 75,
      },
      {
        title: "Content Expert",
        description: "Achieve 90+ in content skills",
        achieved: skillBreakdown.content >= 90,
        date: summaries.find((s) => {
          return analyses.some((a) => {
            const content =
              typeof a.content_scores === "string"
                ? JSON.parse(a.content_scores)
                : a.content_scores;
            return (
              content &&
              (content.relevance + content.depth + content.specificity) / 3 >=
                90
            );
          });
        })?.created_at,
        icon: "",
        points: 75,
      },
      {
        title: "Confidence Builder",
        description: "Achieve 90+ in confidence",
        achieved: skillBreakdown.confidence >= 90,
        date: summaries.find((s) => {
          return analyses.some((a) => (a.confidence_score || 0) >= 90);
        })?.created_at,
        icon: "",
        points: 75,
      },
      {
        title: "Streak Master",
        description: "Complete 5 interviews in 5 days",
        achieved: practiceConsistency.longestStreak >= 5,
        date: undefined,
        icon: "",
        points: 100,
      },
      {
        title: "All-Rounder",
        description: "Score 80+ in all interview types",
        achieved: Object.values(interviewTypePerformance).every(
          (score) => score >= 80
        ),
        date: undefined,
        icon: "",
        points: 125,
      },
      {
        title: "Improvement Champion",
        description: "Show 20+ point improvement",
        achieved: improvementTrend >= 20,
        date: summaries.find((s, index) => {
          if (index === 0) return false;
          const prevScore = summaries[index - 1]?.average_score || 0;
          return (s.average_score || 0) - prevScore >= 20;
        })?.created_at,
        icon: "",
        points: 100,
      },
    ];

    return {
      averageScore,
      totalInterviews: summaries.length,
      improvementTrend,
      skillBreakdown,
      interviewTypePerformance,
      timelineData,
      milestones,
      practiceConsistency,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No progress data available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete your first interview to see your progress!
        </p>
      </div>
    );
  }

  const radarData = [
    {
      skill: "Communication",
      value: Math.round(progressData.skillBreakdown.communication),
      fullMark: 100,
      description: "Clarity, Structure & Conciseness",
    },
    {
      skill: "Content",
      value: Math.round(progressData.skillBreakdown.content),
      fullMark: 100,
      description: "Relevance, Depth & Specificity",
    },
    {
      skill: "Confidence",
      value: Math.round(progressData.skillBreakdown.confidence),
      fullMark: 100,
      description: "Speaking Confidence & Presence",
    },
    {
      skill: "Structure",
      value: Math.round(progressData.skillBreakdown.structure),
      fullMark: 100,
      description: "Answer Organization & Flow",
    },
  ];

  const interviewTypeData = Object.entries(
    progressData.interviewTypePerformance
  )
    .filter(([_, score]) => score > 0)
    .map(([type, score]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      score,
    }));

  return (
    <TabWrapper
      title="Progress"
      description="Track your improvement and celebrate your achievements"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Target className="w-8 h-8 text-primary-blue mx-auto mb-2" />
            <div className="text-2xl font-bold text-dark-navy">
              {Math.round(progressData.averageScore)}
            </div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </Card>

          <Card className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-dark-navy">
              {progressData.improvementTrend > 0 ? "+" : ""}
              {Math.round(progressData.improvementTrend)}
            </div>
            <div className="text-sm text-muted-foreground">Improvement</div>
          </Card>

          <Card className="p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-dark-navy">
              {progressData.practiceConsistency.totalDays}
            </div>
            <div className="text-sm text-muted-foreground">Practice Days</div>
          </Card>

          <Card className="p-4 text-center">
            <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-dark-navy">
              {progressData.milestones.filter((m) => m.achieved).length}
            </div>
            <div className="text-sm text-muted-foreground">Milestones</div>
          </Card>
        </div>

        {/* Progress Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Score Timeline
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData.timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, "Score"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skill Development Radar */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Skill Development
              </h3>
              <p className="text-sm text-gray-600">
                Your performance across key interview skills (0-100 scale)
              </p>
            </div>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fontSize: 12, fill: "#374151" }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickCount={6}
                  />
                  <Radar
                    name="Your Skills"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Skill breakdown with descriptions */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {radarData.map((skill, index) => (
                <div
                  key={skill.skill}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {skill.skill}
                    </div>
                    <div className="text-xs text-gray-500">
                      {skill.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{skill.value}</div>
                    <div className="text-xs text-gray-500">/100</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interview Type Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Performance by Type
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interviewTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: any) => [`${value}%`, "Score"]} />
                  <Bar dataKey="score" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Milestones */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Achievements & Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progressData.milestones.map((milestone, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                  milestone.achieved
                    ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg"
                    : "border-gray-200 bg-gray-50 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{milestone.icon}</span>
                      <div>
                        <h4 className="font-semibold text-dark-navy">
                          {milestone.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {milestone.description}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              milestone.achieved
                                ? "border-green-300 text-green-700 bg-green-100"
                                : "border-gray-300 text-gray-600"
                            }`}
                          >
                            {milestone.points} pts
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {milestone.achieved && milestone.date && (
                      <p className="text-xs text-green-600 font-medium">
                        Achieved:{" "}
                        {new Date(milestone.date).toLocaleDateString()}
                      </p>
                    )}
                    {!milestone.achieved && (
                      <p className="text-xs text-gray-500">
                        Keep practicing to unlock this achievement
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      milestone.achieved
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg"
                        : "bg-gray-300"
                    }`}
                  >
                    {milestone.achieved ? (
                      <Award className="w-6 h-6 text-white" />
                    ) : (
                      <div className="w-6 h-6 border-2 border-white rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TabWrapper>
  );
};

export default ProgressTab;
