/*
  # Create teams table

  This migration creates the `teams` table to store basic information
  about each user's team, linking it to the authenticated user.

  1. New Tables
     - `teams`
       - `id` (uuid, primary key, default gen_random_uuid()): Unique identifier for the team.
       - `user_id` (uuid, foreign key to `auth.users`, unique, not null): Links the team to the authenticated user. Ensures one team per user.
       - `name` (text, not null, default 'My Team'): The name of the team.
       - `logo_url` (text, nullable): URL or Base64 string for the team logo.
       - `created_at` (timestamptz, default now()): Timestamp of creation.

  2. Security
     - Enable RLS on `teams` table.
     - Add policy for users to select their own team data.
     - Add policy for users to update their own team data.
     - Add policy for users to insert their own team data (used during sign up).

  3. Foreign Keys
     - Foreign key constraint from `teams.user_id` to `auth.users.id`.

  4. Indexes
     - Index on `user_id` for faster lookups.
*/

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Team',
  logo_url text NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add comments for clarity
COMMENT ON TABLE public.teams IS 'Stores team information linked to users.';
COMMENT ON COLUMN public.teams.user_id IS 'Links team to the authenticated user.';
COMMENT ON COLUMN public.teams.name IS 'Display name of the team.';
COMMENT ON COLUMN public.teams.logo_url IS 'URL or Base64 data URI for the team logo.';

-- 2. Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Users can select their own team
CREATE POLICY "Allow users to select their own team"
  ON public.teams
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own team
CREATE POLICY "Allow users to update their own team"
  ON public.teams
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own team (needed for sign-up flow)
CREATE POLICY "Allow users to insert their own team"
  ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Create Index
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON public.teams(user_id);