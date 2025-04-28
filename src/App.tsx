import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import Layout from './components/Layout';
import TeamPage from './pages/TeamPage';
import SchedulePage from './pages/SchedulePage';
import StatsPage from './pages/StatsPage';
import LineupPage from './pages/LineupPage';
import GamePage from './pages/GamePage';
import AuthPage from './pages/AuthPage'; // Import AuthPage
import { TeamProvider } from './context/TeamContext';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until session is checked
  const [currentPage, _setCurrentPage] = useState('team'); // Default page if logged in
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // --- Authentication Effect ---
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); // Finished checking initial session
    });

    // Listen for auth state changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // If user logs out, reset relevant state
        _setCurrentPage('team'); // Reset to default page
        setPreviousPage(null);
        setSelectedGameId(null);
      }
      // No need to setLoading(false) here as initial load is handled above
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);
  // --- End Authentication Effect ---

  // --- Logout Handler ---
  const handleLogout = async () => {
    setLoading(true); // Optional: show loading state during logout
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      // Handle error appropriately, maybe show a notification
    }
    // setSession(null) will be handled by onAuthStateChange listener
    setLoading(false); // Hide loading state
  };
  // --- End Logout Handler ---

  const setCurrentPage = (newPage: string) => {
    if (newPage !== currentPage) {
      setPreviousPage(currentPage);
      _setCurrentPage(newPage);
    }
  };

  const selectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentPage('game');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'team': return <TeamPage />;
      case 'schedule': return <SchedulePage />;
      case 'stats': return <StatsPage />;
      case 'lineup': return <LineupPage previousPage={previousPage} />;
      case 'game': return <GamePage gameId={selectedGameId} previousPage={previousPage} />;
      default: return <TeamPage />;
    }
  };

  // Determine if the main layout (with header) should be shown
  const showMainLayout = currentPage !== 'game';

  // --- Render Logic based on Auth State ---
  if (loading) {
    // Optional: Add a nicer loading indicator later
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    // If no active session, show the AuthPage
    return <AuthPage />;
  }

  // If session exists, render the main application
  return (
    <DndProvider backend={HTML5Backend}>
      <TeamProvider setCurrentPage={setCurrentPage} selectGame={selectGame}>
        {showMainLayout ? (
          <Layout
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoggedIn={!!session} // Pass login status
            onLogout={handleLogout} // Pass logout handler
          >
            {renderPage()}
          </Layout>
        ) : (
          // Render GamePage directly without the main Layout/Header
          <div className="min-h-screen bg-gray-100 flex flex-col">
             <main className="flex-grow flex flex-col">
                {renderPage()}
             </main>
          </div>
        )}
      </TeamProvider>
    </DndProvider>
  );
}

export default App;
