import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  Award,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Clock,
  MessageSquare,
  Brain,
  Users,
  Zap,
  BookOpen,
  Trophy,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
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
} from "recharts";
import { format, subDays, subWeeks, subMonths } from "date-fns";

interface AnalyticsData {
  scoreTrend: Array<{ date: string; score: number }>;
  performanceByType: Array<{ type: string; score: number; count: number }>;
  timeDistribution: Array<{
    category: string;
    time: number;
    percentage: number;
  }>;
  practiceFrequency: Array<{ date: string; count: number }>;
  skillDevelopment: Array<{ skill: string; current: number; previous: number }>;
  insights: string[];
  recommendations: string[];
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  unlockedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [selectedDateRange, setSelectedDateRange] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real app, this would come from your backend
  useEffect(() => {
    const mockData: AnalyticsData = {
      scoreTrend: [
        { date: "2024-01-01", score: 65 },
        { date: "2024-01-08", score: 72 },
        { date: "2024-01-15", score: 68 },
        { date: "2024-01-22", score: 78 },
        { date: "2024-01-29", score: 82 },
        { date: "2024-02-05", score: 85 },
        { date: "2024-02-12", score: 78 },
      ],
      performanceByType: [
        { type: "Behavioral", score: 82, count: 5 },
        { type: "Technical", score: 75, count: 3 },
        { type: "Leadership", score: 88, count: 2 },
        { type: "Custom", score: 79, count: 4 },
      ],
      timeDistribution: [
        { category: "Speaking", time: 45, percentage: 60 },
        { category: "Thinking", time: 20, percentage: 27 },
        { category: "Listening", time: 10, percentage: 13 },
      ],
      practiceFrequency: [
        { date: "2024-02-01", count: 1 },
        { date: "2024-02-03", count: 1 },
        { date: "2024-02-05", count: 2 },
        { date: "2024-02-07", count: 1 },
        { date: "2024-02-10", count: 1 },
        { date: "2024-02-12", count: 1 },
      ],
      skillDevelopment: [
        { skill: "Communication", current: 85, previous: 72 },
        { skill: "Confidence", current: 78, previous: 65 },
        { skill: "Technical", current: 82, previous: 75 },
        { skill: "Leadership", current: 70, previous: 68 },
        { skill: "Problem Solving", current: 88, previous: 80 },
      ],
      insights: [
        "Your communication skills have improved significantly over the past month",
        "You perform best in leadership scenarios, showing natural aptitude",
        "Consider focusing more on technical interview preparation",
        "Your confidence levels are trending upward consistently",
      ],
      recommendations: [
        "Practice more behavioral questions using the STAR method",
        "Focus on system design questions for technical interviews",
        "Work on reducing filler words in your responses",
        "Try mock interviews with industry-specific questions",
      ],
      achievements: [
        {
          id: "1",
          title: "First Interview",
          description: "Completed your first mock interview",
          icon: Star,
          unlockedAt: "2024-01-15",
          rarity: "common",
        },
        {
          id: "2",
          title: "Confidence Builder",
          description: "Achieved 80%+ confidence in 3 consecutive interviews",
          icon: Trophy,
          unlockedAt: "2024-02-01",
          rarity: "rare",
        },
        {
          id: "3",
          title: "Consistent Performer",
          description: "Maintained 75%+ scores for a full week",
          icon: Award,
          unlockedAt: "2024-02-10",
          rarity: "epic",
        },
      ],
    };

    setTimeout(() => {
      setAnalyticsData(mockData);
      setIsLoading(false);
    }, 1500);
  }, []);

