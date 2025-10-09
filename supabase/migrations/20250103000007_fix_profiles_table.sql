-- Fix profiles table issues

-- Create a trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert missing profile for current user if it doesn't exist
-- Replace 'baf2e66e-25c6-4483-977b-29a90b43be63' with the actual user ID from the error
INSERT INTO public.profiles (id, full_name, avatar_url)
VALUES ('baf2e66e-25c6-4483-977b-29a90b43be63', 'Test User', null)
ON CONFLICT (id) DO NOTHING;
