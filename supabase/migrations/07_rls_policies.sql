/*
      # Enable RLS and Define Policies (v3 - Split Team Policy Syntax)

      This migration enables Row Level Security (RLS) on all application tables and defines policies to ensure users can only access data related to their own team.

      **Version 3 Changes:**
      - Fixed syntax error in `teams` policy for SELECT/UPDATE/DELETE by splitting it into three separate policies.
      - Kept the separate, less strict policy for INSERT (`WITH CHECK (true)`) to allow team creation immediately after sign-up.

      1. Helper Function
         - Creates `get_my_team_id()` function to easily retrieve the current user's team ID within policies.
      2. RLS Enablement
         - Enables RLS on `teams`, `players`, `games`, `game_lineups`, `game_events`, and `saved_lineups`.
      3. Policies
         - `teams`:
           - SELECT: Allows users access *only* to their own team record (based on `auth.uid()`).
           - UPDATE: Allows users to update *only* their own team record.
           - DELETE: Allows users to delete *only* their own team record.
           - INSERT: Allows any authenticated user to insert a team (relies on client setting `user_id` correctly and UNIQUE constraint).
         - `players`: Allows users full CRUD access *only* to players belonging to their team.
         - `games`: Allows users full CRUD access *only* to games belonging to their team.
         - `game_lineups`: Allows users full CRUD access *only* to lineup entries linked to games of their team.
         - `game_events`: Allows users full CRUD access *only* to events linked to games of their team.
         - `saved_lineups`: Allows users full CRUD access *only* to saved lineups belonging to their team.
      4. Security
         - Policies use `auth.uid()` and the helper function where applicable.
         - `USING` clauses restrict reads/updates/deletes.
         - `WITH CHECK` clauses restrict writes (inserts/updates).
    */

    -- 1. Helper function to get the team ID for the currently authenticated user
    -- Ensure function exists
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_team_id') THEN
        CREATE FUNCTION public.get_my_team_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $func$
          SELECT id FROM public.teams WHERE user_id = auth.uid() LIMIT 1;
        $func$;
      END IF;
    END $$;


    -- 2. Enable RLS on all tables (if not already enabled)
    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.game_lineups ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.saved_lineups ENABLE ROW LEVEL SECURITY;

    -- 3. Define Policies

    -- Policies for 'teams' table (Split for Insert Fix & Syntax Fix)
    DROP POLICY IF EXISTS "Allow user full access to their own team" ON public.teams; -- Drop old combined policy
    DROP POLICY IF EXISTS "Allow user read/update/delete own team" ON public.teams; -- Drop previous attempt
    DROP POLICY IF EXISTS "Allow user read own team" ON public.teams;
    DROP POLICY IF EXISTS "Allow user update own team" ON public.teams;
    DROP POLICY IF EXISTS "Allow user delete own team" ON public.teams;
    DROP POLICY IF EXISTS "Allow authenticated user to insert team" ON public.teams;

    -- Split policies for Read, Update, Delete
    CREATE POLICY "Allow user read own team"
      ON public.teams
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Allow user update own team"
      ON public.teams
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()) -- Important: USING applies to rows being updated
      WITH CHECK (user_id = auth.uid()); -- Check applies to the *new* data

    CREATE POLICY "Allow user delete own team"
      ON public.teams
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()); -- Check applies to rows being deleted

    -- Separate policy for Insert
    CREATE POLICY "Allow authenticated user to insert team"
      ON public.teams
      FOR INSERT
      TO authenticated
      WITH CHECK (true); -- Allows insert, relies on client setting user_id and UNIQUE constraint

    -- Policies for 'players' table
    DROP POLICY IF EXISTS "Allow user full access to their players" ON public.players;
    CREATE POLICY "Allow user full access to their players"
      ON public.players
      FOR ALL
      TO authenticated
      USING (team_id = get_my_team_id())
      WITH CHECK (team_id = get_my_team_id());

    -- Policies for 'games' table
    DROP POLICY IF EXISTS "Allow user full access to their games" ON public.games;
    CREATE POLICY "Allow user full access to their games"
      ON public.games
      FOR ALL
      TO authenticated
      USING (team_id = get_my_team_id())
      WITH CHECK (team_id = get_my_team_id());

    -- Policies for 'game_lineups' table
    DROP POLICY IF EXISTS "Allow user full access to their game lineups" ON public.game_lineups;
    CREATE POLICY "Allow user full access to their game lineups"
      ON public.game_lineups
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.games g
          WHERE g.id = game_lineups.game_id AND g.team_id = get_my_team_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.games g
          WHERE g.id = game_lineups.game_id AND g.team_id = get_my_team_id()
        )
      );

    -- Policies for 'game_events' table
    DROP POLICY IF EXISTS "Allow user full access to their game events" ON public.game_events;
    CREATE POLICY "Allow user full access to their game events"
      ON public.game_events
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.games g
          WHERE g.id = game_events.game_id AND g.team_id = get_my_team_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.games g
          WHERE g.id = game_events.game_id AND g.team_id = get_my_team_id()
        )
      );

    -- Policies for 'saved_lineups' table
    DROP POLICY IF EXISTS "Allow user full access to their saved lineups" ON public.saved_lineups;
    CREATE POLICY "Allow user full access to their saved lineups"
      ON public.saved_lineups
      FOR ALL
      TO authenticated
      USING (team_id = get_my_team_id())
      WITH CHECK (team_id = get_my_team_id());