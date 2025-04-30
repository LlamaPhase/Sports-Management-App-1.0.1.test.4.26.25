import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { TeamContext, Player } from '../context/TeamContext';
import { useDrop, useDrag, DropTargetMonitor, DragSourceMonitor } from 'react-dnd';
import PlayerIcon from '../components/PlayerIcon';
import { Save, Download, RotateCcw, ArrowLeft } from 'lucide-react';
import SaveLineupModal from '../components/SaveLineupModal';
import LoadLineupModal from '../components/LoadLineupModal';

const ItemTypes = {
  PLAYER: 'player',
};

interface LineupPageProps {
  previousPage: string | null;
}

interface DraggablePlayerProps {
  player: Player;
  location: 'field' | 'bench';
  fieldWidth: number;
  fieldHeight: number;
}

const ICON_WIDTH_APPROX = 40;
const ICON_HEIGHT_APPROX = 58;

const DraggablePlayer: React.FC<DraggablePlayerProps> = ({ player, location, fieldWidth, fieldHeight }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { id: player.id, location, position: player.position },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [player.id, location, player.position]);

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
    position: location === 'field' ? 'absolute' : 'relative',
    zIndex: location === 'field' ? 10 : 1,
    minWidth: `${ICON_WIDTH_APPROX}px`,
  };

  if (location === 'field' && player.position && fieldWidth > 0 && fieldHeight > 0) {
    const pixelLeft = (player.position.x / 100) * fieldWidth;
    const pixelTop = (player.position.y / 100) * fieldHeight;
    style.left = `${pixelLeft}px`;
    style.top = `${pixelTop}px`;
    style.transform = `translate(-${ICON_WIDTH_APPROX / 2}px, -${ICON_HEIGHT_APPROX / 2}px)`;
  } else if (location === 'field') {
    style.left = '-9999px';
    style.top = '-9999px';
  }

  return (
    <div
      ref={drag}
      style={style}
      className={`flex justify-center ${location === 'bench' ? 'mb-1' : ''}`}
    >
      <PlayerIcon player={player} showName={true} size="small" context={location} />
    </div>
  );
};

interface DropZoneProps {
  children: React.ReactNode;
  onDropPlayer: (
    item: { id: string; location: 'field' | 'bench'; position?: { x: number; y: number } },
    dropXPercent?: number,
    dropYPercent?: number
  ) => void;
  className?: string;
  location: 'field' | 'bench';
  fieldRef?: React.RefObject<HTMLDivElement>;
}

