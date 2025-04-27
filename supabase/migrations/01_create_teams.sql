/*
      # Create teams table

      This migration creates the `teams` table to store basic information about each user's team.

      1. New Tables
         - `teams`
           - `id` (uuid, PK): Unique identifier for the team.
           - `user_id` (uuid, FK to `auth.users`, Unique, Not Null): Links the team to the authenticated Supabase user. Ensures one team per user.
           - `name` (text, Not Null): The name of the team. Defaults to 'Your Team'.
           - `logo_url` (text, Nullable): URL for the team's logo image.
           - `created_at` (timestampz, Default now()): Timestamp of when the team record was created.
      2. Security
         - RLS will be enabled in a later migration (`07_rls_policies.sql`).
    */

    CREATE TABLE IF NOT EXISTS public.teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      name text NOT NULL DEFAULT 'Your Team',
      logo_url text NULL,
      created_at timestamptz DEFAULT now() NOT NULL
    );

    COMMENT ON TABLE public.teams IS 'Stores team information linked to users.';
    COMMENT ON COLUMN public.teams.user_id IS 'Link to the authenticated user.';
    COMMENT ON COLUMN public.teams.name IS 'Name of the team.';
    COMMENT ON COLUMN public.teams.logo_url IS 'URL for the team logo.';