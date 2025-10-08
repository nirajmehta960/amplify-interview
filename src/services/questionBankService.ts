// Re-export interfaces and database functions
// All questions are now fetched from the database
export type { Question, Field } from "./questionDatabaseService";

export {
  getQuestionsForInterview,
  getAvailableFields,
  fetchQuestionsByType,
  fetchQuestionsByCustomDomain,
  fetchCustomFieldQuestions,
  getQuestionCountByType,
  getQuestionCountByCustomDomain,
} from "./questionDatabaseService";
