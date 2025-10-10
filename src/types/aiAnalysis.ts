/**
 * TypeScript interfaces for AI Analysis functionality
 * Matches the database schema for interview_analysis and interview_summary tables
 */

// Supporting interfaces for nested objects
export interface StarScores {
  situation: number;
  task: number;
  action: number;
  result: number;
}

export interface TechnicalScores {
  understanding: number;
  approach: number;
  depth: number;
  clarity: number;
}

export interface CommunicationScores {
  clarity: number;
  structure: number;
  conciseness: number;
}

export interface ContentScores {
  relevance: number;
  depth: number;
  specificity: number;
}

export interface FillerWords {
  words: string[];
  counts: Record<string, number>;
  total: number;
}

export interface ScoreDistribution {
  excellent: number;
  good: number;
  fair: number;
  needs_improvement: number;
}

// Main interfaces
export interface InterviewAnalysis {
  id: string;
  interview_response_id: string;
  session_id: string;
  question_id: number;
  user_id: string;
  interview_type: "behavioral" | "technical" | "leadership" | "custom";
  custom_domain?: string;
  model_used: string;
  overall_score: number;
  star_scores?: StarScores;
  technical_scores?: TechnicalScores;
  communication_scores: CommunicationScores;
  content_scores: ContentScores;
  strengths: string[];
  improvements: string[];
  actionable_feedback: string;
  improved_example: string;
  filler_words: FillerWords;
  speaking_pace: "too_fast" | "appropriate" | "too_slow";
  confidence_score: number;
  response_length_assessment: "too_short" | "appropriate" | "too_long";
  tokens_used: number;
  input_tokens: number;
  output_tokens: number;
  cost_cents: number;
  processing_time_ms: number;
  created_at: string;
}

