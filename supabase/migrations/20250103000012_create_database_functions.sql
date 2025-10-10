-- Database helper functions for interview analysis

-- Function to calculate readiness level based on average score
CREATE OR REPLACE FUNCTION calculate_readiness_level(avg_score DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
  IF avg_score >= 80 THEN
    RETURN 'ready';
  ELSIF avg_score >= 60 THEN
    RETURN 'needs_practice';
  ELSE
    RETURN 'significant_improvement';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's interview history with summary data
CREATE OR REPLACE FUNCTION get_user_interview_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  session_id UUID,
  interview_type TEXT,
  completed_at TIMESTAMPTZ,
  overall_score INTEGER,
  readiness_level VARCHAR,
  questions_answered INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.interview_type,
    s.completed_at,
    s.overall_score,
    sm.readiness_level,
    sm.questions_answered
  FROM interview_sessions s
  LEFT JOIN interview_summary sm ON s.id = sm.session_id
  WHERE s.user_id = p_user_id
    AND s.completed_at IS NOT NULL
  ORDER BY s.completed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate score distribution from individual question scores
CREATE OR REPLACE FUNCTION calculate_score_distribution(session_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  excellent_count INTEGER := 0;
  good_count INTEGER := 0;
  fair_count INTEGER := 0;
  needs_improvement_count INTEGER := 0;
  total_count INTEGER := 0;
  analysis_record RECORD;
  distribution JSONB;
BEGIN
  -- Count scores by tier from interview_analysis table
  FOR analysis_record IN 
    SELECT overall_score 
    FROM interview_analysis 
    WHERE session_id = session_uuid 
      AND overall_score IS NOT NULL
  LOOP
    total_count := total_count + 1;
    
    IF analysis_record.overall_score >= 80 THEN
      excellent_count := excellent_count + 1;
    ELSIF analysis_record.overall_score >= 60 THEN
      good_count := good_count + 1;
    ELSIF analysis_record.overall_score >= 40 THEN
      fair_count := fair_count + 1;
    ELSE
      needs_improvement_count := needs_improvement_count + 1;
    END IF;
  END LOOP;
  
  -- Build distribution JSON
  distribution := jsonb_build_object(
    'excellent', excellent_count,
    'good', good_count,
    'fair', fair_count,
    'needs_improvement', needs_improvement_count,
    'total', total_count
  );
  
  RETURN distribution;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate performance trend across questions in a session
CREATE OR REPLACE FUNCTION calculate_performance_trend(session_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
  first_half_avg DECIMAL := 0;
  second_half_avg DECIMAL := 0;
  total_questions INTEGER := 0;
  mid_point INTEGER;
  trend VARCHAR(20);
BEGIN
  -- Get total number of questions with scores
  SELECT COUNT(*) INTO total_questions
  FROM interview_analysis 
  WHERE session_id = session_uuid 
    AND overall_score IS NOT NULL;
  
  -- Need at least 4 questions to determine trend
  IF total_questions < 4 THEN
    RETURN 'insufficient_data';
  END IF;
  
  mid_point := total_questions / 2;
  
  -- Calculate average for first half
  SELECT AVG(overall_score) INTO first_half_avg
  FROM (
    SELECT overall_score
    FROM interview_analysis 
    WHERE session_id = session_uuid 
      AND overall_score IS NOT NULL
    ORDER BY created_at ASC
    LIMIT mid_point
  ) first_half;
  
  -- Calculate average for second half
  SELECT AVG(overall_score) INTO second_half_avg
  FROM (
    SELECT overall_score
    FROM interview_analysis 
    WHERE session_id = session_uuid 
      AND overall_score IS NOT NULL
    ORDER BY created_at ASC
    OFFSET mid_point
  ) second_half;
  
  -- Determine trend based on score difference
  IF second_half_avg - first_half_avg > 5 THEN
    trend := 'improving';
  ELSIF first_half_avg - second_half_avg > 5 THEN
    trend := 'declining';
  ELSE
    trend := 'consistent';
  END IF;
  
  RETURN trend;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate model usage statistics for a session
CREATE OR REPLACE FUNCTION calculate_model_breakdown(session_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  model_stats JSONB;
BEGIN
  -- Aggregate model usage counts
  SELECT jsonb_object_agg(model_used, model_count) INTO model_stats
  FROM (
    SELECT 
      model_used,
      COUNT(*) as model_count
    FROM interview_analysis 
    WHERE session_id = session_uuid
    GROUP BY model_used
  ) model_counts;
  
  -- Return empty object if no data
  RETURN COALESCE(model_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total cost for a session
CREATE OR REPLACE FUNCTION calculate_session_cost(session_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_cost INTEGER;
BEGIN
  SELECT COALESCE(SUM(cost_cents), 0) INTO total_cost
  FROM interview_analysis 
  WHERE session_id = session_uuid;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION calculate_readiness_level(DECIMAL) IS 'Calculates readiness level based on average score: ready(80+), needs_practice(60-79), significant_improvement(<60)';
COMMENT ON FUNCTION get_user_interview_history(UUID, INTEGER) IS 'Returns user interview history with summary data, ordered by completion date';
COMMENT ON FUNCTION calculate_score_distribution(UUID) IS 'Calculates score distribution tiers for a session from interview_analysis table';
COMMENT ON FUNCTION calculate_performance_trend(UUID) IS 'Determines if performance improved, declined, or stayed consistent across questions';
COMMENT ON FUNCTION calculate_model_breakdown(UUID) IS 'Aggregates model usage statistics for a session';
COMMENT ON FUNCTION calculate_session_cost(UUID) IS 'Calculates total cost in cents for all analysis in a session';
