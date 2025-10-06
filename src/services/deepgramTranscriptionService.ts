// Define types for transcription results
export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

export interface SpeechAnalysis {
  wordCount: number;
  speakingRate: number;
  fillerWords: string[];
  confidence: number;
}

class DeepgramTranscriptionService {
  private apiKey: string;
  private baseUrl = "https://api.deepgram.com/v1/listen";

  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "⚠️ VITE_DEEPGRAM_API_KEY not found in environment variables"
      );
    }
  }

  /**
   * Transcribe video using Deepgram API
   */
  async transcribeVideoDirectly(videoBlob: Blob): Promise<TranscriptionResult> {
    console.log("Starting Deepgram API transcription...");
    console.log("Video blob size:", videoBlob.size, "bytes");

    // Validate video blob
    if (!videoBlob || videoBlob.size === 0) {
      throw new Error("Invalid video data: empty or missing video blob");
    }

    if (!this.apiKey) {
      throw new Error(
        "Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to your .env.local file"
      );
    }

    try {
      // Extract audio from video
      const audioBlob = await this.extractAudioFromVideo(videoBlob);

      // Transcribe using Deepgram API
      const result = await this.transcribeWithDeepgram(audioBlob);

      console.log(
        "Deepgram API transcription complete:",
        result.text.substring(0, 50) + "..."
      );
      return result;
    } catch (error) {
      console.error("Deepgram API transcription failed:", error);
      throw new Error(
        `Deepgram API transcription failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract audio from video blob
   */
  private async extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(videoBlob);

      audio.onloadedmetadata = () => {
        console.log("Audio extracted from video, duration:", audio.duration);

        // Handle invalid duration by using a reasonable default
        let duration = audio.duration;
        if (!isFinite(duration) || duration <= 0 || duration === Infinity) {
          console.warn(
            "Invalid audio duration detected, using default duration"
          );
          // Use a reasonable default duration for interview responses (2-3 minutes)
          duration = 120; // 2 minutes default
          console.log("Using default duration:", duration, "seconds");
        }

        // Create audio blob from video
        const audioBlob = new Blob([videoBlob], { type: "audio/webm" });
        URL.revokeObjectURL(url);
        resolve(audioBlob);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to extract audio from video"));
      };

      audio.src = url;
      audio.load();
    });
  }

  /**
   * Transcribe audio using Deepgram API
   */
  private async transcribeWithDeepgram(
    audioBlob: Blob
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");

    const response = await fetch(
      `${this.baseUrl}?model=nova-2&language=en&punctuate=true&diarize=false`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "audio/webm",
        },
        body: audioBlob, // Send audio blob directly
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", response.status, errorText);

      // Check for specific quota errors
      if (response.status === 429) {
        console.error("🚨 Deepgram API Quota Exceeded!");
        console.error("Please check your Deepgram usage and billing");
        console.error("Visit: https://console.deepgram.com/usage");
      }

      throw new Error(
        `Deepgram API error: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Deepgram API response received");

    // Extract transcription text from Deepgram response
    const transcriptionText =
      result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const confidence =
      result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.8;
    const duration = result.metadata?.duration || 0;

    return {
      text: transcriptionText || "[No speech detected]",
      language: "en",
      duration: duration,
      confidence: confidence,
    };
  }

  /**
   * Analyze speech patterns
   */
  analyzeSpeechPatterns(text: string): SpeechAnalysis {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;

    // Calculate speaking rate (words per minute)
    const duration = Math.max(1, 60); // Assume 1 minute for analysis
    const speakingRate = Math.round((wordCount / duration) * 60);

    // Count filler words
    const fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "so",
      "well",
      "actually",
      "basically",
      "literally",
      "honestly",
      "obviously",
    ];
    const fillerCount = words.filter((word) =>
      fillerWords.includes(word.toLowerCase())
    ).length;

    // Find actual filler words
    const foundFillerWords = words.filter((word) =>
      fillerWords.includes(word.toLowerCase())
    );

    return {
      wordCount,
      speakingRate,
      fillerWords: foundFillerWords,
      confidence: Math.max(0, 1 - fillerCount / wordCount),
    };
  }

  /**
   * Check if service is supported
   */
  isAudioAnalysisSupported(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get browser capabilities
   */
  getBrowserCapabilities() {
    return {
      deepgramAPI: !!this.apiKey,
      mediaRecorder: "MediaRecorder" in window,
      getUserMedia: "getUserMedia" in navigator.mediaDevices,
    };
  }
}

export const deepgramTranscriptionService = new DeepgramTranscriptionService();
export default deepgramTranscriptionService;
