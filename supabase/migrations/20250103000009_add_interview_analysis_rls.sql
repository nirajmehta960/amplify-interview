-- Enable RLS on interview_analysis table
ALTER TABLE interview_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_analysis table

-- Users can view their own analysis results
CREATE POLICY "Users can view own interview analysis" ON interview_analysis
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own analysis results
CREATE POLICY "Users can insert own interview analysis" ON interview_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own analysis results
CREATE POLICY "Users can update own interview analysis" ON interview_analysis
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own analysis results
CREATE POLICY "Users can delete own interview analysis" ON interview_analysis
  FOR DELETE USING (auth.uid() = user_id);

-- Allow public read access for interview analysis (for anonymous users if needed)
CREATE POLICY "Public can view interview analysis" ON interview_analysis
  FOR SELECT USING (true);
