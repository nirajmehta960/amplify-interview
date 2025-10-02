-- Create interview_questions table
CREATE TABLE public.interview_questions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  interview_type TEXT NOT NULL,
  thinking_time INTEGER DEFAULT 30, -- in seconds
  industry TEXT,
  focus_areas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on interview_questions
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- Interview questions policies (public read access)
CREATE POLICY "Anyone can view interview questions"
  ON public.interview_questions FOR SELECT
  USING (true);

-- Update interview_sessions table to include more details
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS interview_config JSONB,
ADD COLUMN IF NOT EXISTS questions_asked JSONB,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS ai_feedback JSONB,
ADD COLUMN IF NOT EXISTS overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create interview_responses table for individual question responses
CREATE TABLE public.interview_responses (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.interview_questions(id),
  response_text TEXT,
  response_audio_url TEXT,
  response_video_url TEXT,
  duration INTEGER, -- in seconds
  score INTEGER CHECK (score >= 0 AND score <= 100),
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on interview_responses
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;

-- Interview responses policies
CREATE POLICY "Users can view their own responses"
  ON public.interview_responses FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own responses"
  ON public.interview_responses FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ));

-- Insert sample questions
INSERT INTO public.interview_questions (question_text, category, difficulty, interview_type, thinking_time, industry, focus_areas) VALUES
-- Behavioral Questions
('Tell me about yourself and your background.', 'Introduction', 1, 'behavioral', 30, null, ARRAY['Communication']),
('Describe a challenging project you worked on and how you overcame obstacles.', 'Experience', 3, 'behavioral', 60, null, ARRAY['Problem Solving', 'Communication']),
('How do you handle working under pressure?', 'Behavioral', 2, 'behavioral', 45, null, ARRAY['Stress Management', 'Adaptability']),
('Tell me about a time when you had to work with a difficult team member.', 'Teamwork', 3, 'behavioral', 60, null, ARRAY['Teamwork', 'Conflict Resolution']),
('Describe a situation where you had to learn something new quickly.', 'Learning', 2, 'behavioral', 45, null, ARRAY['Learning', 'Adaptability']),

-- Technical Questions
('Explain a complex technical concept to a non-technical audience.', 'Communication', 3, 'technical', 60, 'Technology', ARRAY['Communication', 'Technical Skills']),
('How would you optimize a slow-running database query?', 'Technical', 4, 'technical', 90, 'Technology', ARRAY['Technical Skills', 'Problem Solving']),
('Describe your approach to debugging a production issue.', 'Technical', 4, 'technical', 75, 'Technology', ARRAY['Technical Skills', 'Problem Solving']),
('How do you stay updated with the latest technology trends?', 'Learning', 2, 'technical', 45, 'Technology', ARRAY['Learning', 'Technical Skills']),
('Explain the difference between SQL and NoSQL databases.', 'Technical', 3, 'technical', 60, 'Technology', ARRAY['Technical Skills']),

-- Leadership Questions
('How do you motivate a team that is struggling to meet deadlines?', 'Leadership', 4, 'leadership', 75, null, ARRAY['Leadership', 'Teamwork']),
('Describe a time when you had to make a difficult decision without all the information.', 'Decision Making', 4, 'leadership', 60, null, ARRAY['Leadership', 'Decision Making']),
('How do you handle conflict between team members?', 'Conflict Resolution', 3, 'leadership', 60, null, ARRAY['Leadership', 'Conflict Resolution']),
('Tell me about a time when you had to give difficult feedback to a team member.', 'Leadership', 3, 'leadership', 60, null, ARRAY['Leadership', 'Communication']),
('How do you prioritize tasks when everything seems urgent?', 'Time Management', 3, 'leadership', 45, null, ARRAY['Leadership', 'Time Management']),

-- Custom Questions
('What interests you most about this role and our company?', 'Interest', 2, 'custom', 45, null, ARRAY['Communication']),
('Where do you see yourself in 5 years?', 'Career Goals', 2, 'custom', 45, null, ARRAY['Communication', 'Planning']),
('What is your greatest strength and how does it apply to this role?', 'Self Assessment', 2, 'custom', 45, null, ARRAY['Self Assessment', 'Communication']),
('Describe a time when you failed and what you learned from it.', 'Learning', 3, 'custom', 60, null, ARRAY['Learning', 'Self Assessment']),
('What questions do you have for us?', 'Engagement', 1, 'custom', 30, null, ARRAY['Communication', 'Engagement']);

-- Create indexes for better performance
CREATE INDEX idx_interview_questions_type ON public.interview_questions(interview_type);
CREATE INDEX idx_interview_questions_category ON public.interview_questions(category);
CREATE INDEX idx_interview_questions_difficulty ON public.interview_questions(difficulty);
CREATE INDEX idx_interview_questions_industry ON public.interview_questions(industry);
CREATE INDEX idx_interview_responses_session ON public.interview_responses(session_id);
CREATE INDEX idx_interview_responses_question ON public.interview_responses(question_id);
