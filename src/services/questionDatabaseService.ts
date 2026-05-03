/**
 * Question Database Service — stub implementation.
 * App question bank is AI-generated per session by the FastAPI backend.
 * This stub satisfies the InterviewSetup import without Supabase.
 */

export interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: number;
  thinkingTime: number;
}

export interface Field {
  id: string;
  name: string;
  questions: Question[];
}

const FIELDS: Field[] = [
  { id: "product_manager", name: "Product Manager", questions: [] },
  { id: "software_engineer", name: "Software Engineer", questions: [] },
  { id: "data_scientist", name: "Data Scientist", questions: [] },
  { id: "ui_ux_designer", name: "UI/UX Designer", questions: [] },
  { id: "devops_engineer", name: "DevOps Engineer", questions: [] },
  { id: "ai_engineer", name: "AI Engineer", questions: [] },
];

export const getAvailableFields = async (): Promise<Field[]> => FIELDS;

export const getQuestionCountByType = async (
  _interviewType: "behavioral" | "technical" | "leadership"
): Promise<number> => 0;

export const getQuestionCountByCustomDomain = async (
  _customDomain: string
): Promise<number> => 0;

export const getQuestionsForInterview = async (
  _type: string,
  _useUserQuestions: boolean,
  _selectedIds: string[],
  _field?: string
): Promise<Question[]> => [];
