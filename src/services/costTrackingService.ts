/**
 * Cost Tracking Service
 * Tracks AI model usage and costs for billing and optimization
 */

import { supabase } from "../integrations/supabase/client";
import { InterviewAnalysis } from "../types/aiAnalysis";

export interface CostSummary {
  totalCostCents: number;
  modelBreakdown: Record<string, number>;
  tokenUsage: {
    total: number;
    input: number;
    output: number;
  };
}

export interface UserCostSummary {
  totalCostCents: number;
  sessionCount: number;
  averageCostPerSession: number;
  monthlyBreakdown: Record<string, number>;
}

export interface ModelUsageStats {
  model: string;
  usageCount: number;
  totalCostCents: number;
  totalTokens: number;
  averageCostPerAnalysis: number;
}

class CostTrackingService {
  /**
   * Track AI model usage
   */
  public async trackUsage(
    modelUsed: string,
    inputTokens: number,
    outputTokens: number,
    costCents: number,
    processingTimeMs: number,
    sessionId: string,
    userId: string
  ): Promise<void> {
    try {
      // Usage is already tracked in interview_analysis table
    } catch (error) {
      console.error("Error tracking usage:", error);
      // Don't throw error - supplementary tracking only
    }
  }

  /**
   * Get cost summary for a session
   */
  public async getSessionCost(sessionId: string): Promise<CostSummary> {
    try {
      const { data: analyses, error } = await supabase
        .from("interview_analysis")
        .select(
          "model_used, tokens_used, input_tokens, output_tokens, cost_cents"
        )
        .eq("session_id", sessionId);

      if (error) {
        throw new Error(`Failed to get session cost: ${error.message}`);
      }

      const modelBreakdown: Record<string, number> = {};
      let totalCostCents = 0;
      let totalTokens = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      analyses?.forEach((analysis) => {
        const model = analysis.model_used || "unknown";
        modelBreakdown[model] =
          (modelBreakdown[model] || 0) + (analysis.cost_cents || 0);
        totalCostCents += analysis.cost_cents || 0;
        totalTokens += analysis.tokens_used || 0;
        totalInputTokens += analysis.input_tokens || 0;
        totalOutputTokens += analysis.output_tokens || 0;
      });

      return {
        totalCostCents,
        modelBreakdown,
        tokenUsage: {
          total: totalTokens,
          input: totalInputTokens,
          output: totalOutputTokens,
        },
      };
    } catch (error) {
      console.error("Error getting session cost:", error);
      throw error;
    }
  }

  /**
   * Get user's total AI costs
   */
  public async getUserCosts(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<UserCostSummary> {
    try {
      let query = supabase
        .from("interview_analysis")
        .select("cost_cents, created_at, session_id")
        .eq("user_id", userId);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data: analyses, error } = await query;

      if (error) {
        throw new Error(`Failed to get user costs: ${error.message}`);
      }

      const totalCostCents =
        analyses?.reduce(
          (sum, analysis) => sum + (analysis.cost_cents || 0),
          0
        ) || 0;
      const uniqueSessions = new Set(analyses?.map((a) => a.session_id) || []);
      const sessionCount = uniqueSessions.size;
      const averageCostPerSession =
        sessionCount > 0 ? totalCostCents / sessionCount : 0;

      // Calculate monthly breakdown
      const monthlyBreakdown: Record<string, number> = {};
      analyses?.forEach((analysis) => {
        if (analysis.created_at) {
          const month = analysis.created_at.substring(0, 7); // YYYY-MM
          monthlyBreakdown[month] =
            (monthlyBreakdown[month] || 0) + (analysis.cost_cents || 0);
        }
      });

      return {
        totalCostCents,
        sessionCount,
        averageCostPerSession: Math.round(averageCostPerSession),
        monthlyBreakdown,
      };
    } catch (error) {
      console.error("Error getting user costs:", error);
      throw error;
    }
  }

