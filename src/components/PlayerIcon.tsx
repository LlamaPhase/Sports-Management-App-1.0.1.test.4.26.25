import React from 'react';
import { Player, PlayerLineupState, GameEvent } from '../context/TeamContext'; // Uses updated Player type
import { ArrowUp, ArrowDown, Goal, Footprints } from 'lucide-react';

// Helper function (Unchanged)
const formatTimer = (totalSeconds: number): string => { const minutes = Math.floor(totalSeconds / 60); const seconds = Math.round(totalSeconds % 60); return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; };

interface PlayerIconProps {
  player: Player; // Receives the full Player object from context
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
  // Context now uses PlayerLineupState location OR 'roster'
  context?: PlayerLineupState['location'] | 'roster';
  // Props related to game state (passed from GamePage)
  playtimeDisplaySeconds?: number;
  totalGameSeconds?: number;
  isStarter?: boolean;
  subbedOnCount?: number;
  subbedOffCount?: number;
  goalCount?: number;
  assistCount?: number;
  initialPosition?: { x: number; y: number };
}

const PlayerIcon: React.FC<PlayerIconProps> = ({
  player, // Contains first_name, last_name, number from Supabase
  showName = true,
  size = 'medium',
  context = 'roster', // Default context
  playtimeDisplaySeconds = 0,
  totalGameSeconds = 0,
  isStarter = false,
  subbedOnCount = 0,
  subbedOffCount = 0,
  goalCount = 0,
  assistCount = 0,
  initialPosition,
}) => {
  // Use first_name, last_name from the player object
  const getInitials = (first: string, last: string) => `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();

  // --- Styling and Logic (Largely Unchanged, uses Player object fields) ---
  const sizeClasses = { small: 'w-8 h-8 text-[10px] md:w-10 md:h-10 md:text-sm', medium: 'w-10 h-10 text-sm md:w-12 md:h-12 md:text-base', large: 'w-12 h-12 text-base md:w-14 md:h-14 md:text-lg', };
  const nameTextSizeClass = size === 'small' ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm';
  const numberTextSizeClass = size === 'small' ? 'text-[9px] md:text-xs' : 'text-xs md:text-sm';
  const containerSpacing = size === 'small' ? 'space-y-0.5 md:space-y-1' : 'space-y-1';
  const circleBgClass = context === 'inactive' ? 'bg-gray-400' : 'bg-gray-100';
  const circleBorderClass = context === 'inactive' ? 'border border-gray-500' : 'border border-white';
  const circleTextColorClass = context === 'inactive' ? 'text-gray-600' : 'text-black';
  const nameColorClass = context === 'field' ? 'text-white' : (context === 'inactive' ? 'text-gray-600' : 'text-black');
  const numberColorClass = context === 'field' ? 'text-gray-300' : 'text-gray-500';
  const playtimePercent = totalGameSeconds > 0 ? (playtimeDisplaySeconds / totalGameSeconds) * 100 : 0;
  let playtimeBgColor = 'bg-red-500'; if (playtimePercent >= 50) { playtimeBgColor = 'bg-green-500'; } else if (playtimePercent >= 25) { playtimeBgColor = 'bg-orange-500'; }
  const showSubCounters = (context === 'field' || context === 'bench' || context === 'inactive');
  const showSubOn = showSubCounters && subbedOnCount > 0;
  const showSubOff = showSubCounters && subbedOffCount > 0;
  const showStarterIcon = isStarter && !!initialPosition && showSubCounters;
  const counterTopOffset = '16px'; const counterLeftOffset = '-12px'; const counterSpacing = '18px';
  const showGoalAssistIcons = (context === 'field' || context === 'bench' || context === 'inactive') && (goalCount > 0 || assistCount > 0);
  const goalIcons = Array.from({ length: goalCount }, (_, i) => ( <Goal key={`goal-${i}`} size={12} className="text-black" /> ));
  const assistIcons = Array.from({ length: assistCount }, (_, i) => ( <Footprints key={`assist-${i}`} size={12} className="text-blue-600" /> ));
  const eventIcons = [...goalIcons, ...assistIcons];

  return (
    <div className={`relative flex flex-col items-center ${showName ? containerSpacing : ''}`}>
      {/* Player Circle - Uses player.first_name, player.last_name */}
      <div className={`${sizeClasses[size]} ${circleBgClass} ${circleTextColorClass} ${circleBorderClass} rounded-full flex items-center justify-center font-semibold shadow-sm`} title={`${player.first_name} ${player.last_name} #${player.number ?? ''}`}>
        {getInitials(player.first_name, player.last_name)}
      </div>

      {/* Indicators (Unchanged logic) */}
      {showStarterIcon && ( <div className="absolute -top-1 -left-1 w-4 h-4 bg-black border border-white rounded-full flex items-center justify-center shadow z-20" title="Starter"><span className="text-white text-[9px] font-bold leading-none">S</span></div> )}
      {showSubOn && ( <div className="absolute w-6 h-[16px] bg-gray-200 rounded-full flex items-center justify-between px-1 shadow-sm z-10" style={{ top: counterTopOffset, left: counterLeftOffset }} title={`Subbed On: ${subbedOnCount}`}><span className="text-[10px] font-semibold text-gray-700">{subbedOnCount}</span><div className="w-3 h-3 bg-green-500 rounded-full border border-white flex items-center justify-center"><ArrowUp size={8} className="text-white" /></div></div> )}
      {showSubOff && ( <div className={`absolute w-6 h-[16px] bg-gray-200 rounded-full flex items-center justify-between px-1 shadow-sm`} style={{ top: `calc(${counterTopOffset} + ${counterSpacing})`, left: counterLeftOffset }} title={`Subbed Off: ${subbedOffCount}`}><span className="text-[10px] font-semibold text-gray-700">{subbedOffCount}</span><div className="w-3 h-3 bg-red-500 rounded-full border border-white flex items-center justify-center"><ArrowDown size={8} className="text-white" /></div></div> )}
      {(context === 'field' || context === 'bench' || context === 'inactive') && ( <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 ${playtimeBgColor} text-white text-[9px] md:text-[10px] font-bold rounded-full shadow leading-tight z-20`} title={`Played: ${formatTimer(playtimeDisplaySeconds)}`}>{formatTimer(playtimeDisplaySeconds)}</div> )}
      {showGoalAssistIcons && ( <div className="absolute -bottom-1 right-0 flex space-x-[-4px] z-10" title={`Goals: ${goalCount}, Assists: ${assistCount}`}>{eventIcons.map((icon, index) => ( <div key={index} className="bg-white/70 rounded-full p-0.5 shadow">{icon}</div> ))}</div> )}

      {/* Player Name & Number - Uses player.first_name, player.number */}
      {showName && (
        <span className={`text-center ${nameColorClass} ${nameTextSizeClass} font-medium leading-tight max-w-[50px] md:max-w-[60px] truncate pt-1`}>
          {player.first_name}
          {player.number && <span className={`block ${numberColorClass} ${numberTextSizeClass}`}>#{player.number}</span>}
        </span>
      )}
    </div>
  );
};

export default PlayerIcon;
