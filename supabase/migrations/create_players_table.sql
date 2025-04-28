/*
  # Create players table

  This migration creates the `players` table to store player information,
  linking each player to a specific team and user.

  1. New Tables
     - `players`
       - `id` (uuid, primary key, default gen_random_uuid()): Unique identifier for the player.
       - `user_id` (uuid, foreign key to `auth.users`, not null): Links the player to the authenticated user who owns the team.
       - `team_id` (uuid, foreign key to `teams`, not null): Links the player to the specific team.
       - `first_name` (text, not null): Player's first name.
       - `last_name` (text, not null): Player's last name.
       - `number` (text, nullable): Player's jersey number.
       - `created_at` (timestamptz, default now()): Timestamp of creation.

  2. Security
     - Enable RLS on `players` table.
     - Add policy for users to select players belonging to their team.
     - Add policy for users to insert players into their own team.
     - Add policy for users to update players belonging to their team.
     - Add policy for users to delete players belonging to their team.

  3. Foreign Keys
     - Foreign key constraint from `players.user_id` to `auth.users.id`.
     - Foreign key constraint from `players.team_id` to `teams.id`.

  4. Indexes
     - Index on `team_id` for faster lookups of players within a team.
     - Index on `user_id` (potentially useful, though team_id might be primary lookup).
*/

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    first_name text NOT NULL CHECK (char_length(first_name) > 0),
    last_name text NOT NULL CHECK (char_length(last_name) > 0),
    number text NULL, -- Changed to text to allow non-numeric or leading zeros
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Add comments for clarity
COMMENT ON TABLE public.players IS 'Stores player information linked to a team and user.';
COMMENT ON COLUMN public.players.user_id IS 'Owner of the team this player belongs to.';
COMMENT ON COLUMN public.players.team_id IS 'The team this player belongs to.';
COMMENT ON COLUMN public.players.number IS 'Player jersey number (as text).';

-- 2. Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Users can select players belonging to their team
-- We check ownership via the teams table join
CREATE POLICY "Allow users to select players from their team"
  ON public.players
  FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE public.teams.id = public.players.team_id AND public.teams.user_id = auth.uid()
    )
  );

-- Users can insert players into their own team
CREATE POLICY "Allow users to insert players into their team"
  ON public.players
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE public.teams.id = public.players.team_id AND public.teams.user_id = auth.uid()
    )
 );

-- Users can update players belonging to their team
CREATE POLICY "Allow users to update players in their team"
  ON public.players
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE public.teams.id = public.players.team_id AND public.teams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE public.teams.id = public.players.team_id AND public.teams.user_id = auth.uid()
    )
  );

-- Users can delete players belonging to their team
CREATE POLICY "Allow users to delete players from their team"
  ON public.players
  FOR DELETE
  USING (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE public.teams.id = public.players.team_id AND public.teams.user_id = auth.uid()
    )
  );

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id); -- Optional but potentially useful