export interface InterviewSummary {
  id: string;
  session_id: string;
  user_id: string;
  total_questions: number;
  questions_answered: number;
  average_score: number;
  median_score: number;
  score_distribution: ScoreDistribution;
  performance_trend: "improving" | "consistent" | "declining";
  model_breakdown: Record<string, number>;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_cents: number;
  overall_strengths: string[];
  overall_improvements: string[];
  pattern_insights: string[];
  readiness_level: "ready" | "needs_practice" | "significant_improvement";
  readiness_score: number;
  role_specific_feedback: string;
  next_steps: string[];
  recommended_practice_areas: string[];
  estimated_practice_time: string;
  total_duration_seconds: number;
  average_time_per_question: number;
  time_distribution: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Database insert/update interfaces (with optional fields)
export interface InterviewAnalysisInsert {
  id?: string;
  interview_response_id: string;
  session_id: string;
  question_id: number;
  user_id: string;
  interview_type: "behavioral" | "technical" | "leadership" | "custom";
  custom_domain?: string;
  model_used: string;
  overall_score?: number;
  star_scores?: StarScores;
  technical_scores?: TechnicalScores;
  communication_scores?: CommunicationScores;
  content_scores?: ContentScores;
  strengths?: string[];
  improvements?: string[];
  actionable_feedback?: string;
  improved_example?: string;
  filler_words?: FillerWords;
  speaking_pace?: "too_fast" | "appropriate" | "too_slow";
  confidence_score?: number;
  response_length_assessment?: "too_short" | "appropriate" | "too_long";
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_cents?: number;
  processing_time_ms?: number;
  created_at?: string;
}

export interface InterviewSummaryInsert {
  id?: string;
  session_id: string;
  user_id: string;
  total_questions: number;
  questions_answered: number;
  average_score?: number;
  median_score?: number;
  score_distribution?: ScoreDistribution;
  performance_trend?: "improving" | "consistent" | "declining";
  model_breakdown?: Record<string, number>;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost_cents?: number;
  overall_strengths?: string[];
  overall_improvements?: string[];
  pattern_insights?: string[];
  readiness_level: "ready" | "needs_practice" | "significant_improvement";
  readiness_score?: number;
  role_specific_feedback?: string;
  next_steps?: string[];
  recommended_practice_areas?: string[];
  estimated_practice_time?: string;
  total_duration_seconds?: number;
  average_time_per_question?: number;
  time_distribution?: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

// Database update interfaces (all fields optional)
export interface InterviewAnalysisUpdate {
  id?: string;
  interview_response_id?: string;
  session_id?: string;
  question_id?: number;
  user_id?: string;
  interview_type?: "behavioral" | "technical" | "leadership" | "custom";
  custom_domain?: string;
  model_used?: string;
  overall_score?: number;
  star_scores?: StarScores;
  technical_scores?: TechnicalScores;
  communication_scores?: CommunicationScores;
  content_scores?: ContentScores;
  strengths?: string[];
  improvements?: string[];
  actionable_feedback?: string;
  improved_example?: string;
  filler_words?: FillerWords;
  speaking_pace?: "too_fast" | "appropriate" | "too_slow";
  confidence_score?: number;
  response_length_assessment?: "too_short" | "appropriate" | "too_long";
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_cents?: number;
  processing_time_ms?: number;
  created_at?: string;
}

export interface InterviewSummaryUpdate {
  id?: string;
  session_id?: string;
  user_id?: string;
  total_questions?: number;
  questions_answered?: number;
  average_score?: number;
  median_score?: number;
  score_distribution?: ScoreDistribution;
  performance_trend?: "improving" | "consistent" | "declining";
  model_breakdown?: Record<string, number>;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost_cents?: number;
  overall_strengths?: string[];
  overall_improvements?: string[];
  pattern_insights?: string[];
  readiness_level?: "ready" | "needs_practice" | "significant_improvement";
  readiness_score?: number;
  role_specific_feedback?: string;
  next_steps?: string[];
  recommended_practice_areas?: string[];
  estimated_practice_time?: string;
  total_duration_seconds?: number;
  average_time_per_question?: number;
  time_distribution?: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

// Utility types for API responses
export interface InterviewAnalysisWithResponse {
  analysis: InterviewAnalysis;
  response: {
    id: string;
    session_id: string;
    question_id: number;
    response_text: string;
    duration: number;
  };
  question: {
    question_id: number;
    question_text: string;
    interview_type: string;
    custom_domain?: string;
  };
}

export interface InterviewSummaryWithSession {
  summary: InterviewSummary;
  session: {
    id: string;
    user_id: string;
    interview_type: string;
    duration: number;
    created_at: string;
    completed_at: string;
  };
  analysis_count: number;
}

// Database function return types
export interface UserInterviewHistory {
  session_id: string;
  interview_type: string;
  completed_at: string;
  overall_score: number;
  readiness_level: string;
  questions_answered: number;
}

export interface SessionAnalytics {
  session_id: string;
  interview_type: string;
  total_questions: number;
  questions_answered: number;
  average_score: number;
  readiness_level: string;
  performance_trend: string;
  total_cost_cents: number;
  created_at: string;
  completed_at: string;
}

// Type guards for runtime validation
export function isInterviewAnalysis(obj: any): obj is InterviewAnalysis {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.interview_response_id === "string" &&
    typeof obj.session_id === "string" &&
    typeof obj.question_id === "number" &&
    typeof obj.user_id === "string" &&
    ["behavioral", "technical", "leadership", "custom"].includes(
      obj.interview_type
    ) &&
    typeof obj.model_used === "string"
  );
}

export function isInterviewSummary(obj: any): obj is InterviewSummary {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.session_id === "string" &&
    typeof obj.user_id === "string" &&
    typeof obj.total_questions === "number" &&
    typeof obj.questions_answered === "number" &&
    ["ready", "needs_practice", "significant_improvement"].includes(
      obj.readiness_level
    )
  );
}

// Constants for validation
export const READINESS_LEVELS = [
  "ready",
  "needs_practice",
  "significant_improvement",
] as const;
export const INTERVIEW_TYPES = [
  "behavioral",
  "technical",
  "leadership",
  "custom",
] as const;
export const PERFORMANCE_TRENDS = [
  "improving",
  "consistent",
  "declining",
] as const;
export const SPEAKING_PACES = ["too_fast", "appropriate", "too_slow"] as const;
export const RESPONSE_LENGTHS = [
  "too_short",
  "appropriate",
  "too_long",
] as const;

// Score thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  NEEDS_IMPROVEMENT: 0,
} as const;

// Readiness score thresholds
export const READINESS_THRESHOLDS = {
  READY: 80,
  NEEDS_PRACTICE: 60,
  SIGNIFICANT_IMPROVEMENT: 0,
} as const;
