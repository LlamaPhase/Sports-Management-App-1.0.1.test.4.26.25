/*
      # Create players table

      This migration creates the `players` table to store information about each player associated with a team.

      1. New Tables
         - `players`
           - `id` (uuid, PK): Unique identifier for the player.
           - `team_id` (uuid, FK to `teams`, Not Null): Links the player to their team.
           - `first_name` (text, Not Null): Player's first name. Defaults to empty string.
           - `last_name` (text, Not Null): Player's last name. Defaults to empty string.
           - `player_number` (text, Nullable): Player's jersey number.
           - `created_at` (timestampz, Default now()): Timestamp of creation.
           - `updated_at` (timestampz, Default now()): Timestamp of last update (trigger can be added later).
      2. Indexes
         - Index on `team_id` for faster lookups by team.
      3. Security
         - RLS will be enabled in a later migration (`07_rls_policies.sql`).
    */

    CREATE TABLE IF NOT EXISTS public.players (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
      first_name text NOT NULL DEFAULT '',
      last_name text NOT NULL DEFAULT '',
      player_number text NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);

    COMMENT ON TABLE public.players IS 'Stores player information for each team.';
    COMMENT ON COLUMN public.players.team_id IS 'Link to the team the player belongs to.';
    COMMENT ON COLUMN public.players.player_number IS 'Player jersey number.';