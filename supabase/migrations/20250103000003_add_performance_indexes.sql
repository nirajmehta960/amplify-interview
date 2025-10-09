-- ============================================================
-- Performance Indexes for Interview System
-- Add indexes for fast queries on interview_sessions and interview_responses
-- ============================================================

-- Indexes for interview_sessions table
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user 
  ON public.interview_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_type 
  ON public.interview_sessions (interview_type);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_completed 
  ON public.interview_sessions (completed_at) 
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_created 
  ON public.interview_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_completed 
  ON public.interview_sessions (user_id, completed_at DESC);

-- Indexes for interview_responses table
CREATE INDEX IF NOT EXISTS idx_interview_responses_session 
  ON public.interview_responses (session_id);

CREATE INDEX IF NOT EXISTS idx_interview_responses_question 
  ON public.interview_responses (question_id);

CREATE INDEX IF NOT EXISTS idx_interview_responses_session_question 
  ON public.interview_responses (session_id, question_id);

-- Indexes for interview_questions table (if not already exists)
CREATE INDEX IF NOT EXISTS idx_interview_questions_type 
  ON public.interview_questions (interview_type);

CREATE INDEX IF NOT EXISTS idx_interview_questions_domain 
  ON public.interview_questions (custom_domain) 
  WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_questions_active 
  ON public.interview_questions (is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_interview_questions_type_domain_active 
  ON public.interview_questions (interview_type, custom_domain, is_active);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_interview_questions_type_active 
  ON public.interview_questions (interview_type, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_interview_questions_custom_active 
  ON public.interview_questions (interview_type, custom_domain, is_active) 
  WHERE interview_type = 'custom' AND is_active = true;

-- Performance monitoring queries (optional)
-- These can help identify slow queries in production

-- Query to find sessions by user with responses count
-- SELECT s.*, COUNT(r.id) as response_count 
-- FROM interview_sessions s 
-- LEFT JOIN interview_responses r ON s.id = r.session_id 
-- WHERE s.user_id = $1 
-- GROUP BY s.id 
-- ORDER BY s.created_at DESC;

-- Query to find incomplete sessions
-- SELECT s.* FROM interview_sessions s 
-- WHERE s.completed_at IS NULL 
-- AND s.created_at > NOW() - INTERVAL '24 hours';

-- Query to find questions by type with randomization
-- SELECT * FROM interview_questions 
-- WHERE interview_type = $1 AND is_active = true 
-- ORDER BY RANDOM() 
-- LIMIT $2;
