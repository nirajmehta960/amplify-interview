-- Fix question_id type mismatch between interview_questions and interview_responses

-- First, drop the foreign key constraint
ALTER TABLE public.interview_responses 
DROP CONSTRAINT IF EXISTS interview_responses_question_id_fkey;

-- Change interview_responses.question_id from uuid to int8 to match interview_questions.question_id
ALTER TABLE public.interview_responses 
ALTER COLUMN question_id TYPE int8 USING question_id::text::int8;

-- Recreate the foreign key constraint with correct types
ALTER TABLE public.interview_responses 
ADD CONSTRAINT interview_responses_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES public.interview_questions(question_id) ON DELETE CASCADE;

-- Update the types in the application to match
-- interview_questions.question_id is int8 (BIGSERIAL)
-- interview_responses.question_id is now int8 (matching)


