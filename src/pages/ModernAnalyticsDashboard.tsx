import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Share2,
  BarChart3,
  PieChart,
  Activity,
  Award,
  BookOpen,
  Users,
  Calendar,
  MessageSquare,
  Lightbulb,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
} from "recharts";

// Mock data for the dashboard
const mockData = {
  overallScore: 87,
  previousScore: 82,
  improvement: 5,
  totalQuestions: 8,
  completedQuestions: 8,
  averageResponseTime: 45,
  confidenceLevel: 92,
  strengths: [
    "Clear communication",
    "Strong technical knowledge",
    "Good problem-solving approach",
  ],
  improvements: [
    "Reduce filler words",
    "Provide more specific examples",
    "Improve time management",
  ],
  performanceData: [
    { name: "Q1", score: 85, time: 42 },
    { name: "Q2", score: 88, time: 38 },
    { name: "Q3", score: 82, time: 52 },
    { name: "Q4", score: 90, time: 35 },
    { name: "Q5", score: 87, time: 48 },
    { name: "Q6", score: 89, time: 41 },
    { name: "Q7", score: 85, time: 46 },
    { name: "Q8", score: 88, time: 39 },
  ],
  skillBreakdown: [
    { name: "Communication", value: 88, color: "#3871C2" },
    { name: "Technical", value: 92, color: "#3AB54A" },
    { name: "Problem Solving", value: 85, color: "#FFA94D" },
    { name: "Confidence", value: 90, color: "#8B5CF6" },
  ],
  aiFeedback: {
    overall:
      "Excellent performance! You demonstrated strong technical knowledge and clear communication. Your confidence has improved significantly since your last session.",
    specific: [
      {
        area: "Communication",
        feedback:
          "Your explanations were clear and well-structured. Consider using more specific examples to strengthen your points.",
        score: 88,
      },
      {
        area: "Technical Knowledge",
        feedback:
          "Impressive depth of technical understanding. You handled complex questions with confidence.",
        score: 92,
      },
      {
        area: "Problem Solving",
        feedback:
          "Good systematic approach to problem-solving. Try to verbalize your thought process more clearly.",
        score: 85,
      },
    ],
  },
  roadmap: [
    {
      id: 1,
      title: "Reduce Filler Words",
      description:
        "Practice speaking more concisely and eliminate 'um', 'uh', and 'like'",
      priority: "High",
      estimatedTime: "2-3 weeks",
      status: "in-progress",
    },
    {
      id: 2,
      title: "Improve Examples",
      description: "Prepare 3-5 specific examples for each major skill area",
      priority: "Medium",
      estimatedTime: "1-2 weeks",
      status: "pending",
    },
    {
      id: 3,
      title: "Time Management",
      description: "Practice delivering complete answers within 2-3 minutes",
      priority: "Medium",
      estimatedTime: "1 week",
      status: "pending",
    },
  ],
};

