/**
 * API client for the Amplify Interview FastAPI backend.
 * Handles all communication with /api/* endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ── Types ─────────────────────────────────────────────────

export interface SessionConfig {
  mode: 'behavioral' | 'technical' | 'mixed';
  question_count: number;
  duration_minutes: number;
  starting_difficulty: 'easy' | 'medium' | 'hard';
  adaptive_difficulty: boolean;
  enable_followups: boolean;
  resume_id?: string;
  jd_id?: string;
}

export interface QuestionMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  related_resume_section?: string;
  related_jd_requirement?: string;
  is_followup: boolean;
  question_number: number;
}

export interface ResponseAnalysis {
  score: number;
  communication_scores: { clarity: number; structure: number; conciseness: number };
  content_scores: { relevance: number; depth: number; specificity: number };
  strengths: string[];
  improvements: string[];
  brief_feedback: string;
}

export interface ChatMessage {
  message_id?: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  timestamp?: string;
  question_metadata?: QuestionMetadata;
  analysis?: ResponseAnalysis;
}

export interface SessionProgress {
  questions_asked: number;
  questions_total: number;
  current_difficulty: 'easy' | 'medium' | 'hard';
  topics_covered: string[];
  average_score: number;
  is_complete: boolean;
  time_elapsed_seconds: number;
}

export interface StartSessionResponse {
  session_id: string;
  first_message: ChatMessage;
  progress: SessionProgress;
}

export interface SendMessageResponse {
  candidate_message: ChatMessage;
  interviewer_message: ChatMessage;
  session_progress: SessionProgress;
}

export interface SessionFeedback {
  session_id: string;
  overall_score: number;
  communication_scores: { clarity: number; structure: number; conciseness: number };
  content_scores: { relevance: number; depth: number; specificity: number };
  strengths: string[];
  improvements: string[];
  actionable_feedback: string;
  readiness_level: string;
  readiness_score: number;
  next_steps: string[];
  performance_trend: string;
  skill_gaps_addressed: string[];
  skill_gaps_remaining: string[];
  total_questions: number;
  questions_answered: number;
  total_cost_cents: number;
}

export interface SessionListItem {
  session_id: string;
  status: string;
  mode: string;
  created_at: string;
  completed_at?: string;
  overall_score?: number;
  question_count: number;
  readiness_level?: string;
}

export interface ResumeUploadResponse {
  resume_id: string;
  file_name: string;
  parsed_data: any;
  uploaded_at: string;
}

export interface MatchAnalysis {
  overall_score: number;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string[];
  gaps: string[];
  interview_focus_areas: string[];
}

// ── HTTP Client ───────────────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  // TODO: Replace with Firebase Auth token when auth is migrated
  // For now, try to get from Supabase session
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(errorBody.detail || response.statusText, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Interview API ─────────────────────────────────────────

export const interviewApi = {
  /** Create a new interview session and get the first question */
  createSession: (config: SessionConfig): Promise<StartSessionResponse> =>
    apiFetch('/api/interview/session', {
      method: 'POST',
      body: JSON.stringify({ config }),
    }),

  /** Send a candidate response and get the next question */
  sendMessage: (
    sessionId: string,
    content: string,
    durationSeconds?: number,
  ): Promise<SendMessageResponse> =>
    apiFetch(`/api/interview/session/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content, duration_seconds: durationSeconds }),
    }),

  /** List all sessions for the current user */
  listSessions: (limit = 20): Promise<SessionListItem[]> =>
    apiFetch(`/api/interview/sessions?limit=${limit}`),

  /** Get session details */
  getSession: (sessionId: string) =>
    apiFetch(`/api/interview/session/${sessionId}`),

  /** Get chat history for a session */
  getMessages: (sessionId: string): Promise<{ session_id: string; messages: ChatMessage[] }> =>
    apiFetch(`/api/interview/session/${sessionId}/messages`),

  /** Manually end a session */
  endSession: (sessionId: string) =>
    apiFetch(`/api/interview/session/${sessionId}/end`, { method: 'POST' }),

  /** Delete a session */
  deleteSession: (sessionId: string) =>
    apiFetch(`/api/interview/session/${sessionId}`, { method: 'DELETE' }),
};

// ── Resume API ────────────────────────────────────────────

export const resumeApi = {
  /** Upload and parse a resume file */
  upload: (file: File): Promise<ResumeUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/resume/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /** List all uploaded resumes */
  list: () => apiFetch('/api/resume/list'),

  /** Get a specific parsed resume */
  get: (resumeId: string) => apiFetch(`/api/resume/${resumeId}`),

  /** Delete a resume */
  delete: (resumeId: string) =>
    apiFetch(`/api/resume/${resumeId}`, { method: 'DELETE' }),

  /** Create and parse a job description */
  createJD: (rawText: string, company?: string, roleTitle?: string) =>
    apiFetch('/api/resume/jd', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText, company, role_title: roleTitle }),
    }),

  /** List all job descriptions */
  listJDs: () => apiFetch('/api/resume/jd/list'),

  /** Get match analysis between resume and JD */
  analyzeMatch: (resumeId: string, jdId: string): Promise<{ analysis: MatchAnalysis }> =>
    apiFetch(`/api/resume/match?resume_id=${resumeId}&jd_id=${jdId}`, { method: 'POST' }),
};

// ── Feedback API ──────────────────────────────────────────

export const feedbackApi = {
  /** Generate comprehensive feedback for a completed session */
  generate: (sessionId: string): Promise<SessionFeedback> =>
    apiFetch(`/api/feedback/session/${sessionId}`, { method: 'POST' }),

  /** Get existing feedback */
  get: (sessionId: string): Promise<SessionFeedback> =>
    apiFetch(`/api/feedback/session/${sessionId}`),

  /** Get per-question feedback */
  getQuestions: (sessionId: string) =>
    apiFetch(`/api/feedback/session/${sessionId}/questions`),
};

// ── Analytics API ─────────────────────────────────────────

export const analyticsApi = {
  /** Get overview stats */
  getOverview: () => apiFetch('/api/analytics/overview'),

  /** Get progress data for charts */
  getProgress: () => apiFetch('/api/analytics/progress'),

  /** Get skill analytics */
  getSkills: () => apiFetch('/api/analytics/skills'),
};
