import {
  unifiedTranscriptionService,
  type QuestionResponse,
} from "./unifiedTranscriptionService";

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

  /**
   * Start tracking a question segment
   */
  startQuestionSegment(questionId: string, questionText: string): void {
    const startTime = Date.now();
    this.currentQuestionStartTime = startTime;

    console.log(`Started question segment ${questionId} at ${startTime}`);
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
    const duration = (endTime - this.currentQuestionStartTime) / 1000; // Convert to seconds

    const segment: QuestionSegment = {
      questionId,
      questionText,
      startTime: this.currentQuestionStartTime,
      endTime,
      duration,
    };

    this.questionSegments.push(segment);
    this.currentQuestionStartTime = null;

    console.log(`Ended question segment ${questionId}, duration: ${duration}s`);
    console.log(`Total segments: ${this.questionSegments.length}`);
    console.log(`Segment details:`, segment);
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

    console.log(
      `Transcribing ${this.questionSegments.length} question segments...`
    );

    const responses: QuestionResponse[] = [];

    // For now, we'll transcribe the entire video and split it logically
    // In a more advanced implementation, you'd extract actual audio segments
    try {
      const fullTranscription =
        await unifiedTranscriptionService.transcribeVideoDirectly(videoBlob);
      const fullText = fullTranscription.text;

      console.log(
        "Full transcription received:",
        fullText.substring(0, 100) + "..."
      );

      // Split the transcription by actual question timing boundaries
      const words = fullText.split(" ");
      const totalDuration = this.questionSegments.reduce(
        (sum, seg) => sum + seg.duration,
        0
      );

      // If total duration is too short or segments have very short durations, use equal splitting
      const useEqualSplitting =
        totalDuration < 30 ||
        this.questionSegments.some((seg) => seg.duration < 5);

      if (useEqualSplitting) {
        console.log("Using equal word splitting due to short durations");
        const wordsPerSegment = Math.ceil(
          words.length / this.questionSegments.length
        );

        for (let i = 0; i < this.questionSegments.length; i++) {
          const segment = this.questionSegments[i];
          const startWord = i * wordsPerSegment;
          const endWord = Math.min((i + 1) * wordsPerSegment, words.length);
          const segmentText = words.slice(startWord, endWord).join(" ");

          console.log(`Question ${i + 1} (equal split):`, {
            question: segment.questionText.substring(0, 50) + "...",
            wordRange: `${startWord}-${endWord}`,
            textPreview: segmentText.substring(0, 100) + "...",
          });

          this.createQuestionResponse(segment, segmentText, segment.duration);
        }
      } else {
        // Use timing-based segmentation
        for (let i = 0; i < this.questionSegments.length; i++) {
          const segment = this.questionSegments[i];

          // Calculate word boundaries based on actual timing
          const segmentStartRatio =
            this.questionSegments
              .slice(0, i)
              .reduce((sum, seg) => sum + seg.duration, 0) / totalDuration;
          const segmentEndRatio =
            this.questionSegments
              .slice(0, i + 1)
              .reduce((sum, seg) => sum + seg.duration, 0) / totalDuration;

          const startWord = Math.floor(segmentStartRatio * words.length);
          const endWord = Math.floor(segmentEndRatio * words.length);

          // Add some overlap buffer to prevent cutting off mid-sentence
          const bufferWords = 3; // 3 words buffer
          const actualStartWord = Math.max(
            0,
            startWord - (i > 0 ? bufferWords : 0)
          );
          const actualEndWord = Math.min(
            words.length,
            endWord + (i < this.questionSegments.length - 1 ? bufferWords : 0)
          );

          const segmentText = words
            .slice(actualStartWord, actualEndWord)
            .join(" ");

          console.log(`Question ${i + 1} segmentation:`, {
            question: segment.questionText.substring(0, 50) + "...",
            duration: segment.duration,
            startRatio: segmentStartRatio.toFixed(2),
            endRatio: segmentEndRatio.toFixed(2),
            wordRange: `${actualStartWord}-${actualEndWord}`,
            textPreview: segmentText.substring(0, 100) + "...",
          });

          responses.push(
            this.createQuestionResponse(segment, segmentText, segment.duration)
          );
        }
      }

      console.log(
        `Successfully processed ${responses.length} question segments`
      );
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
    console.log("Cleared all question segments");
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
