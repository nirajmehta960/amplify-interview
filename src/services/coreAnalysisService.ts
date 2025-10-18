/**
 * Core AI Analysis Service
 *
 * This service integrates the OpenRouter API with expert analysis prompts
 * to provide comprehensive interview response analysis.
 */

import { openRouterService } from "./openRouterService";
import {
  BEHAVIORAL_ANALYSIS_PROMPT,
  LEADERSHIP_ANALYSIS_PROMPT,
  TECHNICAL_ANALYSIS_PROMPT,
  CUSTOM_DOMAIN_PROMPTS,
  buildSystemPrompt,
  buildUserPrompt,
  validateAnalysisResponse,
  validateAnalysisResult,
  calculateOverallScore,
  extractFillerWords,
  assessSpeakingPace,
  assessResponseLength,
  calculateConfidenceScore,
  generateFallbackAnalysis,
  type StandardAnalysisResult,
  type StarScores,
  type CommunicationScores,
  type ContentScores,
} from "./aiAnalysisPrompts";

export interface AnalysisRequest {
  questionText: string;
  responseText: string;
  duration: number;
  interviewType: "behavioral" | "leadership" | "technical" | "custom";
  focusAreas?: string[];
  category?: string;
  customDomain?: string;
}

export interface AnalysisResponse {
  success: boolean;
  result?: StandardAnalysisResult;
  error?: string;
  model?: string;
  tokensUsed?: number;
  costCents?: number;
  processingTimeMs?: number;
}

export interface SessionAnalysisResult {
  sessionId: string;
  analyses: StandardAnalysisResult[];
  summary: {
    average_score: number;
    median_score: number;
    readiness_level: "ready" | "needs_practice" | "significant_improvement";
    overall_strengths: string[];
    overall_improvements: string[];
    total_cost_cents: number;
    total_tokens: number;
  };
  totalCostCents: number;
}

/**
 * Analyze a single interview response using AI by response ID
 */
