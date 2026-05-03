import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Video,
  Target,
  TrendingUp,
  Flame,
  Sparkles,
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Lightbulb,
  Search,
  Bell,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  analyticsApi,
  interviewApi,
  SessionListItem,
  userApi,
  UserProfile,
} from "@/services/apiClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface OverviewData {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  performance_trend: string;
  recent_scores: number[];
}

interface ProgressData {
  score_timeline: { date: string; score: number; mode: string; readiness: string }[];
}

const toneClasses: Record<string, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  accent: { bg: "bg-accent/10", text: "text-accent", ring: "ring-accent/20" },
  info: { bg: "bg-info/10", text: "text-info", ring: "ring-info/20" },
  warning: { bg: "bg-warning/10", text: "text-warning", ring: "ring-warning/20" },
};

const statusBadge = (status: string) =>
  status === "Interview Ready" ? "badge-success" : status === "Almost Ready" ? "badge-warning" : "badge-info";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        fetchSessions();
        fetchAnalytics();
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
        fetchAnalytics();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  const fetchAll = async () => {
    await Promise.all([fetchProfile(), fetchSessions(), fetchAnalytics()]);
  };

  const fetchProfile = async () => {
    try {
      const data = await userApi.getProfile();
      setProfile(data);
    } catch (error) {
      // Fallback to Firebase user metadata
      setProfile({
        uid: user?.uid || "",
        email: user?.email || undefined,
        display_name: user?.displayName || user?.email?.split("@")[0] || "User",
        avatar_url: user?.photoURL || undefined,
      });
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await interviewApi.listSessions(20);
      setSessions(data);
    } catch (error: any) {
      toast({
        title: "Error Loading Sessions",
        description: "Failed to load your interview sessions. Please try refreshing.",
        variant: "destructive",
      });
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [ov, prog] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getProgress(),
      ]);
      setOverview(ov as OverviewData);
      setProgress(prog as ProgressData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const calculateImprovement = () => {
    if (!overview) return "+0%";
    switch (overview.performance_trend.toLowerCase()) {
      case "improving":
        return "+15%";
      case "consistent":
        return "+5%";
      case "declining":
        return "-10%";
      default:
        return "+0%";
    }
  };

  const calculatePracticeStreak = () => {
    const timeline = progress?.score_timeline;
    if (!timeline?.length) return "0 days";

    const uniqueDays = [
      ...new Set(
        timeline.map((t) => {
          const d = new Date(t.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      ),
    ]
      .map((t) => new Date(t))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (const day of uniqueDays) {
      const daysDiff = Math.floor(
        (checkDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return `${streak} days`;
  };

  const calculateAverageScore = () => {
    return Math.round(overview?.average_score || 0);
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
    const totalInterviews = overview?.total_sessions ?? sessions.length;
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

  const displayName =
    profile?.display_name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const avgScore = calculateAverageScore();
  const totalInterviews = overview?.total_sessions ?? sessions.length;

  const stats = useMemo(
    () => [
      {
        icon: Video,
        label: "Total Interviews",
        value: String(totalInterviews),
        trend: overview ? `${overview.completed_sessions} completed` : "—",
        tone: "primary",
      },
      {
        icon: Target,
        label: "Average Score",
        value: String(avgScore),
        trend: avgScore > 0 ? getReadinessLevel(avgScore) : "No sessions yet",
        tone: "accent",
      },
      {
        icon: TrendingUp,
        label: "Improvement",
        value: calculateImprovement(),
        trend: "vs last sessions",
        tone: "info",
      },
      {
        icon: Flame,
        label: "Practice Streak",
        value: calculatePracticeStreak(),
        trend: "Keep it going",
        tone: "warning",
      },
    ],
    [totalInterviews, overview, avgScore, progress],
  );

  const handleRefresh = async () => {
    try {
      await Promise.all([fetchSessions(), fetchAnalytics()]);
      toast({
        title: "Refreshed",
        description: "Data has been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="h-full px-6 flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

              <div className="relative flex-1 max-w-md hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search interviews, questions, transcripts…"
                  className="pl-9 h-10 bg-secondary/60 border-transparent focus:bg-card"
                />
              </div>

              <div className="flex-1 md:hidden" />

              <div className="flex items-center gap-2">
                <Button variant="glass" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/interview/setup" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    New Interview
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10 p-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard")}
                      className="cursor-pointer"
                    >
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          await signOut();
                          navigate("/", { replace: true });
                        } catch {
                          navigate("/", { replace: true });
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
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
              {/* Welcome + readiness */}
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {overview?.completed_sessions ? `${overview.completed_sessions} sessions completed` : "Ready when you are"}
                      </span>
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                      Welcome back, {displayName}
                    </h1>
                    <p className="text-muted-foreground max-w-xl mb-6">{getMotivationalMessage()}</p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="hero" size="lg" asChild>
                        <Link to="/interview/setup" className="gap-2">
                          Start New Interview
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="glass" size="lg" asChild>
                        <Link to="/dashboard/practice-questions" className="gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Practice Questions
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground">Interview Readiness</p>
                    <span className={getStatusColor(getReadinessLevel(avgScore))}>
                      {avgScore > 0 ? getReadinessLevel(avgScore) : "—"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="font-display text-5xl font-bold text-foreground">{avgScore}</span>
                    <span className="text-muted-foreground">/ 100</span>
                  </div>
                  <div className="progress-bar mb-4">
                    <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(100, avgScore))}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-auto">
                    {overview?.performance_trend ? `Trend: ${overview.performance_trend}` : "Complete a session to see analytics."}
                  </p>
                </div>
              </motion.section>

              {/* Stats row */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => {
                  const t = toneClasses[stat.tone];
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center mb-4`}>
                        <stat.icon className={`w-5 h-5 ${t.text}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="font-display text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                    </motion.div>
                  );
                })}
              </section>

              {/* Recent sessions */}
              <section className="rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">Recent Interviews</h2>
                    <p className="text-sm text-muted-foreground">Your latest sessions</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-muted-foreground">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {sessions.length === 0 ? (
                  <div className="p-10 text-center">
                    <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No interview sessions yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start your first interview to see your progress here.
                    </p>
                    <Button variant="hero" className="mt-6" asChild>
                      <Link to="/interview/setup" className="gap-2">
                        Start New Interview
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {sessions.slice(0, 8).map((s, i) => {
                      const score = s.overall_score ?? 0;
                      const status = s.readiness_level || getReadinessLevel(score);
                      return (
                        <motion.li
                          key={s.session_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.25, delay: i * 0.03 }}
                          className="group p-5 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Video className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground truncate capitalize">{s.mode}</p>
                              {score > 0 && <span className={statusBadge(status)}>{status}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(s.created_at).toLocaleDateString()} • {s.question_count} questions
                            </p>
                          </div>
                          <div className="hidden sm:flex flex-col items-end w-24">
                            <p className="font-display text-lg font-bold text-foreground leading-none">
                              {score > 0 ? `${score}%` : "—"}
                            </p>
                            <div className="w-20 h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => navigate(`/results/${s.session_id}`)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
