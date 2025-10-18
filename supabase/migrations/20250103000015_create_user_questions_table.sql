-- Create user_questions table for storing custom questions
CREATE TABLE IF NOT EXISTS user_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_questions_user_id ON user_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_category ON user_questions(category);
CREATE INDEX IF NOT EXISTS idx_user_questions_difficulty ON user_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_user_questions_created_at ON user_questions(created_at);

-- Enable RLS
ALTER TABLE user_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own questions" ON user_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questions" ON user_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions" ON user_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions" ON user_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_questions_updated_at
  BEFORE UPDATE ON user_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
