/**
 * OpenRouter API Service for AI Analysis
 * Handles model selection, API calls, cost tracking, and error handling
 */

import {
  InterviewAnalysis,
  InterviewAnalysisInsert,
  StarScores,
  TechnicalScores,
  CommunicationScores,
  ContentScores,
  FillerWords,
} from "../types/aiAnalysis";
import { rateLimiter } from "./rateLimiter";
import { getOpenRouterApiKey } from "../utils/env";

// Model configuration
export const MODELS = {
  BEHAVIORAL_LEADERSHIP: "anthropic/claude-3-haiku",
  TECHNICAL_CUSTOM: "openai/gpt-3.5-turbo",
} as const;

// Model pricing (per token in dollars)
export const MODEL_COSTS = {
  "anthropic/claude-3-haiku": {
    input: 0.25 / 1_000_000, // $0.25 per 1M input tokens
    output: 1.25 / 1_000_000, // $1.25 per 1M output tokens
  },
  "openai/gpt-3.5-turbo": {
    input: 0.5 / 1_000_000, // $0.50 per 1M input tokens
    output: 1.5 / 1_000_000, // $1.50 per 1M output tokens
  },
} as const;

// OpenRouter API interfaces
export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Analysis result interface
export interface AIAnalysisResult {
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
}

// Cost calculation result
export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCostCents: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Service configuration
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  maxRetries: number;
  timeoutMs: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

