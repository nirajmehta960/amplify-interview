/**
 * Central export file for all AI Analysis types
 */

// Core interfaces
export * from "./aiAnalysis";

// Service interfaces
export * from "./aiAnalysisService";

// Re-export commonly used types for convenience
export type {
  InterviewAnalysis,
  InterviewSummary,
  InterviewAnalysisInsert,
  InterviewSummaryInsert,
  StarScores,
  TechnicalScores,
  CommunicationScores,
  ContentScores,
  FillerWords,
  ScoreDistribution,
} from "./aiAnalysis";

export type {
  IAIAnalysisService,
  IInterviewSummaryService,
  IAIProcessingService,
  ICostTrackingService,
  IAnalyticsService,
  IAIAnalysisManager,
  AIAnalysisConfig,
  ModelConfig,
} from "./aiAnalysisService";

// Utility types and constants
export {
  isInterviewAnalysis,
  isInterviewSummary,
  READINESS_LEVELS,
  INTERVIEW_TYPES,
  PERFORMANCE_TRENDS,
  SPEAKING_PACES,
  RESPONSE_LENGTHS,
  SCORE_THRESHOLDS,
  READINESS_THRESHOLDS,
} from "./aiAnalysis";

export {
  AIAnalysisError,
  CostLimitExceededError,
  ProcessingTimeoutError,
} from "./aiAnalysisService";
