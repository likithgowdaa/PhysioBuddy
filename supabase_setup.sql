-- ============================================================
-- PhysioBuddy: Sessions Table + RLS
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create the sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_type TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  reps INT DEFAULT 0,
  accuracy FLOAT DEFAULT 0,
  incorrect_reps INT DEFAULT 0,
  duration INT DEFAULT 0,
  calories INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 3. Policy: users can SELECT their own rows
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: users can INSERT their own rows
CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Policy: users can UPDATE their own rows
CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Policy: users can DELETE their own rows
CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);
