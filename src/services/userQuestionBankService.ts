/**
 * User Question Bank Service
 * Manages user's custom questions stored in the database
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UserQuestion = Database["public"]["Tables"]["user_questions"]["Row"];
type UserQuestionInsert = Database["public"]["Tables"]["user_questions"]["Insert"];
type UserQuestionUpdate = Database["public"]["Tables"]["user_questions"]["Update"];

export interface CustomQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface QuestionBankStats {
  totalQuestions: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
  recentQuestions: CustomQuestion[];
}

class UserQuestionBankService {
  /**
   * Get all custom questions for a user
   */
  async getUserQuestions(userId: string): Promise<CustomQuestion[]> {
    try {
      const { data, error } = await supabase
        .from("user_questions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user questions:", error);
        return [];
      }

      return data.map(this.mapToCustomQuestion);
    } catch (error) {
      console.error("Error in getUserQuestions:", error);
      return [];
    }
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(
    userId: string,
    category: string
  ): Promise<CustomQuestion[]> {
    try {
      const { data, error } = await supabase
        .from("user_questions")
        .select("*")
        .eq("user_id", userId)
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching questions by category:", error);
        return [];
      }

      return data.map(this.mapToCustomQuestion);
    } catch (error) {
      console.error("Error in getQuestionsByCategory:", error);
      return [];
    }
  }

  /**
   * Add a new custom question
   */
  async addQuestion(
    userId: string,
    questionData: {
      text: string;
      category: string;
      difficulty: "easy" | "medium" | "hard";
      tags?: string[];
    }
  ): Promise<CustomQuestion | null> {
    try {
      const insertData: UserQuestionInsert = {
        user_id: userId,
        question_text: questionData.text,
        category: questionData.category,
        difficulty: questionData.difficulty,
        tags: questionData.tags || [],
      };

      const { data, error } = await supabase
        .from("user_questions")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error adding question:", error);
        return null;
      }

      return this.mapToCustomQuestion(data);
    } catch (error) {
      console.error("Error in addQuestion:", error);
      return null;
    }
  }

  /**
   * Update an existing question
   */
  async updateQuestion(
    questionId: string,
    updates: {
      text?: string;
      category?: string;
      difficulty?: "easy" | "medium" | "hard";
      tags?: string[];
    }
  ): Promise<CustomQuestion | null> {
    try {
      const updateData: UserQuestionUpdate = {
        question_text: updates.text,
        category: updates.category,
        difficulty: updates.difficulty,
        tags: updates.tags,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_questions")
        .update(updateData)
        .eq("id", questionId)
        .select()
        .single();

      if (error) {
        console.error("Error updating question:", error);
        return null;
      }

      return this.mapToCustomQuestion(data);
    } catch (error) {
      console.error("Error in updateQuestion:", error);
      return null;
    }
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_questions")
        .delete()
        .eq("id", questionId);

      if (error) {
        console.error("Error deleting question:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteQuestion:", error);
      return false;
    }
  }

  /**
   * Get question bank statistics
   */
  async getQuestionBankStats(userId: string): Promise<QuestionBankStats> {
    try {
      const questions = await this.getUserQuestions(userId);

      const byCategory: Record<string, number> = {};
      const byDifficulty: Record<string, number> = {};

      questions.forEach((question) => {
        byCategory[question.category] = (byCategory[question.category] || 0) + 1;
        byDifficulty[question.difficulty] =
          (byDifficulty[question.difficulty] || 0) + 1;
      });

      return {
        totalQuestions: questions.length,
        byCategory,
        byDifficulty,
        recentQuestions: questions.slice(0, 5),
      };
    } catch (error) {
      console.error("Error in getQuestionBankStats:", error);
      return {
        totalQuestions: 0,
        byCategory: {},
        byDifficulty: {},
        recentQuestions: [],
      };
    }
  }

  /**
   * Search questions by text
   */
  async searchQuestions(
    userId: string,
    searchTerm: string
  ): Promise<CustomQuestion[]> {
    try {
      const { data, error } = await supabase
        .from("user_questions")
        .select("*")
        .eq("user_id", userId)
        .ilike("question_text", `%${searchTerm}%`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error searching questions:", error);
        return [];
      }

      return data.map(this.mapToCustomQuestion);
    } catch (error) {
      console.error("Error in searchQuestions:", error);
      return [];
    }
  }

  /**
   * Get questions for interview (selected questions)
   */
  async getQuestionsForInterview(
    userId: string,
    questionIds: string[]
  ): Promise<CustomQuestion[]> {
    try {
      const { data, error } = await supabase
        .from("user_questions")
        .select("*")
        .eq("user_id", userId)
        .in("id", questionIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching questions for interview:", error);
        return [];
      }

      return data.map(this.mapToCustomQuestion);
    } catch (error) {
      console.error("Error in getQuestionsForInterview:", error);
      return [];
    }
  }

  /**
   * Map database row to CustomQuestion interface
   */
  private mapToCustomQuestion(row: UserQuestion): CustomQuestion {
    return {
      id: row.id,
      text: row.question_text,
      category: row.category,
      difficulty: row.difficulty as "easy" | "medium" | "hard",
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id,
    };
  }
}

export const userQuestionBankService = new UserQuestionBankService();