const ModernAnalyticsDashboard: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(420); // 7 minutes

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-accent-green";
    if (score >= 80) return "text-primary-blue";
    if (score >= 70) return "text-accent-orange";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-accent-green" };
    if (score >= 80) return { label: "Good", color: "bg-primary-blue" };
    if (score >= 70) return { label: "Fair", color: "bg-accent-orange" };
    return { label: "Needs Work", color: "bg-red-500" };
  };

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <div className="bg-white border-b border-light-gray">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark-navy font-display">
                Interview Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Product Manager Interview • January 15, 2024
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-professional">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" className="rounded-professional">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Score Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Overall Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-blue/10 rounded-professional">
                  <Target className="w-6 h-6 text-primary-blue" />
                </div>
                <Badge
                  className={`${
                    getScoreBadge(mockData.overallScore).color
                  } text-white`}
                >
                  {getScoreBadge(mockData.overallScore).label}
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Overall Score
                </h3>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${getScoreColor(
                      mockData.overallScore
                    )}`}
                  >
                    {mockData.overallScore}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="w-4 h-4 text-accent-green" />
                  <span className="text-accent-green font-medium">
                    +{mockData.improvement} from last time
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Questions Completed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-green/10 rounded-professional">
                  <CheckCircle className="w-6 h-6 text-accent-green" />
                </div>
                <Badge className="bg-accent-green text-white">Complete</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Questions Completed
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-dark-navy">
                    {mockData.completedQuestions}
                  </span>
                  <span className="text-muted-foreground">
                    /{mockData.totalQuestions}
                  </span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </Card>
          </motion.div>

          {/* Average Response Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-orange/10 rounded-professional">
                  <Clock className="w-6 h-6 text-accent-orange" />
                </div>
                <Badge className="bg-accent-orange text-white">Optimal</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Avg Response Time
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-dark-navy">
                    {mockData.averageResponseTime}
                  </span>
                  <span className="text-muted-foreground">seconds</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Target: 30-60 seconds
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Confidence Level */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 bg-white rounded-professional shadow-professional border-0 hover:shadow-professional-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-professional">
                  <Star className="w-6 h-6 text-purple-500" />
                </div>
                <Badge className="bg-purple-500 text-white">High</Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Confidence Level
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-dark-navy">
                    {mockData.confidenceLevel}
                  </span>
                  <span className="text-muted-foreground">%</span>
                </div>
                <Progress value={mockData.confidenceLevel} className="h-2" />
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-dark-navy font-display">
                    Interview Recording
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent-green text-white">
                      Complete
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Video Player Placeholder */}
                <div className="relative bg-dark-navy rounded-professional overflow-hidden mb-4">
                  <div className="aspect-video flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="w-8 h-8 ml-1" />
                      </div>
                      <p className="text-lg font-medium">Interview Recording</p>
                      <p className="text-sm text-white/70">Click to play</p>
                    </div>
                  </div>

                  {/* Video Controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center gap-4">
                      <Button
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => setIsPlaying(!isPlaying)}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>

                      <div className="flex-1">
                        <div className="bg-white/20 rounded-full h-1 mb-2">
                          <div
                            className="bg-white rounded-full h-1 transition-all duration-300"
                            style={{
                              width: `${(currentTime / duration) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-white/70">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-dark-navy font-display">
                    Performance Trend
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-professional"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Bar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-professional"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Line
                    </Button>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockData.performanceData}>
                      <defs>
                        <linearGradient
                          id="scoreGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3871C2"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3871C2"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F7FA" />
                      <XAxis dataKey="name" stroke="#64748B" />
                      <YAxis stroke="#64748B" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #F5F7FA",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#3871C2"
                        strokeWidth={3}
                        fill="url(#scoreGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* AI Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary-blue/10 rounded-professional">
                    <MessageSquare className="w-5 h-5 text-primary-blue" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-navy font-display">
                    AI Feedback
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-light-gray rounded-professional">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {mockData.aiFeedback.overall}
                    </p>
                  </div>

                  {mockData.aiFeedback.specific.map((feedback, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-dark-navy">
                          {feedback.area}
                        </h4>
                        <span
                          className={`text-sm font-bold ${getScoreColor(
                            feedback.score
                          )}`}
                        >
                          {feedback.score}/100
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feedback.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Skill Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent-green/10 rounded-professional">
                    <PieChart className="w-5 h-5 text-accent-green" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-navy font-display">
                    Skill Breakdown
                  </h2>
                </div>

                <div className="space-y-4">
                  {mockData.skillBreakdown.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-dark-navy">
                          {skill.name}
                        </span>
                        <span className="text-sm font-bold text-dark-navy">
                          {skill.value}%
                        </span>
                      </div>
                      <div className="w-full bg-light-gray rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${skill.value}%`,
                            backgroundColor: skill.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Improvement Roadmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="p-6 bg-white rounded-professional shadow-professional border-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent-orange/10 rounded-professional">
                    <Lightbulb className="w-5 h-5 text-accent-orange" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-navy font-display">
                    Improvement Roadmap
                  </h2>
                </div>

                <div className="space-y-4">
                  {mockData.roadmap.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      className="p-4 bg-light-gray rounded-professional hover:bg-light-gray/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-dark-navy group-hover:text-primary-blue transition-colors">
                          {item.title}
                        </h4>
                        <Badge
                          className={`${
                            item.priority === "High"
                              ? "bg-red-500"
                              : item.priority === "Medium"
                              ? "bg-accent-orange"
                              : "bg-accent-green"
                          } text-white text-xs`}
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {item.estimatedTime}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.status === "in-progress" ? (
                            <div className="flex items-center gap-1 text-xs text-primary-blue">
                              <div className="w-2 h-2 bg-primary-blue rounded-full animate-pulse" />
                              In Progress
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                              Pending
                            </div>
                          )}
                          <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary-blue transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAnalyticsDashboard;
