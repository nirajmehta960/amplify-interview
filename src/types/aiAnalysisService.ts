/**
 * Service interfaces for AI Analysis operations
 * Defines the contract for AI analysis services
 */

import {
  InterviewAnalysis,
  InterviewSummary,
  InterviewAnalysisInsert,
  InterviewSummaryInsert,
  InterviewAnalysisUpdate,
  InterviewSummaryUpdate,
  InterviewAnalysisWithResponse,
  InterviewSummaryWithSession,
  UserInterviewHistory,
  SessionAnalytics,
} from "./aiAnalysis";

// AI Analysis Service Interface
export interface IAIAnalysisService {
  // Create analysis for a single question response
  createAnalysis(data: InterviewAnalysisInsert): Promise<InterviewAnalysis>;

  // Update existing analysis
  updateAnalysis(
    id: string,
    data: InterviewAnalysisUpdate
  ): Promise<InterviewAnalysis>;

  // Get analysis by ID
  getAnalysis(id: string): Promise<InterviewAnalysis | null>;

  // Get all analyses for a session
  getSessionAnalyses(sessionId: string): Promise<InterviewAnalysis[]>;

  // Get analysis with response and question data
  getAnalysisWithContext(
    analysisId: string
  ): Promise<InterviewAnalysisWithResponse | null>;

  // Delete analysis
  deleteAnalysis(id: string): Promise<boolean>;
}

// Interview Summary Service Interface
export interface IInterviewSummaryService {
  // Create summary for a session
  createSummary(data: InterviewSummaryInsert): Promise<InterviewSummary>;

  // Update existing summary
  updateSummary(
    id: string,
    data: InterviewSummaryUpdate
  ): Promise<InterviewSummary>;

  // Get summary by session ID
  getSummaryBySession(sessionId: string): Promise<InterviewSummary | null>;

  // Get summary with session data
  getSummaryWithSession(
    sessionId: string
  ): Promise<InterviewSummaryWithSession | null>;

  // Get user's interview history
  getUserInterviewHistory(
    userId: string,
    limit?: number
  ): Promise<UserInterviewHistory[]>;

  // Get comprehensive session analytics
  getSessionAnalytics(sessionId: string): Promise<SessionAnalytics | null>;

  // Delete summary
  deleteSummary(id: string): Promise<boolean>;
}

// AI Processing Service Interface
export interface IAIProcessingService {
  // Process a single question response
  processQuestionResponse(
    responseText: string,
    questionData: {
      question_id: number;
      question_text: string;
      interview_type: string;
      custom_domain?: string;
    },
    sessionData: {
      session_id: string;
      user_id: string;
    },
    options?: {
      model?: string;
      includeExample?: boolean;
      customPrompt?: string;
    }
  ): Promise<InterviewAnalysis>;

  // Process entire session and create summary
  processSessionSummary(
    sessionId: string,
    options?: {
      model?: string;
      includePatternAnalysis?: boolean;
    }
  ): Promise<InterviewSummary>;

  // Batch process multiple responses
  batchProcessResponses(
    responses: Array<{
      responseText: string;
      questionData: any;
      sessionData: any;
    }>,
    options?: {
      model?: string;
      concurrency?: number;
    }
  ): Promise<InterviewAnalysis[]>;
}

// Cost and Usage Tracking Interface
export interface ICostTrackingService {
  // Track AI model usage
  trackUsage(
    modelUsed: string,
    inputTokens: number,
    outputTokens: number,
    costCents: number,
    processingTimeMs: number
  ): Promise<void>;

  // Get cost summary for a session
  getSessionCost(sessionId: string): Promise<{
    totalCostCents: number;
    modelBreakdown: Record<string, number>;
    tokenUsage: {
      total: number;
      input: number;
      output: number;
    };
  }>;

  // Get user's total AI costs
  getUserCosts(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalCostCents: number;
    sessionCount: number;
    averageCostPerSession: number;
    monthlyBreakdown: Record<string, number>;
  }>;
}

// Analytics Service Interface
export interface IAnalyticsService {
  // Get user performance trends
  getUserPerformanceTrends(
    userId: string,
    period: "week" | "month" | "quarter" | "year"
  ): Promise<{
    averageScore: number;
    trend: "improving" | "declining" | "stable";
    sessionCount: number;
    readinessLevel: string;
    topStrengths: string[];
    topImprovements: string[];
  }>;

  // Get comparative analytics
  getComparativeAnalytics(
    userId: string,
    comparisonType: "self" | "peers" | "role"
  ): Promise<{
    percentile: number;
    benchmark: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  }>;

  // Get detailed session insights
  getSessionInsights(sessionId: string): Promise<{
    performanceBreakdown: Record<string, number>;
    timeAnalysis: {
      averageTimePerQuestion: number;
      timeDistribution: Record<string, number>;
      pacing: "too_fast" | "appropriate" | "too_slow";
    };
    communicationAnalysis: {
      fillerWords: string[];
      speakingPace: string;
      confidenceLevel: number;
    };
    improvementPriorities: string[];
  }>;
}

// Combined AI Analysis Manager Interface
export interface IAIAnalysisManager {
  // Core services
  analysisService: IAIAnalysisService;
  summaryService: IInterviewSummaryService;
  processingService: IAIProcessingService;
  costService: ICostTrackingService;
  analyticsService: IAnalyticsService;

  // High-level operations
  processCompleteInterview(sessionId: string): Promise<{
    analyses: InterviewAnalysis[];
    summary: InterviewSummary;
    totalCost: number;
    processingTime: number;
  }>;

  // Utility methods
  validateAnalysisData(data: any): boolean;
  calculateReadinessLevel(
    averageScore: number
  ): "ready" | "needs_practice" | "significant_improvement";
  formatCostSummary(costCents: number): string;
}

// Error types
export class AIAnalysisError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "AIAnalysisError";
  }
}

export class CostLimitExceededError extends AIAnalysisError {
  constructor(costCents: number, limitCents: number) {
    super(
      `Cost limit exceeded: ${costCents} cents (limit: ${limitCents} cents)`,
      "COST_LIMIT_EXCEEDED",
      { costCents, limitCents }
    );
  }
}

export class ProcessingTimeoutError extends AIAnalysisError {
  constructor(timeoutMs: number) {
    super(`AI processing timeout after ${timeoutMs}ms`, "PROCESSING_TIMEOUT", {
      timeoutMs,
    });
  }
}

// Configuration interfaces
export interface AIAnalysisConfig {
  defaultModel: string;
  fallbackModel: string;
  maxTokens: number;
  timeoutMs: number;
  costLimitCents: number;
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface ModelConfig {
  name: string;
  provider: string;
  maxTokens: number;
  costPerInputToken: number; // in cents
  costPerOutputToken: number; // in cents
  timeoutMs: number;
  supportsStreaming: boolean;
  capabilities: {
    starAnalysis: boolean;
    technicalAnalysis: boolean;
    communicationAnalysis: boolean;
    patternDetection: boolean;
  };
}