const DropZone: React.FC<DropZoneProps> = ({ children, onDropPlayer, className, location, fieldRef }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAYER,
    drop: (item: { id: string; location: 'field' | 'bench'; position?: { x: number; y: number } }, monitor: DropTargetMonitor) => {
      if (location === 'field' && fieldRef?.current) {
        const fieldRect = fieldRef.current.getBoundingClientRect();
        const dropPosition = monitor.getClientOffset();
        if (dropPosition && fieldRect.width > 0 && fieldRect.height > 0) {
          let relativeX = dropPosition.x - fieldRect.left;
          let relativeY = dropPosition.y - fieldRect.top;
          let percentX = (relativeX / fieldRect.width) * 100;
          let percentY = (relativeY / fieldRect.height) * 100;
          percentX = Math.max(0, Math.min(percentX, 100));
          percentY = Math.max(0, Math.min(percentY, 100));
          onDropPlayer(item, percentX, percentY);
        }
      } else if (location === 'bench') {
        onDropPlayer(item);
      }
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [onDropPlayer, location, fieldRef]);

  const combinedRef = (node: HTMLDivElement | null) => {
    drop(node);
    if (fieldRef && location === 'field') {
      (fieldRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  if (location === 'field') {
    return (
      <div
        ref={combinedRef}
        className={`${className} ${isOver ? 'bg-green-700/20' : ''} transition-colors overflow-hidden`}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {/* Field Markings */}
        <div className="absolute bottom-0 left-[20%] w-[60%] md:left-[25%] md:w-[50%] h-[18%] border-2 border-white/50 border-b-0"></div>
        <div className="absolute bottom-0 left-[38%] w-[24%] md:left-[40%] md:w-[20%] h-[6%] border-2 border-white/50 border-b-0"></div>
        <div className="absolute bottom-[18%] left-[40%] w-[20%] md:left-[42%] md:w-[16%] h-[10%] border-2 border-white/50 border-b-0 rounded-t-full"></div>
        <div className="absolute top-[-12%] left-[40%] w-[20%] md:left-[42%] md:w-[16%] h-[24%] border-2 border-white/50 border-t-0 rounded-b-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[10%] h-[10%] border-2 border-white/50 border-b-0 border-l-0 rounded-tr-full"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[10%] h-[10%] border-2 border-white/50 border-b-0 border-r-0 rounded-tl-full"></div>
        {children}
      </div>
    );
  } else {
    return (
      <div
        ref={drop}
        className={`${className} ${isOver ? 'bg-gray-300/50' : ''} transition-colors`}
      >
        {children}
      </div>
    );
  }
};

const LineupPage: React.FC<LineupPageProps> = ({ previousPage }) => {
  const { players, movePlayer, swapPlayers, savedLineups, saveLineup, loadLineup, deleteLineup, resetLineup, setCurrentPage } = useContext(TeamContext);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const fieldContainerRef = useRef<HTMLDivElement>(null);
  const fieldItselfRef = useRef<HTMLDivElement>(null);
  const benchContainerRef = useRef<HTMLDivElement>(null);
  const [fieldDimensions, setFieldDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      const fieldElement = fieldItselfRef.current;
      const benchElement = benchContainerRef.current;
      if (fieldElement) {
        const { width, height } = fieldElement.getBoundingClientRect();
        if (width > 0 && height > 0 && (Math.abs(width - fieldDimensions.width) > 1 || Math.abs(height - fieldDimensions.height) > 1)) {
          setFieldDimensions({ width, height });
        }
        if (benchElement) {
          const isMdScreen = window.innerWidth >= 768;
          if (isMdScreen && height > 0) {
            benchElement.style.height = `${height}px`;
          } else {
            benchElement.style.height = '';
          }
        }
      }
    };
    const timeoutId = setTimeout(updateDimensions, 50);
    let resizeObserver: ResizeObserver | null = null;
    const containerElement = fieldContainerRef.current;
    if (containerElement) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerElement);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timeoutId);
      if (resizeObserver && containerElement) {
        resizeObserver.unobserve(containerElement);
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, [fieldDimensions.width, fieldDimensions.height]);

  const fieldPlayers = players.filter(p => p.location === 'field');
  const benchPlayers = useMemo(() =>
    players
      .filter(p => p.location === 'bench')
      .sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [players]
  );

  const handleDrop = (
    item: { id: string; location: 'field' | 'bench'; position?: { x: number; y: number } },
    targetLocation: 'field' | 'bench',
    xPercent?: number,
    yPercent?: number
  ) => {
    const droppedPlayerId = item.id;
    const sourceLocation = item.location;

    if (targetLocation === 'field' && xPercent !== undefined && yPercent !== undefined) {
      const iconWidthPercent = fieldDimensions.width > 0 ? (ICON_WIDTH_APPROX / fieldDimensions.width) * 100 : 5;
      const iconHeightPercent = fieldDimensions.height > 0 ? (ICON_HEIGHT_APPROX / fieldDimensions.height) * 100 : 5;
      const targetPlayer = fieldPlayers.find(p => {
        if (!p.position || p.id === droppedPlayerId) return false;
        const pLeft = p.position.x - iconWidthPercent / 2;
        const pRight = p.position.x + iconWidthPercent / 2;
        const pTop = p.position.y - iconHeightPercent / 2;
        const pBottom = p.position.y + iconHeightPercent / 2;
        return xPercent > pLeft && xPercent < pRight && yPercent > pTop && yPercent < pBottom;
      });

      if (targetPlayer) {
        swapPlayers(droppedPlayerId, targetPlayer.id);
      } else {
        movePlayer(droppedPlayerId, 'field', { x: xPercent, y: yPercent });
      }
    } else if (targetLocation === 'bench') {
      if (sourceLocation === 'field') {
        movePlayer(droppedPlayerId, 'bench');
      }
    }
  };

  const handleSaveClick = () => setIsSaveModalOpen(true);
  const handleLoadClick = () => setIsLoadModalOpen(true);
  const handleResetClick = () => { if (window.confirm('Are you sure you want to move all players to the bench?')) { resetLineup(); } };
  const handleSaveLineup = (name: string) => { saveLineup(name); setIsSaveModalOpen(false); };
  const handleLoadLineup = (name: string) => { if (loadLineup(name)) setIsLoadModalOpen(false); else alert(`Failed to load lineup "${name}".`); };
  const handleDeleteLineup = (name: string) => deleteLineup(name);

  const handleGoBack = () => {
    if (typeof setCurrentPage === 'function') {
      setCurrentPage(previousPage || 'team');
    } else {
      console.error("setCurrentPage is not a function in TeamContext");
    }
  };

  const approxFixedElementsHeightPortrait = 220;

  return (
    <div className="flex flex-col flex-grow">
      <div className="pt-1 pb-2 px-2 flex items-center flex-shrink-0">
        <button
          onClick={handleGoBack}
          className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-200"
          aria-label="Go Back"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-grow md:space-x-4">
        <div
          ref={fieldContainerRef}
          className="relative w-full md:w-2/3 mx-auto my-2 md:my-0 md:mx-0 flex flex-col md:order-1 md:max-h-none"
          style={{
            aspectRatio: '1 / 1',
            maxHeight: `calc(100vh - ${approxFixedElementsHeightPortrait}px)`,
          }}
        >
          <DropZone
            onDropPlayer={(item, xPct, yPct) => handleDrop(item, 'field', xPct, yPct)}
            fieldRef={fieldItselfRef}
            className="bg-green-600 w-full h-full rounded-lg shadow-inner flex-grow overflow-hidden"
            location="field"
          >
            {fieldPlayers.map((player) => (
              <DraggablePlayer
                key={player.id}
                player={player}
                location="field"
                fieldWidth={fieldDimensions.width}
                fieldHeight={fieldDimensions.height}
              />
            ))}
          </DropZone>
          <div className="absolute top-2 right-2 flex space-x-1 bg-white/70 p-1 rounded shadow z-20">
            <button onClick={handleSaveClick} className="text-gray-700 hover:text-blue-600 p-1.5" title="Save Lineup"><Save size={18} /></button>
            <button onClick={handleLoadClick} className="text-gray-700 hover:text-blue-600 p-1.5" title="Load Lineup"><Download size={18} /></button>
            <button onClick={handleResetClick} className="text-gray-700 hover:text-red-600 p-1.5" title="Reset Lineup"><RotateCcw size={18} /></button>
          </div>
        </div>

        <div
          ref={benchContainerRef}
          className="bg-gray-200 p-3 mt-3 md:mt-0 rounded-lg shadow flex-shrink-0 md:w-1/3 md:order-2 md:flex md:flex-col"
        >
          <h2 className="text-base font-semibold mb-2 border-b pb-1 text-gray-700 flex-shrink-0">Bench</h2>
          <DropZone
            onDropPlayer={(item) => handleDrop(item, 'bench')}
            className="min-h-[60px] flex flex-wrap gap-x-3 gap-y-1 flex-grow md:overflow-y-auto"
            location="bench"
          >
            {benchPlayers.length === 0 ? (
              <p className="text-gray-500 w-full text-center text-sm py-2">Bench is empty.</p>
            ) : (
              benchPlayers.map((player) => (
                <DraggablePlayer key={player.id} player={player} location="bench" fieldWidth={0} fieldHeight={0} />
              ))
            )}
          </DropZone>
        </div>
      </div>

      <SaveLineupModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveLineup} />
      <LoadLineupModal isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} savedLineups={savedLineups} onLoad={handleLoadLineup} onDelete={handleDeleteLineup} />
    </div>
  );
};

export default LineupPage;
