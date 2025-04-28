import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

// --- Types ---

// PlayerData reflects the actual Supabase 'players' table schema provided
export interface PlayerData {
    id: string; // uuid from Supabase
    team_id: string; // from Supabase teams table
    first_name: string;
    last_name: string;
    number: string | null; // Jersey number (using this field based on previous code)
    created_at: string; // timestamp from Supabase
    // Ignoring updated_at, location, position, player_number for now to fix the core issue
}

// Player type includes local state properties needed for UI (location, position)
// It omits user_id as it's not directly on the players table
export interface Player extends Omit<PlayerData, 'team_id'> { // Omit team_id as it's mainly for DB relation
  team_id: string; // Keep team_id for reference if needed locally
  // --- Local state properties (NOT in Supabase table, managed by UI) ---
  location: 'bench' | 'field'; // For lineup planning page
  position?: { x: number; y: number }; // For lineup planning page
}


export interface PlayerLineupState {
  id: string;
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

export interface GameEvent {
  id: string;
  type: 'goal' | 'substitution';
  team: 'home' | 'away';
  scorerPlayerId?: string | null;
  assistPlayerId?: string | null;
  playerInId?: string;
  playerOutId?: string;
  timestamp: number;
  gameSeconds: number;
}

export interface Game {
  id: string;
  opponent: string;
  date: string;
  time: string;
  location: 'home' | 'away';
  season?: string;
  competition?: string;
  homeScore?: number;
  awayScore?: number;
  timerStatus?: 'stopped' | 'running';
  timerStartTime?: number | null;
  timerElapsedSeconds?: number;
  isExplicitlyFinished?: boolean;
  lineup?: PlayerLineupState[] | null; // Still uses Player IDs
  events?: GameEvent[]; // Still uses Player IDs
}

export interface SavedLineup {
  name: string;
  players: Pick<PlayerLineupState, 'id' | 'location' | 'position'>[]; // Still uses Player IDs
}

export interface GameHistory {
  seasons: string[];
  competitions: string[];
}

export interface TeamData {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

interface TeamContextProps {
  teamData: TeamData | null;
  teamLoading: boolean;
  updateTeamNameInDb: (newName: string) => Promise<void>;
  updateTeamLogoInDb: (newLogoUrl: string | null) => Promise<void>;
  // --- Player State and Functions ---
  players: Player[]; // Holds players fetched from Supabase + local state
  playersLoading: boolean;
  addPlayer: (firstName: string, lastName: string, number: string) => Promise<void>; // Async
  updatePlayer: (id: string, updates: Partial<Pick<PlayerData, 'first_name' | 'last_name' | 'number'>>) => Promise<void>; // Async, uses PlayerData fields
  deletePlayer: (id: string) => Promise<void>; // Async
  // --- Existing Props (Game/Lineup related - still use localStorage/local state) ---
  games: Game[];
  addGame: (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => void;
  updateGame: (id: string, updates: Partial<Omit<Game, 'id' | 'homeScore' | 'awayScore' | 'timerStatus' | 'timerStartTime' | 'timerElapsedSeconds' | 'isExplicitlyFinished' | 'lineup' | 'events'>>) => void;
  deleteGame: (id: string) => void;
  startGameTimer: (gameId: string) => void;
  stopGameTimer: (gameId: string) => void;
  markGameAsFinished: (gameId: string) => void;
  resetGameLineup: (gameId: string) => PlayerLineupState[];
  movePlayerInGame: ( gameId: string, playerId: string, sourceLocation: PlayerLineupState['location'], targetLocation: PlayerLineupState['location'], newPosition?: { x: number; y: number } ) => void;
  startPlayerTimerInGame: (gameId: string, playerId: string) => void;
  stopPlayerTimerInGame: (gameId: string, playerId: string) => void;
  movePlayer: (playerId: string, targetLocation: 'bench' | 'field', position?: { x: number; y: number }) => void; // Updates local Player state only
  swapPlayers: (player1Id: string, player2Id: string) => void; // Updates local Player state only
  savedLineups: SavedLineup[];
  saveLineup: (name: string) => void;
  loadLineup: (name: string) => boolean;
  deleteLineup: (name: string) => void;
  resetLineup: () => void; // Updates local Player state only
  setCurrentPage: (page: string) => void;
  selectGame: (gameId: string) => void;
  gameHistory: GameHistory;
  getMostRecentSeason: () => string | undefined;
  getMostRecentCompetition: () => string | undefined;
  addGameEvent: (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => void;
  removeLastGameEvent: (gameId: string, team: 'home' | 'away') => void;
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
  games: [], addGame: () => {}, updateGame: () => {}, deleteGame: () => {},
  startGameTimer: () => {}, stopGameTimer: () => {}, markGameAsFinished: () => {},
  resetGameLineup: () => [], movePlayerInGame: () => {}, startPlayerTimerInGame: () => {}, stopPlayerTimerInGame: () => {},
  movePlayer: () => {}, swapPlayers: () => {},
  savedLineups: [], saveLineup: () => {}, loadLineup: () => false, deleteLineup: () => {}, resetLineup: () => {},
  setCurrentPage: () => { console.warn("Default setCurrentPage context function called."); },
  selectGame: () => { console.warn("Default selectGame context function called."); },
  gameHistory: { seasons: [], competitions: [] },
  getMostRecentSeason: () => undefined, getMostRecentCompetition: () => undefined,
  addGameEvent: () => { console.warn("Default addGameEvent context function called."); },
  removeLastGameEvent: () => { console.warn("Default removeLastGameEvent context function called."); },
});

// --- Provider ---
interface TeamProviderProps {
  children: ReactNode;
  setCurrentPage: (page: string) => void;
  selectGame: (gameId: string) => void;
}

const getCurrentDate = (): string => new Date().toISOString().split('T')[0];
const getCurrentTime = (): string => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Creates the *local* lineup state for a game, using player IDs from the fetched players
const createDefaultLineup = (players: Player[]): PlayerLineupState[] => {
    return players.map(p => ({
        id: p.id, // Use the player's Supabase ID
        location: 'bench', position: undefined, initialPosition: undefined,
        playtimeSeconds: 0, playtimerStartTime: null, isStarter: false, subbedOnCount: 0, subbedOffCount: 0,
    }));
};

// LocalStorage Helpers (Keep for games, lineups, history - REMOVE players)
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  // REMOVED: Player loading/validation
  try {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return defaultValue;
    const parsedValue = JSON.parse(storedValue);

    // Game Data Validation (Unchanged)
    if (key === 'games' && Array.isArray(parsedValue)) {
      return (parsedValue as any[]).map(g => {
        if (typeof g !== 'object' || g === null || !g.id) { console.warn(`Invalid game data (no id), skipping:`, g); return null; }
        const validLineup = Array.isArray(g.lineup) ? g.lineup.map((p: any) => {
          if (typeof p !== 'object' || p === null || !p.id) { console.warn(`Invalid player lineup data in game ${g.id}, skipping player:`, p); return null; }
          const location = ['field', 'bench', 'inactive'].includes(p.location) ? p.location : 'bench';
          return { id: p.id, location: location, position: p.position, initialPosition: p.initialPosition, playtimeSeconds: typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0, playtimerStartTime: typeof p.playtimerStartTime === 'number' ? p.playtimerStartTime : null, isStarter: typeof p.isStarter === 'boolean' ? p.isStarter : false, subbedOnCount: typeof p.subbedOnCount === 'number' ? p.subbedOnCount : 0, subbedOffCount: typeof p.subbedOffCount === 'number' ? p.subbedOffCount : 0, };
        }).filter(p => p !== null) : null;
        const validEvents = Array.isArray(g.events) ? g.events.map((ev: any) => { if (typeof ev !== 'object' || ev === null || !ev.id || !ev.type || !ev.team || typeof ev.timestamp !== 'number' || typeof ev.gameSeconds !== 'number') { console.warn(`Invalid game event data in game ${g.id}, skipping event:`, ev); return null; } const baseEvent = { id: ev.id, type: ev.type, team: ['home', 'away'].includes(ev.team) ? ev.team : 'home', timestamp: ev.timestamp, gameSeconds: ev.gameSeconds, }; if (ev.type === 'goal') { return { ...baseEvent, scorerPlayerId: typeof ev.scorerPlayerId === 'string' ? ev.scorerPlayerId : null, assistPlayerId: typeof ev.assistPlayerId === 'string' ? ev.assistPlayerId : undefined, }; } else if (ev.type === 'substitution') { return { ...baseEvent, playerInId: typeof ev.playerInId === 'string' ? ev.playerInId : undefined, playerOutId: typeof ev.playerOutId === 'string' ? ev.playerOutId : undefined, }; } else { console.warn(`Unknown event type "${ev.type}" in game ${g.id}, skipping event:`, ev); return null; } }).filter(ev => ev !== null) : [];
        return { id: g.id, opponent: typeof g.opponent === 'string' ? g.opponent : 'Unknown', date: typeof g.date === 'string' ? g.date : getCurrentDate(), time: typeof g.time === 'string' ? g.time : '', location: ['home', 'away'].includes(g.location) ? g.location : 'home', season: typeof g.season === 'string' ? g.season : '', competition: typeof g.competition === 'string' ? g.competition : '', homeScore: typeof g.homeScore === 'number' ? g.homeScore : 0, awayScore: typeof g.awayScore === 'number' ? g.awayScore : 0, timerStatus: ['stopped', 'running'].includes(g.timerStatus) ? g.timerStatus : 'stopped', timerStartTime: typeof g.timerStartTime === 'number' ? g.timerStartTime : null, timerElapsedSeconds: typeof g.timerElapsedSeconds === 'number' ? g.timerElapsedSeconds : 0, isExplicitlyFinished: typeof g.isExplicitlyFinished === 'boolean' ? g.isExplicitlyFinished : false, lineup: validLineup, events: validEvents, };
      }).filter(g => g !== null) as T;
    }

    // Game History Validation (Unchanged)
    if (key === 'gameHistory' && typeof parsedValue === 'object' && parsedValue !== null) { const seasons = Array.isArray(parsedValue.seasons) ? parsedValue.seasons.filter((s: any): s is string => typeof s === 'string' && s.trim() !== '') : []; const competitions = Array.isArray(parsedValue.competitions) ? parsedValue.competitions.filter((c: any): c is string => typeof c === 'string' && c.trim() !== '') : []; return { seasons, competitions } as T; }

    return parsedValue ?? defaultValue;
  } catch (error) {
    console.error(`Error reading/parsing localStorage key “${key}”:`, error);
    try { localStorage.removeItem(key); console.warn(`Removed potentially corrupted localStorage key "${key}".`); }
    catch (removeError) { console.error(`Failed to remove corrupted key "${key}":`, removeError); }
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  // REMOVED: Saving 'players'
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.error(`Error setting localStorage key “${key}”:`, error); }
};

export const TeamProvider: React.FC<TeamProviderProps> = ({ children, setCurrentPage, selectGame }) => {
  // Team Data State
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamLoading, setTeamLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Player State (fetched from Supabase)
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState<boolean>(true);

  // Existing State (using localStorage)
  const [games, setGamesState] = useState<Game[]>(() => loadFromLocalStorage('games', []));
  const [savedLineups, setSavedLineupsState] = useState<SavedLineup[]>(() => loadFromLocalStorage('savedLineups', []));
  const [gameHistory, setGameHistoryState] = useState<GameHistory>(() => loadFromLocalStorage('gameHistory', { seasons: [], competitions: [] }));

  // Existing Effects (using localStorage - REMOVE players)
  useEffect(() => { saveToLocalStorage('games', games); }, [games]);
  useEffect(() => { saveToLocalStorage('savedLineups', savedLineups); }, [savedLineups]);
  useEffect(() => { saveToLocalStorage('gameHistory', gameHistory); }, [gameHistory]);

  // --- Fetch Team Data and Players ---
  useEffect(() => {
    const fetchTeamAndPlayers = async (user: User | null) => {
      if (!user) {
        setTeamData(null); setTeamLoading(false);
        setPlayers([]); setPlayersLoading(false); // Reset players if no user
        return;
      }

      setTeamLoading(true);
      setPlayersLoading(true); // Start loading players too
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

      // 2. Fetch Players *if* team data was fetched successfully
      if (fetchedTeamData) {
        try {
          const { data: playersResult, error: playersError } = await supabase
            .from('players')
            .select('*') // Select all columns based on actual schema
            .eq('team_id', fetchedTeamData.id)
            .order('first_name', { ascending: true });

          if (playersError) throw playersError;

          // Map Supabase data to Player type (adding default local state)
          const fetchedPlayers: Player[] = (playersResult as PlayerData[]).map(p => ({
            ...p, // Spread all fields from PlayerData (id, team_id, first_name, last_name, number, created_at)
            location: 'bench', // Default local state
            position: undefined, // Default local state
          }));
          setPlayers(fetchedPlayers);

        } catch (error: any) {
          console.error('Error fetching players:', error.message);
          setPlayers([]); // Set empty array on error
        } finally {
          setPlayersLoading(false);
        }
      } else {
        // No team data, so no players to fetch
        setPlayers([]);
        setPlayersLoading(false);
      }
    };

    // Auth listener setup (unchanged, but triggers fetchTeamAndPlayers)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      fetchTeamAndPlayers(user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      fetchTeamAndPlayers(user);
    });
    return () => { subscription?.unsubscribe(); };
  }, []); // Run only once on mount

