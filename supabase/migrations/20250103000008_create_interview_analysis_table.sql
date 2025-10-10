-- Create interview_analysis table for detailed AI analysis per question
CREATE TABLE interview_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  interview_response_id UUID NOT NULL REFERENCES interview_responses(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES interview_questions(question_id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Context
  interview_type TEXT NOT NULL,
  custom_domain TEXT,
  model_used VARCHAR(100) NOT NULL,
  
  -- Scoring (all scores 0-100)
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- STAR scores (for behavioral/leadership only)
  star_scores JSONB, -- {situation: 8, task: 7, action: 9, result: 6}
  
  -- Technical scores (for technical/custom only)
  technical_scores JSONB, -- {understanding: 8, approach: 7, depth: 9, clarity: 8}
  
  -- Communication scores (all types)
  communication_scores JSONB, -- {clarity: 8, structure: 7, conciseness: 6}
  
  -- Content quality scores (all types)
  content_scores JSONB, -- {relevance: 9, depth: 7, specificity: 8}
  
  -- Qualitative Analysis
  strengths JSONB, -- ["Clear STAR structure", "Quantified results with metrics"]
  improvements JSONB, -- ["Add more specific context", "Reduce filler words"]
  actionable_feedback TEXT, -- Detailed paragraph of feedback
  improved_example TEXT, -- Rewritten response showing better approach
  
  -- Speaking Metrics
  filler_words JSONB, -- {words: ["um", "like", "uh"], counts: {um: 3, like: 2}, total: 5}
  speaking_pace VARCHAR(20), -- 'too_fast', 'appropriate', 'too_slow'
  confidence_score DECIMAL(3,1) CHECK (confidence_score >= 0 AND confidence_score <= 10),
  response_length_assessment VARCHAR(20), -- 'too_short', 'appropriate', 'too_long'
  
  -- Cost Tracking
  tokens_used INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  processing_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_interview_analysis_session ON interview_analysis(session_id);
CREATE INDEX idx_interview_analysis_response ON interview_analysis(interview_response_id);
CREATE INDEX idx_interview_analysis_user ON interview_analysis(user_id);
CREATE INDEX idx_interview_analysis_type ON interview_analysis(interview_type);
CREATE INDEX idx_interview_analysis_question ON interview_analysis(question_id);
CREATE INDEX idx_interview_analysis_created_at ON interview_analysis(created_at);

-- Add comments for documentation
COMMENT ON TABLE interview_analysis IS 'Detailed AI analysis results for each individual question response';
COMMENT ON COLUMN interview_analysis.star_scores IS 'STAR method scores: {situation, task, action, result} with values 0-10';
COMMENT ON COLUMN interview_analysis.technical_scores IS 'Technical assessment scores: {understanding, approach, depth, clarity} with values 0-10';
COMMENT ON COLUMN interview_analysis.communication_scores IS 'Communication quality scores: {clarity, structure, conciseness} with values 0-10';
COMMENT ON COLUMN interview_analysis.content_scores IS 'Content quality scores: {relevance, depth, specificity} with values 0-10';
COMMENT ON COLUMN interview_analysis.strengths IS 'JSON array of 2-3 specific strength statements';
COMMENT ON COLUMN interview_analysis.improvements IS 'JSON array of 2-3 specific improvement suggestions';
COMMENT ON COLUMN interview_analysis.filler_words IS 'JSON with detected words, counts per word, and total count';
COMMENT ON COLUMN interview_analysis.speaking_pace IS 'Assessment of speaking pace: too_fast, appropriate, too_slow';
COMMENT ON COLUMN interview_analysis.confidence_score IS 'Confidence level from 0.0 to 10.0';
COMMENT ON COLUMN interview_analysis.response_length_assessment IS 'Assessment of response length: too_short, appropriate, too_long';
COMMENT ON COLUMN interview_analysis.model_used IS 'AI model identifier used for analysis (e.g., gpt-4, claude-3)';
COMMENT ON COLUMN interview_analysis.tokens_used IS 'Total tokens consumed for this analysis';
COMMENT ON COLUMN interview_analysis.cost_cents IS 'Cost in cents for this analysis';
