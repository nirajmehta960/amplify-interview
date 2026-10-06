import { Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FocusNext } from "@/components/dashboard/FocusNext";
import { displayName, practiceStreak, statusLine } from "@/components/dashboard/format";
import { RecentInterviews } from "@/components/dashboard/RecentInterviews";
import { ScoreTrend } from "@/components/dashboard/ScoreTrend";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { PageContainer, PageHeader } from "@/components/shell/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The signed-in home, inside the shell (spec §4). Every number comes from the
 * API; nothing is estimated. Fetching lives in useDashboardData.
 */
const Dashboard = () => {
  const { user } = useAuth();
  const { loading, profile, sessions, overview, progress, sessionsError, analyticsError, refresh } = useDashboardData();

  return (
    <PageContainer>
      <Helmet>
        <title>Dashboard — Amplify Interview</title>
      </Helmet>
      <PageHeader
        title="Dashboard"
        subtitle="Your practice at a glance"
        actions={
          <Button asChild>
            <Link to="/interview/setup">
              <Sparkles className="mr-1.5 size-4" aria-hidden="true" />
              New interview
            </Link>
          </Button>
        }
      />
      <div className="mt-8 space-y-6">
        <WelcomeCard
          loading={loading}
          name={displayName(profile, user)}
          status={statusLine(sessions)}
          hasSessions={sessions.length > 0}
          error={sessionsError}
          onRetry={refresh}
        />
        <StatTiles
          loading={loading}
          overview={overview}
          streak={practiceStreak(progress?.score_timeline)}
          error={analyticsError}
          onRetry={refresh}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <ScoreTrend loading={loading} timeline={progress?.score_timeline} error={analyticsError} />
          <FocusNext loading={loading} improvements={progress?.top_improvements} error={analyticsError} />
        </div>
        <RecentInterviews loading={loading} sessions={sessions} onRefresh={refresh} error={sessionsError} />
      </div>
    </PageContainer>
  );
};

export default Dashboard;
