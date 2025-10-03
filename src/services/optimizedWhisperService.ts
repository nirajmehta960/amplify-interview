interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

interface SpeechAnalysis {
  wordCount: number;
  speakingRate: number;
  fillerWords: number;
  confidence: number;
}

class OptimizedWhisperService {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1/audio/transcriptions";

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
  }

  /**
   * Transcribe audio directly from video blob without storing video
   */
  async transcribeVideoDirectly(videoBlob: Blob): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      // Extract audio from video
      const audioBlob = await this.extractAudioFromVideo(videoBlob);

      // Transcribe audio
      return await this.transcribeAudio(audioBlob);
    } catch (error) {
      console.error("Direct video transcription error:", error);
      throw new Error("Failed to transcribe video directly");
    }
  }

  /**
   * Transcribe audio blob using OpenAI Whisper API
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      // Compress audio if too large (Whisper has 25MB limit)
      let finalAudioBlob = audioBlob;
      const maxSize = 25 * 1024 * 1024; // 25MB

      if (audioBlob.size > maxSize) {
        console.log("Audio too large, compressing...");
        finalAudioBlob = await this.compressAudio(audioBlob);
      }

      const formData = new FormData();
      formData.append("file", finalAudioBlob, "audio.webm");
      formData.append("model", "whisper-1");
      formData.append("response_format", "json");
      formData.append("language", "en");

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Whisper API error: ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();

      return {
        text: result.text,
        language: result.language || "en",
        duration: this.estimateAudioDuration(finalAudioBlob),
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
      const canvas = document.createElement("canvas");
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      video.onloadedmetadata = async () => {
        try {
          // Create a media stream from the video
          const stream = video.captureStream ? video.captureStream() : null;

          if (!stream) {
            // Fallback: try to create audio from video element
            const audioTracks = video.webkitAudioDecodedByteCount ? [] : [];
            // This is a simplified approach - in practice, you might need Web Audio API
            throw new Error("Audio extraction not supported in this browser");
          }

          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            throw new Error("No audio track found in video");
          }

          // Create MediaRecorder for audio only
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
          });

          const chunks: BlobPart[] = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(chunks, { type: "audio/webm" });
            resolve(audioBlob);
          };

          mediaRecorder.onerror = (event) => {
            reject(new Error(`MediaRecorder error: ${event}`));
          };

          // Start recording
          mediaRecorder.start();

          // Play video to capture audio
          video
            .play()
            .then(() => {
              // Stop recording when video ends
              video.addEventListener(
                "ended",
                () => {
                  mediaRecorder.stop();
                },
                { once: true }
              );
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error("Failed to load video for audio extraction"));
      };

      video.src = URL.createObjectURL(videoBlob);
      video.load();
    });
  }

  /**
   * Compress audio blob to reduce size
   */
  async compressAudio(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      audio.onloadedmetadata = async () => {
        try {
          // Create a simple audio compression by reducing quality
          const mediaRecorder = new MediaRecorder(
            new MediaStream([]), // Empty stream for now
            {
              mimeType: "audio/webm;codecs=opus",
              audioBitsPerSecond: 64000, // Reduce bitrate
            }
          );

          // For now, return the original blob with a warning
          console.warn(
            "Audio compression not fully implemented, using original"
          );
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };

      audio.src = URL.createObjectURL(audioBlob);
    });
  }

  /**
   * Analyze speech patterns from transcript
   */
  analyzeSpeechPatterns(transcript: string): SpeechAnalysis {
    const words = transcript.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;

    // Estimate duration (average speaking rate is 150-160 words per minute)
    const estimatedDuration = (wordCount / 150) * 60; // in seconds
    const speakingRate = wordCount / (estimatedDuration / 60); // words per minute

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
      "right",
      "okay",
      "alright",
      "hmm",
      "ah",
    ];

    const fillerCount = fillerWords.reduce((count, filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      return count + (transcript.match(regex) || []).length;
    }, 0);

    return {
      wordCount,
      speakingRate: Math.round(speakingRate),
      fillerWords: fillerCount,
      confidence: Math.max(0, 1 - fillerCount / wordCount),
    };
  }

  /**
   * Estimate audio duration from blob size
   */
  private estimateAudioDuration(audioBlob: Blob): number {
    // Rough estimation: 1KB ≈ 0.01 seconds for compressed audio
    return Math.round(audioBlob.size / 100);
  }

  /**
   * Process video and return both transcription and analysis
   */
  async processVideoComplete(videoBlob: Blob): Promise<{
    transcription: TranscriptionResult;
    analysis: SpeechAnalysis;
  }> {
    try {
      const transcription = await this.transcribeVideoDirectly(videoBlob);
      const analysis = this.analyzeSpeechPatterns(transcription.text);

      return {
        transcription,
        analysis,
      };
    } catch (error) {
      console.error("Complete video processing error:", error);
      throw error;
    }
  }
}

export const optimizedWhisperService = new OptimizedWhisperService();
export default optimizedWhisperService;
