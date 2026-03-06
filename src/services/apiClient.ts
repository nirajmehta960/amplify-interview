/**
 * API client for the Amplify Interview FastAPI backend.
 * Handles all communication with /api/* endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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

export interface JDResponse {
  jd_id: string;
  raw_text: string;
  parsed_data: any;
  created_at: string;
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
  try {
    const { auth } = await import('@/lib/firebase');
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
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
  createJD: (rawText: string, company?: string, roleTitle?: string): Promise<JDResponse> =>
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

// ── Questions API (User Question Bank) ───────────────────

export interface UserQuestion {
  id: string;
  question_text: string;
  category: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export const questionsApi = {
  /** List all user practice questions (optionally filtered) */
  list: (category?: string, q?: string): Promise<UserQuestion[]> => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    const qs = params.toString();
    return apiFetch(`/api/questions${qs ? `?${qs}` : ''}`);
  },

  /** Create a new practice question */
  create: (question_text: string, category: string): Promise<UserQuestion> =>
    apiFetch('/api/questions', {
      method: 'POST',
      body: JSON.stringify({ question_text, category }),
    }),

  /** Update an existing practice question */
  update: (id: string, data: { question_text?: string; category?: string }): Promise<UserQuestion> =>
    apiFetch(`/api/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a practice question */
  delete: (id: string): Promise<void> =>
    apiFetch(`/api/questions/${id}`, { method: 'DELETE' }),
};

// ── User API ──────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export const userApi = {
  /** Get the current user's profile from Firebase token claims */
  getProfile: (): Promise<UserProfile> => apiFetch('/api/user/profile'),
};

// ── Email API ─────────────────────────────────────────────

export const emailApi = {
  /** Send a welcome email to a newly registered user */
  sendWelcome: (email: string, userName: string, dashboardUrl: string) =>
    apiFetch('/api/email/welcome', {
      method: 'POST',
      body: JSON.stringify({ email, user_name: userName, dashboard_url: dashboardUrl }),
    }),
};
