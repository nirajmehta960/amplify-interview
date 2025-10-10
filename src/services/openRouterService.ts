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

      // Sanitize the JSON content to remove control characters
      const sanitizedContent = content
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
        .replace(/\r\n/g, "\n") // Normalize line endings
        .replace(/\r/g, "\n") // Normalize line endings
        .trim();


      let analysis: AIAnalysisResult;
      try {
        analysis = JSON.parse(sanitizedContent);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error(`JSON parsing failed: ${parseError.message}`);
      }

      const cost = this.calculateCost(
        model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );

      // Validate the analysis result
      this.validateAnalysisResult(analysis);

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
  "communication_scores": {"clarity": number, "structure": number, "conciseness": number},
  "content_scores": {"relevance": number, "depth": number, "specificity": number},
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
"star_scores": {"situation": number, "task": number, "action": number, "result": number}

Focus on STAR method structure, leadership qualities, and behavioral examples.`
      );
    }

    if (interviewType === "technical" || interviewType === "custom") {
      return (
        basePrompt +
        `

For technical/custom questions, also include:
"technical_scores": {"understanding": number, "approach": number, "depth": number, "clarity": number}

Focus on technical accuracy, problem-solving approach, and domain knowledge.`
      );
    }

    return basePrompt;
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
