/**
 * User Question Bank Service
 * Manages user's custom questions stored in Firestore via the FastAPI backend.
 */

import { questionsApi, UserQuestion } from "@/services/apiClient";

export interface CustomQuestion {
  id: string;
  text: string;
  category: string;
  created_at: string;
  user_id: string;
}

export interface QuestionBankStats {
  totalQuestions: number;
  byCategory: Record<string, number>;
  recentQuestions: CustomQuestion[];
}

function mapToCustomQuestion(q: UserQuestion): CustomQuestion {
  return {
    id: q.id,
    text: q.question_text,
    category: q.category,
    created_at: q.created_at,
    user_id: q.user_id,
  };
}

class UserQuestionBankService {
  async getUserQuestions(_userId: string): Promise<CustomQuestion[]> {
    try {
      const data = await questionsApi.list();
      return data.map(mapToCustomQuestion);
    } catch (error) {
      console.error("Error in getUserQuestions:", error);
      return [];
    }
  }

  async getQuestionsByCategory(
    _userId: string,
    category: string
  ): Promise<CustomQuestion[]> {
    try {
      const data = await questionsApi.list(category);
      return data.map(mapToCustomQuestion);
    } catch (error) {
      console.error("Error in getQuestionsByCategory:", error);
      return [];
    }
  }

  async addQuestion(
    _userId: string,
    questionData: { text: string; category: string }
  ): Promise<CustomQuestion | null> {
    try {
      const created = await questionsApi.create(
        questionData.text,
        questionData.category
      );
      return mapToCustomQuestion(created);
    } catch (error) {
      console.error("Error in addQuestion:", error);
      return null;
    }
  }

  async updateQuestion(
    questionId: string,
    updates: { text?: string; category?: string }
  ): Promise<CustomQuestion | null> {
    try {
      const updated = await questionsApi.update(questionId, {
        question_text: updates.text,
        category: updates.category,
      });
      return mapToCustomQuestion(updated);
    } catch (error) {
      console.error("Error in updateQuestion:", error);
      return null;
    }
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    try {
      await questionsApi.delete(questionId);
      return true;
    } catch (error) {
      console.error("Error in deleteQuestion:", error);
      return false;
    }
  }

  async getQuestionBankStats(_userId: string): Promise<QuestionBankStats> {
    try {
      const questions = await this.getUserQuestions("");
      const byCategory: Record<string, number> = {};
      questions.forEach((q) => {
        byCategory[q.category] = (byCategory[q.category] || 0) + 1;
      });
      return {
        totalQuestions: questions.length,
        byCategory,
        recentQuestions: questions.slice(0, 5),
      };
    } catch (error) {
      console.error("Error in getQuestionBankStats:", error);
      return { totalQuestions: 0, byCategory: {}, recentQuestions: [] };
    }
  }

  async searchQuestions(
    _userId: string,
    searchTerm: string
  ): Promise<CustomQuestion[]> {
    try {
      const data = await questionsApi.list(undefined, searchTerm);
      return data.map(mapToCustomQuestion);
    } catch (error) {
      console.error("Error in searchQuestions:", error);
      return [];
    }
  }

  async getQuestionsForInterview(
    _userId: string,
    questionIds: string[]
  ): Promise<CustomQuestion[]> {
    try {
      const all = await questionsApi.list();
      return all
        .filter((q) => questionIds.includes(q.id))
        .map(mapToCustomQuestion);
    } catch (error) {
      console.error("Error in getQuestionsForInterview:", error);
      return [];
    }
  }

  async getQuestionsByInterviewType(
    _userId: string,
    interviewType: "behavioral" | "technical" | "leadership" | "custom"
  ): Promise<CustomQuestion[]> {
    const categoryMap: Record<string, string> = {
      behavioral: "Behavioral",
      technical: "Technical",
      leadership: "Leadership",
      custom: "Custom",
    };
    const category = categoryMap[interviewType] || "General";
    return this.getQuestionsByCategory("", category);
  }
}

export const userQuestionBankService = new UserQuestionBankService();
