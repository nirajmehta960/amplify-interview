// Speech transcription service — calls FastAPI backend (Cloud Speech-to-Text)
// Keeps the same public interface so ChatInput and InterviewSession need no changes.

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface TranscribedWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
  words?: TranscribedWord[];
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

class TranscriptionService {
  async transcribeVideoDirectly(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("Invalid audio data: empty or missing blob");
    }

    const formData = new FormData();
    formData.append("audio_file", audioBlob, "audio.webm");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();

      const words: TranscribedWord[] = (result.words || []).map((w: any) => ({
        word: w.word,
        start: w.start_time,
        end: w.end_time,
      }));

      return {
        text: result.text || "",
        language: "en",
        duration: words.length > 0 ? words[words.length - 1].end : 0,
        confidence: result.confidence || 0,
        words,
        sentences: [],
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Transcription timed out. Try a shorter recording.");
      }
      throw error;
    }
  }

  createStreamingSession(): StreamingSessionHandle {
    const buffered: Blob[] = [];
    let aborted = false;

    const pushChunk = async (chunk: Blob) => {
      if (aborted) return;
      if (chunk && chunk.size > 0) buffered.push(chunk);
    };

    const finalize = async (): Promise<TranscriptionResult> => {
      if (aborted) throw new Error("Streaming session aborted");
      const mime = buffered.length > 0 ? buffered[0].type || "audio/webm" : "audio/webm";
      const full = new Blob(buffered, { type: mime });
      return this.transcribeVideoDirectly(full);
    };

    const abort = () => {
      aborted = true;
      buffered.splice(0, buffered.length);
    };

    return { pushChunk, finalize, abort };
  }

  analyzeSpeechPatterns(text: string): SpeechAnalysis {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const speakingRate = Math.round((wordCount / Math.max(1, 60)) * 60);

    const fillerList = ["um", "uh", "like", "you know", "so", "well", "actually", "basically", "literally", "honestly", "obviously"];
    const foundFillers = words.filter((w) => fillerList.includes(w.toLowerCase()));

    return {
      wordCount,
      speakingRate,
      fillerWords: foundFillers,
      confidence: Math.max(0, 1 - foundFillers.length / Math.max(1, wordCount)),
    };
  }

  isAudioAnalysisSupported(): boolean {
    return true;
  }

  getBrowserCapabilities() {
    return {
      backendSTT: true,
      mediaRecorder: "MediaRecorder" in window,
      getUserMedia: "getUserMedia" in navigator.mediaDevices,
    };
  }
}

export const deepgramTranscriptionService = new TranscriptionService();
export default deepgramTranscriptionService;
