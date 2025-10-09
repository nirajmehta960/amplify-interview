-- Add RLS policies for interview_questions table

-- Allow anyone to view interview questions (public read access)
CREATE POLICY "Anyone can view interview questions"
  ON public.interview_questions FOR SELECT
  USING (true);

-- Allow authenticated users to insert questions (for admin purposes)
CREATE POLICY "Authenticated users can insert questions"
  ON public.interview_questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update questions (for admin purposes)
CREATE POLICY "Authenticated users can update questions"
  ON public.interview_questions FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete questions (for admin purposes)
CREATE POLICY "Authenticated users can delete questions"
  ON public.interview_questions FOR DELETE
  USING (auth.role() = 'authenticated');


