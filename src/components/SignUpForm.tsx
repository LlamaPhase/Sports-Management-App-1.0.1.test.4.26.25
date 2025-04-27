import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, UserPlus } from 'lucide-react';

const SignUpForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Function to create a team for the new user
  const createTeamForUser = async (userId: string, teamName: string = 'My Team') => {
    const { error: teamError } = await supabase
      .from('teams')
      .insert({ user_id: userId, name: teamName }); // logo_url defaults to NULL

    if (teamError) {
      console.error('Error creating team:', teamError);
      // Handle error appropriately - maybe notify user or log
      // For now, we'll let the sign-up proceed but log the error
      setError(`Account created, but failed to create team: ${teamError.message}`);
    } else {
      console.log('Team created successfully for user:', userId);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        // options: { emailRedirectTo: window.location.origin } // Not needed if email confirmation is off
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        // CRITICAL: Create the team immediately after successful sign-up
        await createTeamForUser(data.user.id, `${email.split('@')[0]}'s Team`); // Use part of email for default name

        // Since email confirmation is likely disabled in Supabase settings (default for new projects),
        // the user is effectively logged in. App.tsx's onAuthStateChange will handle it.
        setMessage('Sign up successful! You are now logged in.');
        // console.log('Sign up successful, user:', data.user);
      } else {
         // This case might happen with email confirmation enabled, but we assume it's off.
         setMessage('Sign up successful. Please check your email to confirm.');
      }

    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.error_description || err.message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-5">
      {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
      {message && <p className="text-green-600 text-sm text-center bg-green-100 p-2 rounded">{message}</p>}
      <div>
        <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail size={18} className="text-gray-400" />
          </span>
          <input
            id="email-signup"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 transition"
            disabled={loading}
          />
        </div>
      </div>
      <div>
        <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock size={18} className="text-gray-400" />
          </span>
          <input
            id="password-signup"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6} // Supabase default minimum
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 transition"
            disabled={loading}
          />
        </div>
         <p className="text-xs text-gray-500 mt-1">Minimum 6 characters.</p>
      </div>
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition duration-150 ease-in-out"
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
             <UserPlus size={18} className="-ml-1 mr-2" />
          )}
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </div>
    </form>
  );
};

export default SignUpForm;
