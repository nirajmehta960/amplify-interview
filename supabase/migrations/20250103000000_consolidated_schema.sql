-- ===========================================
-- AMPLIFY INTERVIEW - CONSOLIDATED SCHEMA
-- ===========================================
-- This migration creates the complete database schema for Amplify Interview
-- Based on the actual schema shown in Supabase Schema Visualizer

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROFILES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================================
-- INTERVIEW SESSIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  interview_config JSONB NOT NULL,
  questions_asked JSONB NOT NULL,
  session_score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on interview_sessions
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Interview sessions policies
CREATE POLICY "Users can view own sessions" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.interview_sessions FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- INTERVIEW QUESTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id SERIAL PRIMARY KEY,
  interview_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  custom_domain TEXT,
  category TEXT NOT NULL,
  focus_areas TEXT[],
  difficulty INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on interview_questions
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- Interview questions policies (public read access)
CREATE POLICY "Anyone can view interview questions" ON public.interview_questions FOR SELECT USING (true);

-- ===========================================
-- USER QUESTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_questions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Behavioral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_questions
ALTER TABLE public.user_questions ENABLE ROW LEVEL SECURITY;

-- User questions policies
CREATE POLICY "Users can view own questions" ON public.user_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own questions" ON public.user_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.user_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON public.user_questions FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- INTERVIEW RESPONSES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.interview_responses (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES public.interview_questions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on interview_responses
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;

-- Interview responses policies
CREATE POLICY "Users can view own responses" ON public.interview_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own responses" ON public.interview_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own responses" ON public.interview_responses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own responses" ON public.interview_responses FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- INTERVIEW ANALYSIS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.interview_analysis (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES public.interview_questions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL,
  custom_domain TEXT,
  overall_score INTEGER NOT NULL,
  communication_scores JSONB NOT NULL,
  content_scores JSONB NOT NULL,
  strengths JSONB NOT NULL,
  improvements JSONB NOT NULL,
  actionable_feedback TEXT NOT NULL,
  improved_example TEXT,
  filler_words JSONB NOT NULL,
  speaking_pace TEXT NOT NULL,
  confidence_score DECIMAL(3,1) NOT NULL,
  token_usage JSONB NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on interview_analysis
ALTER TABLE public.interview_analysis ENABLE ROW LEVEL SECURITY;

-- Interview analysis policies
CREATE POLICY "Users can view own analysis" ON public.interview_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analysis" ON public.interview_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analysis" ON public.interview_analysis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analysis" ON public.interview_analysis FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- INTERVIEW SUMMARY TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.interview_summary (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  questions_answered INTEGER NOT NULL,
  average_score DECIMAL(5,2) NOT NULL,
  median_score DECIMAL(5,2) NOT NULL,
  score_distribution JSONB NOT NULL,
  performance_trend TEXT NOT NULL,
  model_breakdown JSONB NOT NULL,
  total_tokens INTEGER NOT NULL,
  total_input_tokens INTEGER NOT NULL,
  total_output_tokens INTEGER NOT NULL,
  total_cost_cents INTEGER NOT NULL,
  overall_strengths JSONB NOT NULL,
  overall_improvements JSONB NOT NULL,
  readiness_level TEXT NOT NULL,
  readiness_score INTEGER NOT NULL,
  role_specific_feedback TEXT NOT NULL,
  next_steps JSONB NOT NULL,
  estimated_practice_time TEXT NOT NULL,
  total_duration_seconds INTEGER NOT NULL,
  average_time_per_question DECIMAL(5,1) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on interview_summary
ALTER TABLE public.interview_summary ENABLE ROW LEVEL SECURITY;

-- Interview summary policies
CREATE POLICY "Users can view own summaries" ON public.interview_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own summaries" ON public.interview_summary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON public.interview_summary FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summaries" ON public.interview_summary FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================
-- Interview sessions indexes
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_type ON public.interview_sessions(interview_type);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON public.interview_sessions(created_at);

