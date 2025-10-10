-- Create interview_summary table for aggregate analysis per interview session
CREATE TABLE interview_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References (one summary per session)
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Aggregate Metrics
  total_questions INTEGER NOT NULL,
  questions_answered INTEGER NOT NULL,
  average_score DECIMAL(5,2),
  median_score DECIMAL(5,2),
  score_distribution JSONB, -- {excellent: 2, good: 3, fair: 1, needs_improvement: 0}
  performance_trend VARCHAR(20), -- 'improving', 'consistent', 'declining'
  
  -- Model Usage & Cost
  model_breakdown JSONB, -- {claude_haiku: 5, gpt35_turbo: 3}
  total_tokens INTEGER,
  total_input_tokens INTEGER,
  total_output_tokens INTEGER,
  total_cost_cents INTEGER,
  
  -- Overall Analysis
  overall_strengths JSONB, -- Top 5 strengths ["Clear communication", "Good examples"]
  overall_improvements JSONB, -- Top 5 improvements ["Add more metrics", "Reduce fillers"]
  pattern_insights JSONB, -- ["Consistently strong STAR structure", "Filler words increase under pressure"]
  
  -- Readiness Assessment
  readiness_level VARCHAR(30) NOT NULL, -- 'ready', 'needs_practice', 'significant_improvement'
  readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
  role_specific_feedback TEXT, -- Paragraph of role-specific insights
  
  -- Recommendations
  next_steps JSONB, -- ["Practice quantifying results", "Record yourself daily"]
  recommended_practice_areas JSONB, -- ["STAR method", "Reducing filler words", "Adding metrics"]
  estimated_practice_time VARCHAR(50), -- "2-3 weeks of focused practice"
  
  -- Timing Analysis
  total_duration_seconds INTEGER,
  average_time_per_question DECIMAL(5,1),
  time_distribution JSONB, -- Per question timing analysis
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_interview_summary_user ON interview_summary(user_id);
CREATE INDEX idx_interview_summary_session ON interview_summary(session_id);
CREATE INDEX idx_interview_summary_readiness ON interview_summary(readiness_level);
CREATE INDEX idx_interview_summary_created ON interview_summary(created_at);
CREATE INDEX idx_interview_summary_score ON interview_summary(readiness_score);

-- Add comments for documentation
COMMENT ON TABLE interview_summary IS 'Aggregate analysis and insights for entire interview sessions';
COMMENT ON COLUMN interview_summary.score_distribution IS 'JSONB counting responses in tiers: excellent(80-100), good(60-79), fair(40-59), needs_improvement(0-39)';
COMMENT ON COLUMN interview_summary.performance_trend IS 'Analysis of score progression: improving, consistent, declining';
COMMENT ON COLUMN interview_summary.model_breakdown IS 'JSONB with model usage counts: {claude_haiku: 5, gpt35_turbo: 3}';
COMMENT ON COLUMN interview_summary.overall_strengths IS 'JSON array of top 5 strengths identified across all questions';
COMMENT ON COLUMN interview_summary.overall_improvements IS 'JSON array of top 5 improvement areas across all questions';
COMMENT ON COLUMN interview_summary.pattern_insights IS 'JSON array of AI-detected patterns like "strong under pressure" or "struggles with technical depth"';
COMMENT ON COLUMN interview_summary.readiness_level IS 'Overall readiness: ready(80-100), needs_practice(60-79), significant_improvement(0-59)';
COMMENT ON COLUMN interview_summary.next_steps IS 'JSON array of specific actionable recommendations';
COMMENT ON COLUMN interview_summary.recommended_practice_areas IS 'JSON array of areas user should focus practice on';
COMMENT ON COLUMN interview_summary.estimated_practice_time IS 'Human-readable estimate like "2-3 weeks of focused practice"';
COMMENT ON COLUMN interview_summary.time_distribution IS 'JSONB with per-question timing analysis and patterns';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interview_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_interview_summary_updated_at
  BEFORE UPDATE ON interview_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_summary_updated_at();
