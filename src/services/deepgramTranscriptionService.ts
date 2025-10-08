// Define types for transcription results
export interface TranscribedWord {
  word: string;
  start: number; // seconds from start of audio
  end: number; // seconds from start of audio
  confidence?: number;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
  words?: TranscribedWord[]; // optional word-level timestamps
  sentences?: { text: string; start: number; end: number }[];
}

export interface StreamingSessionHandle {
  pushChunk: (chunk: Blob) => Promise<void>;
  finalize: () => Promise<TranscriptionResult>;
  abort: () => void;
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
  private streamUrl = "https://api.deepgram.com/v1/listen"; // same endpoint supports streaming with chunked uploads

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
      // Transcribe using Deepgram API (send raw recorded blob to avoid CORS/HTTP2 issues)
      const result = await this.transcribeWithDeepgram(videoBlob);

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
        // Handle invalid duration by using a reasonable default
        let duration = audio.duration;
        if (!isFinite(duration) || duration <= 0 || duration === Infinity) {
          console.warn(
            "Invalid audio duration detected, using default duration"
          );
          // Use a reasonable default duration for interview responses (2-3 minutes)
          duration = 120; // 2 minutes default
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
    mediaBlob: Blob
  ): Promise<TranscriptionResult> {
    const response = await fetch(
      `${this.baseUrl}?model=nova-2&language=en&punctuate=true&diarize=false&smart_format=true&words=true&sentences=true&paragraphs=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          // Do not force Content-Type; allow browser to set boundary/type for blob
        },
        body: mediaBlob,
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

    // Extract transcription text from Deepgram response
    const transcriptionText =
      result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const confidence =
      result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.8;
    const duration = result.metadata?.duration || 0;

    // Extract word-level timestamps if present
    const dgWords =
      result.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    const words = Array.isArray(dgWords)
      ? dgWords.map((w: any) => ({
          word: w.word ?? "",
          start: typeof w.start === "number" ? w.start : 0,
          end: typeof w.end === "number" ? w.end : 0,
          confidence:
            typeof w.confidence === "number" ? w.confidence : undefined,
        }))
      : [];

    // Extract sentence-level segments (prefer alt.sentences, fallback to paragraphs.sentences)
    let sentences: { text: string; start: number; end: number }[] = [];
    const alt = result.results?.channels?.[0]?.alternatives?.[0];
    const sentList = alt?.sentences;
    if (Array.isArray(sentList) && sentList.length) {
      sentences = sentList.map((s: any) => ({
        text: typeof s.text === "string" ? s.text.trim() : "",
        start: typeof s.start === "number" ? s.start : 0,
        end: typeof s.end === "number" ? s.end : 0,
      }));
    } else if (
      alt?.paragraphs?.paragraphs &&
      Array.isArray(alt.paragraphs.paragraphs)
    ) {
      for (const p of alt.paragraphs.paragraphs) {
        if (Array.isArray(p.sentences)) {
          for (const s of p.sentences) {
            sentences.push({
              text: typeof s.text === "string" ? s.text.trim() : "",
              start: typeof s.start === "number" ? s.start : 0,
              end: typeof s.end === "number" ? s.end : 0,
            });
          }
        }
      }
    }

    return {
      text: transcriptionText || "[No speech detected]",
      language: "en",
      duration: duration,
      confidence: confidence,
      words,
      sentences,
    };
  }

  /**
   * Create a lightweight streaming session that accepts audio chunks during the interview.
   * It buffers chunks locally and performs one POST at finalize for speed.
   */
  createStreamingSession(): StreamingSessionHandle {
    const buffered: Blob[] = [];
    let aborted = false;

    const pushChunk = async (chunk: Blob) => {
      if (aborted) return;
      if (chunk && chunk.size > 0) buffered.push(chunk);
    };

    const finalize = async (): Promise<TranscriptionResult> => {
      if (aborted) throw new Error("Streaming session aborted");
      const mime =
        buffered.length > 0 ? buffered[0].type || "audio/webm" : "audio/webm";
      const full = new Blob(buffered, { type: mime });
      return await this.transcribeWithDeepgram(full);
    };

    const abort = () => {
      aborted = true;
      buffered.splice(0, buffered.length);
    };

    return { pushChunk, finalize, abort };
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
