import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { Session, User, PostgrestError } from '@supabase/supabase-js';

// --- Types ---

// PlayerData reflects the actual Supabase 'players' table schema provided
export interface PlayerData {
    id: string; // uuid from Supabase
    team_id: string; // from Supabase teams table
    first_name: string;
    last_name: string;
    number: string | null; // Jersey number (using this field based on previous code)
    created_at: string; // timestamp from Supabase
}

// Player type includes local state properties needed for UI (location, position)
export interface Player extends Omit<PlayerData, 'team_id'> {
  team_id: string;
  location: 'bench' | 'field';
  position?: { x: number; y: number };
}

// PlayerLineupState remains the same (stored in JSONB)
export interface PlayerLineupState {
  id: string; // Player ID
  location: 'bench' | 'field' | 'inactive';
  position?: { x: number; y: number };
  initialPosition?: { x: number; y: number };
  playtimeSeconds: number;
  playtimerStartTime: number | null;
  isStarter?: boolean;
  subbedOnCount: number;
  subbedOffCount: number;
}

export type PlayerLineupStructure = Pick<PlayerLineupState, 'id' | 'location' | 'position'>;

// GameEvent remains the same (stored in JSONB)
export interface GameEvent {
  id: string;
  type: 'goal' | 'substitution';
  team: 'home' | 'away';
  scorerPlayerId?: string | null;
  playerInId?: string;
  playerOutId?: string;
  assistPlayerId?: string | null;
  timestamp: number; // JS timestamp (milliseconds)
  gameSeconds: number; // Elapsed game seconds at time of event
}

// GameData reflects the Supabase 'games' table schema
export interface GameData {
    id: string; // uuid
    team_id: string; // uuid
    opponent: string; // text
    game_date: string; // date (YYYY-MM-DD)
    game_time: string | null; // time (HH:MM:SS) - nullable
    location: 'home' | 'away'; // text
    season: string | null; // text - nullable
    competition: string | null; // text - nullable
    home_score: number; // integer, default 0
    away_score: number; // integer, default 0
    timer_status: 'stopped' | 'running'; // text, default 'stopped'
    timer_start_time: string | null; // timestamptz - nullable (ISO string)
    timer_elapsed_seconds: number; // integer, default 0
    is_explicitly_finished: boolean; // boolean, default false
    lineup: PlayerLineupState[] | null; // jsonb - nullable
    events: GameEvent[] | null; // jsonb - nullable
    created_at: string; // timestamptz
    updated_at: string; // timestamptz
}

// Game type for local state (maps Supabase fields)
// Use game_date/game_time, convert timer_start_time to number if needed locally
export interface Game extends Omit<GameData, 'team_id' | 'timer_start_time'> {
  team_id: string; // Keep for reference
  timerStartTime: number | null; // Local state representation (JS timestamp)
}

// SavedLineup remains the same (uses localStorage)
export interface SavedLineup {
  name: string;
  players: Pick<PlayerLineupState, 'id' | 'location' | 'position'>[];
}

// GameHistory remains the same (uses localStorage)
export interface GameHistory {
  seasons: string[];
  competitions: string[];
}

