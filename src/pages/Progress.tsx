import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Calendar,
  Award,
  Target,
  MessageSquare,
  CheckCircle2,
  Lock,
  LayoutDashboard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  }>;
  milestones: Array<{
    icon: string;
    title: string;
    desc: string;
    points: number;
    achieved: boolean;
    date?: string;
  }>;
  practiceConsistency: {
    totalDays: number;
  };
}

const Progress = () => {
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

      const [summariesResult, sessionsResult, analysesResult] = await Promise.all([
        supabase
          .from("interview_summary")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("interview_sessions")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("interview_analysis")
          .select("*")
          .eq("user_id", user?.id),
      ]);

      if (summariesResult.error || sessionsResult.error || analysesResult.error) {
        console.error("Error fetching progress data:", {
          summaries: summariesResult.error,
          sessions: sessionsResult.error,
          analyses: analysesResult.error,
        });
        return;
      }

      const processedData = processProgressData(
        summariesResult.data || [],
        sessionsResult.data || [],
        analysesResult.data || []
      );
      setProgressData(processedData);
    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processProgressData = (
    summaries: any[],
    sessions: any[],
    analyses: any[]
  ): ProgressData => {
    const averageScore =
      summaries.length > 0
        ? summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) / summaries.length
        : 0;

    const improvementTrend =
      summaries.length >= 2
        ? (summaries[summaries.length - 1]?.average_score || 0) - (summaries[0]?.average_score || 0)
        : 0;

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
        .map((cs) => (typeof cs === "string" ? JSON.parse(cs) : cs));

      const contentScores = analyses
        .map((a) => a.content_scores)
        .filter(Boolean)
        .map((cs) => (typeof cs === "string" ? JSON.parse(cs) : cs));

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

      const confidenceScores = analyses
        .map((a) => a.confidence_score)
        .filter((score) => score !== null && score !== undefined && score > 0);

      if (confidenceScores.length > 0) {
        skillBreakdown.confidence =
          confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      } else {
        skillBreakdown.confidence = skillBreakdown.communication;
      }

      skillBreakdown.structure = skillBreakdown.communication;
    }

    Object.keys(skillBreakdown).forEach((key) => {
      skillBreakdown[key as keyof typeof skillBreakdown] = Math.max(
        0,
        Math.min(100, skillBreakdown[key as keyof typeof skillBreakdown])
      );
    });

    const interviewTypePerformance = {
      behavioral: 0,
      technical: 0,
      leadership: 0,
      custom: 0,
    };

    summaries.forEach((summary) => {
      const session = sessions.find((s) => s.id === summary.session_id);
      if (session) {
        const type = session.interview_type as keyof typeof interviewTypePerformance;
        if (interviewTypePerformance.hasOwnProperty(type)) {
          interviewTypePerformance[type] = summary.average_score || 0;
        }
      }
    });

    const timelineData = summaries.map((summary) => ({
      date: new Date(summary.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: summary.average_score || 0,
    }));

    const practiceConsistency = {
      totalDays: new Set(sessions.map((s) => new Date(s.created_at).toDateString())).size,
    };

    const milestones = [
      {
        icon: "",
        title: "First Interview",
        desc: "Complete your first mock interview",
        points: 10,
        achieved: summaries.length > 0,
        date: summaries.length > 0 ? summaries[0].created_at : undefined,
      },
      {
        icon: "",
        title: "Consistent Practice",
        desc: "Complete 3 interviews",
        points: 25,
        achieved: summaries.length >= 3,
        date: summaries.length >= 3 ? summaries[2].created_at : undefined,
      },
      {
        icon: "",
        title: "High Performer",
        desc: "Achieve an average score of 80 or higher",
        points: 50,
        achieved: averageScore >= 80,
        date: summaries.find((s) => (s.average_score || 0) >= 80)?.created_at,
      },
      {
        icon: "",
        title: "Interview Ready",
        desc: "Achieve 'Interview Ready' status",
        points: 75,
        achieved: summaries.some((s) => s.readiness_level === "ready"),
        date: summaries.find((s) => s.readiness_level === "ready")?.created_at,
      },
      {
        icon: "",
        title: "Practice Champion",
        desc: "Complete 10 interviews",
        points: 100,
        achieved: summaries.length >= 10,
        date: summaries.length >= 10 ? summaries[9].created_at : undefined,
      },
      {
        icon: "",
        title: "Excellence Seeker",
        desc: "Achieve a perfect score (95+)",
        points: 150,
        achieved: summaries.some((s) => (s.average_score || 0) >= 95),
        date: summaries.find((s) => (s.average_score || 0) >= 95)?.created_at,
      },
      {
        icon: "",
        title: "Communication Master",
        desc: "Achieve 90+ in communication skills",
        points: 75,
        achieved: skillBreakdown.communication >= 90,
        date: summaries.find((s) => {
          return analyses.some((a) => {
            const comm = typeof a.communication_scores === "string" ? JSON.parse(a.communication_scores) : a.communication_scores;
            return comm && (comm.clarity + comm.structure + comm.conciseness) / 3 >= 90;
          });
        })?.created_at,
      },
      {
        icon: "",
        title: "Content Expert",
        desc: "Achieve 90+ in content skills",
        points: 75,
        achieved: skillBreakdown.content >= 90,
        date: summaries.find((s) => {
          return analyses.some((a) => {
            const content = typeof a.content_scores === "string" ? JSON.parse(a.content_scores) : a.content_scores;
            return content && (content.relevance + content.depth + content.specificity) / 3 >= 90;
          });
        })?.created_at,
      },
      {
        icon: "",
        title: "Confidence Builder",
        desc: "Achieve 90+ in confidence",
        points: 75,
        achieved: skillBreakdown.confidence >= 90,
        date: summaries.find((s) => analyses.some((a) => (a.confidence_score || 0) >= 90))?.created_at,
      },
      {
        icon: "",
        title: "Streak Master",
        desc: "Complete 5 interviews in 5 days",
        points: 100,
        achieved: false,
      },
      {
        icon: "",
        title: "All-Rounder",
        desc: "Score 80+ in all interview types",
        points: 125,
        achieved: Object.values(interviewTypePerformance).every((score) => score >= 80),
      },
      {
        icon: "",
        title: "Improvement Champion",
        desc: "Show 20+ point improvement",
        points: 100,
        achieved: improvementTrend >= 20,
        date: summaries.find((s, index) => {
          if (index === 0) return false;
          const prevScore = summaries[index - 1]?.average_score || 0;
          return (s.average_score || 0) - prevScore >= 20;
        })?.created_at,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading progress data...</p>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-xl font-display font-bold text-foreground">Progress</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No progress data available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Complete your first interview to see your progress!</p>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    { icon: Trophy, label: "Average Score", value: String(Math.round(progressData.averageScore)), color: "primary" },
    { icon: TrendingUp, label: "Improvement", value: `${progressData.improvementTrend > 0 ? "+" : ""}${Math.round(progressData.improvementTrend)}`, color: "accent" },
    { icon: Calendar, label: "Practice Days", value: String(progressData.practiceConsistency.totalDays), color: "info" },
    { icon: Award, label: "Milestones", value: String(progressData.milestones.filter((m) => m.achieved).length), color: "warning" },
  ];

  const skillData = [
    { skill: "Communication", value: Math.round(progressData.skillBreakdown.communication), fullMark: 100 },
    { skill: "Content", value: Math.round(progressData.skillBreakdown.content), fullMark: 100 },
    { skill: "Confidence", value: Math.round(progressData.skillBreakdown.confidence), fullMark: 100 },
    { skill: "Structure", value: Math.round(progressData.skillBreakdown.structure), fullMark: 100 },
  ];

  const performanceByType = Object.entries(progressData.interviewTypePerformance)
    .filter(([_, score]) => score > 0)
    .map(([type, score]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      score: Math.round(score),
    }));

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Progress - Amplify Interview</title>
        <meta name="description" content="Track your interview improvement and celebrate your achievements." />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-xl font-display font-bold text-foreground">Progress</h1>
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground"
        >
          Track your improvement and celebrate your achievements
        </motion.p>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat, index) => (
            <div key={index} className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Score Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Score Timeline</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData.timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`${value}%`, "Score"]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Skill Development & Performance by Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Skill Development */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground text-lg">Skill Development</h3>
                <p className="text-xs text-muted-foreground">Your performance across key interview skills (0-100 scale)</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skillData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar
                    name="Skills"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {skillData.map((skill, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{skill.skill}</p>
                    <p className="text-xs text-muted-foreground">
                      {skill.skill === "Communication" && "Clarity, Structure & Conciseness"}
                      {skill.skill === "Content" && "Relevance, Depth & Specificity"}
                      {skill.skill === "Confidence" && "Speaking Confidence & Presence"}
                      {skill.skill === "Structure" && "Answer Organization & Flow"}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-primary">{skill.value}<span className="text-xs text-muted-foreground">/100</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance by Type */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Performance by Type</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Achievements & Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Achievements & Milestones</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progressData.milestones.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.03 }}
                className={`relative p-4 rounded-xl border transition-all ${
                  achievement.achieved
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-muted/30 border-border/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div>
                      <h4 className="font-semibold text-foreground">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.desc}</p>
                      {achievement.achieved ? (
                        <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Achieved: {achievement.date ? new Date(achievement.date).toLocaleDateString() : "Recently"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-2 text-muted-foreground text-sm">
                          <Lock className="w-4 h-4" />
                          <span>Keep practicing to unlock this achievement</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="text-xs">
                      {achievement.points} pts
                    </Badge>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      achievement.achieved
                        ? "bg-emerald-500/20 border-2 border-emerald-500"
                        : "bg-muted/50 border-2 border-border"
                    }`}>
                      {achievement.achieved ? (
                        <Award className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-muted/50" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Progress;


