-- Enable RLS on interview_summary table
ALTER TABLE interview_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_summary table

-- Users can view their own interview summaries
CREATE POLICY "Users can view own interview summaries" ON interview_summary
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own interview summaries
CREATE POLICY "Users can insert own interview summaries" ON interview_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own interview summaries
CREATE POLICY "Users can update own interview summaries" ON interview_summary
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own interview summaries
CREATE POLICY "Users can delete own interview summaries" ON interview_summary
  FOR DELETE USING (auth.uid() = user_id);

-- Allow public read access for interview summaries (for anonymous users if needed)
CREATE POLICY "Public can view interview summaries" ON interview_summary
  FOR SELECT USING (true);
