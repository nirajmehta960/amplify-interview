interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

interface WhisperResponse {
  text: string;
  language?: string;
}

class WhisperService {
  private apiKey: string;
  private baseUrl: string = "https://api.openai.com/v1/audio/transcriptions";

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
  }

  /**
   * Transcribe audio/video file using OpenAI Whisper API
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");
      formData.append("response_format", "json");
      formData.append("language", "en"); // Default to English

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.statusText}`);
      }

      const result: WhisperResponse = await response.json();

      return {
        text: result.text,
        language: result.language || "en",
        duration: audioBlob.size / 1000, // Rough estimate
        confidence: 0.95, // Whisper doesn't provide confidence scores
      };
    } catch (error) {
      console.error("Transcription error:", error);
      throw new Error("Failed to transcribe audio");
    }
  }

  /**
   * Extract audio from video blob for transcription
   */
  async extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const audioContext = new AudioContext();

      video.onloadedmetadata = async () => {
        try {
          const canvas = document.createElement("canvas");
          const audioStream = canvas.captureStream();
          const audioDestination = audioContext.createMediaStreamDestination();

          // This is a simplified approach - in production, you'd use FFmpeg.js or similar
          // For now, we'll return the video blob and let Whisper handle it
          resolve(videoBlob);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error("Failed to load video"));
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  /**
   * Real-time transcription using Web Speech API as fallback
   */
  async startRealtimeTranscription(): Promise<{
    start: () => void;
    stop: () => void;
    onResult: (callback: (text: string) => void) => void;
    onError: (callback: (error: string) => void) => void;
  }> {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      throw new Error("Speech recognition not supported");
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let onResultCallback: (text: string) => void = () => {};
    let onErrorCallback: (error: string) => void = () => {};

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      onResultCallback(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      onErrorCallback(event.error);
    };

    return {
      start: () => recognition.start(),
      stop: () => recognition.stop(),
      onResult: (callback) => {
        onResultCallback = callback;
      },
      onError: (callback) => {
        onErrorCallback = callback;
      },
    };
  }

  /**
   * Analyze speech patterns and extract insights
   */
  analyzeSpeechPatterns(transcript: string): {
    wordCount: number;
    speakingRate: number;
    fillerWords: string[];
    confidence: number;
  } {
    const words = transcript.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Common filler words to detect
    const fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "so",
      "well",
      "actually",
    ];
    const detectedFillers = words.filter((word) => fillerWords.includes(word));

    // Estimate speaking rate (words per minute)
    const speakingRate = wordCount > 0 ? Math.round((wordCount / 60) * 100) : 0;

    return {
      wordCount,
      speakingRate,
      fillerWords: detectedFillers,
      confidence: transcript.length > 50 ? 0.9 : 0.7,
    };
  }
}

export const whisperService = new WhisperService();
export default whisperService;