export async function analyzeQuestionResponse(
  responseId: string
): Promise<AnalysisResponse> {
  try {
    // Import the AI analysis service
    const { aiAnalysisService } = await import("./aiAnalysisService");

    // Get response data from database
    const { supabase } = await import("../integrations/supabase/client");

    const { data: responseData, error: responseError } = await supabase
      .from("interview_responses")
      .select(
        `
        *,
        interview_sessions!inner(
          user_id,
          interview_type
        ),
        interview_questions!inner(
          question_id,
          question_text,
          interview_type,
          custom_domain
        )
      `
      )
      .eq("id", responseId)
      .single();

    if (responseError || !responseData) {
      throw new Error("Response not found");
    }

    // Process the response using AI analysis service
    const analysis = await aiAnalysisService.processQuestionResponse(
      responseData.response_text || "",
      {
        question_id: responseData.interview_questions.question_id,
        question_text: responseData.interview_questions.question_text,
        interview_type: responseData.interview_questions.interview_type,
        custom_domain: responseData.interview_questions.custom_domain,
      },
      {
        session_id: responseData.session_id,
        user_id: responseData.interview_sessions.user_id,
        response_id: responseId,
      }
    );

    // Convert to expected format
    return {
      success: true,
      result: {
        overall_score: analysis.overall_score || 0,
        star_scores: analysis.star_scores as any,
        communication_scores: analysis.communication_scores as any,
        content_scores: analysis.content_scores as any,
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
        improvements: Array.isArray(analysis.improvements)
          ? analysis.improvements
          : [],
        actionable_feedback: analysis.actionable_feedback || "",
        improved_example: analysis.improved_example || "",
        filler_words: analysis.filler_words as any,
        speaking_pace: analysis.speaking_pace || "",
        confidence_score: analysis.confidence_score || 0,
        // response_length_assessment not in database schema
        model_used: analysis.model_used || "",
        tokens_used: analysis.tokens_used || 0,
        cost_cents: analysis.cost_cents || 0,
        // processing_time_ms not in database schema
      },
      model: analysis.model_used,
      tokensUsed: analysis.tokens_used || 0,
      costCents: analysis.cost_cents || 0,
      // processingTimeMs not in database schema
    };
  } catch (error) {
    console.error("Error analyzing question response:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Analyze a single interview response using AI with request object
 */
export async function analyzeQuestionResponseFromRequest(
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const startTime = Date.now();

  try {
    // Select appropriate model and prompt based on interview type
    const model = openRouterService.selectModel(request.interviewType);

    // Build system prompt dynamically
    const systemPrompt = buildSystemPrompt(
      request.interviewType,
      request.customDomain
    );

    // Build the user prompt with actual data
    const userPrompt = buildUserPrompt(
      request.questionText,
      request.responseText,
      request.duration,
      {
        category: request.category,
        focusAreas: request.focusAreas?.join(", "),
        interviewType: request.interviewType,
        customDomain: request.customDomain,
      }
    );

    // Make API call to OpenRouter
    const apiResponse = await openRouterService.callOpenRouterWithRetry({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const processingTime = Date.now() - startTime;

    // Parse the JSON response
    let analysisResult: StandardAnalysisResult;
    try {
      const jsonContent = JSON.parse(apiResponse.choices[0].message.content);
      analysisResult = jsonContent;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("AI returned invalid JSON response");
    }

    // Validate the analysis result structure
    if (!validateAnalysisResponse(analysisResult)) {
      console.error("Invalid analysis result structure:", analysisResult);
      throw new Error("AI returned analysis in invalid format");
    }

    // Calculate cost
    const cost = openRouterService.calculateCost(
      model,
      apiResponse.usage.prompt_tokens,
      apiResponse.usage.completion_tokens
    );

    return {
      success: true,
      result: analysisResult,
      model,
      tokensUsed: apiResponse.usage.total_tokens,
      costCents: cost.totalCostCents,
      processingTimeMs: processingTime,
    };
  } catch (error) {
    console.error("Analysis failed:", error);

    // Generate fallback analysis for graceful degradation
    try {
      const fallbackAnalysis = generateFallbackAnalysis(
        request.responseText,
        request.duration,
        request.interviewType
      );

      return {
        success: true,
        result: fallbackAnalysis as StandardAnalysisResult,
        model: "fallback",
        tokensUsed: 0,
        costCents: 0,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (fallbackError) {
      console.error("Fallback analysis also failed:", fallbackError);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown analysis error",
      };
    }
  }
}

/**
 * Analyze an entire interview session
 */
export async function analyzeInterviewSession(
  sessionId: string
): Promise<SessionAnalysisResult> {
  try {
    // Import the AI analysis service that has full database integration
    const { aiAnalysisService } = await import("./aiAnalysisService");

    // Process the complete interview (all responses + summary)
    const result = await aiAnalysisService.processCompleteInterview(sessionId);

    // Convert the result to the expected format
    const sessionAnalysisResult: SessionAnalysisResult = {
      sessionId,
      analyses: result.analyses.map((analysis) => ({
        overall_score: analysis.overall_score || 0,
        star_scores: analysis.star_scores as any,
        communication_scores: analysis.communication_scores as any,
        content_scores: analysis.content_scores as any,
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
        improvements: Array.isArray(analysis.improvements)
          ? analysis.improvements
          : [],
        actionable_feedback: analysis.actionable_feedback || "",
        improved_example: analysis.improved_example || "",
        filler_words: analysis.filler_words as any,
        speaking_pace: analysis.speaking_pace || "",
        confidence_score: analysis.confidence_score || 0,
        // response_length_assessment not in database schema
        model_used: analysis.model_used || "",
        tokens_used: analysis.tokens_used || 0,
        cost_cents: analysis.cost_cents || 0,
        // processing_time_ms not in database schema
      })),
      summary: {
        average_score: result.summary.average_score || 0,
        median_score: result.summary.median_score || 0,
        readiness_level: result.summary.readiness_level as
          | "ready"
          | "needs_practice"
          | "significant_improvement",
        overall_strengths: Array.isArray(result.summary.overall_strength)
          ? result.summary.overall_strength
          : [],
        overall_improvements: Array.isArray(result.summary.overall_improvements)
          ? result.summary.overall_improvements
          : [],
        total_cost_cents: result.totalCost,
        total_tokens: result.summary.total_tokens || 0,
      },
      totalCostCents: result.totalCost,
    };

    return sessionAnalysisResult;
  } catch (error) {
    console.error("Session analysis failed:", error);
    throw error;
  }
}

/**
 * Helper function to enhance analysis with additional metrics
 */
export function enhanceAnalysisWithMetrics(
  analysis: StandardAnalysisResult,
  responseText: string,
  duration: number
): StandardAnalysisResult {
  // Extract filler words if not already done
  if (!analysis.filler_words || analysis.filler_words.total === undefined) {
    analysis.filler_words = extractFillerWords(responseText);
  }

  // Assess speaking pace if not already done
  if (!analysis.speaking_pace) {
    analysis.speaking_pace = assessSpeakingPace(responseText, duration);
  }

  // response_length_assessment not in database schema

  // Calculate confidence score if not already done
  if (!analysis.confidence_score || analysis.confidence_score === 0) {
    const hasQuantifiedResults =
      /\d+%|\d+\s*(increase|decrease|improvement|reduction)/i.test(
        responseText
      );
    const hasPersonalOwnership =
      /I\s+(did|implemented|led|created|developed|managed|handled)/i.test(
        responseText
      );

    analysis.confidence_score = calculateConfidenceScore(
      analysis.filler_words,
      analysis.speaking_pace,
      "appropriate", // Default response length assessment
      hasQuantifiedResults,
      hasPersonalOwnership
    );
  }

  // Recalculate overall score if needed
  if (analysis.star_scores) {
    const recalculatedScore = calculateOverallScore(
      analysis.star_scores,
      analysis.communication_scores,
      analysis.content_scores
    );

    // Only update if there's a significant difference (AI might have calculated differently)
    if (Math.abs(analysis.overall_score - recalculatedScore) > 5) {
      console.warn(
        `Score mismatch: AI=${analysis.overall_score}, Calculated=${recalculatedScore}`
      );
      analysis.overall_score = recalculatedScore;
    }
  }

  return analysis;
}

/**
 * Helper function to generate session summary from individual analyses
 */
export function generateSessionSummary(
  analyses: StandardAnalysisResult[]
): SessionAnalysisResult["summary"] {
  if (analyses.length === 0) {
    throw new Error("Cannot generate summary from empty analyses");
  }

  const scores = analyses.map((a) => a.overall_score).sort((a, b) => a - b);
  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const medianScore =
    scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];

  // Determine readiness level
  let readinessLevel: "ready" | "needs_practice" | "significant_improvement";
  if (averageScore >= 80) {
    readinessLevel = "ready";
  } else if (averageScore >= 60) {
    readinessLevel = "needs_practice";
  } else {
    readinessLevel = "significant_improvement";
  }

  // Aggregate strengths and improvements
  const allStrengths = analyses.flatMap((a) => a.strengths);
  const allImprovements = analyses.flatMap((a) => a.improvements);

  // Get most common strengths and improvements
  const strengthCounts = allStrengths.reduce((acc, strength) => {
    acc[strength] = (acc[strength] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const improvementCounts = allImprovements.reduce((acc, improvement) => {
    acc[improvement] = (acc[improvement] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const overallStrengths = Object.entries(strengthCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([strength]) => strength);

  const overallImprovements = Object.entries(improvementCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([improvement]) => improvement);

  // Calculate total cost and tokens (would come from database in real implementation)
  const totalCostCents = analyses.length * 2; // Placeholder
  const totalTokens = analyses.length * 1500; // Placeholder

  return {
    average_score: Math.round(averageScore * 100) / 100,
    median_score: Math.round(medianScore * 100) / 100,
    readiness_level: readinessLevel,
    overall_strengths: overallStrengths,
    overall_improvements: overallImprovements,
    total_cost_cents: totalCostCents,
    total_tokens: totalTokens,
  };
}

/**
 * Verify that a user owns a specific interview session
 */
export async function verifySessionOwnership(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { supabase } = await import("../integrations/supabase/client");

    const { data: session, error } = await supabase
      .from("interview_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return false;
    }

    return session.user_id === userId;
  } catch (error) {
    console.error("Error verifying session ownership:", error);
    return false;
  }
}

/**
 * Get analysis status for a session
 */
export async function getAnalysisStatus(sessionId: string): Promise<{
  totalQuestions: number;
  analyzedQuestions: number;
  analysisProgress: number;
  hasSummary: boolean;
}> {
  try {
    const { supabase } = await import("../integrations/supabase/client");

    // Get total questions from responses
    const { count: totalQuestions } = await supabase
      .from("interview_responses")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    // Get analyzed questions count
    const { count: analyzedQuestions } = await supabase
      .from("interview_analysis")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    // Check if summary exists
    const { data: summary } = await supabase
      .from("interview_summary")
      .select("id")
      .eq("session_id", sessionId)
      .single();

    const analysisProgress = totalQuestions
      ? ((analyzedQuestions || 0) / totalQuestions) * 100
      : 0;

    return {
      totalQuestions: totalQuestions || 0,
      analyzedQuestions: analyzedQuestions || 0,
      analysisProgress: Math.round(analysisProgress),
      hasSummary: !!summary,
    };
  } catch (error) {
    console.error("Error getting analysis status:", error);
    return {
      totalQuestions: 0,
      analyzedQuestions: 0,
      analysisProgress: 0,
      hasSummary: false,
    };
  }
}
