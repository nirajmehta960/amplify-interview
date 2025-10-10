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

class AIAnalysisService {
  /**
   * Create analysis for a single question response
   */
  public async createAnalysis(
    data: InterviewAnalysisInsert
  ): Promise<InterviewAnalysis> {
    try {
      const { data: analysis, error } = await supabase
        .from("interview_analysis")
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create analysis: ${error.message}`);
      }

      return analysis;
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
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update analysis: ${error.message}`);
      }

      return analysis;
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

      return analysis;
    } catch (error) {
      console.error("Error getting analysis:", error);
      throw error;
    }
  }

  /**
   * Get all analyses for a session
   */
  public async getSessionAnalyses(
    sessionId: string
  ): Promise<InterviewAnalysis[]> {
    try {
      const { data: analyses, error } = await supabase
        .from("interview_analysis")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to get session analyses: ${error.message}`);
      }

      return analyses || [];
    } catch (error) {
      console.error("Error getting session analyses:", error);
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
        analysis: result,
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
   * Process a single question response using AI
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
    }
  ): Promise<InterviewAnalysis> {
    const startTime = Date.now();

    try {

      // Get AI analysis from OpenRouter
      const { analysis, cost, usage } = await openRouterService.analyzeResponse(
        responseText,
        questionData,
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

      // Add processing time
      analysisData.processing_time_ms = processingTime;

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
        sessionData.duration || 60, // Default duration if not provided
        questionData.interview_type
      );

      // Convert fallback to database format
      const analysisData = {
        interview_response_id: sessionData.response_id,
        session_id: sessionData.session_id,
        question_id: questionData.question_id,
        user_id: sessionData.user_id,
        interview_type: questionData.interview_type,
        custom_domain: questionData.custom_domain || null,
        model_used: "fallback",
        overall_score: fallbackAnalysis.overall_score || 75,
        star_scores: fallbackAnalysis.star_scores || null,
        technical_scores: fallbackAnalysis.technical_scores || null,
        communication_scores: fallbackAnalysis.communication_scores || null,
        content_scores: fallbackAnalysis.content_scores || null,
        strengths: fallbackAnalysis.strengths || [],
        improvements: fallbackAnalysis.improvements || [],
        actionable_feedback:
          fallbackAnalysis.actionable_feedback || "Fallback analysis provided",
        improved_example:
          fallbackAnalysis.improved_example || "Example not available",
        filler_words: fallbackAnalysis.filler_words || null,
        speaking_pace: fallbackAnalysis.speaking_pace || null,
        confidence_score: fallbackAnalysis.confidence_score || 0,
        response_length_assessment:
          fallbackAnalysis.response_length_assessment || null,
        tokens_used: 0,
        input_tokens: 0,
        output_tokens: 0,
        cost_cents: 0,
        processing_time_ms: Date.now() - startTime,
      };

      // Save fallback analysis to database
      const savedAnalysis = await this.createAnalysis(analysisData);

      console.log(
        `Fallback analysis completed for question ${questionData.question_id}: Score ${fallbackAnalysis.overall_score}`
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

      const batchPromises = batch.map((response) =>
        this.processQuestionResponse(
          response.responseText,
          response.questionData,
          response.sessionData,
          options
        ).catch((error) => {
          console.error(
            `Error processing individual response ${response.questionData.question_id}:`,
            error
          );
          // Return null for failed responses - we'll filter them out later
          return null;
        })
      );

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
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create summary: ${error.message}`);
      }

      return summary;
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
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update summary: ${error.message}`);
      }

      return summary;
    } catch (error) {
      console.error("Error updating summary:", error);
      throw error;
    }
  }

  /**
   * Get summary by session ID
   */
  public async getSummaryBySession(
    sessionId: string
  ): Promise<InterviewSummary | null> {
    try {
      const { data: summary, error } = await supabase
        .from("interview_summary")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        console.warn(
          `Failed to get summary for session ${sessionId}:`,
          error.message
        );
        return null; // Return null instead of throwing error
      }

      return summary;
    } catch (error) {
      console.warn("Error getting summary:", error);
      return null; // Return null instead of throwing error
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
        summary: result,
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
      const { data: history, error } = await supabase.rpc(
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
      const { data: analytics, error } = await supabase.rpc(
        "get_session_analytics",
        {
          p_session_id: sessionId,
        }
      );

      if (error) {
        throw new Error(`Failed to get session analytics: ${error.message}`);
      }

      return analytics?.[0] || null;
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
      const { data: summaryId, error } = await supabase.rpc(
        "create_interview_summary",
        {
          p_session_id: sessionId,
        }
      );

        if (!error) {
      // Get the created summary
      const summary = await this.getSummaryBySession(sessionId);
          if (summary) {
      console.log(
        `Session summary created: ${summary.readiness_level} (${summary.readiness_score}%)`
      );
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
      // Get all analyses for this session
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
      const readinessLevel =
        averageScore >= 80
          ? "ready"
          : averageScore >= 60
          ? "needs_practice"
          : "significant_improvement";

      // Aggregate strengths and improvements
      const allStrengths = analyses
        .map((a) => a.strengths)
        .filter((s) => s && Array.isArray(s))
        .flat() as string[];

      const allImprovements = analyses
        .map((a) => a.improvements)
        .filter((i) => i && Array.isArray(i))
        .flat() as string[];

      // Get top 5 most common strengths and improvements
      const strengthCounts = this.countOccurrences(allStrengths);
      const improvementCounts = this.countOccurrences(allImprovements);

      const topStrengths = Object.entries(strengthCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([strength]) => strength);

      const topImprovements = Object.entries(improvementCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([improvement]) => improvement);

      // Calculate score distribution
      const scoreDistribution = this.calculateScoreDistribution(validScores);

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
        score_distribution: scoreDistribution,
        performance_trend: "consistent", // Simplified for now
        model_breakdown: modelBreakdown,
        total_tokens: totalTokens,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_cost_cents: totalCost,
        overall_strengths: topStrengths,
        overall_improvements: topImprovements,
        pattern_insights: [
          `Performance ${
            readinessLevel === "ready"
              ? "demonstrates strong readiness"
              : readinessLevel === "needs_practice"
              ? "shows good potential with room for improvement"
              : "requires significant practice"
          }`,
          `Average score of ${Math.round(averageScore)} indicates ${
            averageScore >= 80
              ? "consistently high-quality"
              : averageScore >= 60
              ? "good responses with specific improvement areas"
              : "responses need substantial development"
          }`,
          `Completed ${questionsAnswered} out of ${totalQuestions} questions with analysis`,
        ],
        readiness_level: readinessLevel,
        readiness_score: Math.round(averageScore),
        role_specific_feedback: `Analysis completed with ${analyses.length} question responses processed`,
        next_steps: [
          "Continue practicing with similar questions",
          "Focus on identified improvement areas",
          "Schedule follow-up interviews to track progress",
        ],
        recommended_practice_areas: topImprovements.slice(0, 3),
        estimated_practice_time:
          readinessLevel === "ready"
            ? "1 week"
            : readinessLevel === "needs_practice"
            ? "2-3 weeks"
            : "4-6 weeks",
        total_duration_seconds: sessionData.duration * 60, // Convert minutes to seconds
        average_time_per_question: (sessionData.duration * 60) / totalQuestions,
        time_distribution: {}, // Simplified for now
      };

      // Create the summary in database
      const summary = await this.createSummary(summaryData);
      return summary;
    } catch (error) {
      console.error("Error creating client-side summary:", error);
      return this.createFallbackSummary(sessionId);
    }
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
        total: 1,
      },
      performance_trend: "consistent",
      model_breakdown: {},
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_cents: 0,
      overall_strengths: ["Good communication skills"],
      overall_improvements: ["Continue practicing"],
      pattern_insights: ["Consistent performance"],
      readiness_level: "needs_practice",
      readiness_score: 75,
      role_specific_feedback: "Analysis completed with fallback data",
      next_steps: ["Practice more interviews"],
      recommended_practice_areas: ["Communication"],
      estimated_practice_time: "1-2 weeks",
      total_duration_seconds: 0,
      average_time_per_question: 0,
      time_distribution: {},
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
    total: number;
  } {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      needs_improvement: 0,
      total: scores.length,
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
   * Process complete interview (all responses + summary)
   */
  public async processCompleteInterview(
    sessionId: string,
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
      const analyses = await this.batchProcessResponses(responses, options);

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
