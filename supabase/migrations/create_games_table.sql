/*
  # Create games table and policies

  This migration creates the `games` table to store game information and sets up Row Level Security (RLS) policies.

  1.  **New Table**: `games`
      -   `id` (uuid, primary key): Unique identifier for the game.
      -   `team_id` (uuid, foreign key): References the `teams` table, linking the game to a team.
      -   `opponent` (text, not null): Name of the opposing team.
      -   `game_date` (date, not null): Date of the game.
      -   `game_time` (time): Time of the game (optional).
      -   `location` (text): Location of the game ('home' or 'away').
      -   `season` (text): Season identifier (e.g., "Fall 2024").
      -   `competition` (text): Competition identifier (e.g., "League Playoffs").
      -   `home_score` (integer, default 0): Score of the home team.
      -   `away_score` (integer, default 0): Score of the away team.
      -   `timer_status` (text, default 'stopped'): Current status of the game timer ('stopped', 'running').
      -   `timer_start_time` (timestamptz): Timestamp when the timer was last started.
      -   `timer_elapsed_seconds` (integer, default 0): Total elapsed seconds on the timer when stopped.
      -   `is_explicitly_finished` (boolean, default false): Whether the game has been manually marked as finished.
      -   `created_at` (timestamptz, default now()): Timestamp of creation.
      -   `updated_at` (timestamptz, default now()): Timestamp of last update.
      -   `lineup` (jsonb): Stores the state of the player lineup for the game.
      -   `events` (jsonb): Stores game events like goals and substitutions.

  2.  **Indexes**:
      -   Index on `team_id` for efficient querying of games per team.

  3.  **Foreign Keys**:
      -   Foreign key constraint on `team_id` referencing `teams(id)` with cascade delete.

  4.  **RLS**:
      -   Enable RLS on the `games` table.
      -   Policy: Allow users to perform all actions (SELECT, INSERT, UPDATE, DELETE) on games belonging to their team.

  5.  **Triggers**:
      -   Trigger to automatically update `updated_at` timestamp on modification.
*/

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    opponent text NOT NULL,
    game_date date NOT NULL,
    game_time time,
    location text CHECK (location IN ('home', 'away')),
    season text,
    competition text,
    home_score integer DEFAULT 0,
    away_score integer DEFAULT 0,
    timer_status text DEFAULT 'stopped' CHECK (timer_status IN ('stopped', 'running')),
    timer_start_time timestamptz,
    timer_elapsed_seconds integer DEFAULT 0,
    is_explicitly_finished boolean DEFAULT false,
    lineup jsonb, -- Store PlayerLineupState[]
    events jsonb, -- Store GameEvent[]
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add index for team_id
CREATE INDEX IF NOT EXISTS idx_games_team_id ON games(team_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_timestamp ON games; -- Drop existing trigger first if it exists
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow full access for team owners
DROP POLICY IF EXISTS "Allow full access for team owners" ON games;
CREATE POLICY "Allow full access for team owners"
    ON games
    FOR ALL
    TO authenticated
    USING (team_id = (SELECT id FROM teams WHERE user_id = auth.uid()))
    WITH CHECK (team_id = (SELECT id FROM teams WHERE user_id = auth.uid()));

-- Grant usage on the sequence if needed for default uuid generation (though gen_random_uuid() is preferred)
-- GRANT USAGE, SELECT ON SEQUENCE games_id_seq TO authenticated; -- Adjust if using serial instead of uuid

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON games TO authenticated;