  /**
   * Get model usage statistics
   */
  public async getModelUsageStats(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ModelUsageStats[]> {
    try {
      let query = supabase
        .from("interview_analysis")
        .select("model_used, tokens_used, cost_cents")
        .not("model_used", "is", null);

      if (userId) {
        query = query.eq("user_id", userId);
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data: analyses, error } = await query;

      if (error) {
        throw new Error(`Failed to get model usage stats: ${error.message}`);
      }

      const modelStats: Record<
        string,
        {
          usageCount: number;
          totalCostCents: number;
          totalTokens: number;
        }
      > = {};

      analyses?.forEach((analysis) => {
        const model = analysis.model_used || "unknown";
        if (!modelStats[model]) {
          modelStats[model] = {
            usageCount: 0,
            totalCostCents: 0,
            totalTokens: 0,
          };
        }
        modelStats[model].usageCount++;
        modelStats[model].totalCostCents += analysis.cost_cents || 0;
        modelStats[model].totalTokens += analysis.tokens_used || 0;
      });

      return Object.entries(modelStats).map(([model, stats]) => ({
        model,
        usageCount: stats.usageCount,
        totalCostCents: stats.totalCostCents,
        totalTokens: stats.totalTokens,
        averageCostPerAnalysis:
          stats.usageCount > 0 ? stats.totalCostCents / stats.usageCount : 0,
      }));
    } catch (error) {
      console.error("Error getting model usage stats:", error);
      throw error;
    }
  }

  /**
   * Get cost trends over time
   */
  public async getCostTrends(
    userId: string,
    period: "day" | "week" | "month" = "month"
  ): Promise<Record<string, number>> {
    try {
      const { data: analyses, error } = await supabase
        .from("interview_analysis")
        .select("cost_cents, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to get cost trends: ${error.message}`);
      }

      const trends: Record<string, number> = {};

      analyses?.forEach((analysis) => {
        if (analysis.created_at) {
          let periodKey: string;
          const date = new Date(analysis.created_at);

          switch (period) {
            case "day":
              periodKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
              break;
            case "week":
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              periodKey = weekStart.toISOString().split("T")[0];
              break;
            case "month":
              periodKey = analysis.created_at.substring(0, 7); // YYYY-MM
              break;
            default:
              periodKey = analysis.created_at.substring(0, 7);
          }

          trends[periodKey] =
            (trends[periodKey] || 0) + (analysis.cost_cents || 0);
        }
      });

      return trends;
    } catch (error) {
      console.error("Error getting cost trends:", error);
      throw error;
    }
  }

  /**
   * Check if user has exceeded cost limit
   */
  public async checkCostLimit(
    userId: string,
    limitCents: number,
    period: "day" | "month" = "month"
  ): Promise<{
    exceeded: boolean;
    currentCostCents: number;
    remainingCents: number;
    period: string;
  }> {
    try {
      const startDate = this.getPeriodStartDate(period);
      const costs = await this.getUserCosts(userId, startDate);

      const currentCostCents = costs.totalCostCents;
      const exceeded = currentCostCents > limitCents;
      const remainingCents = Math.max(0, limitCents - currentCostCents);

      return {
        exceeded,
        currentCostCents,
        remainingCents,
        period,
      };
    } catch (error) {
      console.error("Error checking cost limit:", error);
      throw error;
    }
  }

  /**
   * Get period start date for cost calculations
   */
  private getPeriodStartDate(period: "day" | "month"): string {
    const now = new Date();

    switch (period) {
      case "day":
        return now.toISOString().split("T")[0];
      case "month":
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return firstDay.toISOString().split("T")[0];
      default:
        return now.toISOString().split("T")[0];
    }
  }

  /**
   * Format cost for display
   */
  public formatCost(costCents: number): string {
    const dollars = costCents / 100;
    if (dollars < 0.01) {
      return "<$0.01";
    }
    return `$${dollars.toFixed(2)}`;
  }

  /**
   * Get cost efficiency metrics
   */
  public async getCostEfficiencyMetrics(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    averageCostPerQuestion: number;
    averageCostPerSession: number;
    mostExpensiveModel: string;
    mostEfficientModel: string;
    totalQuestionsAnalyzed: number;
    totalSessions: number;
  }> {
    try {
      const costs = await this.getUserCosts(userId, startDate, startDate);
      const modelStats = await this.getModelUsageStats(
        userId,
        startDate,
        endDate
      );

      // Get total questions analyzed
      let query = supabase
        .from("interview_analysis")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { count: totalQuestions, error } = await query;

      if (error) {
        throw new Error(`Failed to get total questions: ${error.message}`);
      }

      const averageCostPerQuestion =
        (totalQuestions || 0) > 0
          ? costs.totalCostCents / (totalQuestions || 1)
          : 0;
      const averageCostPerSession = costs.averageCostPerSession;

      // Find most expensive and efficient models
      let mostExpensiveModel = "";
      let mostEfficientModel = "";
      let highestCostPerAnalysis = 0;
      let lowestCostPerAnalysis = Infinity;

      modelStats.forEach((stat) => {
        if (stat.averageCostPerAnalysis > highestCostPerAnalysis) {
          highestCostPerAnalysis = stat.averageCostPerAnalysis;
          mostExpensiveModel = stat.model;
        }
        if (stat.averageCostPerAnalysis < lowestCostPerAnalysis) {
          lowestCostPerAnalysis = stat.averageCostPerAnalysis;
          mostEfficientModel = stat.model;
        }
      });

      return {
        averageCostPerQuestion: Math.round(averageCostPerQuestion),
        averageCostPerSession: Math.round(averageCostPerSession),
        mostExpensiveModel,
        mostEfficientModel,
        totalQuestionsAnalyzed: totalQuestions || 0,
        totalSessions: costs.sessionCount,
      };
    } catch (error) {
      console.error("Error getting cost efficiency metrics:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const costTrackingService = new CostTrackingService();
