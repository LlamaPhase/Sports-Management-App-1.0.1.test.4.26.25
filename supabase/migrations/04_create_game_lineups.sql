/*
      # Create game_lineups table

      This migration creates the `game_lineups` table, which tracks the state of each player within a specific game (location, position, playtime, etc.).

      1. New Tables
         - `game_lineups`
           - `id` (uuid, PK): Unique identifier for the lineup entry.
           - `game_id` (uuid, FK to `games`, Not Null): Links to the specific game.
           - `player_id` (uuid, FK to `players`, Not Null): Links to the specific player.
           - `location` (text, Check ('field', 'bench', 'inactive'), Not Null): Current location of the player in the game.
           - `position` (jsonb, Nullable): Player's position on the field (e.g., `{ "x": 50, "y": 20 }`).
           - `initial_position` (jsonb, Nullable): Player's position at the start of the game (if on field).
           - `playtime_seconds` (integer, Default 0): Total accumulated playtime in seconds for the player in this game.
           - `playtimer_start_time` (timestampz, Nullable): System time when the player's timer was last started (if on field and game running).
           - `is_starter` (boolean, Default false): Indicates if the player was part of the starting lineup (field or bench).
           - `subbed_on_count` (integer, Default 0): Number of times the player was substituted onto the field.
           - `subbed_off_count` (integer, Default 0): Number of times the player was substituted off the field.
           - `created_at` (timestampz, Default now()): Timestamp of creation.
           - `updated_at` (timestampz, Default now()): Timestamp of last update.
      2. Constraints
         - UNIQUE constraint on (`game_id`, `player_id`) to ensure one entry per player per game.
         - CHECK constraint on `location`.
      3. Indexes
         - Index on `game_id`.
         - Index on `player_id`.
      4. Security
         - RLS will be enabled in a later migration (`07_rls_policies.sql`).
    */

    CREATE TABLE IF NOT EXISTS public.game_lineups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
      player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
      location text NOT NULL CHECK (location IN ('field', 'bench', 'inactive')),
      position jsonb NULL,
      initial_position jsonb NULL,
      playtime_seconds integer NOT NULL DEFAULT 0,
      playtimer_start_time timestamptz NULL,
      is_starter boolean NOT NULL DEFAULT false,
      subbed_on_count integer NOT NULL DEFAULT 0,
      subbed_off_count integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      UNIQUE (game_id, player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_game_lineups_game_id ON public.game_lineups(game_id);
    CREATE INDEX IF NOT EXISTS idx_game_lineups_player_id ON public.game_lineups(player_id);

    COMMENT ON TABLE public.game_lineups IS 'Tracks player status and stats within a specific game.';
    COMMENT ON COLUMN public.game_lineups.location IS 'Player location: field, bench, or inactive.';
    COMMENT ON COLUMN public.game_lineups.position IS 'Player position on field as {x, y} percentages.';
    COMMENT ON COLUMN public.game_lineups.initial_position IS 'Player starting position if they began on the field.';
    COMMENT ON COLUMN public.game_lineups.playtime_seconds IS 'Accumulated playtime in seconds.';
    COMMENT ON COLUMN public.game_lineups.playtimer_start_time IS 'System time player timer started.';
    COMMENT ON COLUMN public.game_lineups.is_starter IS 'Was the player in the starting lineup (field or bench)?';
    COMMENT ON COLUMN public.game_lineups.subbed_on_count IS 'Times substituted onto the field.';
    COMMENT ON COLUMN public.game_lineups.subbed_off_count IS 'Times substituted off the field.';