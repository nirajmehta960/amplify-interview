import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  CheckCircle, Target, TrendingUp, AlertCircle, Clock, Save,
  Award, RefreshCw, BarChart, ChevronDown, ChevronUp, MessageSquare
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts';

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { interviewApi, feedbackApi, SessionFeedback, ChatMessage } from "@/services/apiClient";

export default function InterviewResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedQs, setExpandedQs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!sessionId) return;
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      // Try to get existing feedback
      let fb;
      try {
        fb = await feedbackApi.get(sessionId!);
      } catch (e: any) {
        if (e.status === 404) {
          // Generate new feedback
          setGenerating(true);
          fb = await feedbackApi.generate(sessionId!);
          setGenerating(false);
        } else {
          throw e; // rethrow
        }
      }
      
      const { messages } = await interviewApi.getMessages(sessionId!);
      
      setFeedback(fb);
      setMessages(messages);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load results", description: "There was an error loading your feedback.", variant: "destructive" });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-cyan-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  const scoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-teal-500/5 border-emerald-500/30';
    if (score >= 60) return 'from-cyan-500/20 to-blue-500/5 border-cyan-500/30';
    if (score >= 40) return 'from-amber-500/20 to-orange-500/5 border-amber-500/30';
    return 'from-rose-500/20 to-red-500/5 border-rose-500/30';
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-6" />
        <h2 className="text-xl font-bold font-outfit text-foreground mb-2">
          {generating ? 'Analyzing Your Performance' : 'Loading Results'}
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          {generating 
            ? 'The AI is generating comprehensive, actionable feedback based on your responses, resume, and target role...' 
            : 'Getting your session data...'}
        </p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold font-outfit text-foreground">Results Not Found</h2>
        <Button onClick={() => window.history.back()} variant="outline" className="mt-6">Go Back</Button>
      </div>
    );
  }

  // Format radar data
  const radarData = [
    { subject: "Communication", A: feedback.overall_score }, // Simplified mapping for visualization
    { subject: "Clarity", A: feedback.communication_scores.clarity },
    { subject: "Structure", A: feedback.communication_scores.structure },
    { subject: "Conciseness", A: feedback.communication_scores.conciseness },
    { subject: "Relevance", A: feedback.content_scores.relevance },
    { subject: "Depth", A: feedback.content_scores.depth },
    { subject: "Specificity", A: feedback.content_scores.specificity },
  ];

  // Group Q&A pairs
  const qaPairs = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'interviewer') {
      const q = messages[i];
      let a = null;
      if (i + 1 < messages.length && messages[i+1].role === 'candidate') {
        a = messages[i+1];
        i++; // skip next since it's the answer
      }
      qaPairs.push({ question: q, answer: a });
    }
  }

  const toggleQuestion = (id: string) => {
    setExpandedQs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Helmet><title>Interview Results | Amplify</title></Helmet>

      {/* Header */}
      <div className="bg-card/50 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold font-outfit">Interview Results</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> 
              Session {sessionId?.split('-')[0].toUpperCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Save className="w-4 h-4 mr-2" /> Export
            </Button>
            <Link to="/interview/setup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <RefreshCw className="w-4 h-4 mr-2" /> Start New
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Box */}
          <div className={`glass-card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br ${scoreGradient(feedback.overall_score)}`}>
            {feedback.overall_score >= 80 ? (
              <Award className="w-12 h-12 text-emerald-400 mb-2" />
            ) : feedback.overall_score >= 60 ? (
              <CheckCircle className="w-12 h-12 text-cyan-400 mb-2" />
            ) : (
              <Target className="w-12 h-12 text-amber-400 mb-2" />
            )}
            
            <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground mb-1">Overall Score</h2>
            <div className={`text-6xl font-black font-outfit ${scoreColor(feedback.overall_score)}`}>
              {feedback.overall_score}<span className="text-3xl text-muted-foreground/50">/100</span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                {feedback.readiness_level} Readiness
              </Badge>
              <Badge variant="outline" className="border-border/50 text-muted-foreground">
                {feedback.questions_answered} Questions Answered
              </Badge>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="glass-card p-4 lg:col-span-2 flex flex-col md:flex-row items-center justify-around">
            <div className="w-full md:w-1/2 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--custom-muted-foreground) / 0.2)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--custom-muted-foreground))', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="hsl(var(--custom-primary))" fill="hsl(var(--custom-primary))" fillOpacity={0.3} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--custom-card))', borderColor: 'hsl(var(--custom-border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--custom-primary))' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4 px-4">
              <h3 className="font-semibold text-foreground border-b border-border/50 pb-2">Analysis Breakdown</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Communication</span><span className="font-medium text-foreground">{Math.round((feedback.communication_scores.clarity + feedback.communication_scores.structure + feedback.communication_scores.conciseness) / 3)}%</span></div>
                  <Progress value={Math.round((feedback.communication_scores.clarity + feedback.communication_scores.structure + feedback.communication_scores.conciseness) / 3)} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Content Relevance</span><span className="font-medium text-foreground">{feedback.content_scores.relevance}%</span></div>
                  <Progress value={feedback.content_scores.relevance} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Depth & Specificity</span><span className="font-medium text-foreground">{Math.round((feedback.content_scores.depth + feedback.content_scores.specificity) / 2)}%</span></div>
                  <Progress value={Math.round((feedback.content_scores.depth + feedback.content_scores.specificity) / 2)} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Summary */}
        <div className="glass-card p-6 border-l-4 border-l-primary">
          <h3 className="text-lg font-semibold font-outfit text-foreground flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            Executive Summary
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {feedback.actionable_feedback}
          </p>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20">
            <h3 className="text-base font-semibold text-emerald-400 flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" /> Key Strengths
            </h3>
            <ul className="space-y-3">
              {feedback.strengths.map((str, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground items-start">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="glass-card p-6 bg-amber-500/5 border-amber-500/20">
            <h3 className="text-base font-semibold text-amber-400 flex items-center gap-2 mb-4">
              <Target className="w-5 h-5" /> Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {feedback.improvements.map((imp, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground items-start">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Question Review */}
        <div>
          <h3 className="text-xl font-bold font-outfit text-foreground mb-6 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-primary" />
            Question Breakdown
          </h3>
          <div className="space-y-4">
            {qaPairs.map(({ question, answer }, index) => {
              const qId = question.message_id || `q-${index}`;
              const isExpanded = expandedQs[qId] || false;
              const hasAnalysis = !!answer?.analysis;
              const score = answer?.analysis?.score || 0;
              
              return (
                <div key={qId} className="glass-card overflow-hidden transition-all duration-300 border-border/50">
                  <button 
                    onClick={() => toggleQuestion(qId)}
                    className="w-full p-5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
                  >
                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-background text-muted-foreground text-[10px]">
                          Question {index + 1}
                        </Badge>
                        {question.question_metadata?.is_followup && (
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]">
                            Follow-up
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-foreground">{question.content}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {hasAnalysis ? (
                        <div className={`text-xl font-bold font-outfit ${scoreColor(score)}`}>
                          {score}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Unanswered</Badge>
                      )}
                      <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && answer && (
                    <div className="p-5 pt-0 border-t border-border/50 bg-background/30">
                      <div className="mt-5 mb-6">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your Answer</h4>
                        <div className="p-4 rounded-lg bg-card border border-border/50 text-sm text-foreground/90 whitespace-pre-wrap">
                          {answer.content}
                        </div>
                      </div>

                      {hasAnalysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-emerald-400 mb-2">What you did well</h4>
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                              {answer.analysis?.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                            </ul>
                          </div>
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-amber-400 mb-2">How to improve</h4>
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                              {answer.analysis?.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
