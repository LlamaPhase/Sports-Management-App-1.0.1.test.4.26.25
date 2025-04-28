import React, { useContext, useState, useRef, ChangeEvent, useEffect } from 'react'; // Added useEffect
import { Shield, Users, Calendar, BarChart2, Plus, LogOut } from 'lucide-react';
import { TeamContext } from '../context/TeamContext';

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const HeaderNavLink: React.FC<{
  page: string;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ page, currentPage, setCurrentPage, children, icon }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex-1 flex flex-col items-center justify-center px-2 py-2 text-xs font-medium transition-opacity ${
        isActive ? 'opacity-100' : 'opacity-70 hover:opacity-90'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && <span className="mb-0.5">{icon}</span>}
      {children}
    </button>
  );
};


const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage, isLoggedIn, onLogout }) => {
  // Get team data and update functions from context
  const { teamData, teamLoading, updateTeamNameInDb, updateTeamLogoInDb } = useContext(TeamContext);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(''); // Initialize empty, will be set by effect
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showBottomNav = ['team', 'schedule', 'stats'].includes(currentPage);

  // Effect to update local edit state when teamData changes
  useEffect(() => {
    if (teamData) {
      setNewName(teamData.name);
    } else {
      setNewName(''); // Reset if teamData is null
    }
  }, [teamData]);

  // --- Handlers for inline name editing ---
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value);
  };

  const handleNameSave = async () => {
    if (newName.trim() && newName.trim() !== teamData?.name) {
      await updateTeamNameInDb(newName.trim()); // Call context function to update DB
    } else if (!newName.trim() && teamData) {
      setNewName(teamData.name); // Revert if empty
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setNewName(teamData?.name || ''); // Revert on escape
      setIsEditingName(false);
    }
  };
  // --- End Handlers ---

  // --- Handlers for logo ---
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Logo = reader.result as string;
        await updateTeamLogoInDb(base64Logo); // Call context function to update DB
      };
      reader.readAsDataURL(file);
    }
  };
  // --- End Handlers ---

  const currentTeamName = teamLoading ? 'Loading...' : teamData?.name || 'My Team';
  const currentTeamLogo = teamData?.logo_url;

  return (
    <header className="bg-red-700 text-white sticky top-0 z-20 shadow">
      {/* Top part */}
      <div className="p-4 flex justify-between items-center">
        {/* Team Logo and Name Section */}
        <div className="flex items-center space-x-2">
          {/* Logo/Placeholder */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoChange}
            accept="image/*"
            className="hidden"
            disabled={teamLoading} // Disable while loading
          />
          <button
            onClick={handleLogoClick}
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 transition cursor-pointer overflow-hidden flex-shrink-0 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Change team logo"
            disabled={teamLoading} // Disable while loading
          >
            {currentTeamLogo ? (
              <img src={currentTeamLogo} alt="Team Logo" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <Shield size={24} className="text-white opacity-60" />
                <Plus size={14} className="absolute text-white" />
              </div>
            )}
          </button>

          {/* Team Name / Input */}
          {isEditingName ? (
            <input
              type="text"
              value={newName}
              onChange={handleNameChange}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="text-lg font-semibold bg-red-800 border-b border-white focus:outline-none px-1 py-0.5 text-white"
              autoFocus
              disabled={teamLoading} // Disable while loading
            />
          ) : (
            <span
              className={`font-semibold text-lg ${teamLoading ? 'opacity-50' : 'cursor-pointer hover:opacity-80'}`}
              onClick={() => !teamLoading && setIsEditingName(true)} // Allow edit only if not loading
            >
              {currentTeamName}
            </span>
          )}
        </div>

        {/* Right Side Icons: Lineup and Logout */}
        <div className="flex items-center space-x-3">
          {/* Lineup Button */}
          <button
            onClick={() => setCurrentPage('lineup')}
            className="hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-red-600"
            aria-label="Edit Lineup"
          >
            <img src="/lineup-icon.svg" alt="Lineup" className="w-6 h-6 invert" />
          </button>

          {/* Logout Button (Conditional) */}
          {isLoggedIn && (
            <button
              onClick={onLogout}
              className="hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-red-600"
              aria-label="Logout"
            >
              <LogOut size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom navigation part */}
      {showBottomNav && (
        <nav className="flex justify-around items-stretch border-t border-red-600">
          <HeaderNavLink page="team" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<Users size={18}/>}>
            Team
          </HeaderNavLink>
          <HeaderNavLink page="schedule" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<Calendar size={18}/>}>
            Schedule
          </HeaderNavLink>
          <HeaderNavLink page="stats" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<BarChart2 size={18}/>}>
            Stats
          </HeaderNavLink>
        </nav>
      )}
    </header>
  );
};

export default Header;
