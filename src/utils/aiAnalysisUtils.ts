/**
 * Utility functions for AI Analysis data manipulation and validation
 */

import {
  InterviewAnalysis,
  InterviewSummary,
  StarScores,
  TechnicalScores,
  CommunicationScores,
  ContentScores,
  FillerWords,
  ScoreDistribution,
  READINESS_THRESHOLDS,
  SCORE_THRESHOLDS,
} from "../types/aiAnalysis";

// Score calculation utilities
export function calculateOverallScore(
  starScores?: StarScores,
  technicalScores?: TechnicalScores,
  communicationScores?: CommunicationScores,
  contentScores?: ContentScores,
  interviewType:
    | "behavioral"
    | "technical"
    | "leadership"
    | "custom" = "behavioral"
): number {
  let totalScore = 0;
  let weightCount = 0;

  // Communication and content scores are always included
  if (communicationScores) {
    totalScore +=
      (communicationScores.clarity +
        communicationScores.structure +
        communicationScores.conciseness) *
      0.3;
    weightCount += 0.3;
  }

  if (contentScores) {
    totalScore +=
      (contentScores.relevance +
        contentScores.depth +
        contentScores.specificity) *
      0.3;
    weightCount += 0.3;
  }

  // Type-specific scoring
  if (interviewType === "behavioral" || interviewType === "leadership") {
    if (starScores) {
      totalScore +=
        (starScores.situation +
          starScores.task +
          starScores.action +
          starScores.result) *
        0.4;
      weightCount += 0.4;
    }
  } else if (interviewType === "technical" || interviewType === "custom") {
    if (technicalScores) {
      totalScore +=
        (technicalScores.understanding +
          technicalScores.approach +
          technicalScores.depth +
          technicalScores.clarity) *
        0.4;
      weightCount += 0.4;
    }
  }

  return weightCount > 0 ? Math.round(totalScore / weightCount) : 0;
}

export function calculateReadinessLevel(
  averageScore: number
): "ready" | "needs_practice" | "significant_improvement" {
  if (averageScore >= READINESS_THRESHOLDS.READY) {
    return "ready";
  } else if (averageScore >= READINESS_THRESHOLDS.NEEDS_PRACTICE) {
    return "needs_practice";
  } else {
    return "significant_improvement";
  }
}

export function getScoreTier(
  score: number
): "excellent" | "good" | "fair" | "needs_improvement" {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) {
    return "excellent";
  } else if (score >= SCORE_THRESHOLDS.GOOD) {
    return "good";
  } else if (score >= SCORE_THRESHOLDS.FAIR) {
    return "fair";
  } else {
    return "needs_improvement";
  }
}

// Data aggregation utilities
export function aggregateScoreDistribution(
  analyses: InterviewAnalysis[]
): ScoreDistribution {
  const distribution: ScoreDistribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    needs_improvement: 0,
  };

  analyses.forEach((analysis) => {
    const tier = getScoreTier(analysis.overall_score);
    distribution[tier]++;
  });

  return distribution;
}

export function calculateAverageScore(analyses: InterviewAnalysis[]): number {
  if (analyses.length === 0) return 0;

  const totalScore = analyses.reduce(
    (sum, analysis) => sum + analysis.overall_score,
    0
  );
  return Math.round((totalScore / analyses.length) * 100) / 100; // Round to 2 decimal places
}

export function calculateMedianScore(analyses: InterviewAnalysis[]): number {
  if (analyses.length === 0) return 0;

  const scores = analyses.map((a) => a.overall_score).sort((a, b) => a - b);
  const middle = Math.floor(scores.length / 2);

  if (scores.length % 2 === 0) {
    return (scores[middle - 1] + scores[middle]) / 2;
  } else {
    return scores[middle];
  }
}

export function calculatePerformanceTrend(
  analyses: InterviewAnalysis[]
): "improving" | "consistent" | "declining" {
  if (analyses.length < 4) return "consistent";

  const sortedAnalyses = [...analyses].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const midPoint = Math.floor(sortedAnalyses.length / 2);
  const firstHalf = sortedAnalyses.slice(0, midPoint);
  const secondHalf = sortedAnalyses.slice(midPoint);

  const firstHalfAvg = calculateAverageScore(firstHalf);
  const secondHalfAvg = calculateAverageScore(secondHalf);

  const difference = secondHalfAvg - firstHalfAvg;

  if (difference > 5) return "improving";
  if (difference < -5) return "declining";
  return "consistent";
}

// Model usage aggregation
export function aggregateModelUsage(
  analyses: InterviewAnalysis[]
): Record<string, number> {
  const modelUsage: Record<string, number> = {};

  analyses.forEach((analysis) => {
    modelUsage[analysis.model_used] =
      (modelUsage[analysis.model_used] || 0) + 1;
  });

  return modelUsage;
}

