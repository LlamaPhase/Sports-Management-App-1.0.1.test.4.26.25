import React, { useState, useEffect, useContext } from 'react';
import { Users, Calendar, Clock, Home, Plane, X, Trophy, Repeat, Loader2 } from 'lucide-react'; // Added Loader2
import { Game, GameData, TeamContext } from '../context/TeamContext'; // Import GameData

interface EditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null; // Still receives local Game type
  // Updated signature for async operation and GameData fields
  onUpdateGame: (id: string, updates: Partial<Omit<GameData, 'id' | 'team_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
}

const EditGameModal: React.FC<EditGameModalProps> = ({ isOpen, onClose, game, onUpdateGame }) => {
  const { gameHistory } = useContext(TeamContext);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(''); // Corresponds to game_date
  const [time, setTime] = useState(''); // Corresponds to game_time
  const [location, setLocation] = useState<'home' | 'away'>('home');
  const [season, setSeason] = useState('');
  const [competition, setCompetition] = useState('');
  const [isSaving, setIsSaving] = useState(false); // Loading state

  useEffect(() => {
    if (isOpen && game) {
      setOpponent(game.opponent);
      setDate(game.game_date); // Use game_date
      setTime(game.game_time || ''); // Use game_time, default to empty string if null
      setLocation(game.location);
      setSeason(game.season || '');
      setCompetition(game.competition || '');
      setIsSaving(false); // Reset loading state
    }
    if (!isOpen) {
        setOpponent('');
        setDate('');
        setTime('');
        setLocation('home');
        setSeason('');
        setCompetition('');
        setIsSaving(false);
    }
  }, [isOpen, game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (game && opponent.trim() && date) {
      setIsSaving(true);
      try {
        // Pass updates using GameData field names
        await onUpdateGame(game.id, {
          opponent: opponent.trim(),
          game_date: date,
          game_time: time, // Context handler will convert '' to null
          location,
          season: season, // Context handler will convert '' to null
          competition: competition, // Context handler will convert '' to null
          // Other fields like score, timer, lineup, events are updated by game actions
        });
        onClose(); // Close modal on success
      } catch (error) {
        console.error("Update game failed in modal:", error);
        // Error is alerted in context, modal stays open
      } finally {
        setIsSaving(false);
      }
    } else {
      alert("Please enter opponent name and date.");
    }
  };

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Game</h2>
          <button onClick={onClose} disabled={isSaving} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Buttons */}
          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
             <div className="flex space-x-3">
                <button type="button" onClick={() => setLocation('home')} disabled={isSaving} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md transition-colors ${ location === 'home' ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100' } disabled:opacity-50 disabled:cursor-not-allowed`} >
                    <Home size={18} /> <span>Home</span>
                </button>
                <button type="button" onClick={() => setLocation('away')} disabled={isSaving} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md transition-colors ${ location === 'away' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100' } disabled:opacity-50 disabled:cursor-not-allowed`} >
                    <Plane size={18} /> <span>Away</span>
                </button>
             </div>
           </div>

          {/* Opponent Input */}
          <div>
            <label htmlFor="editOpponent" className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Users size={18} className="text-gray-400" /></span>
              <input type="text" id="editOpponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50" placeholder="e.g., Rival Team" required disabled={isSaving} />
            </div>
          </div>
          {/* Date Input (for game_date) */}
          <div>
            <label htmlFor="editDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={18} className="text-gray-400" /></span>
              <input type="date" id="editDate" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50" required disabled={isSaving} />
            </div>
          </div>
          {/* Time Input (for game_time) */}
          <div>
            <label htmlFor="editTime" className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Clock size={18} className="text-gray-400" /></span>
              <input type="time" id="editTime" value={time} onChange={(e) => setTime(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50" disabled={isSaving} />
            </div>
          </div>

          {/* Competition */}
          <div>
            <label htmlFor="editCompetition" className="block text-sm font-medium text-gray-700 mb-1">Competition (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Trophy size={18} className="text-gray-400" /></span>
              <input
                type="text"
                id="editCompetition"
                list="edit-competition-history"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                placeholder="e.g., League Playoffs"
                disabled={isSaving}
              />
              <datalist id="edit-competition-history">
                {gameHistory.competitions.map((comp, index) => (
                  <option key={index} value={comp} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Season */}
          <div>
            <label htmlFor="editSeason" className="block text-sm font-medium text-gray-700 mb-1">Season (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Repeat size={18} className="text-gray-400" /></span>
              <input
                type="text"
                id="editSeason"
                list="edit-season-history"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                placeholder="e.g., Fall 2024"
                disabled={isSaving}
              />
              <datalist id="edit-season-history">
                {gameHistory.seasons.map((s, index) => (
                  <option key={index} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center min-w-[130px]">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGameModal;