-- Interview questions indexes
CREATE INDEX IF NOT EXISTS idx_interview_questions_type ON public.interview_questions(interview_type);
CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON public.interview_questions(category);
CREATE INDEX IF NOT EXISTS idx_interview_questions_domain ON public.interview_questions(custom_domain);
CREATE INDEX IF NOT EXISTS idx_interview_questions_active ON public.interview_questions(is_active);

-- User questions indexes
CREATE INDEX IF NOT EXISTS idx_user_questions_user_id ON public.user_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_category ON public.user_questions(category);
CREATE INDEX IF NOT EXISTS idx_user_questions_created_at ON public.user_questions(created_at);

-- Interview responses indexes
CREATE INDEX IF NOT EXISTS idx_interview_responses_session_id ON public.interview_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_question_id ON public.interview_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_user_id ON public.interview_responses(user_id);

-- Interview analysis indexes
CREATE INDEX IF NOT EXISTS idx_interview_analysis_session_id ON public.interview_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_analysis_question_id ON public.interview_analysis(question_id);
CREATE INDEX IF NOT EXISTS idx_interview_analysis_user_id ON public.interview_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_analysis_type ON public.interview_analysis(interview_type);

-- Interview summary indexes
CREATE INDEX IF NOT EXISTS idx_interview_summary_session_id ON public.interview_summary(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_summary_user_id ON public.interview_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_summary_readiness ON public.interview_summary(readiness_level);

-- ===========================================
-- SAMPLE DATA
-- ===========================================
-- Insert sample interview questions
INSERT INTO public.interview_questions (interview_type, question_text, category, difficulty, focus_areas) VALUES
-- Behavioral Questions
('behavioral', 'Tell me about yourself and your background.', 'Introduction', 1, ARRAY['Communication']),
('behavioral', 'Describe a challenging project you worked on and how you overcame obstacles.', 'Experience', 3, ARRAY['Problem Solving', 'Communication']),
('behavioral', 'How do you handle working under pressure?', 'Behavioral', 2, ARRAY['Stress Management', 'Adaptability']),
('behavioral', 'Tell me about a time when you had to work with a difficult team member.', 'Teamwork', 3, ARRAY['Teamwork', 'Conflict Resolution']),
('behavioral', 'Describe a situation where you had to learn something new quickly.', 'Learning', 2, ARRAY['Learning', 'Adaptability']),

-- Technical Questions
('technical', 'Explain a complex technical concept to a non-technical audience.', 'Communication', 3, ARRAY['Communication', 'Technical Skills']),
('technical', 'How would you optimize a slow-running database query?', 'Technical', 4, ARRAY['Technical Skills', 'Problem Solving']),
('technical', 'Describe your approach to debugging a production issue.', 'Technical', 4, ARRAY['Technical Skills', 'Problem Solving']),
('technical', 'How do you stay updated with the latest technology trends?', 'Learning', 2, ARRAY['Learning', 'Technical Skills']),
('technical', 'Explain the difference between SQL and NoSQL databases.', 'Technical', 3, ARRAY['Technical Skills']),

-- Leadership Questions
('leadership', 'How do you motivate a team that is struggling to meet deadlines?', 'Leadership', 4, ARRAY['Leadership', 'Teamwork']),
('leadership', 'Describe a time when you had to make a difficult decision without all the information.', 'Decision Making', 4, ARRAY['Leadership', 'Decision Making']),
('leadership', 'How do you handle conflict between team members?', 'Conflict Resolution', 3, ARRAY['Leadership', 'Conflict Resolution']),
('leadership', 'Tell me about a time when you had to give difficult feedback to a team member.', 'Leadership', 3, ARRAY['Leadership', 'Communication']),
('leadership', 'How do you prioritize tasks when everything seems urgent?', 'Time Management', 3, ARRAY['Leadership', 'Time Management']),

-- Custom Domain Questions - Product Manager
('custom', 'How would you prioritize features for a new product launch?', 'Product Strategy', 4, ARRAY['Product Management', 'Prioritization']),
('custom', 'Describe your approach to user research and how you use insights to drive product decisions.', 'User Research', 4, ARRAY['Product Management', 'User Research']),
('custom', 'How do you handle competing stakeholder requirements?', 'Stakeholder Management', 3, ARRAY['Product Management', 'Communication']),

-- Custom Domain Questions - Software Engineer
('custom', 'Walk me through your approach to code review and what you look for.', 'Code Quality', 3, ARRAY['Software Engineering', 'Code Review']),
('custom', 'How would you design a scalable microservices architecture?', 'System Design', 5, ARRAY['Software Engineering', 'Architecture']),
('custom', 'Describe your testing strategy for a critical production system.', 'Testing', 4, ARRAY['Software Engineering', 'Testing']),

-- Custom Domain Questions - AI Engineer
('custom', 'How would you approach building a machine learning pipeline for real-time recommendations?', 'ML Pipeline', 5, ARRAY['AI Engineering', 'Machine Learning']),
('custom', 'Explain the trade-offs between different ML algorithms for a classification problem.', 'Algorithm Selection', 4, ARRAY['AI Engineering', 'Machine Learning']),
('custom', 'How do you ensure model fairness and avoid bias in AI systems?', 'Ethics', 4, ARRAY['AI Engineering', 'Ethics']),

-- Custom Domain Questions - Data Scientist
('custom', 'Describe your process for exploratory data analysis on a new dataset.', 'Data Analysis', 3, ARRAY['Data Science', 'Analysis']),
('custom', 'How would you handle missing data in a time series dataset?', 'Data Cleaning', 4, ARRAY['Data Science', 'Data Processing']),
('custom', 'Explain how you would validate the results of a statistical model.', 'Model Validation', 4, ARRAY['Data Science', 'Statistics']),

-- Custom Domain Questions - UX Designer
('custom', 'Walk me through your user research process for a new mobile app.', 'User Research', 4, ARRAY['UX Design', 'User Research']),
('custom', 'How do you balance user needs with business requirements?', 'Design Strategy', 3, ARRAY['UX Design', 'Strategy']),
('custom', 'Describe your approach to creating accessible designs.', 'Accessibility', 3, ARRAY['UX Design', 'Accessibility']);

-- Update custom domain for custom questions
UPDATE public.interview_questions 
SET custom_domain = 'product_manager' 
WHERE interview_type = 'custom' AND category IN ('Product Strategy', 'User Research', 'Stakeholder Management');

UPDATE public.interview_questions 
SET custom_domain = 'software_engineer' 
WHERE interview_type = 'custom' AND category IN ('Code Quality', 'System Design', 'Testing');

UPDATE public.interview_questions 
SET custom_domain = 'ai_engineer' 
WHERE interview_type = 'custom' AND category IN ('ML Pipeline', 'Algorithm Selection', 'Ethics');

UPDATE public.interview_questions 
SET custom_domain = 'data_scientist' 
WHERE interview_type = 'custom' AND category IN ('Data Analysis', 'Data Cleaning', 'Model Validation');

UPDATE public.interview_questions 
SET custom_domain = 'ux_designer' 
WHERE interview_type = 'custom' AND category IN ('User Research', 'Design Strategy', 'Accessibility');

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================
COMMENT ON TABLE public.profiles IS 'User profile information linked to auth.users';
COMMENT ON TABLE public.interview_sessions IS 'Interview session metadata and configuration';
COMMENT ON TABLE public.interview_questions IS 'App-provided questions for different interview types and domains';
COMMENT ON TABLE public.user_questions IS 'User-created custom questions for practice';
COMMENT ON TABLE public.interview_responses IS 'Individual question responses during interview sessions';
COMMENT ON TABLE public.interview_analysis IS 'AI analysis results for each question response';
COMMENT ON TABLE public.interview_summary IS 'Aggregate analysis and insights for entire interview sessions';
