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
import { supabase } from "@/integrations/supabase/client";
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

      const [summariesResult, sessionsResult, analysesResult] = await Promise.all([
        supabase.from("interview_summary").select("*").eq("user_id", user?.id),
        supabase.from("interview_sessions").select("*").eq("user_id", user?.id),
        supabase.from("interview_analysis").select("*").eq("user_id", user?.id),
      ]);

      if (summariesResult.error || sessionsResult.error || analysesResult.error) {
        console.error("Error fetching insights data:", {
          summaries: summariesResult.error,
          sessions: sessionsResult.error,
          analyses: analysesResult.error,
        });
        return;
      }

      const processedData = processInsightsData(
        summariesResult.data || [],
        sessionsResult.data || [],
        analysesResult.data || []
      );
      setInsightsData(processedData);
    } catch (error) {
      console.error("Error fetching insights data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBestTimeOfDay = (sessions: any[]): string => {
    if (sessions.length === 0) return "Afternoon";
    const timeSlots: Record<string, number> = {
      "Early Morning": 0,
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
      Night: 0,
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
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.round(Math.sqrt(variance));
  };

  const calculateConsistencyScore = (summaries: any[]): number => {
    if (summaries.length < 2) return 100;
    const variation = calculateScoreVariation(summaries);
    return Math.max(0, Math.round(100 - variation));
  };

  const calculateConfidenceTrend = (analyses: any[]): "improving" | "consistent" | "declining" => {
    if (analyses.length < 2) return "consistent";
    const recent = analyses.slice(-3).reduce((sum, a) => sum + (a.confidence_score || 0), 0) / Math.min(3, analyses.length);
    const earlier = analyses.slice(0, 3).reduce((sum, a) => sum + (a.confidence_score || 0), 0) / Math.min(3, analyses.length);
    if (recent > earlier + 5) return "improving";
    if (recent < earlier - 5) return "declining";
    return "consistent";
  };

  const getMostCommonFillerWords = (analyses: any[]): Array<{ word: string; count: number }> => {
    const wordCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      const fillerWords = typeof a.filler_words === "string" ? JSON.parse(a.filler_words) : a.filler_words;
      if (fillerWords?.words && Array.isArray(fillerWords.words)) {
        fillerWords.words.forEach((word: string) => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
      }
    });
    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const getTopStrengths = (analyses: any[]): string[] => {
    const strengthCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      const strengths = typeof a.strengths === "string" ? JSON.parse(a.strengths) : a.strengths;
      if (Array.isArray(strengths)) {
        strengths.forEach((strength: string) => {
          const normalized = strength.toLowerCase().trim();
          strengthCounts[normalized] = (strengthCounts[normalized] || 0) + 1;
        });
      }
    });
    return Object.entries(strengthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strength]) => strength.charAt(0).toUpperCase() + strength.slice(1));
  };

  const getImprovementAreas = (analyses: any[]): string[] => {
    const improvementCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      const improvements = typeof a.improvements === "string" ? JSON.parse(a.improvements) : a.improvements;
      if (Array.isArray(improvements)) {
        improvements.forEach((improvement: string) => {
          const normalized = improvement.toLowerCase().trim();
          improvementCounts[normalized] = (improvementCounts[normalized] || 0) + 1;
        });
      }
    });
    return Object.entries(improvementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([improvement]) => improvement.charAt(0).toUpperCase() + improvement.slice(1));
  };

  const getEasiestQuestionTypes = (summaries: any[], sessions: any[]): string[] => {
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
        type: type.charAt(0).toUpperCase() + type.slice(1),
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 2)
      .map((item) => item.type);
  };

  const getHardestQuestionTypes = (summaries: any[], sessions: any[]): string[] => {
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
        type: type.charAt(0).toUpperCase() + type.slice(1),
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 2)
      .map((item) => item.type);
  };

  const getNextMilestone = (summaries: any[]): string => {
    if (summaries.length === 0) return "Complete your first interview";
    const avgScore = summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) / summaries.length;
    if (avgScore < 70) return "Achieve 70+ average score";
    if (avgScore < 80) return "Achieve 80+ average score";
    if (avgScore < 90) return "Achieve 90+ average score";
    return "Achieve 90+ average score";
  };

  const getEstimatedTimeToReady = (summaries: any[]): string => {
    if (summaries.length === 0) return "2-3 weeks";
    const avgScore = summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) / summaries.length;
    if (avgScore >= 85) return "Ready now";
    if (avgScore >= 80) return "1 week";
    if (avgScore >= 75) return "1-2 weeks";
    if (avgScore >= 70) return "2-3 weeks";
    return "3-4 weeks";
  };

  const getRecommendedFocus = (analyses: any[]): string => {
    const improvements = getImprovementAreas(analyses);
    if (improvements.length > 0) {
      return `Focus on ${improvements[0].toLowerCase()}`;
    }
    return "Maintain excellence and help others improve";
  };

  const processInsightsData = (summaries: any[], sessions: any[], analyses: any[]) => {
    const consistencyScore = calculateConsistencyScore(summaries);
    const avgFillerWords = analyses.length > 0
      ? Math.round(analyses.reduce((sum, a) => {
          const fillerWords = typeof a.filler_words === "string" ? JSON.parse(a.filler_words) : a.filler_words;
          return sum + (fillerWords?.total || 0);
        }, 0) / analyses.length)
      : 0;

    const totalCost = summaries.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0) / 100;
    const avgCostPerInterview = summaries.length > 0 ? totalCost / summaries.length : 0;

    const avgSessionLength = summaries.length > 0
      ? Math.round(summaries.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) / summaries.length / 60)
      : 0;

    const performancePatterns = [
      { label: "Best Time to Practice", value: getBestTimeOfDay(sessions) },
      { label: "Avg Session Length", value: `${avgSessionLength} min` },
      { label: "Score Variation", value: String(calculateScoreVariation(summaries)) },
    ];

    const confidenceTrend = calculateConfidenceTrend(analyses);
    const fillerWords = getMostCommonFillerWords(analyses);

    const strengths = getTopStrengths(analyses);
    const focusAreas = getImprovementAreas(analyses);

    const readinessScore = summaries.length > 0
      ? Math.round(summaries[summaries.length - 1]?.readiness_score || summaries.reduce((sum, s) => sum + (s.average_score || 0), 0) / summaries.length)
      : 0;

    const strongAreas = getEasiestQuestionTypes(summaries, sessions).map((type) => ({ type, status: "Strong" }));
    const areasToImprove = getHardestQuestionTypes(summaries, sessions).map((type) => ({ type, status: "Focus" }));

    return {
      consistencyScore,
      avgFillerWords,
      totalCost,
      avgCostPerInterview,
      performancePatterns,
      confidenceTrend,
      fillerWords,
      strengths: strengths.length > 0 ? strengths : ["Relevant examples provided", "Concise and to the point", "Relevant details provided"],
      focusAreas: focusAreas.length > 0 ? focusAreas : ["Improve structure for better flow", "Enhance structure for better flow", "Increase specificity in examples"],
      readinessScore,
      nextMilestone: getNextMilestone(summaries),
      estimatedTimeToReady: getEstimatedTimeToReady(summaries),
      recommendedFocus: getRecommendedFocus(analyses),
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
    { label: "Consistency Score", value: insightsData.consistencyScore, icon: Target, color: "primary", showProgress: true },
    { label: "Avg Filler Words", value: String(insightsData.avgFillerWords), icon: MessageSquare, subtitle: insightsData.confidenceTrend === "improving" ? "Improving" : "Consistent", color: "accent" },
    { label: "Total Cost", value: `$${insightsData.totalCost.toFixed(2)}`, icon: DollarSign, subtitle: `$${insightsData.avgCostPerInterview.toFixed(2)} per interview`, color: "muted" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Insights - Amplify Interview</title>
        <meta name="description" content="Deep analysis of your interview performance and personalized recommendations." />
      </Helmet>

      {/* Header */}
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
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground"
        >
          Deep analysis of your interview performance and personalized recommendations
        </motion.p>

        {/* Top Stats */}
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

        {/* Performance & Speaking Patterns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Performance Patterns */}
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

          {/* Speaking Patterns */}
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
                  <span className="font-semibold">{insightsData.confidenceTrend === "improving" ? "Improving" : insightsData.confidenceTrend === "declining" ? "Declining" : "Consistent"}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-3">Most Common Filler Words:</p>
                <div className="flex flex-wrap gap-2">
                  {insightsData.fillerWords.length > 0 ? (
                    insightsData.fillerWords.map((filler: any, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {filler.word} ({filler.count})
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      No filler words detected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Strengths & AI Predictions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Strengths & Areas for Improvement */}
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

          {/* AI Predictions & Recommendations */}
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

        {/* Question Type Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Question Type Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-emerald-400 font-medium mb-4">Your Strongest Areas</p>
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
                  <p className="text-muted-foreground text-sm">Complete more interviews to see your strong areas</p>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-orange-400 font-medium mb-4">Areas to Improve</p>
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
                  <p className="text-muted-foreground text-sm">Keep practicing to identify improvement areas</p>
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


