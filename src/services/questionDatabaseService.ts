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
  id: row.id,
  text: row.question_text,
  category: row.category,
  difficulty: row.difficulty,
  thinkingTime: row.thinking_time || 30,
});

// Fetch questions from database by interview type
export const fetchQuestionsByType = async (
  interviewType: string
): Promise<Question[]> => {
  try {
    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("interview_type", interviewType)
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

// Fetch questions by interview type and industry (for custom fields)
export const fetchQuestionsByTypeAndIndustry = async (
  interviewType: string,
  industry: string
): Promise<Question[]> => {
  try {
    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("interview_type", interviewType)
      .eq("industry", industry)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching questions by type and industry:", error);
      return [];
    }

    return data.map(dbRowToQuestion);
  } catch (error) {
    console.error("Error fetching questions by type and industry:", error);
    return [];
  }
};

// Get all available industries/fields for custom interviews
export const fetchAvailableIndustries = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("interview_questions")
      .select("industry")
      .eq("interview_type", "custom")
      .not("industry", "is", null)
      .order("industry", { ascending: true });

    if (error) {
      console.error("Error fetching industries:", error);
      return [];
    }

    // Get unique industries
    const uniqueIndustries = Array.from(
      new Set(data.map((row) => row.industry).filter(Boolean))
    );
    return uniqueIndustries;
  } catch (error) {
    console.error("Error fetching industries:", error);
    return [];
  }
};

// Get questions for custom interviews with field mapping
export const fetchCustomFieldQuestions = async (): Promise<Field[]> => {
  try {
    // First get all custom questions
    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("interview_type", "custom")
      .not("industry", "is", null)
      .order("industry", { ascending: true });

    if (error) {
      console.error("Error fetching custom field questions:", error);
      return [];
    }

    // Group questions by industry
    const questionsByIndustry = data.reduce((acc, row) => {
      const industry = row.industry!;
      if (!acc[industry]) {
        acc[industry] = [];
      }
      acc[industry].push(dbRowToQuestion(row));
      return acc;
    }, {} as Record<string, Question[]>);

    // Convert to Field format
    const fields: Field[] = Object.entries(questionsByIndustry).map(
      ([industry, questions]) => ({
        id: industry.toLowerCase().replace(/\s+/g, "-"),
        name: industry,
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
  interviewType: string,
  useCustomQuestions: boolean,
  customQuestions: string[],
  selectedField?: string
): Promise<Question[]> => {
  if (useCustomQuestions && customQuestions.length > 0) {
    // Convert custom questions to Question objects
    return customQuestions.map((question, index) => ({
      id: `custom-${index + 1}`,
      text: question,
      category: "Custom",
      difficulty: 2,
      thinkingTime: 45,
    }));
  }

  // For custom interview type with selected field, fetch by industry
  if (interviewType === "custom" && selectedField) {
    const fields = await fetchCustomFieldQuestions();
    const selectedFieldObj = fields.find((f) => f.id === selectedField);
    return selectedFieldObj ? selectedFieldObj.questions : [];
  }

  // For standard interview types, fetch from database
  return await fetchQuestionsByType(interviewType);
};

// Get available fields for custom interview type
export const getAvailableFieldsFromDB = async (): Promise<Field[]> => {
  return await fetchCustomFieldQuestions();
};

// Fallback function that combines database and local questions
export const getQuestionsForInterview = async (
  interviewType: string,
  useCustomQuestions: boolean,
  customQuestions: string[],
  selectedField?: string
): Promise<Question[]> => {
  try {
    // Try to get questions from database first
    const dbQuestions = await getQuestionsForInterviewFromDB(
      interviewType,
      useCustomQuestions,
      customQuestions,
      selectedField
    );

    // If we have questions from database, use them
    if (dbQuestions.length > 0) {
      return dbQuestions;
    }

    // Fallback to local questions if database is empty or fails
    console.warn(
      `No questions found in database for ${interviewType}, using fallback questions`
    );

    // Import local questions as fallback
    const {
      fallbackBehavioralQuestions,
      fallbackTechnicalQuestions,
      fallbackLeadershipQuestions,
      fallbackCustomFields,
    } = await import("./questionBankService");

    if (useCustomQuestions && customQuestions.length > 0) {
      return customQuestions.map((question, index) => ({
        id: `custom-${index + 1}`,
        text: question,
        category: "Custom",
        difficulty: 2,
        thinkingTime: 45,
      }));
    }

    switch (interviewType) {
      case "behavioral":
        return fallbackBehavioralQuestions;
      case "technical":
        return fallbackTechnicalQuestions;
      case "leadership":
        return fallbackLeadershipQuestions;
      case "custom":
        if (selectedField) {
          const field = fallbackCustomFields.find(
            (f) => f.id === selectedField
          );
          return field ? field.questions : fallbackBehavioralQuestions;
        }
        return fallbackBehavioralQuestions;
      default:
        return fallbackBehavioralQuestions;
    }
  } catch (error) {
    console.error("Error getting questions:", error);
    // Return empty array as last resort
    return [];
  }
};

// Function to get available fields with fallback
export const getAvailableFields = async (): Promise<Field[]> => {
  try {
    // Try database first
    const dbFields = await getAvailableFieldsFromDB();
    if (dbFields.length > 0) {
      return dbFields;
    }

    // Fallback to local fields
    const { fallbackCustomFields } = await import("./questionBankService");
    return fallbackCustomFields;
  } catch (error) {
    console.error("Error getting available fields:", error);
    const { fallbackCustomFields } = await import("./questionBankService");
    return fallbackCustomFields;
  }
};
