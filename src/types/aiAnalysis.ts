/**
 * TypeScript interfaces for AI Analysis functionality
 * Matches the database schema for interview_analysis and interview_summary tables
 */

// Supporting interfaces for nested objects
// Note: StarScores and TechnicalScores removed as they don't exist in database schema

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
  overall_score: number | null;
  communication_scores: CommunicationScores | null;
  content_scores: ContentScores | null;
  strengths: string[] | null;
  improvements: string[] | null;
  actionable_feedback: string | null;
  improved_example: string | null;
  filler_words: FillerWords | null;
  speaking_pace: number | null; // Database stores as integer: 1=too_fast, 2=appropriate, 3=too_slow
  confidence_score: number | null;
  tokens_used: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_cents: number | null;
  created_at: string;
}

export interface InterviewSummary {
  id: string;
  session_id: string;
  user_id: string;
  total_questions: number;
  questions_answered: number;
  average_score: number | null;
  median_score: number | null;
  score_distribution: ScoreDistribution | null;
  performance_trend: string | null; // Database uses character varying, not enum
  model_breakdown: Record<string, number> | null;
  total_tokens: number | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  total_cost_cents: number | null;
  overall_strengths: string[] | null;
  overall_improvements: string[] | null;
  readiness_level: string; // Database uses character varying, not enum
  readiness_score: number | null;
  role_specific_feedback: string | null;
  next_steps: string[] | null;
  estimated_practice_time: string | null;
  total_duration_seconds: number | null;
  average_time_per_question: number | null;
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
  communication_scores?: CommunicationScores;
  content_scores?: ContentScores;
  strengths?: string[];
  improvements?: string[];
  actionable_feedback?: string;
  improved_example?: string;
  filler_words?: FillerWords;
  speaking_pace?: number; // Database stores as integer: 1=too_fast, 2=appropriate, 3=too_slow
  confidence_score?: number;
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_cents?: number;
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
  performance_trend?: string | null;
  model_breakdown?: Record<string, number>;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost_cents?: number;
  overall_strengths?: string[];
  overall_improvements?: string[];
  readiness_level: string;
  readiness_score?: number;
  role_specific_feedback?: string;
  next_steps?: string[];
  estimated_practice_time?: string;
  total_duration_seconds?: number;
  average_time_per_question?: number;
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
  communication_scores?: CommunicationScores;
  content_scores?: ContentScores;
  strengths?: string[];
  improvements?: string[];
  actionable_feedback?: string;
  improved_example?: string;
  filler_words?: FillerWords;
  speaking_pace?: number; // Database stores as integer: 1=too_fast, 2=appropriate, 3=too_slow
  confidence_score?: number;
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_cents?: number;
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
  performance_trend?: string | null;
  model_breakdown?: Record<string, number>;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost_cents?: number;
  overall_strengths?: string[];
  overall_improvements?: string[];
  readiness_level?: string;
  readiness_score?: number;
  role_specific_feedback?: string;
  next_steps?: string[];
  estimated_practice_time?: string;
  total_duration_seconds?: number;
  average_time_per_question?: number;
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
// RESPONSE_LENGTHS removed - this field doesn't exist in database schema

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
