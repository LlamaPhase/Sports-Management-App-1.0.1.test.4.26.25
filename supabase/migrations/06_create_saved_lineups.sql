/*
      # Create saved_lineups table

      This migration creates the `saved_lineups` table to store user-defined lineup configurations for quick loading.

      1. New Tables
         - `saved_lineups`
           - `id` (uuid, PK): Unique identifier for the saved lineup.
           - `team_id` (uuid, FK to `teams`, Not Null): Links the saved lineup to the team.
           - `name` (text, Not Null): User-defined name for the lineup.
           - `lineup_data` (jsonb, Not Null): Stores the actual lineup configuration (array of player IDs, locations, positions).
           - `created_at` (timestampz, Default now()): Timestamp of creation.
      2. Constraints
         - UNIQUE constraint on (`team_id`, `name`) to prevent duplicate names per team.
      3. Indexes
         - Index on `team_id`.
      4. Security
         - RLS will be enabled in a later migration (`07_rls_policies.sql`).
    */

    CREATE TABLE IF NOT EXISTS public.saved_lineups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
      name text NOT NULL,
      lineup_data jsonb NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      UNIQUE (team_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_saved_lineups_team_id ON public.saved_lineups(team_id);

    COMMENT ON TABLE public.saved_lineups IS 'Stores user-saved lineup configurations.';
    COMMENT ON COLUMN public.saved_lineups.team_id IS 'Link to the team the lineup belongs to.';
    COMMENT ON COLUMN public.saved_lineups.name IS 'User-defined name for the lineup.';
    COMMENT ON COLUMN public.saved_lineups.lineup_data IS 'JSONB storing the player lineup structure.';