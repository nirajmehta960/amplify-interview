import { InterviewQuestion, QuestionResponse } from "@/types/interview";

export interface LocalInterviewSession {
  id: string;
  userId: string;
  interviewType: string;
  config: any;
  questions: InterviewQuestion[];
  responses: QuestionResponse[];
  createdAt: string;
  completedAt?: string;
  duration?: number;
}

export interface LocalSessionData {
  sessionId: string;
  timestamp: number;
  storageType: "local";
  session: LocalInterviewSession;
  videoMetadata?: {
    duration: number;
    size: number;
    format: string;
  };
}

class LocalInterviewStorageService {
  private readonly STORAGE_KEY = "amplify_interview_sessions";
  private readonly CURRENT_SESSION_KEY = "amplify_current_session";

  /**
   * Save interview session locally
   */
  async saveSession(session: LocalInterviewSession): Promise<void> {
    try {
      const sessions = this.getAllSessions();
      sessions[session.id] = session;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      console.log(`Saved session ${session.id} locally`);
    } catch (error) {
      console.error("Error saving session locally:", error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): LocalInterviewSession | null {
    try {
      const sessions = this.getAllSessions();
      return sessions[sessionId] || null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Record<string, LocalInterviewSession> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Error getting all sessions:", error);
      return {};
    }
  }

  /**
   * Save question response
   */
  async saveResponse(
    sessionId: string,
    response: QuestionResponse
  ): Promise<void> {
    try {
      const session = this.getSession(sessionId);
      if (session) {
        session.responses = session.responses || [];
        session.responses.push(response);
        await this.saveSession(session);
        console.log(
          `Saved response for question ${response.questionId} in session ${sessionId}`
        );
      }
    } catch (error) {
      console.error("Error saving response:", error);
      throw error;
    }
  }

  /**
   * Complete session
   */
  async completeSession(
    sessionId: string,
    totalDuration: number
  ): Promise<void> {
    try {
      const session = this.getSession(sessionId);
      if (session) {
        session.completedAt = new Date().toISOString();
        session.duration = Math.round(totalDuration);
        await this.saveSession(session);
        console.log(`Completed session ${sessionId} locally`);
      }
    } catch (error) {
      console.error("Error completing session:", error);
      throw error;
    }
  }

  /**
   * Set current session
   */
  setCurrentSession(sessionId: string): void {
    localStorage.setItem(this.CURRENT_SESSION_KEY, sessionId);
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return localStorage.getItem(this.CURRENT_SESSION_KEY);
  }

  /**
   * Clear current session
   */
  clearCurrentSession(): void {
    localStorage.removeItem(this.CURRENT_SESSION_KEY);
  }

  /**
   * Create session data for results page
   */
  createSessionData(sessionId: string, videoMetadata?: any): LocalSessionData {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId,
      timestamp: new Date(session.createdAt).getTime(),
      storageType: "local",
      session,
      videoMetadata,
    };
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    try {
      const sessions = this.getAllSessions();
      delete sessions[sessionId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      console.log(`Deleted session ${sessionId}`);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }
}

export const localInterviewStorageService = new LocalInterviewStorageService();
