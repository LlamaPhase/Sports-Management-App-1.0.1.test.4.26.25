import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import SignUpForm from '../components/SignUpForm';
import { Shield } from 'lucide-react'; // Using Shield as a generic app icon

const AuthPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex justify-center mb-6">
            {/* Simple Logo Placeholder */}
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-md">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">
            {showLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>

          {showLogin ? <LoginForm /> : <SignUpForm />}

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowLogin(!showLogin)}
              className="text-sm font-medium text-red-600 hover:text-red-800 transition duration-150 ease-in-out"
            >
              {showLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