// TeamData remains the same
export interface TeamData {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

// --- Context Props ---
interface TeamContextProps {
  teamData: TeamData | null;
  teamLoading: boolean;
  updateTeamNameInDb: (newName: string) => Promise<void>;
  updateTeamLogoInDb: (newLogoUrl: string | null) => Promise<void>;
  // Player State
  players: Player[];
  playersLoading: boolean;
  addPlayer: (firstName: string, lastName: string, number: string) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Pick<PlayerData, 'first_name' | 'last_name' | 'number'>>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  // Game State (Now from Supabase)
  games: Game[];
  gamesLoading: boolean; // New loading state for games
  addGame: (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => Promise<void>; // Async
  updateGame: (id: string, updates: Partial<Omit<GameData, 'id' | 'team_id' | 'created_at' | 'updated_at'>>) => Promise<void>; // Async, uses GameData fields
  deleteGame: (id: string) => Promise<void>; // Async
  // Game Actions (Update Supabase)
  startGameTimer: (gameId: string) => Promise<void>; // Async
  stopGameTimer: (gameId: string) => Promise<void>; // Async
  markGameAsFinished: (gameId: string) => Promise<void>; // Async
  resetGameLineup: (gameId: string) => Promise<PlayerLineupState[] | null>; // Async, returns new lineup or null
  movePlayerInGame: ( gameId: string, playerId: string, sourceLocation: PlayerLineupState['location'], targetLocation: PlayerLineupState['location'], newPosition?: { x: number; y: number } ) => Promise<void>; // Async
  addGameEvent: (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => Promise<void>; // Async
  removeLastGameEvent: (gameId: string, team: 'home' | 'away') => Promise<void>; // Async
  // Local Lineup Planning State (Unchanged)
  movePlayer: (playerId: string, targetLocation: 'bench' | 'field', position?: { x: number; y: number }) => void;
  swapPlayers: (player1Id: string, player2Id: string) => void;
  savedLineups: SavedLineup[];
  saveLineup: (name: string) => void;
  loadLineup: (name: string) => boolean;
  deleteLineup: (name: string) => void;
  resetLineup: () => void;
  // Navigation (Unchanged)
  setCurrentPage: (page: string) => void;
  selectGame: (gameId: string) => void;
  // Game History (Uses localStorage, derived from Supabase games)
  gameHistory: GameHistory;
  getMostRecentSeason: () => string | undefined;
  getMostRecentCompetition: () => string | undefined;
}

// --- Context ---
export const TeamContext = createContext<TeamContextProps>({
  teamData: null, teamLoading: true,
  updateTeamNameInDb: async () => { console.warn("Default updateTeamNameInDb context function called."); },
  updateTeamLogoInDb: async () => { console.warn("Default updateTeamLogoInDb context function called."); },
  players: [], playersLoading: true,
  addPlayer: async () => { console.warn("Default addPlayer context function called."); },
  updatePlayer: async () => { console.warn("Default updatePlayer context function called."); },
  deletePlayer: async () => { console.warn("Default deletePlayer context function called."); },
  games: [], gamesLoading: true, // Initialize gamesLoading
  addGame: async () => { console.warn("Default addGame context function called."); },
  updateGame: async () => { console.warn("Default updateGame context function called."); },
  deleteGame: async () => { console.warn("Default deleteGame context function called."); },
  startGameTimer: async () => { console.warn("Default startGameTimer context function called."); },
  stopGameTimer: async () => { console.warn("Default stopGameTimer context function called."); },
  markGameAsFinished: async () => { console.warn("Default markGameAsFinished context function called."); },
  resetGameLineup: async () => { console.warn("Default resetGameLineup context function called."); return null; },
  movePlayerInGame: async () => { console.warn("Default movePlayerInGame context function called."); },
  addGameEvent: async () => { console.warn("Default addGameEvent context function called."); },
  removeLastGameEvent: async () => { console.warn("Default removeLastGameEvent context function called."); },
  movePlayer: () => {}, swapPlayers: () => {},
  savedLineups: [], saveLineup: () => {}, loadLineup: () => false, deleteLineup: () => {}, resetLineup: () => {},
  setCurrentPage: () => { console.warn("Default setCurrentPage context function called."); },
  selectGame: () => { console.warn("Default selectGame context function called."); },
  gameHistory: { seasons: [], competitions: [] },
  getMostRecentSeason: () => undefined, getMostRecentCompetition: () => undefined,
});

// --- Provider ---
interface TeamProviderProps {
  children: ReactNode;
  setCurrentPage: (page: string) => void;
  selectGame: (gameId: string) => void;
}

// Helper to convert Supabase GameData to local Game state
const mapGameDataToGame = (gameData: GameData): Game => {
  return {
    ...gameData,
    // Convert ISO string timestamp to JS number timestamp (milliseconds) or null
    timerStartTime: gameData.timer_start_time ? new Date(gameData.timer_start_time).getTime() : null,
    // Ensure lineup and events are arrays, even if null/undefined from DB
    lineup: gameData.lineup ?? [],
    events: gameData.events ?? [],
    // Ensure scores are numbers
    home_score: gameData.home_score ?? 0,
    away_score: gameData.away_score ?? 0,
    // Ensure timer status is valid
    timer_status: gameData.timer_status === 'running' ? 'running' : 'stopped',
    timer_elapsed_seconds: gameData.timer_elapsed_seconds ?? 0,
    is_explicitly_finished: gameData.is_explicitly_finished ?? false,
  };
};

// Creates the default lineup structure for a *new* game
const createDefaultLineup = (players: Player[]): PlayerLineupState[] => {
    return players.map(p => ({
        id: p.id, // Use the player's Supabase ID
        location: 'bench', position: undefined, initialPosition: undefined,
        playtimeSeconds: 0, playtimerStartTime: null, isStarter: false, subbedOnCount: 0, subbedOffCount: 0,
    }));
};

// LocalStorage Helpers (Keep for savedLineups - REMOVE games, gameHistory derived now)
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return defaultValue;
    const parsedValue = JSON.parse(storedValue);
    // Add validation for savedLineups if needed
    return parsedValue ?? defaultValue;
  } catch (error) {
    console.error(`Error reading/parsing localStorage key “${key}”:`, error);
    try { localStorage.removeItem(key); console.warn(`Removed potentially corrupted localStorage key "${key}".`); }
    catch (removeError) { console.error(`Failed to remove corrupted key "${key}":`, removeError); }
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.error(`Error setting localStorage key “${key}”:`, error); }
};

// --- Provider Component ---
export const TeamProvider: React.FC<TeamProviderProps> = ({ children, setCurrentPage, selectGame }) => {
  // Team Data State
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamLoading, setTeamLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Player State (fetched from Supabase)
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState<boolean>(true);

  // Game State (fetched from Supabase)
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState<boolean>(true);

  // Local State (using localStorage)
  const [savedLineups, setSavedLineupsState] = useState<SavedLineup[]>(() => loadFromLocalStorage('savedLineups', []));

  // Derived State (from Supabase games)
  const [gameHistory, setGameHistory] = useState<GameHistory>({ seasons: [], competitions: [] });

  // --- Effects ---

  // Save savedLineups to localStorage
  useEffect(() => { saveToLocalStorage('savedLineups', savedLineups); }, [savedLineups]);

  // Derive Game History from fetched games
  useEffect(() => {
    const seasons = new Set<string>();
    const competitions = new Set<string>();
    games.forEach(game => {
      if (game.season) seasons.add(game.season);
      if (game.competition) competitions.add(game.competition);
    });
    // Sort most recent first (simple approach: reverse alphabetical for now)
    const sortedSeasons = Array.from(seasons).sort().reverse();
    const sortedCompetitions = Array.from(competitions).sort().reverse();
    setGameHistory({ seasons: sortedSeasons, competitions: sortedCompetitions });
  }, [games]);

  // Fetch Team, Players, and Games based on Auth State
  useEffect(() => {
    const fetchAllData = async (user: User | null) => {
      if (!user) {
        setTeamData(null); setTeamLoading(false);
        setPlayers([]); setPlayersLoading(false);
        setGames([]); setGamesLoading(false); // Reset games if no user
        return;
      }

      setTeamLoading(true);
      setPlayersLoading(true);
      setGamesLoading(true); // Start loading games
      let fetchedTeamData: TeamData | null = null;

      try {
        // 1. Fetch Team Data
        const { data: teamResult, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (teamError) {
          if (teamError.code === 'PGRST116') { console.warn('No team found for user.'); }
          else { throw teamError; }
        } else {
          fetchedTeamData = teamResult as TeamData;
          setTeamData(fetchedTeamData);
        }
      } catch (error: any) {
        console.error('Error fetching team data:', error.message);
        setTeamData(null);
      } finally {
        setTeamLoading(false);
      }

      // 2. Fetch Players and Games *if* team data was fetched successfully
      if (fetchedTeamData) {
        try {
          // Fetch Players
          const { data: playersResult, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('team_id', fetchedTeamData.id)
            .order('first_name', { ascending: true });
          if (playersError) throw playersError;
          const fetchedPlayers: Player[] = (playersResult as PlayerData[]).map(p => ({
            ...p, location: 'bench', position: undefined,
          }));
          setPlayers(fetchedPlayers);
        } catch (error: any) {
          console.error('Error fetching players:', error.message);
          setPlayers([]);
        } finally {
          setPlayersLoading(false);
        }

        try {
          // Fetch Games
          const { data: gamesResult, error: gamesError } = await supabase
            .from('games')
            .select('*')
            .eq('team_id', fetchedTeamData.id)
            .order('game_date', { ascending: false }) // Fetch newest first
            .order('game_time', { ascending: false, nulls: 'last' });
          if (gamesError) throw gamesError;
          const fetchedGames: Game[] = (gamesResult as GameData[]).map(mapGameDataToGame);
          setGames(fetchedGames);
        } catch (error: any) {
          console.error('Error fetching games:', error.message);
          setGames([]);
        } finally {
          setGamesLoading(false);
        }
      } else {
        // No team data, so no players or games to fetch
        setPlayers([]); setPlayersLoading(false);
        setGames([]); setGamesLoading(false);
      }
    };

    // Auth listener setup
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      fetchAllData(user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      fetchAllData(user);
    });
    return () => { subscription?.unsubscribe(); };
  }, []); // Run only once on mount

  // --- Team Update Functions (Unchanged) ---
  const updateTeamNameInDb = useCallback(async (newName: string) => { if (!teamData || !currentUser) { console.error("Cannot update team name: No team data or user logged in."); return; } try { const { error } = await supabase.from('teams').update({ name: newName }).eq('id', teamData.id).eq('user_id', currentUser.id); if (error) throw error; setTeamData(prev => prev ? { ...prev, name: newName } : null); } catch (error: any) { console.error('Error updating team name:', error.message); } }, [teamData, currentUser]);
  const updateTeamLogoInDb = useCallback(async (newLogoUrl: string | null) => { if (!teamData || !currentUser) { console.error("Cannot update team logo: No team data or user logged in."); return; } try { const { error } = await supabase.from('teams').update({ logo_url: newLogoUrl }).eq('id', teamData.id).eq('user_id', currentUser.id); if (error) throw error; setTeamData(prev => prev ? { ...prev, logo_url: newLogoUrl } : null); } catch (error: any) { console.error('Error updating team logo:', error.message); } }, [teamData, currentUser]);

  // --- Player CRUD Functions (Unchanged) ---
  const addPlayer = useCallback(async (firstName: string, lastName: string, number: string) => { if (!currentUser || !teamData) { console.error("Cannot add player: User not logged in or team data missing."); alert("Could not add player."); return; } setPlayersLoading(true); try { const { data, error } = await supabase.from('players').insert({ team_id: teamData.id, first_name: firstName, last_name: lastName, number: number || null, }).select().single(); if (error) throw error; const newPlayer: Player = { ...(data as PlayerData), location: 'bench', position: undefined, }; setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.first_name.localeCompare(b.first_name))); } catch (error: any) { console.error('Error adding player:', error.message); alert(`Error adding player: ${error.message}`); } finally { setPlayersLoading(false); } }, [currentUser, teamData]);
  const updatePlayer = useCallback(async (id: string, updates: Partial<Pick<PlayerData, 'first_name' | 'last_name' | 'number'>>) => { if (!teamData) { console.error("Cannot update player: Team data missing."); return; } const dbUpdates = { ...updates }; if (dbUpdates.number === '') { dbUpdates.number = null; } setPlayersLoading(true); try { const { error } = await supabase.from('players').update(dbUpdates).eq('id', id).eq('team_id', teamData.id); if (error) throw error; setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...dbUpdates } : p).sort((a, b) => a.first_name.localeCompare(b.first_name))); } catch (error: any) { console.error('Error updating player:', error.message); alert(`Error updating player: ${error.message}`); } finally { setPlayersLoading(false); } }, [teamData]);
  const deletePlayer = useCallback(async (id: string) => {
    if (!teamData) {
      console.error("Cannot delete player: Team data missing.");
      return;
    }
    setPlayersLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)
        .eq('team_id', teamData.id);

      if (error) {
        throw error;
      }
      setPlayers(prev => prev.filter(p => p.id !== id));
      // TODO: Cleanup games/lineups? Maybe not necessary with cascade delete?
    } catch (error: any) {
      console.error('Error deleting player:', error.message);
      alert(`Error deleting player: ${error.message}`);
    } finally {
      setPlayersLoading(false);
    }
  }, [teamData]);

  // --- Game CRUD Functions (Refactored for Supabase) ---
  const addGame = useCallback(async (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => {
    if (!teamData) { console.error("Cannot add game: Team data missing."); alert("Could not add game."); return; }
    setGamesLoading(true);
    const newGameData: Omit<GameData, 'id' | 'created_at' | 'updated_at'> = {
      team_id: teamData.id,
      opponent: opponent.trim(),
      game_date: date,
      game_time: time || null, // Store empty string as null
      location: location,
      season: season?.trim() || null,
      competition: competition?.trim() || null,
      home_score: 0,
      away_score: 0,
      timer_status: 'stopped',
      timer_start_time: null,
      timer_elapsed_seconds: 0,
      is_explicitly_finished: false,
      lineup: createDefaultLineup(players), // Create initial lineup based on current players
      events: [], // Ensure events is included here
    };
    try {
      const { data, error } = await supabase.from('games').insert(newGameData).select().single();
      if (error) throw error;
      const newGame = mapGameDataToGame(data as GameData);
      setGames(prev => [newGame, ...prev].sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime() || (b.game_time ?? '').localeCompare(a.game_time ?? '')));
    } catch (error: any) {
      console.error('Error adding game:', error.message);
      alert(`Error adding game: ${error.message}`);
      throw error; // Re-throw error so modal knows it failed
    } finally {
      setGamesLoading(false);
    }
  }, [teamData, players]); // Depend on players to create default lineup

  const updateGame = useCallback(async (id: string, updates: Partial<Omit<GameData, 'id' | 'team_id' | 'created_at' | 'updated_at'>>) => {
    if (!teamData) { console.error("Cannot update game: Team data missing."); return; }
    setGamesLoading(true);
    // Ensure empty strings for optional fields become null
    const dbUpdates = { ...updates };
    if (dbUpdates.season === '') dbUpdates.season = null;
    if (dbUpdates.competition === '') dbUpdates.competition = null;
    if (dbUpdates.game_time === '') dbUpdates.game_time = null;
    // Convert local number timestamp back to ISO string for DB
    if ('timerStartTime' in dbUpdates && typeof dbUpdates.timerStartTime === 'number') {
        dbUpdates.timer_start_time = new Date(dbUpdates.timerStartTime).toISOString();
        delete (dbUpdates as any).timerStartTime; // Remove the local state version
    } else if ('timerStartTime' in dbUpdates && dbUpdates.timerStartTime === null) {
        dbUpdates.timer_start_time = null;
        delete (dbUpdates as any).timerStartTime;
    }


    try {
      const { data, error } = await supabase.from('games').update(dbUpdates).eq('id', id).eq('team_id', teamData.id).select().single();
      if (error) throw error;
      const updatedGame = mapGameDataToGame(data as GameData);
      setGames(prev => prev.map(g => g.id === id ? updatedGame : g)
                         .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime() || (b.game_time ?? '').localeCompare(a.game_time ?? '')));
    } catch (error: any) {
      console.error('Error updating game:', error.message);
      alert(`Error updating game: ${error.message}`);
      throw error; // Re-throw error
    } finally {
      setGamesLoading(false);
    }
  }, [teamData]);

  const deleteGame = useCallback(async (id: string) => {
    if (!teamData) { console.error("Cannot delete game: Team data missing."); return; }
    setGamesLoading(true);
    try {
      const { error } = await supabase.from('games').delete().eq('id', id).eq('team_id', teamData.id);
      if (error) throw error;
      setGames(prev => prev.filter(g => g.id !== id));
    } catch (error: any) {
      console.error('Error deleting game:', error.message);
      alert(`Error deleting game: ${error.message}`);
      throw error; // Re-throw error
    } finally {
      setGamesLoading(false);
    }
  }, [teamData]);

  // --- Game Action Functions (Refactored for Supabase with try/catch) ---

  const startGameTimer = useCallback(async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.is_explicitly_finished || !teamData) return;
    const now = Date.now();
    const nowISO = new Date(now).toISOString();
    const isStartingFresh = (game.timer_elapsed_seconds ?? 0) === 0 && !game.timerStartTime;

    const newLineup = game.lineup?.map(p => {
      const isFieldPlayer = p.location === 'field';
      const initialPosition = isStartingFresh && isFieldPlayer ? p.position : p.initialPosition;
      const isStarter = isStartingFresh ? (p.location === 'field' || p.location === 'bench') : (p.isStarter ?? false);
      return { ...p, playtimerStartTime: isFieldPlayer ? now : p.playtimerStartTime, isStarter: isStarter, initialPosition: initialPosition };
    }) ?? null;

    const updates: Partial<GameData> = { timer_status: 'running', timer_start_time: nowISO, is_explicitly_finished: false, lineup: newLineup };

    try {
      await updateGame(gameId, updates);
    } catch (error) {
      console.error("Error starting game timer:", error);
      // Alert is handled in updateGame
    }
  }, [games, teamData, updateGame]);

  const stopGameTimer = useCallback(async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.timer_status !== 'running' || !game.timerStartTime || !teamData) return;
    const now = Date.now();
    const elapsed = (now - game.timerStartTime) / 1000;
    const newElapsedSeconds = Math.round((game.timer_elapsed_seconds || 0) + elapsed);

    const newLineup = game.lineup?.map(p => {
      if ((p.location === 'field' || p.location === 'inactive') && p.playtimerStartTime) {
        const playerElapsed = (now - p.playtimerStartTime) / 1000;
        const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0;
        const newPlaytime = Math.round(currentPlaytime + playerElapsed);
        return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null };
      }
      return p;
    }) ?? null;

    const updates: Partial<GameData> = { timer_status: 'stopped', timer_start_time: null, timer_elapsed_seconds: newElapsedSeconds, lineup: newLineup };

    try {
      await updateGame(gameId, updates);
    } catch (error) {
      console.error("Error stopping game timer:", error);
    }
  }, [games, teamData, updateGame]);

  const markGameAsFinished = useCallback(async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !teamData) return;
    const now = Date.now();
    let finalElapsedSeconds = game.timer_elapsed_seconds ?? 0;
    let finalLineup = game.lineup;

    if (game.timer_status === 'running' && game.timerStartTime) {
      const elapsed = (now - game.timerStartTime) / 1000;
      finalElapsedSeconds = Math.round((game.timer_elapsed_seconds || 0) + elapsed);
      finalLineup = game.lineup?.map(p => {
        if ((p.location === 'field' || p.location === 'inactive') && p.playtimerStartTime) {
          const playerElapsed = (now - p.playtimerStartTime) / 1000;
          const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0;
          const newPlaytime = Math.round(currentPlaytime + playerElapsed);
          return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null };
        }
        return p;
      }) ?? null;
    }

    finalLineup = finalLineup?.map(p => ({ ...p, playtimerStartTime: null })) ?? null;

    const updates: Partial<GameData> = { timer_status: 'stopped', timer_start_time: null, timer_elapsed_seconds: finalElapsedSeconds, is_explicitly_finished: true, lineup: finalLineup };

    try {
      await updateGame(gameId, updates);
    } catch (error) {
      console.error("Error marking game as finished:", error);
    }
  }, [games, teamData, updateGame]);

  const resetGameLineup = useCallback(async (gameId: string): Promise<PlayerLineupState[] | null> => {
    const game = games.find(g => g.id === gameId);
    if (!game || !teamData) return null;
    const defaultLineup = createDefaultLineup(players);
    const updates: Partial<GameData> = { lineup: defaultLineup, timer_elapsed_seconds: 0, timer_start_time: null, timer_status: 'stopped', is_explicitly_finished: false, home_score: 0, away_score: 0, events: [] };

    try {
      await updateGame(gameId, updates);
      return defaultLineup;
    } catch (error) {
      console.error("Error resetting game lineup:", error);
      return game.lineup; // Return original lineup on error
    }
  }, [games, players, teamData, updateGame]);

  const movePlayerInGame = useCallback(async ( gameId: string, playerId: string, sourceLocation: PlayerLineupState['location'], targetLocation: PlayerLineupState['location'], newPosition?: { x: number; y: number } ) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !game.lineup || !teamData) return;
    const now = Date.now();
    const isGameActive = game.timer_status === 'running' || (game.timer_status === 'stopped' && (game.timer_elapsed_seconds ?? 0) > 0);
    let newLineup = [...game.lineup];
    const playerIndex = newLineup.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const playerState = { ...newLineup[playerIndex] };
    let updatedPlaytime = playerState.playtimeSeconds;
    let updatedStartTime = playerState.playtimerStartTime;

    if ((sourceLocation === 'field' || sourceLocation === 'inactive') && playerState.playtimerStartTime) {
      const elapsed = (now - playerState.playtimerStartTime) / 1000;
      updatedPlaytime = Math.round(playerState.playtimeSeconds + elapsed);
      updatedStartTime = null;
    }

    if (targetLocation === 'field' && game.timer_status === 'running' && updatedStartTime === null) {
      updatedStartTime = now;
    } else if (targetLocation !== 'field') {
      updatedStartTime = null;
    }

    let updatedSubbedOnCount = playerState.subbedOnCount;
    let updatedSubbedOffCount = playerState.subbedOffCount;
    let substitutionEvent: GameEvent | null = null;
    if (isGameActive) {
      let currentSeconds = game.timer_elapsed_seconds ?? 0;
      if (game.timer_status === 'running' && game.timerStartTime) {
        currentSeconds += (Date.now() - game.timerStartTime) / 1000;
      }
      const eventSeconds = Math.round(currentSeconds);
      const eventTeam = (game.location === 'home') ? 'home' : 'away';
      if (sourceLocation === 'bench' && targetLocation === 'field') { updatedSubbedOnCount++; substitutionEvent = { id: uuidv4(), type: 'substitution', team: eventTeam, playerInId: playerId, playerOutId: undefined, timestamp: now, gameSeconds: eventSeconds }; }
      else if (sourceLocation === 'field' && targetLocation === 'bench') { updatedSubbedOffCount++; substitutionEvent = { id: uuidv4(), type: 'substitution', team: eventTeam, playerInId: undefined, playerOutId: playerId, timestamp: now, gameSeconds: eventSeconds }; }
    }

    playerState.location = targetLocation;
    playerState.position = targetLocation === 'field' ? newPosition : undefined;
    playerState.playtimeSeconds = updatedPlaytime;
    playerState.playtimerStartTime = updatedStartTime;
    playerState.subbedOnCount = updatedSubbedOnCount;
    playerState.subbedOffCount = updatedSubbedOffCount;
    newLineup[playerIndex] = playerState;

    const updatedEvents = substitutionEvent ? [...(game.events || []), substitutionEvent] : game.events;
    const updates: Partial<GameData> = { lineup: newLineup, events: updatedEvents };

    try {
      await updateGame(gameId, updates);
    } catch (error) {
      console.error("Error moving player in game:", error);
    }
  }, [games, teamData, updateGame]);

  const addGameEvent = useCallback(async (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !teamData) return;
    let currentSeconds = game.timer_elapsed_seconds ?? 0;
    if (game.timer_status === 'running' && game.timerStartTime) {
      currentSeconds += (Date.now() - game.timerStartTime) / 1000;
    }
    const newEvent: GameEvent = { id: uuidv4(), type: 'goal', team: team, scorerPlayerId: scorerPlayerId, assistPlayerId: assistPlayerId, timestamp: Date.now(), gameSeconds: Math.round(currentSeconds) };
    const updatedEvents = [...(game.events || []), newEvent];
    const newHomeScore = team === 'home' ? (game.home_score ?? 0) + 1 : (game.home_score ?? 0);
    const newAwayScore = team === 'away' ? (game.away_score ?? 0) + 1 : (game.away_score ?? 0);
    const updates: Partial<GameData> = { events: updatedEvents, home_score: newHomeScore, away_score: newAwayScore };

    try {
      await updateGame(gameId, updates);
    } catch (error) {
      console.error("Error adding game event:", error);
    }
  }, [games, teamData, updateGame]);

  const removeLastGameEvent = useCallback(async (gameId: string, team: 'home' | 'away') => {
    const game = games.find(g => g.id === gameId);
    if (!game || !game.events || !teamData) return;
    const events = [...game.events];
    let lastGoalEventIndex = -1;
    for (let i = events.length - 1; i >= 0; i--) { if (events[i].type === 'goal' && events[i].team === team) { lastGoalEventIndex = i; break; } }

    if (lastGoalEventIndex !== -1) {
      events.splice(lastGoalEventIndex, 1);
      const newHomeScore = team === 'home' ? Math.max(0, (game.home_score ?? 0) - 1) : (game.home_score ?? 0);
      const newAwayScore = team === 'away' ? Math.max(0, (game.away_score ?? 0) - 1) : (game.away_score ?? 0);
      const updates: Partial<GameData> = { events: events, home_score: newHomeScore, away_score: newAwayScore };
      try {
        await updateGame(gameId, updates);
      } catch (error) {
        console.error("Error removing last game event:", error);
      }
    } else {
      console.warn(`No goal event found for team ${team} in game ${gameId} to remove.`);
    }
  }, [games, teamData, updateGame]);


  // --- Local Player State Management (for lineup planning page - Unchanged) ---
  const movePlayer = useCallback((playerId: string, targetLocation: 'bench' | 'field', position?: { x: number; y: number }) => { setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, location: targetLocation, position: targetLocation === 'field' ? position : undefined } : p)); }, []);
  const swapPlayers = useCallback((player1Id: string, player2Id: string) => { setPlayers(prev => { const p1Index = prev.findIndex(p => p.id === player1Id); const p2Index = prev.findIndex(p => p.id === player2Id); if (p1Index === -1 || p2Index === -1) return prev; const p1 = prev[p1Index]; const p2 = prev[p2Index]; const newState = [...prev]; newState[p1Index] = { ...p1, location: p2.location, position: p2.position }; newState[p2Index] = { ...p2, location: p1.location, position: p1.position }; return newState; }); }, []);
  const resetLineup = useCallback(() => { setPlayers(prev => prev.map(p => ({ ...p, location: 'bench', position: undefined }))); }, []);
  const loadLineup = useCallback((name: string): boolean => { const lineupToLoad = savedLineups.find(l => l.name === name); if (!lineupToLoad) { console.error(`Lineup "${name}" not found.`); return false; } setPlayers(currentPlayers => { const savedPlayerStates = new Map(lineupToLoad.players.map(p => [p.id, { location: p.location, position: p.position }])); return currentPlayers.map(player => { const savedState = savedPlayerStates.get(player.id); return savedState ? { ...player, location: savedState.location, position: savedState.position } : { ...player, location: 'bench', position: undefined }; }); }); return true; }, [savedLineups]);
  const saveLineup = (name: string) => { if (!name.trim()) { alert("Please enter a name."); return; } const lineupToSave: SavedLineup = { name: name.trim(), players: players.map(({ id, location, position }) => ({ id, location, position })), }; setSavedLineupsState((prev) => { const filtered = prev.filter(l => l.name !== lineupToSave.name); return [...filtered, lineupToSave]; }); };
  const deleteLineup = (name: string) => { setSavedLineupsState((prev) => prev.filter(l => l.name !== name)); };

  // --- Game History Getters (Unchanged) ---
  const getMostRecentSeason = (): string | undefined => gameHistory.seasons[0];
  const getMostRecentCompetition = (): string | undefined => gameHistory.competitions[0];

  // --- Context Value ---
  const contextValue: TeamContextProps = {
    teamData, teamLoading, updateTeamNameInDb, updateTeamLogoInDb,
    players, playersLoading, addPlayer, updatePlayer, deletePlayer,
    games, gamesLoading, addGame, updateGame, deleteGame, // Provide game state/functions
    startGameTimer, stopGameTimer, markGameAsFinished,
    resetGameLineup, movePlayerInGame, addGameEvent, removeLastGameEvent,
    movePlayer, swapPlayers, // Local state updates
    savedLineups, saveLineup, loadLineup, deleteLineup, resetLineup, // Uses local player state
    setCurrentPage, selectGame,
    gameHistory, getMostRecentSeason, getMostRecentCompetition,
  };

  return <TeamContext.Provider value={contextValue}>{children}</TeamContext.Provider>;
};
