import {
  unifiedTranscriptionService,
  type QuestionResponse,
} from "./unifiedTranscriptionService";
import type {
  TranscribedWord,
  TranscriptionResult,
} from "./deepgramTranscriptionService";

interface QuestionSegment {
  questionId: string;
  questionText: string;
  startTime: number;
  endTime: number;
  duration: number;
}

class VideoSegmentService {
  private questionSegments: QuestionSegment[] = [];
  private currentQuestionStartTime: number | null = null;
  private recordingStartEpochMs: number | null = null;
  private prepGapSeconds: number = 10;

  /**
   * Start tracking a question segment
   */
  startQuestionSegment(questionId: string, questionText: string): void {
    const startTime = Date.now();
    this.currentQuestionStartTime = startTime;
  }

  /**
   * End tracking a question segment
   */
  endQuestionSegment(questionId: string, questionText: string): void {
    if (!this.currentQuestionStartTime) {
      console.warn(`No start time found for question ${questionId}`);
      return;
    }

    const endTime = Date.now();
    // Add a 2-second buffer to ensure we capture the complete response
    const bufferedEndTime = endTime + 2000;
    const duration = (bufferedEndTime - this.currentQuestionStartTime) / 1000; // Convert to seconds

    const segment: QuestionSegment = {
      questionId,
      questionText,
      startTime: this.currentQuestionStartTime,
      endTime: bufferedEndTime,
      duration,
    };

    this.questionSegments.push(segment);
    this.currentQuestionStartTime = null;
  }

  /**
   * Mark the absolute recording start (epoch ms). Should be called right after recording begins.
   */
  markRecordingStart(): void {
    this.recordingStartEpochMs = Date.now();
  }

  /**
   * Get the recording start time in epoch milliseconds
   */
  getRecordingStartTime(): number | null {
    return this.recordingStartEpochMs;
  }

  /**
   * Set the preparation/thinking gap duration in seconds (default 10s).
   */
  setPrepGapSeconds(seconds: number): void {
    this.prepGapSeconds = Math.max(0, Math.floor(seconds));
  }

  /**
   * Get all question segments
   */
  getQuestionSegments(): QuestionSegment[] {
    return [...this.questionSegments];
  }

