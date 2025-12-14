/**
 * AI Analysis Service
 * Integrates OpenRouter API with database operations for interview analysis
 */

import { supabase } from "../integrations/supabase/client";
import {
  InterviewAnalysis,
  InterviewAnalysisInsert,
  InterviewAnalysisUpdate,
  InterviewAnalysisWithResponse,
  InterviewSummary,
  InterviewSummaryInsert,
  InterviewSummaryUpdate,
  InterviewSummaryWithSession,
  UserInterviewHistory,
  SessionAnalytics,
} from "../types/aiAnalysis";
import {
  openRouterService,
  AIAnalysisResult,
  CostCalculation,
} from "./openRouterService";
import { AIAnalysisUtils } from "../utils/aiAnalysisUtils";
import {
  questionClassificationService,
  ClassifiedQuestion,
} from "./questionClassificationService";

class AIAnalysisService {
  /**
   * Convert speaking pace string to integer for database storage
   */
  private convertSpeakingPaceToInt(speakingPace: string): number {
    switch (speakingPace) {
      case "too_fast":
        return 1;
      case "appropriate":
        return 2;
      case "too_slow":
        return 3;
      default:
        return 2; // Default to appropriate
    }
  }

  /**
   * Create analysis for a single question response
   */
  public async createAnalysis(
    data: InterviewAnalysisInsert
  ): Promise<InterviewAnalysis> {
    try {
      const { data: analysis, error } = await supabase
        .from("interview_analysis")
        .insert(data as any)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create analysis: ${error.message}`);
      }

      return analysis as unknown as InterviewAnalysis;
    } catch (error) {
      console.error("Error creating analysis:", error);
      throw error;
    }
  }

  /**
   * Update existing analysis
   */
  public async updateAnalysis(
    id: string,
    data: InterviewAnalysisUpdate
  ): Promise<InterviewAnalysis> {
    try {
      const { data: analysis, error } = await supabase
        .from("interview_analysis")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update analysis: ${error.message}`);
      }

