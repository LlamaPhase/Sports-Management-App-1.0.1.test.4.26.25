import React, { useState, useEffect, useContext } from 'react';
import { Users, Calendar, Clock, Home, Plane, X, Trophy, Repeat, Loader2 } from 'lucide-react'; // Added Loader2
import { TeamContext } from '../context/TeamContext';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated signature for async operation
  onAddGame: (opponent: string, date: string, time: string, location: 'home' | 'away', season?: string, competition?: string) => Promise<void>;
}

const AddGameModal: React.FC<AddGameModalProps> = ({ isOpen, onClose, onAddGame }) => {
  const { gameHistory, getMostRecentSeason, getMostRecentCompetition } = useContext(TeamContext);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState<'home' | 'away'>('home');
  const [season, setSeason] = useState('');
  const [competition, setCompetition] = useState('');
  const [isAdding, setIsAdding] = useState(false); // Loading state

  useEffect(() => {
    if (isOpen) {
      setOpponent('');
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setTime('');
      setLocation('home');
      setSeason(getMostRecentSeason() || '');
      setCompetition(getMostRecentCompetition() || '');
      setIsAdding(false); // Reset loading state
    }
  }, [isOpen, getMostRecentSeason, getMostRecentCompetition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (opponent.trim() && date) {
      setIsAdding(true);
      try {
        // Await the async add game function
        await onAddGame(opponent.trim(), date, time, location, season, competition);
        // onClose(); // Context handler closes modal now (or SchedulePage does)
      } catch (error) {
        // Error handling is done in the context, but we stop loading here
        console.error("Add game failed in modal:", error);
      } finally {
        setIsAdding(false);
      }
    } else {
      alert("Please enter opponent name and date.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Game</h2>
          <button onClick={onClose} disabled={isAdding} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Buttons */}
          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
             <div className="flex space-x-3">
               <button type="button" onClick={() => setLocation('home')} disabled={isAdding} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md transition-colors ${ location === 'home' ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100' } disabled:opacity-50 disabled:cursor-not-allowed`} >
                 <Home size={18} /> <span>Home</span>
               </button>
               <button type="button" onClick={() => setLocation('away')} disabled={isAdding} className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-md transition-colors ${ location === 'away' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100' } disabled:opacity-50 disabled:cursor-not-allowed`} >
                 <Plane size={18} /> <span>Away</span>
               </button>
             </div>
           </div>

          {/* Opponent */}
          <div>
            <label htmlFor="opponent" className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Users size={18} className="text-gray-400" /></span>
              <input type="text" id="opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50" placeholder="e.g., Rival Team" required disabled={isAdding} />
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={18} className="text-gray-400" /></span>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50" required disabled={isAdding} />
            </div>
          </div>

          {/* Time */}
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Clock size={18} className="text-gray-400" /></span>
              <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50" disabled={isAdding} />
            </div>
          </div>

          {/* Competition */}
          <div>
            <label htmlFor="competition" className="block text-sm font-medium text-gray-700 mb-1">Competition (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Trophy size={18} className="text-gray-400" /></span>
              <input
                type="text"
                id="competition"
                list="competition-history"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                placeholder="e.g., League Playoffs"
                disabled={isAdding}
              />
              <datalist id="competition-history">
                {gameHistory.competitions.map((comp, index) => (
                  <option key={index} value={comp} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Season */}
          <div>
            <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-1">Season (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Repeat size={18} className="text-gray-400" /></span>
              <input
                type="text"
                id="season"
                list="season-history"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                placeholder="e.g., Fall 2024"
                disabled={isAdding}
              />
              <datalist id="season-history">
                {gameHistory.seasons.map((s, index) => (
                  <option key={index} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={isAdding} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isAdding} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center min-w-[110px]">
              {isAdding ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              {isAdding ? 'Adding...' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGameModal;