  const COLORS = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-500";
      case "rare":
        return "bg-blue-500";
      case "epic":
        return "bg-purple-500";
      case "legendary":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getImprovementIcon = (current: number, previous: number) => {
    const improvement = current - previous;
    if (improvement > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (improvement < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const getImprovementColor = (current: number, previous: number) => {
    const improvement = current - previous;
    if (improvement > 0) return "text-green-500";
    if (improvement < 0) return "text-red-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Loading Analytics</h2>
            <p className="text-muted-foreground">Analyzing your progress...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Progress <span className="gradient-text">Analytics</span>
              </h1>
              <p className="text-muted-foreground">
                Track your interview performance and skill development
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-4">
              <Tabs
                value={selectedDateRange}
                onValueChange={setSelectedDateRange}
              >
                <TabsList className="glass">
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="quarter">3 Months</TabsTrigger>
                  <TabsTrigger value="all">All Time</TabsTrigger>
                </TabsList>
              </Tabs>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="glass">
                    <Calendar className="w-4 h-4 mr-2" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: customDateRange.from,
                      to: customDateRange.to,
                    }}
                    onSelect={(range) => setCustomDateRange(range || {})}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </motion.div>

        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {[
            {
              label: "Average Score",
              value: "82%",
              icon: Target,
              color: "text-green-500",
            },
            {
              label: "Total Interviews",
              value: "14",
              icon: MessageSquare,
              color: "text-blue-500",
            },
            {
              label: "Practice Hours",
              value: "12.5",
              icon: Clock,
              color: "text-purple-500",
            },
            {
              label: "Improvement",
              value: "+17%",
              icon: TrendingUp,
              color: "text-orange-500",
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Score Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Score Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.scoreTrend}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS.primary}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    labelFormatter={(value) =>
                      format(new Date(value), "MMM dd, yyyy")
                    }
                    formatter={(value) => [`${value}%`, "Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Performance by Type */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Performance by Type
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.performanceByType}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="type" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                  <Bar
                    dataKey="score"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Time Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Time Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.timeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="percentage"
                    label={({ category, percentage }) =>
                      `${category}: ${percentage}%`
                    }
                  >
                    {analyticsData.timeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          Object.values(COLORS)[
                            index % Object.values(COLORS).length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Practice Frequency Heatmap */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Practice Frequency
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }).map((_, index) => {
                  const date = subDays(new Date(), 27 - index);
                  const dateStr = format(date, "yyyy-MM-dd");
                  const practiceData = analyticsData.practiceFrequency.find(
                    (d) => d.date === dateStr
                  );
                  const intensity = practiceData
                    ? Math.min(practiceData.count * 0.3, 1)
                    : 0;

                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-sm text-xs flex items-center justify-center ${
                        intensity > 0
                          ? `bg-primary opacity-${Math.round(intensity * 100)}`
                          : "bg-muted"
                      }`}
                      style={{ opacity: intensity > 0 ? intensity : 0.1 }}
                    >
                      {practiceData?.count || ""}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((opacity) => (
                    <div
                      key={opacity}
                      className="w-3 h-3 rounded-sm bg-primary"
                      style={{ opacity }}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Skill Development */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid lg:grid-cols-2 gap-8 mb-8"
        >
          {/* Radar Chart */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Skill Radar
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={analyticsData.skillDevelopment}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" className="text-xs" />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  className="text-xs"
                />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Previous"
                  dataKey="previous"
                  stroke={COLORS.secondary}
                  fill={COLORS.secondary}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Progress Bars */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Skill Progress
            </h3>
            <div className="space-y-6">
              {analyticsData.skillDevelopment.map((skill, index) => (
                <motion.div
                  key={skill.skill}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      {getImprovementIcon(skill.current, skill.previous)}
                      <span
                        className={`text-sm font-bold ${getImprovementColor(
                          skill.current,
                          skill.previous
                        )}`}
                      >
                        {skill.current}%
                      </span>
                    </div>
                  </div>
                  <Progress value={skill.current} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Previous: {skill.previous}%</span>
                    <span>+{skill.current - skill.previous}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Insights and Achievements */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Insights
              </h3>
              <div className="space-y-4">
                {analyticsData.insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary"
                  >
                    <p className="text-sm">{insight}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {analyticsData.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Achievements
              </h3>
              <div className="space-y-4">
                {analyticsData.achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl ${getRarityColor(
                        achievement.rarity
                      )} flex items-center justify-center`}
                    >
                      <achievement.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unlocked{" "}
                        {format(
                          new Date(achievement.unlockedAt),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
