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
  const createTeamForUser = async (userId: string, teamName: string) => {
    console.log(`Attempting to create team for user ${userId} with name ${teamName}`);
    // Insert into the 'teams' table using the user_id and provided name
    const { error: teamError } = await supabase
      .from('teams')
      .insert({
        user_id: userId,
        name: teamName,
        // logo_url defaults to NULL in the database schema
      })
      .select() // Select to confirm insertion and potentially catch RLS issues if insert fails silently
      .single(); // Expecting a single row back

    if (teamError) {
      console.error('Error creating team:', teamError);
      // Set error state to inform the user, even if signup was technically successful
      setError(`Account created, but failed to initialize team: ${teamError.message}. Please try logging out and back in, or contact support.`);
    } else {
      console.log('Team created successfully for user:', userId);
      // Team creation successful, no need to set a message here as the main signup message handles it.
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
        // Assuming email confirmation is disabled in Supabase project settings
      });

      if (signUpError) {
        // Handle specific errors like user already registered
        if (signUpError.message.includes("User already registered")) {
           setError("This email is already registered. Please try logging in.");
        } else {
           throw signUpError; // Throw other sign-up errors
        }
      } else if (data.user) {
        // CRITICAL: Create the team immediately after successful sign-up
        // Use part of the email for a default team name
        const defaultTeamName = `${email.split('@')[0]}'s Team`;
        await createTeamForUser(data.user.id, defaultTeamName);

        // Check if an error occurred during team creation
        if (!error) {
            // Since email confirmation is likely disabled, the user is logged in.
            // App.tsx's onAuthStateChange will handle the session update.
            setMessage('Sign up successful! You are now logged in.');
            // console.log('Sign up successful, user:', data.user);
        }
        // If 'error' state was set by createTeamForUser, it will be displayed.

      } else {
         // This case might happen with email confirmation enabled, but we assume it's off.
         // Or if there's an unexpected issue with the signup response.
         setMessage('Sign up process initiated. If email confirmation is required, please check your email.');
         console.warn("SignUp successful but no user data returned immediately.", data);
      }

    } catch (err: any) {
      console.error('Sign up error:', err);
      if (!error) { // Avoid overwriting specific team creation errors
          setError(err.error_description || err.message || 'Failed to sign up.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-5">
      {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
      {message && !error && <p className="text-green-600 text-sm text-center bg-green-100 p-2 rounded">{message}</p>} {/* Show message only if no error */}
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
