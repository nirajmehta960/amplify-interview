import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InterviewQuestion =
  Database["public"]["Tables"]["interview_questions"]["Row"];

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

// Convert database row to Question interface
const dbRowToQuestion = (row: InterviewQuestion): Question => ({
  id: row.question_id.toString(),
  text: row.question_text,
  category: row.category || "General",
  difficulty:
    row.difficulty === "Easy" ? 1 : row.difficulty === "Medium" ? 2 : 3,
  thinkingTime: 45, // Default thinking time
});

// Fetch questions from database by interview type
export const fetchQuestionsByType = async (
  interviewType: "behavioral" | "technical" | "leadership"
): Promise<Question[]> => {
  try {
    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("interview_type", interviewType)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching questions:", error);
      return [];
    }

    return data.map(dbRowToQuestion);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};

// Fetch questions by custom domain
export const fetchQuestionsByCustomDomain = async (
  customDomain:
    | "product_manager"
    | "software_engineer"
    | "data_scientist"
    | "ui_ux_designer"
    | "devops_engineer"
    | "ai_engineer"
): Promise<Question[]> => {
  try {
    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("interview_type", "custom")
      .eq("custom_domain", customDomain)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching questions by custom domain:", error);
      return [];
    }

    return data.map(dbRowToQuestion);
  } catch (error) {
    console.error("Error fetching questions by custom domain:", error);
    return [];
  }
};

// Get questions for custom interviews with field mapping
export const fetchCustomFieldQuestions = async (): Promise<Field[]> => {
  try {
    // Get all custom questions
    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("interview_type", "custom")
      .eq("is_active", true)
      .order("custom_domain", { ascending: true });

    if (error) {
      console.error("Error fetching custom field questions:", error);
      return [];
    }

    // Define domain mapping for display names
    const domainDisplayNames: Record<string, string> = {
      product_manager: "Product Manager",
      software_engineer: "Software Engineer",
      data_scientist: "Data Scientist",
      ui_ux_designer: "UI/UX Designer",
      devops_engineer: "DevOps Engineer",
      ai_engineer: "AI Engineer",
    };

    // Group questions by custom domain
    const questionsByDomain = data.reduce((acc, row) => {
      const domain = row.custom_domain!;

      if (!acc[domain]) {
        acc[domain] = [];
      }
      acc[domain].push(dbRowToQuestion(row));
      return acc;
    }, {} as Record<string, Question[]>);

    // Convert to Field format
    const fields: Field[] = Object.entries(questionsByDomain).map(
      ([domain, questions]) => ({
        id: domain,
        name: domainDisplayNames[domain] || domain,
        questions,
      })
    );

    return fields;
  } catch (error) {
    console.error("Error fetching custom field questions:", error);
    return [];
  }
};

// Main function to get questions for interview (replaces getQuestionsForInterview)
export const getQuestionsForInterviewFromDB = async (
  interviewType: "behavioral" | "technical" | "leadership" | "custom",
  useCustomQuestions: boolean,
  customQuestions: string[],
  selectedField?: string
): Promise<Question[]> => {
  if (useCustomQuestions && customQuestions.length > 0) {
    // For custom questions, we'll classify them and store metadata
    return customQuestions.map((question, index) => ({
      id: `custom-${index + 1}`,
      text: question,
      category: "Custom",
      difficulty: 2,
      thinkingTime: 45,
    }));
  }

  // For custom interview type with selected field, fetch by custom domain
  if (interviewType === "custom" && selectedField) {
    const customDomain = selectedField as
      | "product_manager"
      | "software_engineer"
      | "data_scientist"
      | "ui_ux_designer"
      | "devops_engineer"
      | "ai_engineer";
    return await fetchQuestionsByCustomDomain(customDomain);
  }

  // For standard interview types, fetch from database
  if (
    interviewType === "behavioral" ||
    interviewType === "technical" ||
    interviewType === "leadership"
  ) {
    return await fetchQuestionsByType(interviewType);
  }

  // Fallback for custom without selected field
  return [];
};

// Get available fields for custom interview type
export const getAvailableFieldsFromDB = async (): Promise<Field[]> => {
  return await fetchCustomFieldQuestions();
};

// Main function that fetches questions from database only (no fallback to hardcoded)
export const getQuestionsForInterview = async (
  interviewType: "behavioral" | "technical" | "leadership" | "custom",
  useCustomQuestions: boolean,
  customQuestions: string[],
  selectedField?: string,
  useUserQuestions?: boolean,
  selectedUserQuestions?: string[],
  userId?: string
): Promise<Question[]> => {
  try {
    // Handle user questions first
    if (useUserQuestions && selectedUserQuestions && selectedUserQuestions.length > 0 && userId) {
      const { userQuestionBankService } = await import("./userQuestionBankService");
      const userQuestions = await userQuestionBankService.getQuestionsForInterview(
        userId,
        selectedUserQuestions
      );
      
      return userQuestions.map((q, index) => ({
        id: q.id,
        text: q.text,
        category: q.category,
        difficulty: q.difficulty === "easy" ? 1 : q.difficulty === "medium" ? 2 : 3,
        thinkingTime: 45,
      }));
    }

    // Always fetch from database - no fallback to hardcoded questions
    const questions = await getQuestionsForInterviewFromDB(
      interviewType,
      useCustomQuestions,
      customQuestions,
      selectedField
    );

    if (questions.length === 0) {
      console.warn(
        `No questions found in database for ${interviewType}${
          selectedField ? ` (${selectedField})` : ""
        }`
      );
    }

    return questions;
  } catch (error) {
    console.error("Error getting questions:", error);
    // Return empty array instead of fallback questions
    return [];
  }
};

// Function to get available fields (no fallback)
export const getAvailableFields = async (): Promise<Field[]> => {
  try {
    return await getAvailableFieldsFromDB();
  } catch (error) {
    console.error("Error getting available fields:", error);
    return [];
  }
};

// Get question count for a specific interview type
export const getQuestionCountByType = async (
  interviewType: "behavioral" | "technical" | "leadership"
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from("interview_questions")
      .select("*", { count: "exact", head: true })
      .eq("interview_type", interviewType)
      .eq("is_active", true);

    if (error) {
      console.error("Error getting question count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting question count:", error);
    return 0;
  }
};

// Get question count for a specific custom domain
export const getQuestionCountByCustomDomain = async (
  customDomain:
    | "product_manager"
    | "software_engineer"
    | "data_scientist"
    | "ui_ux_designer"
    | "devops_engineer"
    | "ai_engineer"
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from("interview_questions")
      .select("*", { count: "exact", head: true })
      .eq("interview_type", "custom")
      .eq("custom_domain", customDomain)
      .eq("is_active", true);

    if (error) {
      console.error("Error getting custom domain question count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting custom domain question count:", error);
    return 0;
  }
};