class OpenRouterService {
  private config: OpenRouterConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config?: Partial<OpenRouterConfig>) {
    this.config = {
      apiKey: config?.apiKey || "", // Will be set dynamically
      baseUrl: config?.baseUrl || "https://openrouter.ai/api/v1",
      maxRetries: config?.maxRetries || 3,
      timeoutMs: config?.timeoutMs || 30000,
      defaultTemperature: config?.defaultTemperature || 0.7,
      defaultMaxTokens: config?.defaultMaxTokens || 2000,
    };

    // Don't set headers in constructor - will be set dynamically
    this.defaultHeaders = {
      Authorization: "",
      "HTTP-Referer": "https://amplifyinterview.com",
      "X-Title": "Amplify Interview",
      "Content-Type": "application/json",
    };
  }

  /**
   * Get API key dynamically from environment
   */
  private getApiKey(): string {
    // Try config first, then environment variables
    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    // Use the environment utility to get the API key
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
      console.warn(
        "OpenRouter API key not found. Check VITE_OPENROUTER_API_KEY environment variable."
      );
    }

    return apiKey;
  }

  /**
   * Get headers with dynamic API key
   */
  private getHeaders(): Record<string, string> {
    return {
      ...this.defaultHeaders,
      Authorization: `Bearer ${this.getApiKey()}`,
    };
  }

  /**
   * Select the appropriate model based on interview type
   */
  public selectModel(interviewType: string): string {
    if (interviewType === "behavioral" || interviewType === "leadership") {
      return MODELS.BEHAVIORAL_LEADERSHIP;
    }
    if (interviewType === "technical" || interviewType === "custom") {
      return MODELS.TECHNICAL_CUSTOM;
    }
    throw new Error(`Unknown interview type: ${interviewType}`);
  }

  /**
   * Calculate cost for API usage
   */
  public calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostCalculation {
    const modelCost = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
    if (!modelCost) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputCost = inputTokens * modelCost.input;
    const outputCost = outputTokens * modelCost.output;
    const totalCostCents = Math.ceil((inputCost + outputCost) * 100);

    return {
      inputCost,
      outputCost,
      totalCostCents,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  /**
   * Call OpenRouter API with retry logic and rate limiting
   */
  public async callOpenRouterWithRetry(
    request: OpenRouterRequest,
    maxRetries?: number
  ): Promise<OpenRouterResponse> {
    // Check if API key is available
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        "OpenRouter API key is required. Please check your VITE_OPENROUTER_API_KEY environment variable."
      );
    }

    const retries = maxRetries || this.config.maxRetries;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use rate limiter for API calls
        const response = await rateLimiter.add(() =>
          this.callOpenRouter(request)
        );
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication errors
        if (this.isAuthError(error)) {
          throw error;
        }

        if (attempt < retries) {
          // Exponential backoff: 2^attempt seconds
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(
            `OpenRouter attempt ${attempt} failed, retrying in ${delay}ms`
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `OpenRouter failed after ${retries} attempts: ${lastError.message}`
    );
  }

  /**
   * Make a single API call to OpenRouter
   */
  private async callOpenRouter(
    request: OpenRouterRequest
  ): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorText}`
        );
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No choices returned from OpenRouter API");
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(
          `OpenRouter API timeout after ${this.config.timeoutMs}ms`
        );
      }

      throw error;
    }
  }

  /**
   * Check if error is authentication-related (don't retry)
   */
  private isAuthError(error: any): boolean {
    if (error.message && typeof error.message === "string") {
      return (
        error.message.includes("401") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("Invalid API key")
      );
    }
    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Analyze a question response using AI
   */
  public async analyzeResponse(
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
  ): Promise<{
    analysis: AIAnalysisResult;
    cost: CostCalculation;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    const model =
      options?.model || this.selectModel(questionData.interview_type);
    const prompt =
      options?.customPrompt ||
      this.generateAnalysisPrompt(
        responseText,
        questionData,
        options?.includeExample
      );

    const request: OpenRouterRequest = {
      model,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt(questionData.interview_type),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: this.config.defaultTemperature,
      max_tokens: this.config.defaultMaxTokens,
      response_format: { type: "json_object" },
    };

    try {
      const response = await this.callOpenRouterWithRetry(request);
      const content = response.choices[0].message.content;

      // Try to parse JSON robustly
      const analysis = this.parseJsonLenient<AIAnalysisResult>(content);

      const cost = this.calculateCost(
        model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );

      // Validate the analysis result
      this.validateAnalysisResult(analysis);

      // Normalize all scores to be out of 100 for consistency
      this.normalizeAllScores(analysis);

      return {
        analysis,
        cost,
        usage: response.usage,
      };
    } catch (error) {
      console.error("Error analyzing response:", error);
      throw new Error(`Failed to analyze response: ${error.message}`);
    }
  }

  /**
   * Lenient JSON parser to mitigate occasional malformed provider output
   */
  private parseJsonLenient<T = any>(raw: string): T {
    // Remove control chars and potential trailing commas
    let s = (raw || "")
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    // If wrapped in code fences, strip them
    if (s.startsWith("```")) {
      s = s.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");
    }

    // Attempt direct parse
    try {
      return JSON.parse(s);
    } catch {}

    // Try to extract the first JSON object substring
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = s.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (e) {
        console.error("JSON parsing failed after sanitization:", e, candidate);

        // Try to fix common JSON issues
        let fixedCandidate = candidate;

        // Fix missing commas between properties (look for } followed by {)
        fixedCandidate = fixedCandidate.replace(/"}\s*{"/g, '"},{"');

        // Fix missing quotes around property names (but not values)
        fixedCandidate = fixedCandidate.replace(
          /([^"]\w+):/g,
          (match, prop) => {
            // Only fix if it's not already quoted and not a value
            if (!match.includes('"')) {
              return `"${prop}":`;
            }
            return match;
          }
        );

        // Fix trailing commas before closing braces/brackets
        fixedCandidate = fixedCandidate.replace(/,(\s*[}\]])/g, "$1");

        // Fix common malformed JSON patterns
        // Fix unquoted string values that should be quoted
        fixedCandidate = fixedCandidate.replace(
          /:\s*([^",{\[\s][^",}\]\s]*[^",}\]\s])\s*([,}])/g,
          ': "$1"$2'
        );

        // Fix missing commas between string values
        fixedCandidate = fixedCandidate.replace(/"\s*"/g, '", "');

        // Fix unescaped quotes within string values
        fixedCandidate = fixedCandidate.replace(
          /"([^"]*)"([^"]*)"([^"]*)":/g,
          '"$1\\"$2\\"$3":'
        );

        // Try parsing the fixed version
        try {
          return JSON.parse(fixedCandidate);
        } catch (fixError) {
          console.error(
            "JSON parsing failed even after fixes:",
            fixError,
            fixedCandidate
          );

          // Last resort: try to extract just the essential fields manually
          try {
            const essentialFields = this.extractEssentialFields(candidate);
            if (essentialFields) {
              console.warn("Using essential fields extraction as fallback");
              return essentialFields;
            }
          } catch (extractError) {
            console.error(
              "Essential fields extraction also failed:",
              extractError
            );
          }
        }
      }
    }

    throw new Error(
      "JSON parsing failed: Expected valid JSON object in model output"
    );
  }

  /**
   * Last resort: extract essential fields manually from malformed JSON
   */
  private extractEssentialFields(jsonString: string): any | null {
    try {
      // Extract key fields using regex patterns
      const overallScoreMatch = jsonString.match(/"overall_score":\s*(\d+)/);
      const overallScore = overallScoreMatch
        ? parseInt(overallScoreMatch[1])
        : 75;

      // Extract strengths array
      const strengthsMatch = jsonString.match(/"strengths":\s*\[(.*?)\]/s);
      let strengths = [];
      if (strengthsMatch) {
        const strengthsContent = strengthsMatch[1];
        const strengthItems = strengthsContent.match(/"([^"]+)"/g);
        if (strengthItems) {
          strengths = strengthItems.map((item) => item.replace(/"/g, ""));
        }
      }

      // Extract improvements array
      const improvementsMatch = jsonString.match(
        /"improvements":\s*\[(.*?)\]/s
      );
      let improvements = [];
      if (improvementsMatch) {
        const improvementsContent = improvementsMatch[1];
        const improvementItems = improvementsContent.match(/"([^"]+)"/g);
        if (improvementItems) {
          improvements = improvementItems.map((item) => item.replace(/"/g, ""));
        }
      }

      // Extract actionable feedback
      const feedbackMatch = jsonString.match(
        /"actionable_feedback":\s*"([^"]+)"/
      );
      const actionableFeedback = feedbackMatch
        ? feedbackMatch[1]
        : "Analysis completed with essential fields extraction.";

      // Extract improved example
      const exampleMatch = jsonString.match(/"improved_example":\s*"([^"]+)"/);
      const improvedExample = exampleMatch
        ? exampleMatch[1]
        : "Example not available due to parsing issues.";

      // Extract confidence score
      const confidenceMatch = jsonString.match(
        /"confidence_score":\s*(\d+(?:\.\d+)?)/
      );
      const confidenceScore = confidenceMatch
        ? parseFloat(confidenceMatch[1])
        : 8.0;

      return {
        overall_score: overallScore,
        strengths:
          strengths.length > 0
            ? strengths
            : [
                "Response provided",
                "Analysis completed with manual extraction",
              ],
        improvements:
          improvements.length > 0
            ? improvements
            : [
                "Consider providing more specific examples",
                "Practice reducing filler words",
              ],
        actionable_feedback: actionableFeedback,
        improved_example: improvedExample,
        confidence_score: confidenceScore,
        communication_scores: {
          clarity: Math.min(10, Math.max(1, overallScore / 10)),
          structure: Math.min(10, Math.max(1, overallScore / 10)),
          conciseness: Math.min(10, Math.max(1, overallScore / 10)),
        },
        content_scores: {
          relevance: Math.min(10, Math.max(1, overallScore / 10)),
          depth: Math.min(10, Math.max(1, overallScore / 10)),
          specificity: Math.min(10, Math.max(1, overallScore / 10)),
        },
        filler_words: { total: 0, words: [], counts: {} },
        speaking_pace: "appropriate",
        response_length_assessment: "appropriate",
      };
    } catch (error) {
      console.error("Essential fields extraction failed:", error);
      return null;
    }
  }

  /**
   * Generate analysis prompt based on question data
   */
  private generateAnalysisPrompt(
    responseText: string,
    questionData: {
      question_id: number;
      question_text: string;
      interview_type: string;
      custom_domain?: string;
    },
    includeExample: boolean = true
  ): string {
    const basePrompt = `
Analyze the following interview response and provide a comprehensive evaluation.

QUESTION: ${questionData.question_text}
RESPONSE: ${responseText}

Please provide a detailed analysis including scoring, strengths, improvements, and actionable feedback.`;

    if (includeExample) {
      return (
        basePrompt +
        "\n\nAlso provide an improved example of how the response could be better structured."
      );
    }

    return basePrompt;
  }

  /**
   * Get system prompt based on interview type
   */
  private getSystemPrompt(interviewType: string): string {
    const basePrompt = `You are an expert interview coach analyzing interview responses. Provide objective, constructive feedback with specific scores and actionable recommendations.

Return your analysis as a JSON object with the following structure:
{
  "overall_score": number (0-100),
  "communication_scores": {"clarity": number (0-100), "structure": number (0-100), "conciseness": number (0-100)},
  "content_scores": {"relevance": number (0-100), "depth": number (0-100), "specificity": number (0-100)},
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "actionable_feedback": "Detailed paragraph of feedback",
  "improved_example": "Rewritten response showing better approach",
  "filler_words": {"words": ["um", "like"], "counts": {"um": 2, "like": 1}, "total": 3},
  "speaking_pace": "too_fast|appropriate|too_slow",
  "confidence_score": number (0.0-10.0),
  "response_length_assessment": "too_short|appropriate|too_long"
}`;

    if (interviewType === "behavioral" || interviewType === "leadership") {
      return (
        basePrompt +
        `

For behavioral/leadership questions, also include:
"star_scores": {"situation": number (0-100), "task": number (0-100), "action": number (0-100), "result": number (0-100)}

Focus on STAR method structure, leadership qualities, and behavioral examples.`
      );
    }

    if (interviewType === "technical" || interviewType === "custom") {
      return (
        basePrompt +
        `

For technical/custom questions, also include:
"technical_scores": {"understanding": number (0-100), "approach": number (0-100), "depth": number (0-100), "clarity": number (0-100)}

Focus on technical accuracy, problem-solving approach, and domain knowledge.`
      );
    }

    return basePrompt;
  }

  /**
   * Normalize all scores to be out of 100 for consistency
   */
  private normalizeAllScores(analysis: AIAnalysisResult): void {
    // Normalize overall_score (should already be out of 100, but ensure it is)
    analysis.overall_score = this.normalizeScore(analysis.overall_score, 100);

    // Normalize communication_scores
    if (analysis.communication_scores) {
      analysis.communication_scores.clarity = this.normalizeScore(
        analysis.communication_scores.clarity,
        100
      );
      analysis.communication_scores.structure = this.normalizeScore(
        analysis.communication_scores.structure,
        100
      );
      analysis.communication_scores.conciseness = this.normalizeScore(
        analysis.communication_scores.conciseness,
        100
      );
    }

    // Normalize content_scores
    if (analysis.content_scores) {
      analysis.content_scores.relevance = this.normalizeScore(
        analysis.content_scores.relevance,
        100
      );
      analysis.content_scores.depth = this.normalizeScore(
        analysis.content_scores.depth,
        100
      );
      analysis.content_scores.specificity = this.normalizeScore(
        analysis.content_scores.specificity,
        100
      );
    }

    // Normalize star_scores
    if (analysis.star_scores) {
      analysis.star_scores.situation = this.normalizeScore(
        analysis.star_scores.situation,
        100
      );
      analysis.star_scores.task = this.normalizeScore(
        analysis.star_scores.task,
        100
      );
      analysis.star_scores.action = this.normalizeScore(
        analysis.star_scores.action,
        100
      );
      analysis.star_scores.result = this.normalizeScore(
        analysis.star_scores.result,
        100
      );
    }

    // Normalize technical_scores
    if (analysis.technical_scores) {
      analysis.technical_scores.understanding = this.normalizeScore(
        analysis.technical_scores.understanding,
        100
      );
      analysis.technical_scores.approach = this.normalizeScore(
        analysis.technical_scores.approach,
        100
      );
      analysis.technical_scores.depth = this.normalizeScore(
        analysis.technical_scores.depth,
        100
      );
      analysis.technical_scores.clarity = this.normalizeScore(
        analysis.technical_scores.clarity,
        100
      );
    }

    // Normalize confidence_score (keep out of 10, then convert to 100 for display)
    analysis.confidence_score = this.normalizeScore(
      analysis.confidence_score,
      10
    );
  }

  /**
   * Normalize a score to the target scale (default 100)
   */
  private normalizeScore(score: number, targetScale: number = 100): number {
    let numScore = typeof score === "string" ? parseFloat(score) : score;
    if (isNaN(numScore)) return 0;

    // If score is already within target scale, return as is
    if (numScore >= 0 && numScore <= targetScale) {
      return Math.round(numScore);
    }

    // If score is out of 10 and target is 100, multiply by 10
    if (numScore >= 0 && numScore <= 10 && targetScale === 100) {
      return Math.round(numScore * 10);
    }

    // If score is out of 5 and target is 100, multiply by 20
    if (numScore >= 0 && numScore <= 5 && targetScale === 100) {
      return Math.round(numScore * 20);
    }

    // If score is > target scale, cap it
    if (numScore > targetScale) {
      return targetScale;
    }

    // For confidence_score (targetScale = 10), if score is > 10, cap it
    if (targetScale === 10 && numScore > 10) {
      return 10;
    }

    return Math.round(numScore);
  }

  /**
   * Validate analysis result structure
   */
  private validateAnalysisResult(analysis: AIAnalysisResult): void {
    const requiredFields = [
      "overall_score",
      "communication_scores",
      "content_scores",
      "strengths",
      "improvements",
      "actionable_feedback",
      "improved_example",
      "filler_words",
      "speaking_pace",
      "confidence_score",
      "response_length_assessment",
    ];

    for (const field of requiredFields) {
      if (!(field in analysis)) {
        throw new Error(`Missing required field in analysis result: ${field}`);
      }
    }

    // Validate score ranges
    if (analysis.overall_score < 0 || analysis.overall_score > 100) {
      throw new Error("overall_score must be between 0 and 100");
    }

    if (analysis.confidence_score < 0 || analysis.confidence_score > 10) {
      throw new Error("confidence_score must be between 0 and 10");
    }

    // Validate arrays
    if (
      !Array.isArray(analysis.strengths) ||
      !Array.isArray(analysis.improvements)
    ) {
      throw new Error("strengths and improvements must be arrays");
    }

    // Validate enum values
    const validSpeakingPaces = ["too_fast", "appropriate", "too_slow"];
    if (!validSpeakingPaces.includes(analysis.speaking_pace)) {
      throw new Error(
        `speaking_pace must be one of: ${validSpeakingPaces.join(", ")}`
      );
    }

    const validLengths = ["too_short", "appropriate", "too_long"];
    if (!validLengths.includes(analysis.response_length_assessment)) {
      throw new Error(
        `response_length_assessment must be one of: ${validLengths.join(", ")}`
      );
    }
  }

  /**
   * Convert AI analysis result to database insert format
   */
  public convertToDatabaseFormat(
    analysis: AIAnalysisResult,
    responseId: string,
    sessionId: string,
    questionId: number,
    userId: string,
    interviewType: string,
    customDomain?: string,
    modelUsed: string = "",
    usage: any = {},
    cost: CostCalculation = {
      inputCost: 0,
      outputCost: 0,
      totalCostCents: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
  ): InterviewAnalysisInsert {
    return {
      interview_response_id: responseId,
      session_id: sessionId,
      question_id: questionId,
      user_id: userId,
      interview_type: interviewType as any,
      custom_domain: customDomain,
      model_used: modelUsed,
      overall_score: analysis.overall_score,
      star_scores: analysis.star_scores,
      technical_scores: analysis.technical_scores,
      communication_scores: analysis.communication_scores,
      content_scores: analysis.content_scores,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      actionable_feedback: analysis.actionable_feedback,
      improved_example: analysis.improved_example,
      filler_words: analysis.filler_words,
      speaking_pace: analysis.speaking_pace,
      confidence_score: analysis.confidence_score,
      response_length_assessment: analysis.response_length_assessment,
      tokens_used: usage.total_tokens || cost.totalTokens,
      input_tokens: usage.prompt_tokens || cost.inputTokens,
      output_tokens: usage.completion_tokens || cost.outputTokens,
      cost_cents: cost.totalCostCents,
      processing_time_ms: 0, // Will be set by the calling service
    };
  }
}