      return analysis as unknown as InterviewAnalysis;
    } catch (error) {
      console.error("Error updating analysis:", error);
      throw error;
    }
  }

  /**
   * Get analysis by ID
   */
  public async getAnalysis(id: string): Promise<InterviewAnalysis | null> {
    try {
      const { data: analysis, error } = await supabase
        .from("interview_analysis")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw new Error(`Failed to get analysis: ${error.message}`);
      }

      return analysis as unknown as InterviewAnalysis;
    } catch (error) {
      console.error("Error getting analysis:", error);
      throw error;
    }
  }

  /**
   * Get analysis with response and question data
   */
  public async getAnalysisWithContext(
    analysisId: string
  ): Promise<InterviewAnalysisWithResponse | null> {
    try {
      const { data: result, error } = await supabase
        .from("interview_analysis")
        .select(
          `
          *,
          interview_responses!inner(
            id,
            session_id,
            question_id,
            response_text,
            duration
          ),
          interview_questions!inner(
            question_id,
            question_text,
            interview_type,
            custom_domain
          )
        `
        )
        .eq("id", analysisId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw new Error(
          `Failed to get analysis with context: ${error.message}`
        );
      }

      return {
        analysis: result as unknown as InterviewAnalysis,
        response: result.interview_responses,
        question: result.interview_questions,
      };
    } catch (error) {
      console.error("Error getting analysis with context:", error);
      throw error;
    }
  }

  /**
   * Delete analysis
   */
  public async deleteAnalysis(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("interview_analysis")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to delete analysis: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting analysis:", error);
      throw error;
    }
  }

  /**
   * Process a single question response using AI (enhanced for custom questions)
   */
  public async processQuestionResponse(
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
      response_id: string;
    },
    options?: {
      model?: string;
      includeExample?: boolean;
      customPrompt?: string;
      classifiedQuestion?: ClassifiedQuestion;
    }
  ): Promise<InterviewAnalysis> {
    const startTime = Date.now();

    try {
      // Use classified question information if available
      const enhancedQuestionData = options?.classifiedQuestion
        ? {
            ...questionData,
            classification: options.classifiedQuestion.classification,
            analysisApproach:
              options.classifiedQuestion.classification.analysisApproach,
          }
        : questionData;

      // Get AI analysis from OpenRouter with enhanced question data
      const { analysis, cost, usage } = await openRouterService.analyzeResponse(
        responseText,
        enhancedQuestionData,
        sessionData,
        options
      );

      const processingTime = Date.now() - startTime;

      // Convert to database format
      const analysisData = openRouterService.convertToDatabaseFormat(
        analysis,
        sessionData.response_id,
        sessionData.session_id,
        questionData.question_id,
        sessionData.user_id,
        questionData.interview_type,
        questionData.custom_domain,
        options?.model ||
          openRouterService.selectModel(questionData.interview_type),
        usage,
        cost
      );

      // Processing time not stored in database schema

      // Save to database
      const savedAnalysis = await this.createAnalysis(analysisData);

      return savedAnalysis;
    } catch (error) {
      console.error(
        `Error processing response for question ${questionData.question_id}:`,
        error
      );

      // Generate fallback analysis instead of throwing error
      const { generateFallbackAnalysis } = await import("./aiAnalysisPrompts");

      const fallbackAnalysis = generateFallbackAnalysis(
        responseText,
        (sessionData as any).duration || 60, // Default duration if not provided
        questionData.interview_type
      );

      // Normalize fallback analysis scores to ensure consistency
      if (fallbackAnalysis.communication_scores) {
        fallbackAnalysis.communication_scores.clarity = Math.min(
          100,
          Math.max(10, fallbackAnalysis.communication_scores.clarity)
        );
        fallbackAnalysis.communication_scores.structure = Math.min(
          100,
          Math.max(10, fallbackAnalysis.communication_scores.structure)
        );
        fallbackAnalysis.communication_scores.conciseness = Math.min(
          100,
          Math.max(10, fallbackAnalysis.communication_scores.conciseness)
        );
      }
      if (fallbackAnalysis.content_scores) {
        fallbackAnalysis.content_scores.relevance = Math.min(
          100,
          Math.max(10, fallbackAnalysis.content_scores.relevance)
        );
        fallbackAnalysis.content_scores.depth = Math.min(
          100,
          Math.max(10, fallbackAnalysis.content_scores.depth)
        );
        fallbackAnalysis.content_scores.specificity = Math.min(
          100,
          Math.max(10, fallbackAnalysis.content_scores.specificity)
        );
      }

      // Convert fallback to database format
      const analysisData = {
        interview_response_id: sessionData.response_id,
        session_id: sessionData.session_id,
        question_id: questionData.question_id,
        user_id: sessionData.user_id,
        interview_type: questionData.interview_type as any,
        custom_domain: questionData.custom_domain || null,
        model_used: "fallback",
        overall_score: fallbackAnalysis.overall_score || 75,
        communication_scores: fallbackAnalysis.communication_scores || null,
        content_scores: fallbackAnalysis.content_scores || null,
        strengths: fallbackAnalysis.strengths || [],
        improvements: fallbackAnalysis.improvements || [],
        actionable_feedback:
          fallbackAnalysis.actionable_feedback || "Fallback analysis provided",
        improved_example:
          fallbackAnalysis.improved_example || "Example not available",
        filler_words: fallbackAnalysis.filler_words || null,
        speaking_pace: fallbackAnalysis.speaking_pace
          ? this.convertSpeakingPaceToInt(fallbackAnalysis.speaking_pace)
          : null,
        confidence_score: fallbackAnalysis.confidence_score || 0,
        // response_length_assessment not in database schema
        tokens_used: 0,
        input_tokens: 0,
        output_tokens: 0,
        cost_cents: 0,
        // processing_time_ms not in database schema
      };

      // Save fallback analysis to database
      const savedAnalysis = await this.createAnalysis(analysisData);

      console.warn(
        `FALLBACK analysis used for question ${questionData.question_id} - AI analysis failed. Score: ${fallbackAnalysis.overall_score}`
      );

      return savedAnalysis;
    }
  }

  /**
   * Batch process multiple responses
   */
  public async batchProcessResponses(
    responses: Array<{
      responseText: string;
      questionData: {
        question_id: number;
        question_text: string;
        interview_type: string;
        custom_domain?: string;
      };
      sessionData: {
        session_id: string;
        user_id: string;
        response_id: string;
      };
    }>,
    classifiedQuestions: ClassifiedQuestion[] = [],
    options?: {
      model?: string;
      concurrency?: number;
    }
  ): Promise<InterviewAnalysis[]> {
    const concurrency = options?.concurrency || 3;
    const results: InterviewAnalysis[] = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < responses.length; i += concurrency) {
      const batch = responses.slice(i, i + concurrency);

      const batchPromises = batch.map((response) => {
        // Find classified question
        const classifiedQuestion = classifiedQuestions.find(
          (q) => q.text === response.questionData.question_text
        );

        return this.processQuestionResponse(
          response.responseText,
          response.questionData,
          response.sessionData,
          {
            ...options,
            classifiedQuestion,
          }
        ).catch((error) => {
          console.error(
            `Error processing individual response ${response.questionData.question_id}:`,
            error
          );
          // Return null for failed responses - we'll filter them out later
          return null;
        });
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        // Filter out null results (failed responses)
        const successfulResults = batchResults.filter(
          (result) => result !== null
        );
        results.push(...successfulResults);
      } catch (error) {
        console.error(
          `Error processing batch ${Math.floor(i / concurrency) + 1}:`,
          error
        );
        // Don't throw error - continue with other batches
        console.warn("Continuing with remaining batches despite batch error");
      }
    }

    return results;
  }

  /**
   * Create summary for a session
   */
  public async createSummary(
    data: InterviewSummaryInsert
  ): Promise<InterviewSummary> {
    try {
      const { data: summary, error } = await supabase
        .from("interview_summary")
        .insert(data as any)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create summary: ${error.message}`);
      }

      return summary as unknown as InterviewSummary;
    } catch (error) {
      console.error("Error creating summary:", error);
      throw error;
    }
  }

  /**
   * Update existing summary
   */
  public async updateSummary(
    id: string,
    data: InterviewSummaryUpdate
  ): Promise<InterviewSummary> {
    try {
      const { data: summary, error } = await supabase
        .from("interview_summary")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update summary: ${error.message}`);
      }

      return summary as unknown as InterviewSummary;
    } catch (error) {
      console.error("Error updating summary:", error);
      throw error;
    }
  }

  /**
   * Get summary with session data
   */
  public async getSummaryWithSession(
    sessionId: string
  ): Promise<InterviewSummaryWithSession | null> {
    try {
      const { data: result, error } = await supabase
        .from("interview_summary")
        .select(
          `
          *,
          interview_sessions!inner(
            id,
            user_id,
            interview_type,
            duration,
            created_at,
            completed_at
          )
        `
        )
        .eq("session_id", sessionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw new Error(`Failed to get summary with session: ${error.message}`);
      }

      // Get analysis count
      const { count: analysisCount } = await supabase
        .from("interview_analysis")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      return {
        summary: result as unknown as InterviewSummary,
        session: result.interview_sessions,
        analysis_count: analysisCount || 0,
      };
    } catch (error) {
      console.error("Error getting summary with session:", error);
      throw error;
    }
  }

  /**
   * Get user's interview history using database function
   */
  public async getUserInterviewHistory(
    userId: string,
    limit: number = 10
  ): Promise<UserInterviewHistory[]> {
    try {
      const { data: history, error } = await (supabase as any).rpc(
        "get_user_interview_history",
        {
          p_user_id: userId,
          p_limit: limit,
        }
      );

      if (error) {
        throw new Error(
          `Failed to get user interview history: ${error.message}`
        );
      }

      return history || [];
    } catch (error) {
      console.error("Error getting user interview history:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive session analytics using database function
   */
  public async getSessionAnalytics(
    sessionId: string
  ): Promise<SessionAnalytics | null> {
    try {
      const { data: analytics, error } = await (supabase as any).rpc(
        "get_session_analytics",
        {
          p_session_id: sessionId,
        }
      );

      if (error) {
        throw new Error(`Failed to get session analytics: ${error.message}`);
      }

      return (analytics as any)?.[0] || null;
    } catch (error) {
      console.error("Error getting session analytics:", error);
      throw error;
    }
  }

  /**
   * Delete summary
   */
  public async deleteSummary(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("interview_summary")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to delete summary: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting summary:", error);
      throw error;
    }
  }

  /**
   * Process entire session and create summary using database function
   */
  public async processSessionSummary(
    sessionId: string,
    options?: {
      model?: string;
      includePatternAnalysis?: boolean;
    }
  ): Promise<InterviewSummary> {
    try {
      // First try the database function
      try {
        const { data: summaryId, error } = await (supabase as any).rpc(
          "create_interview_summary",
          {
            p_session_id: sessionId,
          }
        );

        if (!error) {
          // Get the created summary
          const summary = await this.getSummaryBySession(sessionId);
          if (summary) {
            return summary;
          }
        }
      } catch (dbError) {
        console.warn(
          `Database function failed, using client-side summary: ${dbError}`
        );
      }

      // Fallback: Create summary client-side from analysis data
      return await this.createClientSideSummary(sessionId);
    } catch (error) {
      console.error("Error processing session summary:", error);
      // Return fallback summary instead of throwing
      return this.createFallbackSummary(sessionId);
    }
  }

  /**
   * Create summary client-side from analysis data (fallback when DB function fails)
   */
  private async createClientSideSummary(
    sessionId: string
  ): Promise<InterviewSummary> {
    try {
      // Get all analyses for session
      const { data: analyses, error: analysesError } = await supabase
        .from("interview_analysis")
        .select("*")
        .eq("session_id", sessionId);

      if (analysesError || !analyses || analyses.length === 0) {
        console.warn("No analyses found for session, using fallback summary");
        return this.createFallbackSummary(sessionId);
      }

      // Get session data
      const { data: sessionData, error: sessionError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.warn("Session data not found, using fallback summary");
        return this.createFallbackSummary(sessionId);
      }

      // Calculate metrics
      const validScores = analyses
        .map((a) => a.overall_score)
        .filter((score) => score !== null && score !== undefined) as number[];

      const totalQuestions = analyses.length;
      const questionsAnswered = validScores.length;
      const averageScore =
        validScores.length > 0
          ? validScores.reduce((sum, score) => sum + score, 0) /
            validScores.length
          : 75;
      const medianScore = this.calculateMedian(validScores);

      // Calculate readiness level
      const readinessLevel = this.calculateReadinessLevel(averageScore).level;

      // Aggregate strengths and improvements (filter out fallback data)
      const validAnalyses = analyses.filter(
        (analysis) => analysis.model_used !== "fallback"
      );

      // Only proceed with AI-generated summary if we have valid analyses
      if (validAnalyses.length === 0) {
        console.warn(
          "No valid AI analyses found for summary generation - using fallback summary"
        );
        return this.createFallbackSummary(sessionId);
      }

      const allStrengths = validAnalyses.flatMap(
        (analysis) => (analysis.strengths as string[]) || []
      );
      const allImprovements = validAnalyses.flatMap(
        (analysis) => (analysis.improvements as string[]) || []
      );

      // Get top 5 unique strengths and improvements
      const topStrengths = [...new Set(allStrengths)].slice(0, 5);
      const topImprovements = [...new Set(allImprovements)].slice(0, 5);

      // Calculate score distribution
      const scoreDistribution = this.calculateScoreDistribution(validScores);

      // Detect patterns/trends (only from valid analyses)
      const patternInsights =
        validAnalyses.length > 0
          ? this.detectPatterns(validAnalyses as unknown as InterviewAnalysis[])
          : [];

      const performanceTrend = this.detectPerformanceTrend(validScores);

      // Generate practice areas and estimated practice time (only from valid analyses)
      const practiceAreas =
        validAnalyses.length > 0
          ? this.generatePracticeAreas(
              validAnalyses as unknown as InterviewAnalysis[]
            )
          : ["General interview preparation"];
      const estimatedPracticeTime = this.estimatePracticeTime(
        readinessLevel,
        topImprovements.length,
        averageScore
      );

      // Generate role-specific feedback and next steps using model (with safe parse)
      const roleSpecificFeedback = await this.generateRoleSpecificFeedback(
        sessionId,
        sessionData.interview_type,
        (sessionData as any).interview_config?.domain || null,
        topStrengths,
        topImprovements
      );

      const nextSteps = await this.generateNextSteps(
        sessionId,
        readinessLevel,
        topImprovements,
        patternInsights
      );

      // Calculate costs and tokens
      const totalCost = analyses.reduce(
        (sum, a) => sum + (a.cost_cents || 0),
        0
      );
      const totalTokens = analyses.reduce(
        (sum, a) => sum + (a.tokens_used || 0),
        0
      );
      const totalInputTokens = analyses.reduce(
        (sum, a) => sum + (a.input_tokens || 0),
        0
      );
      const totalOutputTokens = analyses.reduce(
        (sum, a) => sum + (a.output_tokens || 0),
        0
      );

      // Model breakdown
      const modelBreakdown = analyses.reduce((acc, a) => {
        const model = a.model_used || "unknown";
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Create summary data
      const summaryData: InterviewSummaryInsert = {
        session_id: sessionId,
        user_id: sessionData.user_id,
        total_questions: totalQuestions,
        questions_answered: questionsAnswered,
        average_score: Math.round(averageScore * 100) / 100,
        median_score: Math.round(medianScore * 100) / 100,
        score_distribution: scoreDistribution as any,
        performance_trend: performanceTrend,
        model_breakdown: modelBreakdown,
        total_tokens: totalTokens,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_cost_cents: totalCost,
        overall_strengths: topStrengths as any,
        overall_improvements: topImprovements as any,
        // pattern_insights not in database schema
        readiness_level: readinessLevel,
        readiness_score: Math.round(averageScore),
        role_specific_feedback: roleSpecificFeedback,
        next_steps: nextSteps as any,
        // recommended_practice_areas not in database schema
        estimated_practice_time: estimatedPracticeTime,
        total_duration_seconds: sessionData.duration * 60, // Convert minutes to seconds
        average_time_per_question: (sessionData.duration * 60) / totalQuestions,
        // time_distribution not in database schema
      };

      // Create the summary in database
      const summary = await this.createSummary(summaryData);
      return summary;
    } catch (error) {
      console.error("Error creating client-side summary:", error);
      return this.createFallbackSummary(sessionId);
    }
  }

  // ---- Aggregation and helper utilities ----
  private calculateReadinessLevel(averageScore: number): {
    level: "ready" | "needs_practice" | "significant_improvement";
    score: number;
    description: string;
  } {
    if (averageScore >= 80) {
      return {
        level: "ready",
        score: averageScore,
        description:
          "You are interview-ready! Your responses demonstrate strong competency. Focus on minor refinements and stay sharp with occasional practice.",
      };
    } else if (averageScore >= 60) {
      return {
        level: "needs_practice",
        score: averageScore,
        description:
          "You have a solid foundation but need focused practice in specific areas. With 2-3 weeks of targeted improvement, you will be interview-ready.",
      };
    }
    return {
      level: "significant_improvement",
      score: averageScore,
      description:
        "Your responses show potential but require substantial improvement. Focus on the fundamentals and practice regularly for 4-6 weeks before interviewing.",
    };
  }

  private detectPerformanceTrend(
    scores: number[]
  ): "improving" | "consistent" | "declining" {
    if (scores.length < 3) return "consistent";
    const firstThird = scores.slice(0, Math.ceil(scores.length / 3));
    const lastThird = scores.slice(-Math.ceil(scores.length / 3));
    const firstAvg =
      firstThird.reduce((a, b) => a + b, 0) / Math.max(1, firstThird.length);
    const lastAvg =
      lastThird.reduce((a, b) => a + b, 0) / Math.max(1, lastThird.length);
    const change = lastAvg - firstAvg;
    if (change > 8) return "improving";
    if (change < -8) return "declining";
    return "consistent";
  }

  private detectPatterns(analyses: InterviewAnalysis[]): string[] {
    if (!analyses || analyses.length === 0) return [];
    const patterns: string[] = [];
    const scores = analyses.map((a) => a.overall_score);
    const trend = this.detectScoreTrend(scores);
    if (trend) patterns.push(trend);
    const totalFillers = analyses.reduce(
      (sum, a) => sum + ((a.filler_words as any)?.total || 0),
      0
    );
    if (totalFillers > analyses.length * 3) {
      patterns.push(
        "Filler words increase when discussing complex topics - practice recording yourself"
      );
    }
    const avgConfidence =
      analyses.reduce((s, a) => s + (a.confidence_score || 0), 0) /
      analyses.length;
    if (avgConfidence < 6) {
      patterns.push(
        "Confidence appears lower in later questions - practice managing interview stamina"
      );
    }
    const paceIssues = analyses.filter(
      (a) => a.speaking_pace && a.speaking_pace !== "appropriate"
    ).length;
    if (paceIssues > analyses.length / 2) {
      patterns.push(
        "Speaking pace inconsistent - focus on maintaining steady rhythm"
      );
    }
    return patterns;
  }

  private detectScoreTrend(scores: number[]): string | null {
    if (scores.length < 3) return null;
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const improvement = secondAvg - firstAvg;
    if (improvement > 10)
      return "Performance improved significantly throughout interview - shows adaptability";
    if (improvement < -10)
      return "Performance declined in later questions - may indicate fatigue or pressure";
    return "Maintained consistent performance throughout interview";
  }

  private generatePracticeAreas(analyses: InterviewAnalysis[]): string[] {
    if (!analyses || analyses.length === 0) return [];
    const practiceAreas = new Set<string>();
    const avg: any = {
      clarity: 0,
      structure: 0,
      conciseness: 0,
      relevance: 0,
      depth: 0,
      specificity: 0,
    };
    analyses.forEach((a) => {
      if (a.communication_scores) {
        avg.clarity += a.communication_scores.clarity || 0;
        avg.structure += a.communication_scores.structure || 0;
        avg.conciseness += a.communication_scores.conciseness || 0;
      }
      if (a.content_scores) {
        avg.relevance += a.content_scores.relevance || 0;
        avg.depth += a.content_scores.depth || 0;
        avg.specificity += a.content_scores.specificity || 0;
      }
    });
    Object.keys(avg).forEach((k) => (avg[k] /= analyses.length));
    if (avg.clarity < 7)
      practiceAreas.add("Clear and articulate communication");
    if (avg.structure < 7)
      practiceAreas.add("Structured response organization");
    if (avg.conciseness < 7) practiceAreas.add("Concise and focused answers");
    if (avg.relevance < 7)
      practiceAreas.add("Staying relevant to question asked");
    if (avg.depth < 7) practiceAreas.add("Providing sufficient detail");
    if (avg.specificity < 7)
      practiceAreas.add("Using specific examples and metrics");
    const avgFillers =
      analyses.reduce((s, a) => s + ((a.filler_words as any)?.total || 0), 0) /
      analyses.length;
    if (avgFillers > 3) practiceAreas.add("Reducing filler words");
    return Array.from(practiceAreas).slice(0, 5);
  }

  private estimatePracticeTime(
    readinessLevel: string,
    improvementCount: number,
    averageScore: number
  ): string {
    if (readinessLevel === "ready") {
      return "1 week of light practice to stay sharp";
    }
    if (readinessLevel === "needs_practice") {
      return averageScore >= 70
        ? "2-3 weeks of focused practice"
        : "3-4 weeks of focused practice";
    }
    if (averageScore >= 50) return "4-6 weeks of structured practice";
    if (averageScore >= 40) return "6-8 weeks of intensive practice";
    return "8-12 weeks of comprehensive interview preparation";
  }

  private async aggregateThemes(
    analyses: InterviewAnalysis[],
    sessionId: string,
    interviewType: string
  ): Promise<{ topStrengths: string[]; topImprovements: string[] }> {
    const strengths = analyses
      .map((a) => a.strengths as string[])
      .filter((s) => Array.isArray(s))
      .flat();
    const improvements = analyses
      .map((a) => a.improvements as string[])
      .filter((s) => Array.isArray(s))
      .flat();

    const fallbackTop = (items: string[]) => {
      const counts = this.countOccurrences(items);
      return Object.entries(counts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([v]) => v);
    };

    try {
      const topStrengths = await this.identifyCommonThemes(
        strengths,
        "strengths"
      );
      const topImprovements = await this.identifyCommonThemes(
        improvements,
        "improvements"
      );
      return {
        topStrengths: topStrengths.slice(0, 5),
        topImprovements: topImprovements.slice(0, 5),
      };
    } catch (e) {
      console.warn("Theme identification failed, using counts fallback:", e);
      return {
        topStrengths: fallbackTop(strengths),
        topImprovements: fallbackTop(improvements),
      };
    }
  }

  private async identifyCommonThemes(
    items: string[],
    type: "strengths" | "improvements"
  ): Promise<string[]> {
    if (!items || items.length === 0) return [];
    const list = items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    const prompt = `Given these interview ${type} from multiple questions:\n\n${list}\n\nIdentify the top 5 overarching themes or patterns. Consolidate similar points. Return as JSON object: { "themes": string[] }`;
    const response = await openRouterService.callOpenRouterWithRetry({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at identifying patterns in interview feedback. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0].message.content;
    const parsed: any = (openRouterService as any).instance?.[
      "parseJsonLenient"
    ]
      ? (openRouterService as any).instance["parseJsonLenient"](content)
      : JSON.parse(content);
    return parsed.themes || parsed.patterns || parsed.items || [];
  }

  private async generateRoleSpecificFeedback(
    sessionId: string,
    interviewType: string,
    customDomain: string | null,
    overallStrengths: string[],
    overallImprovements: string[]
  ): Promise<string> {
    const roleContext = customDomain || interviewType;
    const prompt = `Generate role-specific interview feedback for a ${roleContext} candidate.\n\nOVERALL STRENGTHS:\n${overallStrengths
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n")}\n\nAREAS FOR IMPROVEMENT:\n${overallImprovements
      .map((imp, i) => `${i + 1}. ${imp}`)
      .join(
        "\n"
      )}\n\nProvide a comprehensive 4-5 sentence paragraph that: 1) Acknowledges strengths in context of the role, 2) Explains how improvements relate to competencies, 3) Offers specific, actionable guidance, 4) Ends encouragingly.`;
    const resp = await openRouterService.callOpenRouterWithRetry({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert career coach specializing in interview preparation. Provide constructive, role-specific feedback.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });
    return resp.choices[0].message.content.trim();
  }

  private async generateNextSteps(
    sessionId: string,
    readinessLevel: string,
    overallImprovements: string[],
    patterns: string[]
  ): Promise<string[]> {
    const prompt = `Based on this interview assessment, provide specific next steps:\n\nREADINESS LEVEL: ${readinessLevel}\n\nMAIN AREAS TO IMPROVE:\n${overallImprovements
      .map((imp, i) => `${i + 1}. ${imp}`)
      .join("\n")}\n\nPATTERNS DETECTED:\n${patterns
      .map((p, i) => `${i + 1}. ${p}`)
      .join(
        "\n"
      )}\n\nGenerate 5-7 specific, actionable next steps ordered by priority. Return JSON object: { "steps": string[] }`;
    const resp = await openRouterService.callOpenRouterWithRetry({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interview coach. Generate specific, actionable recommendations. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    const content = resp.choices[0].message.content;
    const parsed: any = (openRouterService as any).instance?.[
      "parseJsonLenient"
    ]
      ? (openRouterService as any).instance["parseJsonLenient"](content)
      : JSON.parse(content);
    return parsed.steps || parsed.next_steps || parsed.recommendations || [];
  }

  /**
   * Create a fallback summary when all else fails
   */
  private createFallbackSummary(sessionId: string): InterviewSummary {
    return {
      id: `fallback-${sessionId}`,
      session_id: sessionId,
      user_id: "", // Will be filled by caller
      total_questions: 1,
      questions_answered: 1,
      average_score: 75,
      median_score: 75,
      score_distribution: {
        excellent: 0,
        good: 1,
        fair: 0,
        needs_improvement: 0,
      } as any,
      performance_trend: "consistent",
      model_breakdown: {},
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_cents: 0,
      overall_strengths: ["Good communication skills"] as any,
      overall_improvements: ["Continue practicing"] as any,
      // pattern_insights not in database schema
      readiness_level: "needs_practice",
      readiness_score: 75,
      role_specific_feedback: "Analysis completed with fallback data",
      next_steps: ["Practice more interviews"] as any,
      // recommended_practice_areas not in database schema
      estimated_practice_time: "1-2 weeks",
      total_duration_seconds: 0,
      average_time_per_question: 0,
      // time_distribution not in database schema
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Calculate median value from array of numbers
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 75;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Count occurrences of items in array
   */
  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Calculate score distribution from scores
   */
  private calculateScoreDistribution(scores: number[]): {
    excellent: number;
    good: number;
    fair: number;
    needs_improvement: number;
  } {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      needs_improvement: 0,
    };

    scores.forEach((score) => {
      if (score >= 80) distribution.excellent++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else distribution.needs_improvement++;
    });

    return distribution;
  }

  /**
   * Get all analyses for a session
   */
  public async getSessionAnalyses(
    sessionId: string
  ): Promise<InterviewAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from("interview_analysis")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching session analyses:", error);
        throw error;
      }

      // Parse JSON fields if they are strings
      const parsedData = (data || []).map((analysis: any) => {
        // Debug logs removed - issue fixed

        const parsed = {
          ...analysis,
          strengths:
            typeof analysis.strengths === "string"
              ? JSON.parse(analysis.strengths)
              : analysis.strengths,
          improvements:
            typeof analysis.improvements === "string"
              ? JSON.parse(analysis.improvements)
              : analysis.improvements,
          communication_scores:
            typeof analysis.communication_scores === "string"
              ? JSON.parse(analysis.communication_scores)
              : analysis.communication_scores,
          content_scores:
            typeof analysis.content_scores === "string"
              ? JSON.parse(analysis.content_scores)
              : analysis.content_scores,
          filler_words:
            typeof analysis.filler_words === "string"
              ? JSON.parse(analysis.filler_words)
              : analysis.filler_words,
          // Parse actionable_feedback and improved_example (they should be strings, not JSON)
          actionable_feedback: analysis.actionable_feedback || "",
          improved_example: analysis.improved_example || "",
        };

        return parsed;
      });

      return parsedData;
    } catch (error) {
      console.error("Error getting session analyses:", error);
      return [];
    }
  }

  /**
   * Get summary for a session
   */
  public async getSummaryBySession(
    sessionId: string
  ): Promise<InterviewSummary | null> {
    try {
      const { data, error } = await supabase
        .from("interview_summary")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching session summary:", error);
        return null;
      }

      return data as unknown as InterviewSummary;
    } catch (error) {
      console.error("Error getting session summary:", error);
      return null;
    }
  }

  /**
   * Process complete interview (all responses + summary)
   */
  public async processCompleteInterview(
    sessionId: string,
    classifiedQuestions: ClassifiedQuestion[] = [],
    options?: {
      model?: string;
      concurrency?: number;
    }
  ): Promise<{
    analyses: InterviewAnalysis[];
    summary: InterviewSummary;
    totalCost: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Validate session ID
      if (!sessionId || sessionId === "null" || sessionId === "undefined") {
        throw new Error("Invalid session ID provided for analysis");
      }

      // Get session data and responses
      const { data: sessionData, error: sessionError } = await supabase
        .from("interview_sessions")
        .select(
          `
          *,
          interview_responses(
            id,
            question_id,
            response_text,
            duration
          )
        `
        )
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        throw new Error(`Failed to get session data: ${sessionError.message}`);
      }

      if (
        !sessionData.interview_responses ||
        sessionData.interview_responses.length === 0
      ) {
        throw new Error("No responses found for this session");
      }

      // Get question data
      const questionIds = sessionData.interview_responses.map(
        (r) => r.question_id
      );
      const { data: questions, error: questionsError } = await supabase
        .from("interview_questions")
        .select("question_id, question_text, interview_type, custom_domain")
        .in("question_id", questionIds);

      if (questionsError) {
        throw new Error(`Failed to get questions: ${questionsError.message}`);
      }

      // Prepare responses for batch processing
      const responses = sessionData.interview_responses.map((response) => {
        const question = questions.find(
          (q) => q.question_id === response.question_id
        );
        if (!question) {
          throw new Error(`Question not found for response ${response.id}`);
        }

        return {
          responseText: response.response_text || "",
          questionData: {
            question_id: question.question_id,
            question_text: question.question_text,
            interview_type: question.interview_type,
            custom_domain: question.custom_domain,
          },
          sessionData: {
            session_id: sessionId,
            user_id: sessionData.user_id,
            response_id: response.id,
          },
        };
      });

      // Process all responses
      const analyses = await this.batchProcessResponses(
        responses,
        classifiedQuestions,
        options
      );

      // Create session summary
      const summary = await this.processSessionSummary(sessionId, options);

      const processingTime = Date.now() - startTime;
      const totalCost = analyses.reduce(
        (sum, analysis) => sum + (analysis.cost_cents || 0),
        0
      );

      return {
        analyses,
        summary,
        totalCost,
        processingTime,
      };
    } catch (error) {
      console.error("Error processing complete interview:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();
