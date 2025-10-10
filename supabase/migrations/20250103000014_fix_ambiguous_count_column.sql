-- Fix ambiguous 'count' column reference in create_interview_summary function
CREATE OR REPLACE FUNCTION create_interview_summary(p_session_id UUID)
RETURNS UUID AS $$
DECLARE
  session_data RECORD;
  summary_id UUID;
  avg_score DECIMAL(5,2);
  median_score DECIMAL(5,2);
  total_questions INTEGER;
  questions_answered INTEGER;
  readiness_level VARCHAR(30);
  readiness_score INTEGER;
  performance_trend VARCHAR(20);
  score_dist JSONB;
  model_breakdown JSONB;
  total_cost INTEGER;
  total_tokens INTEGER;
  total_input_tokens INTEGER;
  total_output_tokens INTEGER;
  overall_strengths JSONB;
  overall_improvements JSONB;
  pattern_insights JSONB;
BEGIN
  -- Get session data
  SELECT * INTO session_data
  FROM interview_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;
  
  -- Calculate aggregate metrics
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN overall_score IS NOT NULL THEN 1 END) as answered,
    AVG(overall_score) as avg_s,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY overall_score) as median_s
  INTO total_questions, questions_answered, avg_score, median_score
  FROM interview_analysis 
  WHERE session_id = p_session_id;
  
  -- Calculate derived metrics
  readiness_level := calculate_readiness_level(avg_score);
  readiness_score := ROUND(avg_score);
  performance_trend := calculate_performance_trend(p_session_id);
  score_dist := calculate_score_distribution(p_session_id);
  model_breakdown := calculate_model_breakdown(p_session_id);
  total_cost := calculate_session_cost(p_session_id);
  
  -- Calculate token totals
  SELECT 
    COALESCE(SUM(tokens_used), 0),
    COALESCE(SUM(input_tokens), 0),
    COALESCE(SUM(output_tokens), 0)
  INTO total_tokens, total_input_tokens, total_output_tokens
  FROM interview_analysis 
  WHERE session_id = p_session_id;
  
  -- Aggregate strengths and improvements (top 5 most common)
  WITH strength_counts AS (
    SELECT 
      jsonb_array_elements_text(strengths) as strength,
      COUNT(*) as strength_count
    FROM interview_analysis 
    WHERE session_id = p_session_id 
      AND strengths IS NOT NULL
    GROUP BY jsonb_array_elements_text(strengths)
    ORDER BY strength_count DESC, strength
    LIMIT 5
  ),
  improvement_counts AS (
    SELECT 
      jsonb_array_elements_text(improvements) as improvement,
      COUNT(*) as improvement_count
    FROM interview_analysis 
    WHERE session_id = p_session_id 
      AND improvements IS NOT NULL
    GROUP BY jsonb_array_elements_text(improvements)
    ORDER BY improvement_count DESC, improvement
    LIMIT 5
  )
  SELECT 
    COALESCE(jsonb_agg(strength ORDER BY strength_count DESC, strength), '[]'::jsonb),
    COALESCE(jsonb_agg(improvement ORDER BY improvement_count DESC, improvement), '[]'::jsonb)
  INTO overall_strengths, overall_improvements
  FROM strength_counts, improvement_counts;
  
  -- Generate pattern insights based on analysis
  SELECT jsonb_build_array(
    CASE 
      WHEN performance_trend = 'improving' THEN 'Performance improved throughout the interview'
      WHEN performance_trend = 'declining' THEN 'Performance declined as interview progressed'
      ELSE 'Performance remained consistent throughout'
    END,
    CASE 
      WHEN readiness_level = 'ready' THEN 'Demonstrates strong interview readiness'
      WHEN readiness_level = 'needs_practice' THEN 'Shows good potential with room for improvement'
      ELSE 'Requires significant practice before interview readiness'
    END,
    CASE 
      WHEN avg_score >= 80 THEN 'Consistently high-quality responses'
      WHEN avg_score >= 60 THEN 'Good responses with specific improvement areas'
      ELSE 'Responses need substantial development'
    END
  ) INTO pattern_insights;
  
  -- Insert or update summary
  INSERT INTO interview_summary (
    session_id,
    user_id,
    total_questions,
    questions_answered,
    average_score,
    median_score,
    score_distribution,
    performance_trend,
    model_breakdown,
    total_tokens,
    total_input_tokens,
    total_output_tokens,
    total_cost_cents,
    overall_strengths,
    overall_improvements,
    pattern_insights,
    readiness_level,
    readiness_score,
    total_duration_seconds,
    created_at,
    updated_at
  ) VALUES (
    p_session_id,
    session_data.user_id,
    total_questions,
    questions_answered,
    avg_score,
    median_score,
    score_dist,
    performance_trend,
    model_breakdown,
    total_tokens,
    total_input_tokens,
    total_output_tokens,
    total_cost,
    overall_strengths,
    overall_improvements,
    pattern_insights,
    readiness_level,
    readiness_score,
    session_data.duration,
    NOW(),
    NOW()
  )
  ON CONFLICT (session_id) 
  DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    questions_answered = EXCLUDED.questions_answered,
    average_score = EXCLUDED.average_score,
    median_score = EXCLUDED.median_score,
    score_distribution = EXCLUDED.score_distribution,
    performance_trend = EXCLUDED.performance_trend,
    model_breakdown = EXCLUDED.model_breakdown,
    total_tokens = EXCLUDED.total_tokens,
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    total_cost_cents = EXCLUDED.total_cost_cents,
    overall_strengths = EXCLUDED.overall_strengths,
    overall_improvements = EXCLUDED.overall_improvements,
    pattern_insights = EXCLUDED.pattern_insights,
    readiness_level = EXCLUDED.readiness_level,
    readiness_score = EXCLUDED.readiness_score,
    total_duration_seconds = EXCLUDED.total_duration_seconds,
    updated_at = NOW()
  RETURNING id INTO summary_id;
  
  RETURN summary_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION create_interview_summary(UUID) IS 'Creates or updates interview summary by aggregating data from interview_analysis table - fixed ambiguous count column reference';
