import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import {
  interviewSessionService,
  type InterviewConfig,
  type QuestionResponse,
  type SessionWithResponses,
} from "@/services/interviewSessionService";
import { localInterviewStorageService } from "@/services/localInterviewStorageService";
import { useAuth } from "./AuthContext";

// Types
export interface InterviewState {
  currentSessionId: string | null;
  currentQuestionIndex: number;
  questions: any[];
  responses: QuestionResponse[];
  isSessionActive: boolean;
  isSessionComplete: boolean;
  isLoading: boolean;
  error: string | null;
  sessionData: SessionWithResponses | null;
}

export interface InterviewAction {
  type:
    | "SET_LOADING"
    | "SET_ERROR"
    | "CLEAR_ERROR"
    | "CREATE_SESSION"
    | "SET_QUESTIONS"
    | "ADD_RESPONSE"
    | "NEXT_QUESTION"
    | "COMPLETE_SESSION"
    | "RESUME_SESSION"
    | "RESET_SESSION";
  payload?: any;
}

// Initial state
const initialState: InterviewState = {
  currentSessionId: null,
  currentQuestionIndex: 0,
  questions: [],
  responses: [],
  isSessionActive: false,
  isSessionComplete: false,
  isLoading: false,
  error: null,
  sessionData: null,
};

// Reducer
function interviewReducer(
  state: InterviewState,
  action: InterviewAction
): InterviewState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload, error: null };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "CREATE_SESSION":
      return {
        ...state,
        currentSessionId: action.payload.sessionId,
        questions: action.payload.questions,
        currentQuestionIndex: 0,
        responses: [],
        isSessionActive: true,
        isSessionComplete: false,
        isLoading: false,
        error: null,
      };

    case "SET_QUESTIONS":
      return { ...state, questions: action.payload };

    case "ADD_RESPONSE":
      return {
        ...state,
        responses: [...state.responses, action.payload],
      };

    case "NEXT_QUESTION":
      return {
        ...state,
        currentQuestionIndex: Math.min(
          state.currentQuestionIndex + 1,
          state.questions.length - 1
        ),
      };

    case "COMPLETE_SESSION":
      return {
        ...state,
        isSessionActive: false,
        isSessionComplete: true,
        isLoading: false,
      };

    case "RESUME_SESSION":
      return {
        ...state,
        currentSessionId: action.payload.sessionId,
        questions: action.payload.questions,
        responses: action.payload.responses,
        currentQuestionIndex: action.payload.currentQuestionIndex,
        isSessionActive: true,
        isSessionComplete: action.payload.isComplete,
        isLoading: false,
        error: null,
        sessionData: action.payload.sessionData,
      };

    case "RESET_SESSION":
      return {
        ...initialState,
        currentSessionId: null,
      };

    default:
      return state;
  }
}

// Context
const InterviewContext = createContext<{
  state: InterviewState;
  dispatch: React.Dispatch<InterviewAction>;
  actions: {
    createSession: (
      interviewType: string,
      config: InterviewConfig
    ) => Promise<void>;
    addResponse: (response: QuestionResponse) => Promise<void>;
    nextQuestion: () => void;
    completeSession: (totalDuration: number) => Promise<void>;
    resumeSession: (sessionId: string) => Promise<void>;
    resetSession: () => void;
    checkForIncompleteSession: () => Promise<string | null>;
    clearError: () => void;
  };
} | null>(null);

// Provider component
export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);
  const { user } = useAuth();

  // Check for incomplete session on mount
  useEffect(() => {
    if (user) {
      checkForIncompleteSession();
    }
  }, [user]);

  const createSession = async (
    interviewType: string,
    config: InterviewConfig
  ) => {
    if (!user) {
      dispatch({ type: "SET_ERROR", payload: "User not authenticated" });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Get questions from the database service
      const { sessionId, questions } =
        await interviewSessionService.createInterviewSession({
          userId: user.id,
          interviewType: interviewType as any,
          config,
        });

      // Create local session
      const localSession = {
        id: sessionId,
        userId: user.id,
        interviewType: interviewType as any,
        config,
        questions,
        responses: [],
        createdAt: new Date().toISOString(),
      };

      await localInterviewStorageService.saveSession(localSession);
      localInterviewStorageService.setCurrentSession(sessionId);

      dispatch({
        type: "CREATE_SESSION",
        payload: {
          sessionId,
          questions,
        },
      });

      console.log("Interview session created locally:", sessionId);
    } catch (error) {
      console.error("Error creating session:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to create session",
      });
    }
  };

  const addResponse = async (response: QuestionResponse) => {
    if (!state.currentSessionId) {
      dispatch({ type: "SET_ERROR", payload: "No active session" });
      return;
    }

    try {
      await interviewSessionService.saveQuestionResponse(
        state.currentSessionId,
        response
      );

      dispatch({ type: "ADD_RESPONSE", payload: response });

      console.log("Response saved:", response.questionId);
    } catch (error) {
      console.error("Error saving response:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to save response",
      });

      // Still add to local state as backup
      dispatch({ type: "ADD_RESPONSE", payload: response });
    }
  };

  const nextQuestion = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      dispatch({ type: "NEXT_QUESTION" });
    }
  };

  const completeSession = async (totalDuration: number) => {
    if (!state.currentSessionId) {
      dispatch({ type: "SET_ERROR", payload: "No active session to complete" });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Complete session in local storage
      await localInterviewStorageService.completeSession(
        state.currentSessionId,
        totalDuration
      );

      dispatch({ type: "COMPLETE_SESSION" });

      console.log("Interview session completed locally");
    } catch (error) {
      console.error("Error completing session:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to complete session",
      });
    }
  };

  const resumeSession = async (sessionId: string) => {
    if (!user) {
      dispatch({ type: "SET_ERROR", payload: "User not authenticated" });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const sessionData = await interviewSessionService.resumeInterviewSession(
        sessionId
      );

      if (!sessionData) {
        dispatch({
          type: "SET_ERROR",
          payload: "Session not found or already completed",
        });
        return;
      }

      // Convert database responses to our format
      const responses: QuestionResponse[] = sessionData.responses.map((r) => ({
        questionId: r.question_id.toString(),
        responseText: r.response_text,
        duration: r.duration,
      }));

      // Find current question index based on responses
      const currentQuestionIndex = Math.min(
        responses.length,
        sessionData.questions.length - 1
      );

      dispatch({
        type: "RESUME_SESSION",
        payload: {
          sessionId,
          questions: sessionData.questions,
          responses,
          currentQuestionIndex,
          isComplete: !!sessionData.completed_at,
          sessionData,
        },
      });

      console.log("Resumed interview session:", sessionId);
    } catch (error) {
      console.error("Error resuming session:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to resume session",
      });
    }
  };

  const resetSession = () => {
    dispatch({ type: "RESET_SESSION" });
    interviewSessionService.clearCurrentSession();
  };

  const checkForIncompleteSession = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const sessionId = await interviewSessionService.checkForIncompleteSession(
        user.id
      );
      return sessionId;
    } catch (error) {
      console.error("Error checking for incomplete session:", error);
      return null;
    }
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const actions = {
    createSession,
    addResponse,
    nextQuestion,
    completeSession,
    resumeSession,
    resetSession,
    checkForIncompleteSession,
    clearError,
  };

  return (
    <InterviewContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </InterviewContext.Provider>
  );
}

// Hook to use interview context
export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
}