  // --- Team Update Functions (Unchanged) ---
  const updateTeamNameInDb = useCallback(async (newName: string) => { if (!teamData || !currentUser) { console.error("Cannot update team name: No team data or user logged in."); return; } try { const { error } = await supabase.from('teams').update({ name: newName }).eq('id', teamData.id).eq('user_id', currentUser.id); if (error) throw error; setTeamData(prev => prev ? { ...prev, name: newName } : null); } catch (error: any) { console.error('Error updating team name:', error.message); } }, [teamData, currentUser]);
  const updateTeamLogoInDb = useCallback(async (newLogoUrl: string | null) => { if (!teamData || !currentUser) { console.error("Cannot update team logo: No team data or user logged in."); return; } try { const { error } = await supabase.from('teams').update({ logo_url: newLogoUrl }).eq('id', teamData.id).eq('user_id', currentUser.id); if (error) throw error; setTeamData(prev => prev ? { ...prev, logo_url: newLogoUrl } : null); } catch (error: any) { console.error('Error updating team logo:', error.message); } }, [teamData, currentUser]);

  // --- Player CRUD Functions (Refactored for Supabase - REMOVED user_id) ---
  const addPlayer = useCallback(async (firstName: string, lastName: string, number: string) => {
    if (!currentUser || !teamData) { // Check for currentUser for safety, though teamData implies user exists
      console.error("Cannot add player: User not logged in or team data missing.");
      alert("Could not add player. Please ensure you are logged in and team data is available.");
      return;
    }
    setPlayersLoading(true);
    try {
      // REMOVED user_id from insert object
      const { data, error } = await supabase
        .from('players')
        .insert({
          team_id: teamData.id, // Link to the team
          first_name: firstName,
          last_name: lastName,
          number: number || null, // Store empty string as null
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new player (with local state defaults) to the existing players array
      const newPlayer: Player = {
        ...(data as PlayerData), // Spread fields from the returned PlayerData
        location: 'bench',
        position: undefined,
      };
      setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.first_name.localeCompare(b.first_name)));

    } catch (error: any) {
      console.error('Error adding player:', error.message);
      alert(`Error adding player: ${error.message}`);
    } finally {
      setPlayersLoading(false);
    }
  }, [currentUser, teamData]); // Depend on currentUser and teamData

