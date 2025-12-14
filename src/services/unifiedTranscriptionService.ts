import {
  type TranscriptionResult,
  type SpeechAnalysis,
} from "./deepgramTranscriptionService";
import { deepgramTranscriptionService } from "./deepgramTranscriptionService";

export type TranscriptionProvider = "deepgram";

interface TranscriptionOptions {
  preferredProvider?: TranscriptionProvider;
  fallbackProviders?: TranscriptionProvider[];
  useMockFallback?: boolean;
}

class UnifiedTranscriptionService {
  private defaultOptions: TranscriptionOptions = {
    preferredProvider: "deepgram",
    fallbackProviders: [],
    useMockFallback: false,
  };

  /**
   * Transcribe video using Deepgram API
   */
  async transcribeVideoDirectly(
    videoBlob: Blob,
    options?: Partial<TranscriptionOptions>
  ): Promise<TranscriptionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const providers = [
      opts.preferredProvider,
      ...opts.fallbackProviders,
    ].filter(Boolean) as TranscriptionProvider[];

    for (const provider of providers) {
      try {
        const result = await this.transcribeWithProvider(videoBlob, provider);
        return result;
      } catch (error) {
        console.error(`Provider ${provider} failed:`, error);
        // Don't continue to next provider, throw the error immediately
        throw new Error(
          `Transcription failed with ${provider}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    throw new Error("No transcription providers available");
  }

  /**
   * Transcribe with Deepgram API
   */
  private async transcribeWithProvider(
    videoBlob: Blob,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    switch (provider) {
      case "deepgram":
        return await deepgramTranscriptionService.transcribeVideoDirectly(
          videoBlob
        );

      default:
        throw new Error(`Unknown transcription provider: ${provider}`);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return {
      deepgram: {
        available: deepgramTranscriptionService.isAudioAnalysisSupported(),
        name: "Deepgram API",
        cost: "Free tier: 45,000 minutes/month",
        accuracy: "High",
        speed: "Fast",
      },
    };
  }

  /**
   * Get recommended provider
   */
  getRecommendedProvider(): TranscriptionProvider {
    return "deepgram";
  }

  /**
   * Test all available providers
   */
  async testProviders(videoBlob: Blob): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const providers = this.getAvailableProviders();

    for (const [key, provider] of Object.entries(providers)) {
      if (provider.available) {
        try {
          const startTime = Date.now();
          const result = await this.transcribeWithProvider(
            videoBlob,
            key as TranscriptionProvider
          );
          const duration = Date.now() - startTime;

          results[key] = {
            success: true,
            result,
            duration: `${duration}ms`,
            provider: provider.name,
          };
        } catch (error) {
          results[key] = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            provider: provider.name,
          };
        }
      } else {
        results[key] = {
          success: false,
          error: "Not available - API key not configured",
          provider: provider.name,
        };
      }
    }

    return results;
  }

  /**
   * Analyze speech patterns
   */
  analyzeSpeechPatterns(text: string): SpeechAnalysis {
    return deepgramTranscriptionService.analyzeSpeechPatterns(text);
  }
}

export const unifiedTranscriptionService = new UnifiedTranscriptionService();
export default unifiedTranscriptionService;