// Export singleton instance
// Create a lazy-initialized service to avoid constructor errors during module load
let _openRouterService: OpenRouterService | null = null;

export const openRouterService = {
  get instance() {
    if (!_openRouterService) {
      _openRouterService = new OpenRouterService();
    }
    return _openRouterService;
  },

  // Proxy all methods to the actual service instance
  selectModel: (interviewType: string) =>
    openRouterService.instance.selectModel(interviewType),
  calculateCost: (model: string, inputTokens: number, outputTokens: number) =>
    openRouterService.instance.calculateCost(model, inputTokens, outputTokens),
  callOpenRouterWithRetry: (request: OpenRouterRequest, maxRetries?: number) =>
    openRouterService.instance.callOpenRouterWithRetry(request, maxRetries),
  analyzeResponse: (
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
  ) =>
    openRouterService.instance.analyzeResponse(
      responseText,
      questionData,
      sessionData,
      options
    ),
  convertToDatabaseFormat: (
    analysis: AIAnalysisResult,
    responseId: string,
    sessionId: string,
    questionId: number,
    userId: string,
    interviewType: string,
    customDomain: string | null,
    modelUsed: string,
    usage: {
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    },
    cost: CostCalculation
  ) =>
    openRouterService.instance.convertToDatabaseFormat(
      analysis,
      responseId,
      sessionId,
      questionId,
      userId,
      interviewType,
      customDomain,
      modelUsed,
      usage,
      cost
    ),
};

// Export the class for direct instantiation
export { OpenRouterService };
