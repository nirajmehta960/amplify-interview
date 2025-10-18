import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video,
  Target,
  TrendingUp,
  Flame,
  Mic,
  BarChart3,
  MessageCircle,
  LayoutGrid,
  List,
  ChevronRight,
  LogOut,
  RefreshCw,
  Settings,
  Brain,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
// Removed EnvironmentTest and TranscriptionProviderSelector - no longer needed

interface InterviewSession {
  id: string;
  interview_type: string;
  session_score: number | null;
  duration: number;
  created_at: string;
  user_id: string;
  interview_config: any;
  questions_asked: any;
  completed_at: string | null;
}

interface InterviewSummary {
  id: string;
  session_id: string;
  user_id: string;
  total_questions: number;
  questions_answered: number;
  average_score: number | null;
  median_score: number | null;
  score_distribution: any;
  total_duration_seconds: number | null;
  average_time_per_question: number | null;
  model_breakdown: any;
  total_tokens: number | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  total_cost_cents: number | null;
  overall_strengths: any;
  overall_improvements: any;
  readiness_score: number | null;
  next_steps: any;
  performance_trend: string | null;
  role_specific_feedback: string | null;
  readiness_level: string;
  estimated_practice_time: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [summaries, setSummaries] = useState<InterviewSummary[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSessions();
      fetchSummaries();
    }
  }, [user]);

  // Refresh data when component becomes visible (user returns from interview)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        fetchSessions();
        fetchSummaries();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  // Also refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchSessions();
        fetchSummaries();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  const fetchProfile = async () => {
    // First try to get from profiles table
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    } else {
      // Fallback to user metadata if no profile exists
      setProfile({
        full_name:
          user?.user_metadata?.full_name ||
          user?.email?.split("@")[0] ||
          "User",
        avatar_url: user?.user_metadata?.avatar_url,
      });
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching sessions:", error);
        return;
      }

      console.log("Fetched sessions:", data);
      setSessions(data || []);
    } catch (error) {
      console.error("Error in fetchSessions:", error);
    }
  };

  const fetchSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_summary")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching summaries:", error);
        return;
      }

      console.log("Fetched summaries:", data);
      setSummaries(data || []);
    } catch (error) {
      console.error("Error in fetchSummaries:", error);
    }
  };

  // Authentication is now handled by ProtectedRoute component

  // Calculate improvement based on recent summaries
  const calculateImprovement = () => {
    if (summaries.length < 2) return "0%";

    // Use performance_trend from summaries if available
    const latestSummary = summaries[0];
    if (latestSummary?.performance_trend) {
      switch (latestSummary.performance_trend.toLowerCase()) {
        case "improving":
          return "+15%"; // Positive improvement
        case "consistent":
          return "+5%"; // Slight improvement
        case "declining":
          return "-10%"; // Negative trend
        default:
          return "0%";
      }
    }

    // Fallback calculation based on average scores
    const recentSummaries = summaries.slice(0, 2); // Last 2 summaries
    const olderSummaries = summaries.slice(2, 4); // Previous 2 summaries

    if (olderSummaries.length === 0) return "0%";

    const recentAvg =
      recentSummaries.reduce((acc, s) => acc + (s.average_score || 0), 0) /
      recentSummaries.length;
    const olderAvg =
      olderSummaries.reduce((acc, s) => acc + (s.average_score || 0), 0) /
      olderSummaries.length;

    if (olderAvg === 0) return "0%";

    const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;
    return `${improvement > 0 ? "+" : ""}${Math.round(improvement)}%`;
  };

  // Calculate practice streak based on summaries
  const calculatePracticeStreak = () => {
    if (summaries.length === 0) return "0 days";

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort summaries by date (most recent first)
    const sortedSummaries = [...summaries].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const summary of sortedSummaries) {
      const summaryDate = new Date(summary.created_at);
      summaryDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - summaryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === streak) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }

    return `${streak} days`;
  };

  // Calculate overall average score from summaries
  const calculateAverageScore = () => {
    if (summaries.length === 0) return 0;

    const totalScore = summaries.reduce(
      (acc, summary) => acc + (summary.average_score || 0),
      0
    );
    return Math.round(totalScore / summaries.length);
  };

  const stats = [
    {
      icon: Video,
      label: "Total Interviews",
      value: summaries.length || sessions.length, // Use summaries count, fallback to sessions
      color: "from-primary-blue to-primary-blue/80",
    },
    {
      icon: Target,
      label: "Average Score",
      value: calculateAverageScore(),
      color: "from-accent-green to-accent-green/80",
    },
    {
      icon: TrendingUp,
      label: "Improvement",
      value: calculateImprovement(),
      color: "from-primary-blue to-primary-blue/80",
    },
    {
      icon: Flame,
      label: "Practice Streak",
      value: calculatePracticeStreak(),
      color: "from-accent-orange to-accent-orange/80",
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-green";
    if (score >= 60) return "text-primary-blue";
    if (score >= 40) return "text-accent-orange";
    return "text-red-500";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-accent-green/10 border-accent-green/20 text-accent-green";
    if (score >= 60)
      return "bg-primary-blue/10 border-primary-blue/20 text-primary-blue";
    if (score >= 40)
      return "bg-accent-orange/10 border-accent-orange/20 text-accent-orange";
    return "bg-red-100 border-red-200 text-red-600";
  };

  const getReadinessLevel = (score: number) => {
    if (score >= 85) return "Interview Ready";
    if (score >= 70) return "Almost Ready";
    if (score >= 55) return "Keep Practicing";
    return "Needs Work";
  };

  const getMotivationalMessage = () => {
    const totalInterviews = summaries.length || sessions.length;
    const avgScore = calculateAverageScore();
    const streak = calculatePracticeStreak();

    if (totalInterviews === 0) {
      return "Ready to start your interview journey? Your first mock interview is just a click away!";
    }

    if (avgScore >= 80) {
      return "Excellent progress! You're performing at a high level. Ready for the next challenge?";
    }

    if (avgScore >= 60) {
      return "Great job on your recent interviews! Keep practicing to reach the next level.";
    }

    return "Every interview is a learning opportunity. Keep practicing and you'll see improvement!";
  };

  const handleViewDetails = (sessionId: string) => {
    navigate(`/results/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-gray via-white to-light-gray/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-light-gray/50 shadow-professional">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-dark-navy font-display">
                Welcome back,{" "}
                {profile?.full_name || user?.email?.split("@")[0] || "User"}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {getMotivationalMessage()}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full hover:bg-primary-blue/10"
                  >
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary-blue text-white">
                        {profile?.full_name?.charAt(0)?.toUpperCase() ||
                          user?.email?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-56">
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm p-6 hover:shadow-professional-lg transition-all duration-300 border border-light-gray/50 rounded-professional group">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-professional bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-professional group-hover:scale-110 transition-transform duration-300`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.label === "Average Score" &&
                    calculateAverageScore() > 0 && (
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(
                          calculateAverageScore()
                        )}`}
                      >
                        {getReadinessLevel(calculateAverageScore())}
                      </div>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mb-1 font-medium">
                  {stat.label}
                </p>
                <p
                  className={`text-3xl font-bold font-display ${
                    stat.label === "Average Score"
                      ? getScoreColor(calculateAverageScore())
                      : "text-dark-navy"
                  }`}
                >
                  {typeof stat.value === "number" ? stat.value : stat.value}
                </p>
                {stat.label === "Improvement" && stat.value !== "0%" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    vs previous interviews
                  </p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <Button
            size="lg"
            className="bg-primary-blue hover:bg-primary-blue/90 text-white h-20 rounded-professional shadow-professional hover:shadow-professional-lg transition-all duration-300 group flex-1"
            onClick={() => (window.location.href = "/interview/setup")}
          >
            <Mic className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
            Start New Interview
          </Button>
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <Button
              variant="outline"
              size="lg"
              className="bg-white/90 backdrop-blur-sm border-light-gray/50 hover:bg-primary-blue/5 hover:border-primary-blue/30 hover:text-primary-blue h-20 rounded-professional shadow-professional hover:shadow-professional-lg transition-all duration-300 group flex-1"
              onClick={() => (window.location.href = "/dashboard/progress")}
            >
              <TrendingUp className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
              Progress
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/90 backdrop-blur-sm border-light-gray/50 hover:bg-primary-blue/5 hover:border-primary-blue/30 hover:text-primary-blue h-20 rounded-professional shadow-professional hover:shadow-professional-lg transition-all duration-300 group flex-1"
              onClick={() => (window.location.href = "/dashboard/insights")}
            >
              <Brain className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
              Insights
            </Button>
          </div>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/90 backdrop-blur-sm p-6 rounded-professional shadow-professional border border-light-gray/50"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-dark-navy font-display">
                Recent Sessions
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {sessions.length}{" "}
                {sessions.length === 1 ? "session" : "sessions"} found
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  fetchSessions();
                  fetchSummaries();
                }}
                className="bg-white/50 border-light-gray/50 hover:bg-primary-blue/10 hover:border-primary-blue/30"
                title="Refresh sessions"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="bg-white/50 border-light-gray/50 hover:bg-primary-blue/10 hover:border-primary-blue/30"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="bg-white/50 border-light-gray/50 hover:bg-primary-blue/10 hover:border-primary-blue/30"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary-blue/10 rounded-professional flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-primary-blue" />
              </div>
              <p className="text-muted-foreground font-medium">
                No interview sessions yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Start your first interview to see your progress here
              </p>
            </div>
          ) : (
            <div
              className={`max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 ${
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-4"
              }`}
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#d1d5db #f3f4f6",
              }}
            >
              {sessions.map((session, index) => {
                // Find corresponding summary for this session
                const sessionSummary = summaries.find(
                  (summary) => summary.session_id === session.id
                );
                const sessionScore =
                  sessionSummary?.average_score || session.session_score || 0;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm p-4 hover:shadow-professional-lg transition-all duration-300 group cursor-pointer border border-light-gray/50 rounded-professional">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary-blue/10 rounded-professional">
                            <Video className="w-4 h-4 text-primary-blue" />
                          </div>
                          <div>
                            <Badge
                              variant="secondary"
                              className="mb-2 bg-light-gray/50 text-dark-navy border-0"
                            >
                              {session.interview_type}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                session.created_at
                              ).toLocaleDateString()}{" "}
                              •{" "}
                              {session.duration
                                ? `${Math.round(session.duration / 60)} min`
                                : "0 min"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreBadgeColor(
                              sessionScore
                            )}`}
                          >
                            {sessionScore}%
                          </div>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                sessionScore >= 80
                                  ? "bg-accent-green"
                                  : sessionScore >= 60
                                  ? "bg-primary-blue"
                                  : sessionScore >= 40
                                  ? "bg-accent-orange"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {getReadinessLevel(sessionScore)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="w-full bg-light-gray rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              sessionScore >= 80
                                ? "bg-accent-green"
                                : sessionScore >= 60
                                ? "bg-primary-blue"
                                : sessionScore >= 40
                                ? "bg-accent-orange"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${sessionScore}%` }}
                          ></div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full group-hover:bg-primary-blue/10 text-primary-blue hover:text-primary-blue font-medium"
                        onClick={() => handleViewDetails(session.id)}
                      >
                        View Details
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
