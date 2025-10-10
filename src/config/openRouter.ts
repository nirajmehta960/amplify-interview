/**
 * OpenRouter Configuration
 * Environment variables and default settings for OpenRouter API
 */

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  maxRetries: number;
  timeoutMs: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
  siteUrl: string;
  siteTitle: string;
}

/**
 * Get OpenRouter configuration from environment variables
 */
export function getOpenRouterConfig(): OpenRouterConfig {
  const config: OpenRouterConfig = {
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || "",
    baseUrl:
      import.meta.env.VITE_OPENROUTER_BASE_URL ||
      "https://openrouter.ai/api/v1",
    maxRetries: parseInt(import.meta.env.VITE_OPENROUTER_MAX_RETRIES || "3"),
    timeoutMs: parseInt(import.meta.env.VITE_OPENROUTER_TIMEOUT_MS || "30000"),
    defaultTemperature: parseFloat(
      import.meta.env.VITE_OPENROUTER_DEFAULT_TEMPERATURE || "0.7"
    ),
    defaultMaxTokens: parseInt(
      import.meta.env.VITE_OPENROUTER_DEFAULT_MAX_TOKENS || "2000"
    ),
    siteUrl: import.meta.env.VITE_SITE_URL || "https://amplifyinterview.com",
    siteTitle: import.meta.env.VITE_SITE_TITLE || "Amplify Interview",
  };

  // Validate required configuration
  if (!config.apiKey) {
    console.warn("OpenRouter API key not found. AI analysis will not work.");
  }

  return config;
}

/**
 * Model configuration with pricing
 */
export const MODEL_CONFIG = {
  "anthropic/claude-3-haiku": {
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    inputCostPerToken: 0.25 / 1_000_000, // $0.25 per 1M input tokens
    outputCostPerToken: 1.25 / 1_000_000, // $1.25 per 1M output tokens
    maxTokens: 200000,
    contextWindow: 200000,
    capabilities: {
      starAnalysis: true,
      technicalAnalysis: false,
      communicationAnalysis: true,
      patternDetection: true,
      behavioralAssessment: true,
      leadershipAssessment: true,
    },
  },
  "openai/gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    inputCostPerToken: 0.5 / 1_000_000, // $0.50 per 1M input tokens
    outputCostPerToken: 1.5 / 1_000_000, // $1.50 per 1M output tokens
    maxTokens: 4096,
    contextWindow: 16385,
    capabilities: {
      starAnalysis: false,
      technicalAnalysis: true,
      communicationAnalysis: true,
      patternDetection: true,
      behavioralAssessment: false,
      leadershipAssessment: false,
    },
  },
} as const;

/**
 * Model selection strategy
 */
export const MODEL_SELECTION = {
  behavioral: "anthropic/claude-3-haiku",
  leadership: "anthropic/claude-3-haiku",
  technical: "openai/gpt-3.5-turbo",
  custom: "openai/gpt-3.5-turbo",
} as const;

/**
 * Cost limits and thresholds
 */
export const COST_LIMITS = {
  DEFAULT_DAILY_LIMIT_CENTS: 500, // $5.00 per day
  DEFAULT_MONTHLY_LIMIT_CENTS: 5000, // $50.00 per month
  WARNING_THRESHOLD_PERCENT: 80, // Warn at 80% of limit
  CRITICAL_THRESHOLD_PERCENT: 95, // Critical at 95% of limit
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2, // Exponential backoff
  RETRYABLE_ERRORS: [
    429, // Rate limit
    500, // Server error
    502, // Bad gateway
    503, // Service unavailable
    504, // Gateway timeout
  ],
  NON_RETRYABLE_ERRORS: [
    400, // Bad request
    401, // Unauthorized
    403, // Forbidden
    404, // Not found
  ],
} as const;

/**
 * Analysis configuration
 */
export const ANALYSIS_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2000,
  RESPONSE_FORMAT: { type: "json_object" as const },
  TIMEOUT_MS: 30000,

  // Scoring weights
  SCORE_WEIGHTS: {
    behavioral: {
      communication: 0.3,
      content: 0.3,
      star: 0.4,
    },
    leadership: {
      communication: 0.3,
      content: 0.3,
      star: 0.4,
    },
    technical: {
      communication: 0.3,
      content: 0.3,
      technical: 0.4,
    },
    custom: {
      communication: 0.3,
      content: 0.3,
      technical: 0.4,
    },
  },

  // Quality thresholds
  QUALITY_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 60,
    FAIR: 40,
    NEEDS_IMPROVEMENT: 0,
  },

  // Readiness thresholds
  READINESS_THRESHOLDS: {
    READY: 80,
    NEEDS_PRACTICE: 60,
    SIGNIFICANT_IMPROVEMENT: 0,
  },
} as const;
