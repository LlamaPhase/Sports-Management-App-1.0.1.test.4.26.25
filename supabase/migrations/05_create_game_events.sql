/*
      # Create game_events table

      This migration creates the `game_events` table to log significant occurrences during a game, such as goals and substitutions.

      1. New Tables
         - `game_events`
           - `id` (uuid, PK): Unique identifier for the event.
           - `game_id` (uuid, FK to `games`, Not Null): Links the event to the specific game.
           - `type` (text, Check ('goal', 'substitution'), Not Null): The type of event.
           - `team` (text, Check ('home', 'away'), Not Null): The team associated with the event (e.g., scoring team, team making substitution).
           - `scorer_player_id` (uuid, FK to `players`, Nullable): Player who scored (for 'goal' type).
           - `assist_player_id` (uuid, FK to `players`, Nullable): Player who assisted (for 'goal' type).
           - `player_in_id` (uuid, FK to `players`, Nullable): Player coming in (for 'substitution' type).
           - `player_out_id` (uuid, FK to `players`, Nullable): Player going out (for 'substitution' type).
           - `event_timestamp` (timestampz, Default now()): System timestamp when the event was recorded.
           - `game_seconds` (integer, Not Null): The game time (in seconds) when the event occurred.
           - `created_at` (timestampz, Default now()): Timestamp of creation.
      2. Constraints
         - CHECK constraint on `type`.
         - CHECK constraint on `team`.
      3. Indexes
         - Index on `game_id` for faster lookups by game.
         - Index on `type` for filtering by event type.
      4. Security
         - RLS will be enabled in a later migration (`07_rls_policies.sql`).
    */

    CREATE TABLE IF NOT EXISTS public.game_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
      type text NOT NULL CHECK (type IN ('goal', 'substitution')),
      team text NOT NULL CHECK (team IN ('home', 'away')),
      scorer_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL NULL,
      assist_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL NULL,
      player_in_id uuid REFERENCES public.players(id) ON DELETE SET NULL NULL,
      player_out_id uuid REFERENCES public.players(id) ON DELETE SET NULL NULL,
      event_timestamp timestamptz DEFAULT now() NOT NULL,
      game_seconds integer NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON public.game_events(game_id);
    CREATE INDEX IF NOT EXISTS idx_game_events_type ON public.game_events(type);

    COMMENT ON TABLE public.game_events IS 'Logs significant events during a game (goals, substitutions).';
    COMMENT ON COLUMN public.game_events.game_id IS 'Link to the game the event belongs to.';
    COMMENT ON COLUMN public.game_events.type IS 'Type of game event.';
    COMMENT ON COLUMN public.game_events.team IS 'Team associated with the event.';
    COMMENT ON COLUMN public.game_events.scorer_player_id IS 'Player who scored the goal.';
    COMMENT ON COLUMN public.game_events.assist_player_id IS 'Player who assisted the goal.';
    COMMENT ON COLUMN public.game_events.player_in_id IS 'Player substituted in.';
    COMMENT ON COLUMN public.game_events.player_out_id IS 'Player substituted out.';
    COMMENT ON COLUMN public.game_events.event_timestamp IS 'System time the event was logged.';
    COMMENT ON COLUMN public.game_events.game_seconds IS 'Game time in seconds when the event occurred.';