  /**
   * Extract audio segments from video blob and transcribe them
   */
  async transcribeQuestionSegments(
    videoBlob: Blob
  ): Promise<QuestionResponse[]> {
    if (this.questionSegments.length === 0) {
      console.warn("No question segments found for transcription");
      return [];
    }

    const responses: QuestionResponse[] = [];

    // For now, we'll transcribe the entire video and split it logically
    // In a more advanced implementation, you'd extract actual audio segments
    try {
      const fullTranscription =
        await unifiedTranscriptionService.transcribeVideoDirectly(videoBlob);
      const fullText = fullTranscription.text;
      const words = (fullTranscription as any).words as
        | TranscribedWord[]
        | undefined;
      const sentences =
        (fullTranscription as TranscriptionResult).sentences || [];

      const totalDuration = this.questionSegments.reduce(
        (sum, seg) => sum + seg.duration,
        0
      );

      // If total duration is too short or segments have very short durations, use equal splitting
      const useEqualSplitting =
        totalDuration < 30 ||
        this.questionSegments.some((seg) => seg.duration < 5);

      if (!words || words.length === 0) {
        // No word timestamps available, fallback to previous logic (equal or ratio split)
        const splitWords = fullText.split(" ");
        if (useEqualSplitting) {
          const wordsPerSegment = Math.ceil(
            splitWords.length / this.questionSegments.length
          );

          for (let i = 0; i < this.questionSegments.length; i++) {
            const segment = this.questionSegments[i];
            const startWord = i * wordsPerSegment;
            const endWord = Math.min(
              (i + 1) * wordsPerSegment,
              splitWords.length
            );
            const segmentText = splitWords.slice(startWord, endWord).join(" ");

            responses.push(
              this.createQuestionResponse(
                segment,
                segmentText,
                segment.duration
              )
            );
          }
        } else {
          // timing-based ratio split without word timestamps
          for (let i = 0; i < this.questionSegments.length; i++) {
            const segment = this.questionSegments[i];

            const segmentStartRatio =
              this.questionSegments
                .slice(0, i)
                .reduce((sum, seg) => sum + seg.duration, 0) / totalDuration;
            const segmentEndRatio =
              this.questionSegments
                .slice(0, i + 1)
                .reduce((sum, seg) => sum + seg.duration, 0) / totalDuration;

            const startWord = Math.floor(segmentStartRatio * splitWords.length);
            const endWord = Math.floor(segmentEndRatio * splitWords.length);

            const segmentText = splitWords.slice(startWord, endWord).join(" ");

            responses.push(
              this.createQuestionResponse(
                segment,
                segmentText,
                segment.duration
              )
            );
          }
        }
      } else if (this.recordingStartEpochMs) {
        // Precise mapping using Deepgram word-level timestamps
        for (let i = 0; i < this.questionSegments.length; i++) {
          const seg = this.questionSegments[i];
          // Do not add prep gap here: startQuestionSegment already fires after the 10s thinking window
          const absoluteStartMs = seg.startTime - this.recordingStartEpochMs;
          const absoluteEndMs = seg.endTime - this.recordingStartEpochMs;

          const startSec = Math.max(0, absoluteStartMs / 1000);
          // Add tiny epsilon so end > start even when rounded
          const endSec = Math.max(startSec + 0.05, absoluteEndMs / 1000);

          // Prefer sentence-level selection to preserve punctuation
          const sentenceSlice = sentences.filter(
            (s) => s.end > startSec && s.start < endSec
          );
          let segmentText = sentenceSlice.map((s) => s.text).join(" ");

          if (!segmentText || segmentText.trim().length === 0) {
            // Fallback to words within range
            const startIndex = words.findIndex((w) => w.end > startSec);
            let endIndex = words.findIndex((w) => w.start >= endSec);
            if (endIndex === -1) endIndex = words.length;
            const segmentWords =
              startIndex >= 0 ? words.slice(startIndex, endIndex) : [];
            segmentText = this.formatSegmentFromWords(segmentWords);
          }

          responses.push(
            this.createQuestionResponse(seg, segmentText, seg.duration)
          );
        }
      } else {
        console.warn("Recording start not marked; falling back to ratio split");
        const splitWords = fullText.split(" ");
        const wordsPerSegment = Math.ceil(
          splitWords.length / this.questionSegments.length
        );
        for (let i = 0; i < this.questionSegments.length; i++) {
          const segment = this.questionSegments[i];
          const startWord = i * wordsPerSegment;
          const endWord = Math.min(
            (i + 1) * wordsPerSegment,
            splitWords.length
          );
          const segmentText = splitWords.slice(startWord, endWord).join(" ");
          responses.push(
            this.createQuestionResponse(segment, segmentText, segment.duration)
          );
        }
      }

      return responses;
    } catch (error) {
      console.error("Error transcribing question segments:", error);
      throw new Error(
        `Question segment transcription failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Build a readable segment from timed words. Inserts sentence breaks when large time gaps occur.
   */
  private formatSegmentFromWords(segmentWords: TranscribedWord[]): string {
    if (!segmentWords || segmentWords.length === 0) return "";

    const pieces: string[] = [];
    const GAP_BREAK_SECONDS = 0.8; // break sentence if gap >= 800ms

    for (let i = 0; i < segmentWords.length; i++) {
      const w = segmentWords[i];
      const prev = i > 0 ? segmentWords[i - 1] : undefined;
      const gap = prev ? Math.max(0, w.start - prev.end) : 0;
      if (prev && gap >= GAP_BREAK_SECONDS) {
        // Insert sentence boundary
        const last = pieces.length - 1;
        if (last >= 0 && !/[.!?]$/.test(pieces[last])) {
          pieces[last] = pieces[last] + ".";
        }
      }
      pieces.push(w.word);
    }

    // Ensure final punctuation
    if (pieces.length && !/[.!?]$/.test(pieces[pieces.length - 1])) {
      pieces[pieces.length - 1] = pieces[pieces.length - 1] + ".";
    }

    // Capitalize probable sentence starts
    const text = pieces.join(" ");
    return text.replace(
      /(^|[.!?]\s+)([a-z])/g,
      (m, p1, p2) => p1 + p2.toUpperCase()
    );
  }

  /**
   * Create a question response object
   */
  private createQuestionResponse(
    segment: QuestionSegment,
    segmentText: string,
    duration: number
  ): QuestionResponse {
    const mockAudioBlob = new Blob([segmentText], { type: "text/plain" });

    return {
      questionId: segment.questionId,
      questionText: segment.questionText,
      answerText: segmentText || "No transcription available for this segment",
      audioBlob: mockAudioBlob,
      duration: duration,
      transcription: {
        text: segmentText,
        language: "en",
        duration: duration,
        confidence: 0.8,
      },
      analysis: {
        wordCount: segmentText.split(" ").length,
        speakingRate:
          duration > 0
            ? Math.round((segmentText.split(" ").length / duration) * 60)
            : 0,
        fillerWords: this.countFillerWords(segmentText).words,
        confidence: 0.8,
      },
      timestamp: segment.startTime,
    };
  }

  /**
   * Count filler words in text and return both count and list
   */
  private countFillerWords(text: string): { count: number; words: string[] } {
    const fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "so",
      "well",
      "actually",
    ];
    const words = text.toLowerCase().split(/\s+/);
    const foundFillerWords = words.filter((word) => fillerWords.includes(word));
    return {
      count: foundFillerWords.length,
      words: foundFillerWords,
    };
  }

  /**
   * Clear all segments
   */
  clearSegments(): void {
    this.questionSegments = [];
    this.currentQuestionStartTime = null;
  }

  /**
   * Get current question being tracked
   */
  getCurrentQuestionId(): string | null {
    return this.currentQuestionStartTime
      ? this.questionSegments[this.questionSegments.length - 1]?.questionId ||
          null
      : null;
  }
}

export const videoSegmentService = new VideoSegmentService();
export default videoSegmentService;
