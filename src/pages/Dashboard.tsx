import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Mic,
  Video,
  Target,
  TrendingUp,
  Flame,
  Sparkles,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Lightbulb,
  RefreshCw,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [summaries, setSummaries] = useState<InterviewSummary[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSessions();
      fetchSummaries();
    }
  }, [user]);

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
    try {
      if (!user?.id) {
        throw new Error("User ID is required");
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // Profile might not exist yet, which is okay
        if (error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }
        setProfile({
          full_name:
            user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "User",
          avatar_url: user?.user_metadata?.avatar_url,
        });
        return;
      }

      if (profileData) {
        setProfile(profileData);
      } else {
        setProfile({
          full_name:
            user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "User",
          avatar_url: user?.user_metadata?.avatar_url,
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      // Fallback to user metadata
      setProfile({
        full_name:
          user?.user_metadata?.full_name ||
          user?.email?.split("@")[0] ||
          "User",
        avatar_url: user?.user_metadata?.avatar_url,
      });

      // Only show error if it's a network issue
      if (
        error?.message?.includes("network") ||
        error?.message?.includes("fetch")
      ) {
        toast({
          title: "Network Error",
          description: "Unable to fetch profile. Please check your connection.",
          variant: "destructive",
        });
      }
    }
  };

  const fetchSessions = async () => {
    try {
      if (!user?.id) {
        throw new Error("User ID is required");
      }

      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching sessions:", error);

        // Check for specific error types
        if (
          error.code === "PGRST301" ||
          error.message?.includes("network") ||
          error.message?.includes("fetch")
        ) {
          toast({
            title: "Network Error",
            description:
              "Unable to fetch interview sessions. Please check your connection and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error Loading Sessions",
            description:
              "Failed to load your interview sessions. Please try refreshing the page.",
            variant: "destructive",
          });
        }
        return;
      }

      setSessions(data || []);
    } catch (error: any) {
      console.error("Error in fetchSessions:", error);

      // Handle network errors
      if (
        error?.message?.includes("network") ||
        error?.message?.includes("fetch") ||
        error?.name === "TypeError"
      ) {
        toast({
          title: "Connection Error",
          description:
            "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading sessions.",
          variant: "destructive",
        });
      }
    }
  };

  const fetchSummaries = async () => {
    try {
      if (!user?.id) {
        throw new Error("User ID is required");
      }

      const { data, error } = await supabase
        .from("interview_summary")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching summaries:", error);

        // Check for specific error types
        if (
          error.code === "PGRST301" ||
          error.message?.includes("network") ||
          error.message?.includes("fetch")
        ) {
          toast({
            title: "Network Error",
            description:
              "Unable to fetch interview summaries. Please check your connection and try again.",
            variant: "destructive",
          });
        }
        return;
      }

      setSummaries(data || []);
    } catch (error: any) {
      console.error("Error in fetchSummaries:", error);

      // Handle network errors
      if (
        error?.message?.includes("network") ||
        error?.message?.includes("fetch") ||
        error?.name === "TypeError"
      ) {
        toast({
          title: "Connection Error",
          description:
            "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive",
        });
      }
    }
  };

  const calculateImprovement = () => {
    if (summaries.length < 2) return "+0%";

    const latestSummary = summaries[0];
    if (latestSummary?.performance_trend) {
      switch (latestSummary.performance_trend.toLowerCase()) {
        case "improving":
          return "+15%";
        case "consistent":
          return "+5%";
        case "declining":
          return "-10%";
        default:
          return "+0%";
      }
    }

    const recentSummaries = summaries.slice(0, 2);
    const olderSummaries = summaries.slice(2, 4);

    if (olderSummaries.length === 0) return "+0%";

    const recentAvg =
      recentSummaries.reduce((acc, s) => acc + (s.average_score || 0), 0) /
      recentSummaries.length;
    const olderAvg =
      olderSummaries.reduce((acc, s) => acc + (s.average_score || 0), 0) /
      olderSummaries.length;

    if (olderAvg === 0) return "+0%";

    const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;
    return `${improvement > 0 ? "+" : ""}${Math.round(improvement)}%`;
  };

  const calculatePracticeStreak = () => {
    if (summaries.length === 0) return "0 days";

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

  const calculateAverageScore = () => {
    if (summaries.length === 0) return 0;
    const totalScore = summaries.reduce(
      (acc, summary) => acc + (summary.average_score || 0),
      0
    );
    return Math.round(totalScore / summaries.length);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Interview Ready":
        return "badge-success";
      case "Almost Ready":
        return "badge-warning";
      default:
        return "badge-info";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-accent";
    if (score >= 70) return "text-warning";
    return "text-destructive";
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

  const avgScore = calculateAverageScore();
  const stats = [
    {
      icon: Video,
      label: "Total Interviews",
      value: String(summaries.length || sessions.length),
      color: "primary",
    },
    {
      icon: Target,
      label: "Average Score",
      value: String(avgScore),
      badge: avgScore > 0 ? getReadinessLevel(avgScore) : undefined,
      color: "accent",
    },
    {
      icon: TrendingUp,
      label: "Improvement",
      value: calculateImprovement(),
      subtitle: "vs previous interviews",
      color: "info",
    },
    {
      icon: Flame,
      label: "Practice Streak",
      value: calculatePracticeStreak(),
      color: "warning",
    },
  ];

  const handleRefresh = async () => {
    try {
      await Promise.all([fetchSessions(), fetchSummaries()]);
      toast({
        title: "Refreshed",
        description: "Data has been refreshed successfully.",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-display font-semibold text-lg text-foreground">
                Amplify Interview
              </span>
              <p className="text-xs text-muted-foreground">
                AI-Powered Mock Interviews
              </p>
            </div>
          </Link>

          <div className="text-center hidden md:block">
            <h1 className="font-display font-semibold text-foreground">
              Welcome back,{" "}
              {profile?.full_name || user?.email?.split("@")[0] || "User"}!
            </h1>
            <p className="text-sm text-muted-foreground">
              {getMotivationalMessage()}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full hover:bg-primary/10 p-0"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ||
                      user?.email?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/dashboard")}
                className="cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await signOut();
                    navigate("/");
                  } catch (error) {
                    console.error("Error signing out:", error);
                  }
                }}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="stat-card"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                {stat.badge && (
                  <span className="badge-success">{stat.badge}</span>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p
                  className={`text-3xl font-display font-bold ${
                    stat.color === "primary"
                      ? "text-foreground"
                      : stat.color === "accent"
                      ? "text-accent"
                      : stat.color === "info"
                      ? "text-info"
                      : "text-warning"
                  }`}
                >
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <Button
            variant="hero"
            size="xl"
            className="md:col-span-1 justify-start gap-3"
            asChild
          >
            <Link to="/interview/setup">
              <Sparkles className="w-5 h-5" />
              Start New Interview
            </Link>
          </Button>
          <Button
            variant="glass"
            size="lg"
            className="justify-start gap-3"
            asChild
          >
            <Link to="/dashboard/progress">
              <TrendingUp className="w-5 h-5" />
              Progress
            </Link>
          </Button>
          <Button
            variant="glass"
            size="lg"
            className="justify-start gap-3"
            asChild
          >
            <Link to="/dashboard/practice-questions">
              <MessageSquare className="w-5 h-5" />
              Practice Questions
            </Link>
          </Button>
          <Button
            variant="glass"
            size="lg"
            className="justify-start gap-3"
            asChild
          >
            <Link to="/dashboard/insights">
              <Lightbulb className="w-5 h-5" />
              Insights
            </Link>
          </Button>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Recent Sessions
              </h2>
              <p className="text-sm text-muted-foreground">
                {sessions.length} sessions found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No interview sessions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start your first interview to see your progress here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.slice(0, 6).map((session, index) => {
                const sessionSummary = summaries.find(
                  (summary) => summary.session_id === session.id
                );
                const sessionScore =
                  sessionSummary?.average_score || session.session_score || 0;
                const status = getReadinessLevel(sessionScore);

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                    className="session-card group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Video className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground capitalize">
                            {session.interview_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}{" "}
                            •{" "}
                            {session.duration
                              ? `${Math.round(session.duration / 60)} min`
                              : "0 min"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${getScoreColor(
                            sessionScore
                          )}`}
                        >
                          {sessionScore}%
                        </p>
                        <span className={getStatusColor(status)}>{status}</span>
                      </div>
                    </div>

                    <div className="progress-bar mb-4">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${sessionScore}%` }}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between group-hover:text-primary"
                      onClick={() => navigate(`/results/${session.id}`)}
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </Button>
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