  const updatePlayer = useCallback(async (id: string, updates: Partial<Pick<PlayerData, 'first_name' | 'last_name' | 'number'>>) => {
    if (!teamData) { // No need to check currentUser explicitly if teamData exists
      console.error("Cannot update player: Team data missing.");
      return;
    }
    const dbUpdates = { ...updates };
    if (dbUpdates.number === '') {
        dbUpdates.number = null;
    }

    setPlayersLoading(true);
    try {
      // Update based on player id and team_id (RLS implicitly checks user ownership via team)
      const { error } = await supabase
        .from('players')
        .update(dbUpdates)
        .eq('id', id)
        .eq('team_id', teamData.id); // Ensure update is within the correct team

      if (error) throw error;

      // Update local state optimistically
      setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...dbUpdates } : p)
                           .sort((a, b) => a.first_name.localeCompare(b.first_name)));

    } catch (error: any) {
      console.error('Error updating player:', error.message);
      alert(`Error updating player: ${error.message}`);
    } finally {
      setPlayersLoading(false);
    }
  }, [teamData]); // Depend on teamData

  const deletePlayer = useCallback(async (id: string) => {
    if (!teamData) { // No need to check currentUser explicitly if teamData exists
      console.error("Cannot delete player: Team data missing.");
      return;
    }
    setPlayersLoading(true);
    try {
      // Delete based on player id and team_id (RLS implicitly checks user ownership via team)
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)
        .eq('team_id', teamData.id); // Ensure delete is within the correct team

      if (error) throw error;

      // Update local state optimistically
      setPlayers(prev => prev.filter(p => p.id !== id));

      // TODO: Consider cleanup in localStorage games/lineups if needed

    } catch (error: any) {
      console.error('Error deleting player:', error.message);
      alert(`Error deleting player: ${error.message}`);
    } finally {
      setPlayersLoading(false);
    }
  }, [teamData]); // Depend on teamData

  // --- Local Player State Management (for lineup planning page - Unchanged) ---
  const movePlayer = useCallback((playerId: string, targetLocation: 'bench' | 'field', position?: { x: number; y: number }) => { setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, location: targetLocation, position: targetLocation === 'field' ? position : undefined } : p)); }, []);
  const swapPlayers = useCallback((player1Id: string, player2Id: string) => { setPlayers(prev => { const p1Index = prev.findIndex(p => p.id === player1Id); const p2Index = prev.findIndex(p => p.id === player2Id); if (p1Index === -1 || p2Index === -1) return prev; const p1 = prev[p1Index]; const p2 = prev[p2Index]; const newState = [...prev]; newState[p1Index] = { ...p1, location: p2.location, position: p2.position }; newState[p2Index] = { ...p2, location: p1.location, position: p1.position }; return newState; }); }, []);
  const resetLineup = useCallback(() => { setPlayers(prev => prev.map(p => ({ ...p, location: 'bench', position: undefined }))); }, []);
  const loadLineup = useCallback((name: string): boolean => { const lineupToLoad = savedLineups.find(l => l.name === name); if (!lineupToLoad) { console.error(`Lineup "${name}" not found.`); return false; } setPlayers(currentPlayers => { const savedPlayerStates = new Map(lineupToLoad.players.map(p => [p.id, { location: p.location, position: p.position }])); return currentPlayers.map(player => { const savedState = savedPlayerStates.get(player.id); return savedState ? { ...player, location: savedState.location, position: savedState.position } : { ...player, location: 'bench', position: undefined }; }); }); return true; }, [savedLineups]);

  // --- Game/History Functions (Unchanged - still use localStorage) ---
  const addGame = (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => { const currentPlayersFromState = players; const newGame: Game = { id: uuidv4(), opponent, date, time, location, season: season?.trim() || '', competition: competition?.trim() || '', homeScore: 0, awayScore: 0, timerStatus: 'stopped', timerStartTime: null, timerElapsedSeconds: 0, isExplicitlyFinished: false, lineup: createDefaultLineup(currentPlayersFromState), events: [], }; setGamesState((prev) => [...prev, newGame].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())); updateHistory(season, competition); };
  const updateGame = (id: string, updates: Partial<Omit<Game, 'id' | 'homeScore' | 'awayScore' | 'timerStatus' | 'timerStartTime' | 'timerElapsedSeconds' | 'isExplicitlyFinished' | 'lineup' | 'events'>>) => { let seasonToUpdateHistory: string | undefined = undefined; let competitionToUpdateHistory: string | undefined = undefined; setGamesState((prev) => prev.map((g) => { if (g.id === id) { const finalUpdates = { ...updates }; if (typeof updates.season === 'string') { finalUpdates.season = updates.season.trim(); seasonToUpdateHistory = finalUpdates.season; } else { seasonToUpdateHistory = g.season; } if (typeof updates.competition === 'string') { finalUpdates.competition = updates.competition.trim(); competitionToUpdateHistory = finalUpdates.competition; } else { competitionToUpdateHistory = g.competition; } return { ...g, ...finalUpdates }; } return g; }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())); if (seasonToUpdateHistory !== undefined || competitionToUpdateHistory !== undefined) { updateHistory(seasonToUpdateHistory, competitionToUpdateHistory); } };
  const deleteGame = (id: string) => { setGamesState((prev) => prev.filter(g => g.id !== id)); };
  const addGameEvent = (gameId: string, team: 'home' | 'away', scorerPlayerId: string | null, assistPlayerId?: string | null) => { setGamesState(prevGames => { const gameIndex = prevGames.findIndex(g => g.id === gameId); if (gameIndex === -1) return prevGames; const game = prevGames[gameIndex]; let currentSeconds = game.timerElapsedSeconds ?? 0; if (game.timerStatus === 'running' && game.timerStartTime) { currentSeconds += (Date.now() - game.timerStartTime) / 1000; } const newEvent: GameEvent = { id: uuidv4(), type: 'goal', team: team, scorerPlayerId: scorerPlayerId, assistPlayerId: assistPlayerId, timestamp: Date.now(), gameSeconds: Math.round(currentSeconds), }; const updatedEvents = [...(game.events || []), newEvent]; const newHomeScore = team === 'home' ? (game.homeScore ?? 0) + 1 : (game.homeScore ?? 0); const newAwayScore = team === 'away' ? (game.awayScore ?? 0) + 1 : (game.awayScore ?? 0); const updatedGames = [...prevGames]; updatedGames[gameIndex] = { ...game, events: updatedEvents, homeScore: newHomeScore, awayScore: newAwayScore }; return updatedGames; }); };
  const removeLastGameEvent = (gameId: string, team: 'home' | 'away') => { setGamesState(prevGames => { const gameIndex = prevGames.findIndex(g => g.id === gameId); if (gameIndex === -1) return prevGames; const game = prevGames[gameIndex]; const events = game.events || []; let lastGoalEventIndex = -1; for (let i = events.length - 1; i >= 0; i--) { if (events[i].type === 'goal' && events[i].team === team) { lastGoalEventIndex = i; break; } } if (lastGoalEventIndex !== -1) { const updatedEvents = [...events]; updatedEvents.splice(lastGoalEventIndex, 1); const newHomeScore = team === 'home' ? Math.max(0, (game.homeScore ?? 0) - 1) : (game.homeScore ?? 0); const newAwayScore = team === 'away' ? Math.max(0, (game.awayScore ?? 0) - 1) : (game.awayScore ?? 0); const updatedGames = [...prevGames]; updatedGames[gameIndex] = { ...game, events: updatedEvents, homeScore: newHomeScore, awayScore: newAwayScore }; return updatedGames; } return prevGames; }); };
  const startGameTimer = (gameId: string) => { const now = Date.now(); const currentDate = getCurrentDate(); const currentTime = getCurrentTime(); setGamesState((prev) => prev.map((g) => { if (g.id === gameId && !g.isExplicitlyFinished) { const updates: Partial<Game> = {}; if (g.date !== currentDate) updates.date = currentDate; if (g.time !== currentTime) updates.time = currentTime; const isStartingFresh = (g.timerElapsedSeconds ?? 0) === 0 && !g.timerStartTime; const newLineup = g.lineup?.map(p => { const isFieldPlayer = p.location === 'field'; const initialPosition = isStartingFresh && isFieldPlayer ? p.position : p.initialPosition; const isStarter = isStartingFresh ? (p.location === 'field' || p.location === 'bench') : (p.isStarter ?? false); return { ...p, playtimerStartTime: isFieldPlayer ? now : p.playtimerStartTime, isStarter: isStarter, initialPosition: initialPosition, }; }) ?? null; return { ...g, ...updates, timerStatus: 'running', timerStartTime: now, isExplicitlyFinished: false, lineup: newLineup }; } return g; }) ); };
  const stopGameTimer = (gameId: string) => { const now = Date.now(); setGamesState((prev) => prev.map((g) => { if (g.id === gameId && g.timerStatus === 'running' && g.timerStartTime) { const elapsed = (now - g.timerStartTime) / 1000; const newElapsedSeconds = Math.round((g.timerElapsedSeconds || 0) + elapsed); const newLineup = g.lineup?.map(p => { if ((p.location === 'field' || p.location === 'inactive') && p.playtimerStartTime) { const playerElapsed = (now - p.playtimerStartTime) / 1000; const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0; const newPlaytime = Math.round(currentPlaytime + playerElapsed); return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null }; } return p; }) ?? null; return { ...g, timerStatus: 'stopped', timerStartTime: null, timerElapsedSeconds: newElapsedSeconds, lineup: newLineup }; } return g; }) ); };
  const markGameAsFinished = (gameId: string) => { const now = Date.now(); setGamesState((prev) => prev.map((g) => { if (g.id === gameId) { let finalElapsedSeconds = g.timerElapsedSeconds ?? 0; let finalLineup = g.lineup; if (g.timerStatus === 'running' && g.timerStartTime) { const elapsed = (now - g.timerStartTime) / 1000; finalElapsedSeconds = Math.round((g.timerElapsedSeconds || 0) + elapsed); finalLineup = g.lineup?.map(p => { if ((p.location === 'field' || p.location === 'inactive') && p.playtimerStartTime) { const playerElapsed = (now - p.playtimerStartTime) / 1000; const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0; const newPlaytime = Math.round(currentPlaytime + playerElapsed); return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null }; } return p; }) ?? null; } finalLineup = finalLineup?.map(p => ({ ...p, playtimerStartTime: null })) ?? null; return { ...g, timerStatus: 'stopped', timerStartTime: null, timerElapsedSeconds: finalElapsedSeconds, isExplicitlyFinished: true, lineup: finalLineup }; } return g; }) ); };
  const startPlayerTimerInGame = (gameId: string, playerId: string) => { const now = Date.now(); setGamesState(prevGames => prevGames.map(game => { if (game.id === gameId && game.lineup && game.timerStatus === 'running') { const newLineup = game.lineup.map(p => { if (p.id === playerId && p.location === 'field' && !p.playtimerStartTime) { return { ...p, playtimerStartTime: now }; } return p; }); return { ...game, lineup: newLineup }; } return game; })); };
  const stopPlayerTimerInGame = (gameId: string, playerId: string) => { const now = Date.now(); setGamesState(prevGames => { const gameIndex = prevGames.findIndex(g => g.id === gameId); if (gameIndex === -1 || !prevGames[gameIndex].lineup) return prevGames; const game = prevGames[gameIndex]; let playerUpdated = false; const newLineup = game.lineup.map(p => { if (p.id === playerId && p.playtimerStartTime) { const elapsed = (now - p.playtimerStartTime) / 1000; const currentPlaytime = typeof p.playtimeSeconds === 'number' ? p.playtimeSeconds : 0; const newPlaytime = Math.round(currentPlaytime + elapsed); playerUpdated = true; return { ...p, playtimeSeconds: newPlaytime, playtimerStartTime: null }; } return p; }); if (playerUpdated) { const updatedGames = [...prevGames]; updatedGames[gameIndex] = { ...game, lineup: newLineup }; return updatedGames; } return prevGames; }); };
  const resetGameLineup = (gameId: string): PlayerLineupState[] => { const currentPlayersFromState = players; const defaultLineup = createDefaultLineup(currentPlayersFromState); setGamesState((prevGames) => prevGames.map(game => game.id === gameId ? { ...game, lineup: defaultLineup, timerElapsedSeconds: 0, timerStartTime: null, timerStatus: 'stopped', isExplicitlyFinished: false, homeScore: 0, awayScore: 0, events: [] } : game)); return defaultLineup; };
  const movePlayerInGame = (gameId: string, playerId: string, sourceLocation: PlayerLineupState['location'], targetLocation: PlayerLineupState['location'], newPosition?: { x: number; y: number }) => { const now = Date.now(); setGamesState(prevGames => { const gameIndex = prevGames.findIndex(g => g.id === gameId); if (gameIndex === -1) return prevGames; const game = { ...prevGames[gameIndex] }; if (!game.lineup) return prevGames; const isGameActive = game.timerStatus === 'running' || (game.timerStatus === 'stopped' && (game.timerElapsedSeconds ?? 0) > 0); let newLineup = [...game.lineup]; const playerIndex = newLineup.findIndex(p => p.id === playerId); if (playerIndex === -1) return prevGames; const playerState = { ...newLineup[playerIndex] }; let updatedPlaytime = playerState.playtimeSeconds; let updatedStartTime = playerState.playtimerStartTime; if ((sourceLocation === 'field' || sourceLocation === 'inactive') && playerState.playtimerStartTime) { const elapsed = (now - playerState.playtimerStartTime) / 1000; updatedPlaytime = Math.round(playerState.playtimeSeconds + elapsed); updatedStartTime = null; } if (targetLocation === 'field' && game.timerStatus === 'running' && updatedStartTime === null) { updatedStartTime = now; } else if (targetLocation !== 'field') { updatedStartTime = null; } let updatedSubbedOnCount = playerState.subbedOnCount; let updatedSubbedOffCount = playerState.subbedOffCount; let substitutionEvent: GameEvent | null = null; if (isGameActive) { let currentSeconds = game.timerElapsedSeconds ?? 0; if (game.timerStatus === 'running' && game.timerStartTime) { currentSeconds += (Date.now() - game.timerStartTime) / 1000; } const eventSeconds = Math.round(currentSeconds); const eventTeam = (game.location === 'home') ? 'home' : 'away'; if (sourceLocation === 'bench' && targetLocation === 'field') { updatedSubbedOnCount++; substitutionEvent = { id: uuidv4(), type: 'substitution', team: eventTeam, playerInId: playerId, playerOutId: undefined, timestamp: now, gameSeconds: eventSeconds, }; } else if (sourceLocation === 'field' && targetLocation === 'bench') { updatedSubbedOffCount++; substitutionEvent = { id: uuidv4(), type: 'substitution', team: eventTeam, playerInId: undefined, playerOutId: playerId, timestamp: now, gameSeconds: eventSeconds, }; } } playerState.location = targetLocation; playerState.position = targetLocation === 'field' ? newPosition : undefined; playerState.playtimeSeconds = updatedPlaytime; playerState.playtimerStartTime = updatedStartTime; playerState.subbedOnCount = updatedSubbedOnCount; playerState.subbedOffCount = updatedSubbedOffCount; newLineup[playerIndex] = playerState; const updatedEvents = substitutionEvent ? [...(game.events || []), substitutionEvent] : game.events; const updatedGames = [...prevGames]; updatedGames[gameIndex] = { ...game, lineup: newLineup, events: updatedEvents }; return updatedGames; }); };
  const saveLineup = (name: string) => { if (!name.trim()) { alert("Please enter a name."); return; } const lineupToSave: SavedLineup = { name: name.trim(), players: players.map(({ id, location, position }) => ({ id, location, position })), }; setSavedLineupsState((prev) => { const filtered = prev.filter(l => l.name !== lineupToSave.name); return [...filtered, lineupToSave]; }); };
  const deleteLineup = (name: string) => { setSavedLineupsState((prev) => prev.filter(l => l.name !== name)); };
  const updateHistory = (season?: string, competition?: string) => { setGameHistoryState(prev => { const newSeasons = [...prev.seasons]; const newCompetitions = [...prev.competitions]; if (season && season.trim()) { const trimmedSeason = season.trim(); const seasonIndex = newSeasons.indexOf(trimmedSeason); if (seasonIndex > -1) newSeasons.splice(seasonIndex, 1); newSeasons.unshift(trimmedSeason); } if (competition && competition.trim()) { const trimmedCompetition = competition.trim(); const compIndex = newCompetitions.indexOf(trimmedCompetition); if (compIndex > -1) newCompetitions.splice(compIndex, 1); newCompetitions.unshift(trimmedCompetition); } return { seasons: newSeasons, competitions: newCompetitions }; }); };
  const getMostRecentSeason = (): string | undefined => gameHistory.seasons[0];
  const getMostRecentCompetition = (): string | undefined => gameHistory.competitions[0];

  const contextValue: TeamContextProps = {
    teamData, teamLoading, updateTeamNameInDb, updateTeamLogoInDb,
    players, playersLoading, addPlayer, updatePlayer, deletePlayer, // Provide player state/functions
    games, addGame, updateGame, deleteGame,
    startGameTimer, stopGameTimer, markGameAsFinished,
    resetGameLineup, movePlayerInGame, startPlayerTimerInGame, stopPlayerTimerInGame,
    movePlayer, swapPlayers, // Local state updates
    savedLineups, saveLineup, loadLineup, deleteLineup, resetLineup, // Uses local player state
    setCurrentPage, selectGame,
    gameHistory, getMostRecentSeason, getMostRecentCompetition,
    addGameEvent, removeLastGameEvent,
  };

  return <TeamContext.Provider value={contextValue}>{children}</TeamContext.Provider>;
};
