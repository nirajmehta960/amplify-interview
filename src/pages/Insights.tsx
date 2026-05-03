import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  MessageSquare,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  LayoutDashboard,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyticsApi } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";

const Insights = () => {
  const { user } = useAuth();
  const [insightsData, setInsightsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInsightsData();
    }
  }, [user]);

  const fetchInsightsData = async () => {
    try {
      setLoading(true);
      const [overview, progress, skills] = await Promise.all([
        analyticsApi.getOverview() as Promise<any>,
        analyticsApi.getProgress() as Promise<any>,
        analyticsApi.getSkills() as Promise<any>,
      ]);
      setInsightsData(processInsightsData(overview, progress, skills));
    } catch (error) {
      console.error("Error fetching insights data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateConsistencyScore = (timeline: any[]): number => {
    if (timeline.length < 2) return 100;
    const scores = timeline.map((t) => t.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const variation = Math.sqrt(variance);
    return Math.max(0, Math.round(100 - variation));
  };

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const getNextMilestone = (avgScore: number, completedSessions: number): string => {
    if (completedSessions === 0) return "Complete your first interview";
    if (avgScore < 70) return "Achieve 70+ average score";
    if (avgScore < 80) return "Achieve 80+ average score";
    if (avgScore < 90) return "Achieve 90+ average score";
    return "Maintain excellence — you're interview ready!";
  };

  const getEstimatedTimeToReady = (avgScore: number): string => {
    if (avgScore >= 85) return "Ready now";
    if (avgScore >= 80) return "1 week";
    if (avgScore >= 75) return "1–2 weeks";
    if (avgScore >= 70) return "2–3 weeks";
    return "3–4 weeks";
  };

  const processInsightsData = (overview: any, progress: any, skills: any) => {
    const timeline: any[] = progress.score_timeline || [];
    const commTimeline: any[] = progress.communication_timeline || [];

    const consistencyScore = calculateConsistencyScore(timeline);

    const totalCostCents = overview.total_cost_cents || 0;
    const totalCost = totalCostCents / 100;
    const completedSessions = overview.completed_sessions || 0;
    const avgCostPerInterview = completedSessions > 0 ? totalCost / completedSessions : 0;

    const avgScore = overview.average_score || 0;
    const trend = (overview.performance_trend || "consistent").toLowerCase() as
      | "improving"
      | "consistent"
      | "declining";

    const avgSessionLength =
      timeline.length > 0
        ? "~" + Math.round(timeline.length > 0 ? 15 : 0) + " min"
        : "N/A";

    const scoreVariation =
      timeline.length >= 2
        ? (() => {
            const scores = timeline.map((t) => t.score);
            const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
            return Math.round(
              Math.sqrt(
                scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length
              )
            );
          })()
        : 0;

    const performancePatterns = [
      { label: "Performance Trend", value: capitalize(trend) },
      { label: "Sessions Completed", value: String(completedSessions) },
      { label: "Score Variation", value: String(scoreVariation) },
    ];

    const topStrengths: string[] = (progress.top_strengths || [])
      .slice(0, 3)
      .map((s: any) => capitalize(s.item));

    const topImprovements: string[] = (progress.top_improvements || [])
      .slice(0, 3)
      .map((s: any) => capitalize(s.item));

    const demonstratedSkills: string[] = (skills.skills_demonstrated || []).slice(0, 2);
    const skillsToPractice: string[] = (skills.skills_to_practice || []).slice(0, 2);

    const strongAreas = demonstratedSkills.map((s: string) => ({ type: s, status: "Strong" }));
    const areasToImprove = skillsToPractice.map((s: string) => ({ type: s, status: "Focus" }));

    const recommendedFocus =
      topImprovements.length > 0
        ? `Focus on ${topImprovements[0].toLowerCase()}`
        : "Maintain excellence and keep practicing";

    return {
      consistencyScore,
      totalCost,
      avgCostPerInterview,
      performancePatterns,
      confidenceTrend: trend,
      fillerWords: [] as any[],
      strengths:
        topStrengths.length > 0
          ? topStrengths
          : ["Relevant examples provided", "Concise and to the point", "Relevant details shared"],
      focusAreas:
        topImprovements.length > 0
          ? topImprovements
          : ["Improve structure for better flow", "Enhance specificity in examples", "Develop more depth in answers"],
      readinessScore: Math.round(avgScore),
      nextMilestone: getNextMilestone(avgScore, completedSessions),
      estimatedTimeToReady: getEstimatedTimeToReady(avgScore),
      recommendedFocus,
      strongAreas,
      areasToImprove,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-xl font-display font-bold text-foreground">Insights</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No insights data available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Complete interviews to see insights!</p>
          </div>
        </main>
      </div>
    );
  }

  const topStats = [
    {
      label: "Consistency Score",
      value: insightsData.consistencyScore,
      icon: Target,
      color: "primary",
      showProgress: true,
    },
    {
      label: "Performance Trend",
      value: insightsData.confidenceTrend === "improving" ? "Improving ↑" : insightsData.confidenceTrend === "declining" ? "Declining ↓" : "Consistent →",
      icon: MessageSquare,
      subtitle: `Based on recent sessions`,
      color: "accent",
    },
    {
      label: "Total Cost",
      value: `$${insightsData.totalCost.toFixed(2)}`,
      icon: DollarSign,
      subtitle: `$${insightsData.avgCostPerInterview.toFixed(2)} per interview`,
      color: "muted",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Insights - Amplify Interview</title>
        <meta name="description" content="Deep analysis of your interview performance and personalized recommendations." />
      </Helmet>

      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-xl font-display font-bold text-foreground">Insights</h1>
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground"
        >
          Deep analysis of your interview performance and personalized recommendations
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {topStats.map((stat, index) => (
            <div key={index} className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
              {stat.showProgress && (
                <Progress value={stat.value as number} className="mt-3 h-2" />
              )}
              {stat.subtitle && (
                <p className="text-sm text-muted-foreground mt-2">{stat.subtitle}</p>
              )}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Performance Patterns</h3>
            </div>
            <div className="space-y-4">
              {insightsData.performancePatterns.map((pattern: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{pattern.label}</span>
                  <span className="font-semibold text-foreground">{pattern.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Speaking Patterns</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Confidence Trend</span>
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">
                    {insightsData.confidenceTrend === "improving"
                      ? "Improving"
                      : insightsData.confidenceTrend === "declining"
                      ? "Declining"
                      : "Consistent"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-3">Most Common Filler Words:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Not tracked in current version
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Strengths & Areas for Improvement</h3>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-emerald-400 font-medium mb-3">Top Strengths</p>
                <ul className="space-y-2">
                  {insightsData.strengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-foreground/80">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-orange-400 font-medium mb-3">Focus Areas</p>
                <ul className="space-y-2">
                  {insightsData.focusAreas.map((area: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-foreground/80">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">AI Predictions & Recommendations</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Readiness Score</span>
                <span className="font-bold text-2xl text-foreground">{insightsData.readinessScore}/100</span>
              </div>
              <div className="py-3 border-b border-border/50">
                <p className="text-muted-foreground mb-1">Next Milestone:</p>
                <p className="text-foreground">{insightsData.nextMilestone}</p>
              </div>
              <div className="py-3 border-b border-border/50">
                <p className="text-muted-foreground mb-1">Estimated Time to Ready:</p>
                <p className="text-foreground font-medium">{insightsData.estimatedTimeToReady}</p>
              </div>
              <div className="py-3">
                <p className="text-muted-foreground mb-1">Recommended Focus:</p>
                <p className="text-foreground">{insightsData.recommendedFocus}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Skill Analysis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-emerald-400 font-medium mb-4">Demonstrated Skills</p>
              <div className="space-y-3">
                {insightsData.strongAreas.length > 0 ? (
                  insightsData.strongAreas.map((area: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-foreground">{area.type}</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {area.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Complete more interviews to see demonstrated skills</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-orange-400 font-medium mb-4">Skills to Practice</p>
              <div className="space-y-3">
                {insightsData.areasToImprove.length > 0 ? (
                  insightsData.areasToImprove.map((area: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <span className="text-foreground">{area.type}</span>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {area.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Keep practicing to identify skill gaps</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Insights;