// Cost calculation utilities
export function calculateTotalCost(analyses: InterviewAnalysis[]): number {
  return analyses.reduce((total, analysis) => total + analysis.cost_cents, 0);
}

export function calculateTotalTokens(analyses: InterviewAnalysis[]): {
  total: number;
  input: number;
  output: number;
} {
  return analyses.reduce(
    (totals, analysis) => ({
      total: totals.total + analysis.tokens_used,
      input: totals.input + analysis.input_tokens,
      output: totals.output + analysis.output_tokens,
    }),
    { total: 0, input: 0, output: 0 }
  );
}

// Content aggregation utilities
export function aggregateStrengths(
  analyses: InterviewAnalysis[],
  limit: number = 5
): string[] {
  const strengthCounts: Record<string, number> = {};

  analyses.forEach((analysis) => {
    analysis.strengths.forEach((strength) => {
      strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
    });
  });

  return Object.entries(strengthCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([strength]) => strength);
}

export function aggregateImprovements(
  analyses: InterviewAnalysis[],
  limit: number = 5
): string[] {
  const improvementCounts: Record<string, number> = {};

  analyses.forEach((analysis) => {
    analysis.improvements.forEach((improvement) => {
      improvementCounts[improvement] =
        (improvementCounts[improvement] || 0) + 1;
    });
  });

  return Object.entries(improvementCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([improvement]) => improvement);
}

export function aggregateFillerWords(
  analyses: InterviewAnalysis[]
): FillerWords {
  const allWords: string[] = [];
  const wordCounts: Record<string, number> = {};
  let totalCount = 0;

  analyses.forEach((analysis) => {
    allWords.push(...analysis.filler_words.words);
    analysis.filler_words.words.forEach((word) => {
      wordCounts[word] =
        (wordCounts[word] || 0) + (analysis.filler_words.counts[word] || 0);
    });
    totalCount += analysis.filler_words.total;
  });

  const uniqueWords = [...new Set(allWords)];

  return {
    words: uniqueWords,
    counts: wordCounts,
    total: totalCount,
  };
}

// Formatting utilities
export function formatCost(costCents: number): string {
  const dollars = costCents / 100;
  return `$${dollars.toFixed(2)}`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

// Validation utilities
export function validateStarScores(scores: StarScores): boolean {
  return Object.values(scores).every(
    (score) => typeof score === "number" && score >= 0 && score <= 10
  );
}

export function validateTechnicalScores(scores: TechnicalScores): boolean {
  return Object.values(scores).every(
    (score) => typeof score === "number" && score >= 0 && score <= 10
  );
}

export function validateCommunicationScores(
  scores: CommunicationScores
): boolean {
  return Object.values(scores).every(
    (score) => typeof score === "number" && score >= 0 && score <= 10
  );
}

export function validateContentScores(scores: ContentScores): boolean {
  return Object.values(scores).every(
    (score) => typeof score === "number" && score >= 0 && score <= 10
  );
}

// Analysis summary utilities
export function generateSummaryInsights(summary: InterviewSummary): string[] {
  const insights: string[] = [];

  // Performance insights
  if (summary.performance_trend === "improving") {
    insights.push("Performance improved throughout the interview");
  } else if (summary.performance_trend === "declining") {
    insights.push("Performance declined as the interview progressed");
  } else {
    insights.push("Performance remained consistent throughout");
  }

  // Readiness insights
  if (summary.readiness_level === "ready") {
    insights.push("Demonstrates strong interview readiness");
  } else if (summary.readiness_level === "needs_practice") {
    insights.push("Shows good potential with room for improvement");
  } else {
    insights.push("Requires significant practice before interview readiness");
  }

  // Score insights
  if (summary.average_score >= 80) {
    insights.push("Consistently high-quality responses");
  } else if (summary.average_score >= 60) {
    insights.push("Good responses with specific improvement areas");
  } else {
    insights.push("Responses need substantial development");
  }

  return insights;
}

// Export all utilities
export const AIAnalysisUtils = {
  calculateOverallScore,
  calculateReadinessLevel,
  getScoreTier,
  aggregateScoreDistribution,
  calculateAverageScore,
  calculateMedianScore,
  calculatePerformanceTrend,
  aggregateModelUsage,
  calculateTotalCost,
  calculateTotalTokens,
  aggregateStrengths,
  aggregateImprovements,
  aggregateFillerWords,
  formatCost,
  formatDuration,
  formatScore,
  validateStarScores,
  validateTechnicalScores,
  validateCommunicationScores,
  validateContentScores,
  generateSummaryInsights,
};
