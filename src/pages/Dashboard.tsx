import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
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
  score: number;
  duration: number;
  created_at: string;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSessions();
    }
  }, [user]);

  // Refresh data when component becomes visible (user returns from interview)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        fetchSessions();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Calculate improvement based on recent sessions
  const calculateImprovement = () => {
    if (sessions.length < 2) return "0%";

    const recentSessions = sessions.slice(0, 3); // Last 3 sessions
    const olderSessions = sessions.slice(3, 6); // Previous 3 sessions

    if (olderSessions.length === 0) return "0%";

    const recentAvg =
      recentSessions.reduce((acc, s) => acc + (s.score || 0), 0) /
      recentSessions.length;
    const olderAvg =
      olderSessions.reduce((acc, s) => acc + (s.score || 0), 0) /
      olderSessions.length;

    if (olderAvg === 0) return "0%";

    const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;
    return `${improvement > 0 ? "+" : ""}${Math.round(improvement)}%`;
  };

  // Calculate practice streak
  const calculatePracticeStreak = () => {
    if (sessions.length === 0) return "0 days";

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort sessions by date (most recent first)
    const sortedSessions = [...sessions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.created_at);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
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

  const stats = [
    {
      icon: Video,
      label: "Total Interviews",
      value: sessions.length,
      color: "from-primary to-secondary",
    },
    {
      icon: Target,
      label: "Average Score",
      value: sessions.length
        ? Math.round(
            sessions.reduce((acc, s) => acc + (s.score || 0), 0) /
              sessions.length
          )
        : 0,
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: TrendingUp,
      label: "Improvement",
      value: calculateImprovement(),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Flame,
      label: "Practice Streak",
      value: calculatePracticeStreak(),
      color: "from-orange-500 to-red-500",
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back,{" "}
                {profile?.full_name || user?.email?.split("@")[0] || "User"}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Ready to practice your interview skills?
              </p>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
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
              <Card className="glass p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold">
                  {typeof stat.value === "number" ? stat.value : stat.value}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-20"
            onClick={() => (window.location.href = "/interview/setup")}
          >
            <Mic className="w-6 h-6 mr-2" />
            Start New Interview
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="glass h-20"
            onClick={() => (window.location.href = "/dashboard/analytics")}
          >
            <BarChart3 className="w-6 h-6 mr-2" />
            View Progress
          </Button>
          <Button variant="outline" size="lg" className="glass h-20">
            <MessageCircle className="w-6 h-6 mr-2" />
            Practice Questions
          </Button>
        </div>

        {/* Recent Sessions */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Recent Sessions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {sessions.length}{" "}
                {sessions.length === 1 ? "session" : "sessions"} found
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchSessions()}
                className="glass"
                title="Refresh sessions"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="glass"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="glass"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No interview sessions yet</p>
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
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass p-4 hover:shadow-lg transition-all group cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {session.interview_type}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()} •{" "}
                          {session.duration
                            ? `${Math.round(session.duration / 60)} min`
                            : "0 min"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getScoreColor(
                            session.score || 0
                          )}`}
                        />
                        <span className="font-bold">{session.score || 0}%</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full group-hover:bg-primary/10"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
