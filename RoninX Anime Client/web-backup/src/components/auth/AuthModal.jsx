import React from 'react';
import { X, Loader2 } from 'lucide-react';

export function AuthModal({
  authModalOpen,
  setAuthModalOpen,
  isSignUp,
  setIsSignUp,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authError,
  setAuthError,
  authLoading,
  handleAuthSubmit,
}) {
  if (!authModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-surface/90 border border-white/10 p-10 rounded-2xl shadow-2xl flex flex-col gap-6 backdrop-blur-2xl">
        <button 
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all border-none cursor-pointer"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-display font-extrabold text-white mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="text-[14px] text-zinc-400 font-medium">
            {isSignUp ? 'Sign up to sync your progress across devices' : 'Log in to recover your watch list and history'}
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Email Address</label>
            <input 
              type="email" 
              required
              placeholder="name@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-base text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all font-medium placeholder-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-base text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all font-medium placeholder-zinc-600"
            />
          </div>

          {authError && (
            <div className="text-sm font-bold text-accent bg-accent/10 border border-accent/20 rounded-xl py-2.5 px-4">
              {authError}
            </div>
          )}

          <button 
            type="submit"
            disabled={authLoading}
            className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white font-black text-base rounded-xl transition-all shadow-lg shadow-accent/20 border-none cursor-pointer flex items-center justify-center gap-2"
          >
            {authLoading ? <Loader2 size={20} className="animate-spin" /> : isSignUp ? 'SIGN UP' : 'LOG IN'}
          </button>
        </form>

        <div className="text-center text-sm font-medium text-zinc-400 mt-2">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setAuthError('');
            }}
            className="bg-transparent border-none text-accent hover:underline font-bold cursor-pointer"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
