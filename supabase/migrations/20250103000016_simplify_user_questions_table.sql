-- Simplify user_questions table to only have question_text and category
-- Remove difficulty and tags columns

-- First, drop the existing constraints and indexes
DROP INDEX IF EXISTS idx_user_questions_difficulty;
DROP INDEX IF EXISTS idx_user_questions_created_at;

-- Remove the difficulty constraint
ALTER TABLE user_questions DROP CONSTRAINT IF EXISTS user_questions_difficulty_check;

-- Drop the columns we don't need
ALTER TABLE user_questions DROP COLUMN IF EXISTS difficulty;
ALTER TABLE user_questions DROP COLUMN IF EXISTS tags;
ALTER TABLE user_questions DROP COLUMN IF EXISTS created_at;
ALTER TABLE user_questions DROP COLUMN IF EXISTS updated_at;

-- Update the category default to be more specific
ALTER TABLE user_questions ALTER COLUMN category SET DEFAULT 'Behavioral';

-- Add a new created_at column without the trigger
ALTER TABLE user_questions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a simple index for created_at
CREATE INDEX IF NOT EXISTS idx_user_questions_created_at ON user_questions(created_at);

-- Drop the trigger and function since we don't need updated_at anymore
DROP TRIGGER IF EXISTS update_user_questions_updated_at ON user_questions;
DROP FUNCTION IF EXISTS update_updated_at_column();
