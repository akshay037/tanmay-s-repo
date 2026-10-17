import React, { useState } from 'react';
import { useLoginMutation } from '../store/apiSlice';
import { Coins, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      await login({ username, password }).unwrap();
    } catch (err) {
      setErrorMessage(err?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100/60 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Red & Rose Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border-2 border-red-200 rounded-3xl shadow-2xl p-6 sm:p-8 z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-red-500/30 border-2 border-white">
            <Coins className="w-9 h-9 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-red-800 tracking-tight">
            Draikola
          </h1>
          {/* <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin &bull; Admin &bull; User Gaming & Point System
          </p> */}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-3 bg-red-50/40 border-2 border-red-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-red-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-red-500/25 disabled:opacity-50 flex items-center justify-center space-x-2 mt-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>Sign In to Dashboard</span>
          </button>
        </form>

        {/* Quick Demo Credentials Box */}
        <div className="mt-8 pt-6 border-t-2 border-red-100 text-center">
          <p className="text-xs text-slate-500 font-bold mb-3">Quick Demo Credentials:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleQuickFill('superadmin', 'SuperAdmin@123')}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 text-xs rounded-xl border border-red-200 transition-colors font-mono font-bold"
            >
              Super Admin
            </button>
            <button
              onClick={() => handleQuickFill('user1', '12345678')}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 text-xs rounded-xl border border-red-200 transition-colors font-mono font-bold"
            >
              User 1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
