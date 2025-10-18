import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InterviewSession =
  Database["public"]["Tables"]["interview_sessions"]["Row"];
type InterviewResponse =
  Database["public"]["Tables"]["interview_responses"]["Row"];
type InterviewQuestion =
  Database["public"]["Tables"]["interview_questions"]["Row"];

export interface InterviewConfig {
  duration: number;
  questionCount: number;
  useCustomQuestions: boolean;
  customQuestions?: string[];
  selectedField?: string;
}

export interface CreateSessionData {
  userId: string;
  interviewType: "behavioral" | "technical" | "leadership" | "custom";
  config: InterviewConfig;
}

export interface QuestionResponse {
  questionId: number; // Changed from string to number to match database int8
  responseText: string;
  duration: number;
  questionText?: string;
}

export interface SessionWithResponses extends InterviewSession {
  responses: InterviewResponse[];
  questions: InterviewQuestion[];
}

export class InterviewSessionService {
  private static instance: InterviewSessionService;
  private currentSessionId: string | null = null;

  static getInstance(): InterviewSessionService {
    if (!InterviewSessionService.instance) {
      InterviewSessionService.instance = new InterviewSessionService();
    }
    return InterviewSessionService.instance;
  }

  /**
   * Create a new interview session
   */
  async createInterviewSession(
    data: CreateSessionData
  ): Promise<{ sessionId: string; questions: InterviewQuestion[] }> {
    try {
      // First, fetch questions for this interview type
      // Respect user's question count configuration
      const questions = await this.fetchQuestionsForInterview(
        data.interviewType,
        data.config.selectedField,
        data.config.questionCount, // Use user's selected question count
        data.config.useCustomQuestions,
        data.config.customQuestions || []
      );

      if (questions.length === 0) {
        throw new Error(
          `No questions found for interview type: ${data.interviewType}`
        );
      }

      // Prepare session data
      const sessionData = {
        user_id: data.userId,
        interview_type: data.interviewType,
        duration: data.config.duration, // Add the required duration field
        interview_config: {
          duration: data.config.duration,
          questionCount: data.config.questionCount,
          useCustomQuestions: data.config.useCustomQuestions,
          customQuestions: data.config.customQuestions || [],
          selectedField: data.config.selectedField,
        },
        questions_asked: questions.map((q) => q.question_id),
        completed_at: null,
      };

      const { data: session, error } = await supabase
        .from("interview_sessions")
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error("Error creating interview session:", error);
        throw new Error(`Failed to create interview session: ${error.message}`);
      }

      this.currentSessionId = session.id;

      // Save session ID to localStorage for recovery
      localStorage.setItem("current_interview_session_id", session.id);

      console.log("Created interview session:", session.id);
      return { sessionId: session.id, questions };
    } catch (error) {
      console.error("Error in createInterviewSession:", error);
      throw error;
    }
  }

  /**
   * Fetch questions for interview based on type and domain
   */
  async fetchQuestionsForInterview(
    interviewType: "behavioral" | "technical" | "leadership" | "custom",
    customDomain?: string,
    count: number = 15,
    useCustomQuestions: boolean = false,
    customQuestions: string[] = []
  ): Promise<InterviewQuestion[]> {
    try {
      // If using custom questions, return mock question objects
      if (useCustomQuestions && customQuestions.length > 0) {
        return customQuestions.map((text, index) => ({
          question_id: `custom-${index + 1}` as any,
          interview_type: "custom" as any,
          custom_domain: null,
          question_text: text,
          category: "Custom",
          focus_areas: ["Custom"],
          difficulty: "Medium" as any,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      }

      let query = supabase
        .from("interview_questions")
        .select("*")
        .eq("is_active", true)
        .limit(count);

      if (interviewType === "custom" && customDomain) {
        query = query
          .eq("interview_type", "custom")
          .eq("custom_domain", customDomain);
      } else {
        query = query.eq("interview_type", interviewType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching questions:", error);
        console.error("Query details:", {
          interviewType,
          customDomain,
          count,
          useCustomQuestions,
          customQuestionsLength: customQuestions.length,
        });
        throw new Error(`Failed to fetch questions: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn(
          `No questions found for ${interviewType}${
            customDomain ? ` (${customDomain})` : ""
          }`
        );
        return [];
      }

      // Randomize order for variety
      const shuffled = data.sort(() => Math.random() - 0.5);

      // Transform database rows to InterviewQuestion format
      const transformedQuestions = shuffled.map((row) => ({
        question_id: row.question_id,
        interview_type: row.interview_type,
        custom_domain: row.custom_domain,
        question_text: row.question_text,
        category: row.category || "General",
        focus_areas: row.focus_areas || [],
        difficulty: row.difficulty,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      console.log(
        `Fetched ${transformedQuestions.length} questions for ${interviewType}`
      );
      console.log(
        "Questions fetched:",
        transformedQuestions.map((q) => ({
          question_id: q.question_id,
          question_text: q.question_text.substring(0, 50) + "...",
        }))
      );
      return transformedQuestions;
    } catch (error) {
      console.error("Error in fetchQuestionsForInterview:", error);
      throw error;
    }
  }

  /**
   * Map difficulty enum to number
   */
  private mapDifficultyToNumber(difficulty: string): number {
    switch (difficulty) {
      case "Easy":
        return 1;
      case "Medium":
        return 2;
      case "Hard":
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Get thinking time based on difficulty
   */
  private getThinkingTimeFromDifficulty(difficulty: string): number {
    switch (difficulty) {
      case "Easy":
        return 30;
      case "Medium":
        return 45;
      case "Hard":
        return 60;
      default:
        return 45;
    }
  }

  /**
   * Save a question response
   */
  async saveQuestionResponse(
    sessionId: string,
    response: QuestionResponse
  ): Promise<string> {
    try {
      const responseData = {
        session_id: sessionId,
        question_id: Number(response.questionId), // Ensure question_id is a number (int8)
        response_text: response.responseText,
        duration: Math.round(response.duration), // Convert to integer
      };

      const { data, error } = await supabase
        .from("interview_responses")
        .insert(responseData)
        .select()
        .single();

      if (error) {
        console.error("Error saving question response:", error);
        throw new Error(`Failed to save response: ${error.message}`);
      }

      // Also save to localStorage as backup
      this.saveResponseToLocalStorage(sessionId, response);

      console.log("Saved question response:", data.id);
      return data.id;
    } catch (error) {
      console.error("Error in saveQuestionResponse:", error);
      throw error;
    }
  }

  /**
   * Complete the interview session
   */
  async completeInterviewSession(
    sessionId: string,
    totalDuration: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("interview_sessions")
        .update({
          completed_at: new Date().toISOString(),
          duration: Math.round(totalDuration), // Convert to integer
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error completing interview session:", error);
        throw new Error(`Failed to complete session: ${error.message}`);
      }

      // Clear current session and localStorage
      this.currentSessionId = null;
      localStorage.removeItem("current_interview_session_id");
      localStorage.removeItem(`interview_responses_${sessionId}`);

      console.log("Completed interview session:", sessionId);
    } catch (error) {
      console.error("Error in completeInterviewSession:", error);
      throw error;
    }
  }

  /**
   * Fetch interview session with responses
   */
  async fetchInterviewSession(
    sessionId: string
  ): Promise<SessionWithResponses | null> {
    try {
      // Fetch session
      const { data: session, error: sessionError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        return null;
      }

      if (!session) {
        return null;
      }

      // Fetch responses
      const { data: responses, error: responsesError } = await supabase
        .from("interview_responses")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (responsesError) {
        console.error("Error fetching responses:", responsesError);
      }

      // Fetch questions (if question IDs are available)
      let questions: InterviewQuestion[] = [];
      if (session.questions_asked && Array.isArray(session.questions_asked)) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("interview_questions")
          .select("*")
          .in("question_id", session.questions_asked);

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
        } else {
          questions = questionsData || [];
        }
      }

      return {
        ...session,
        responses: responses || [],
        questions,
      };
    } catch (error) {
      console.error("Error in fetchInterviewSession:", error);
      return null;
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    if (this.currentSessionId) {
      return this.currentSessionId;
    }

    // Try to get from localStorage
    const stored = localStorage.getItem("current_interview_session_id");
    if (stored) {
      this.currentSessionId = stored;
      return stored;
    }

    return null;
  }

  /**
   * Set current session ID
   */
  setCurrentSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
    localStorage.setItem("current_interview_session_id", sessionId);
  }

  /**
   * Clear current session
   */
  clearCurrentSession(): void {
    this.currentSessionId = null;
    localStorage.removeItem("current_interview_session_id");
  }

  /**
   * Save response to localStorage as backup
   */
  private saveResponseToLocalStorage(
    sessionId: string,
    response: QuestionResponse
  ): void {
    try {
      const key = `interview_responses_${sessionId}`;
      const existing = localStorage.getItem(key);
      const responses = existing ? JSON.parse(existing) : [];

      responses.push({
        ...response,
        saved_at: new Date().toISOString(),
      });

      localStorage.setItem(key, JSON.stringify(responses));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  /**
   * Get responses from localStorage backup
   */
  getLocalStorageResponses(sessionId: string): any[] {
    try {
      const key = `interview_responses_${sessionId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  }

  /**
   * Check for incomplete interview session
   */
  async checkForIncompleteSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("id")
        .eq("user_id", userId)
        .is("completed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking for incomplete session:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("Error in checkForIncompleteSession:", error);
      return null;
    }
  }

  /**
   * Resume incomplete interview session
   */
  async resumeInterviewSession(
    sessionId: string
  ): Promise<SessionWithResponses | null> {
    try {
      const session = await this.fetchInterviewSession(sessionId);
      if (session && !session.completed_at) {
        this.setCurrentSessionId(sessionId);
        return session;
      }
      return null;
    } catch (error) {
      console.error("Error in resumeInterviewSession:", error);
      return null;
    }
  }

  /**
   * Get user's interview history
   */
  async getUserInterviewHistory(
    userId: string,
    limit: number = 10
  ): Promise<InterviewSession[]> {
    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching interview history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserInterviewHistory:", error);
      return [];
    }
  }
}

// Export singleton instance
export const interviewSessionService = InterviewSessionService.getInstance();
