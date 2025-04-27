/*
      # Create games table

      This migration creates the `games` table to store details about each game played or scheduled by a team.

      1. New Tables
         - `games`
           - `id` (uuid, PK): Unique identifier for the game.
           - `team_id` (uuid, FK to `teams`, Not Null): Links the game to the team.
           - `opponent` (text, Not Null): Name of the opposing team.
           - `game_date` (date, Not Null): Date the game is scheduled for or played on.
           - `game_time` (time, Nullable): Time the game is scheduled for.
           - `location` (text, Check ('home', 'away'), Not Null): Indicates if the game is home or away.
           - `season` (text, Nullable): The season the game belongs to (e.g., 'Fall 2024').
           - `competition` (text, Nullable): The competition name (e.g., 'League Playoffs').
           - `home_score` (integer, Default 0): Score of the home team.
           - `away_score` (integer, Default 0): Score of the away team.
           - `timer_status` (text, Check ('stopped', 'running'), Default 'stopped'): Current status of the game timer.
           - `timer_start_time` (timestampz, Nullable): The system time when the timer was last started.
           - `timer_elapsed_seconds` (integer, Default 0): Total elapsed seconds recorded by the timer.
           - `is_explicitly_finished` (boolean, Default false): Flag indicating if the game has been manually marked as finished.
           - `created_at` (timestampz, Default now()): Timestamp of creation.
           - `updated_at` (timestampz, Default now()): Timestamp of last update.
      2. Indexes
         - Index on `team_id` for faster lookups by team.
         - Index on `game_date` for sorting/filtering by date.
      3. Constraints
         - CHECK constraint on `location`.
         - CHECK constraint on `timer_status`.
      4. Security
         - RLS will be enabled in a later migration (`07_rls_policies.sql`).
    */

    CREATE TABLE IF NOT EXISTS public.games (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
      opponent text NOT NULL DEFAULT 'Opponent',
      game_date date NOT NULL,
      game_time time NULL,
      location text NOT NULL CHECK (location IN ('home', 'away')),
      season text NULL,
      competition text NULL,
      home_score integer NOT NULL DEFAULT 0,
      away_score integer NOT NULL DEFAULT 0,
      timer_status text NOT NULL DEFAULT 'stopped' CHECK (timer_status IN ('stopped', 'running')),
      timer_start_time timestamptz NULL,
      timer_elapsed_seconds integer NOT NULL DEFAULT 0,
      is_explicitly_finished boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_games_team_id ON public.games(team_id);
    CREATE INDEX IF NOT EXISTS idx_games_game_date ON public.games(game_date);

    COMMENT ON TABLE public.games IS 'Stores details about scheduled or played games.';
    COMMENT ON COLUMN public.games.team_id IS 'Link to the team involved in the game.';
    COMMENT ON COLUMN public.games.game_date IS 'Date of the game.';
    COMMENT ON COLUMN public.games.game_time IS 'Time of the game.';
    COMMENT ON COLUMN public.games.location IS 'Indicates if it is a home or away game for the team.';
    COMMENT ON COLUMN public.games.timer_start_time IS 'System time when the timer was last started.';
    COMMENT ON COLUMN public.games.timer_elapsed_seconds IS 'Total accumulated seconds on the game timer.';
    COMMENT ON COLUMN public.games.is_explicitly_finished IS 'Whether the game has been manually marked as finished.';