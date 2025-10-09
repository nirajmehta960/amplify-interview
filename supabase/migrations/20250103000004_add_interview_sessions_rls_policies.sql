-- Add RLS policies for interview_sessions table

-- Users can view their own interview sessions
CREATE POLICY "Users can view their own interview sessions"
  ON public.interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own interview sessions
CREATE POLICY "Users can create their own interview sessions"
  ON public.interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own interview sessions
CREATE POLICY "Users can update their own interview sessions"
  ON public.interview_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interview sessions
CREATE POLICY "Users can delete their own interview sessions"
  ON public.interview_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for interview_responses table (if not already present)

-- Users can view their own interview responses
CREATE POLICY "Users can view their own responses"
  ON public.interview_responses FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ));

-- Users can create their own interview responses
CREATE POLICY "Users can create their own responses"
  ON public.interview_responses FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ));

-- Users can update their own interview responses
CREATE POLICY "Users can update their own responses"
  ON public.interview_responses FOR UPDATE
  USING (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ));

-- Users can delete their own interview responses
CREATE POLICY "Users can delete their own responses"
  ON public.interview_responses FOR DELETE
  USING (session_id IN (
    SELECT id FROM public.interview_sessions WHERE user_id = auth.uid()
  ));


