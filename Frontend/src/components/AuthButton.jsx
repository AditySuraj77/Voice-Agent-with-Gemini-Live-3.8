import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Cloud, ChevronDown } from 'lucide-react';

export function AuthButton() {
  const { user, profile, loading, signInWithGoogle, signOut, isConfigured } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConfigured) {
    return null;
  }

  if (loading) {
    return (
      <div className="h-7 w-24 rounded-full bg-stone-200/60 animate-pulse" />
    );
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={signingIn}
        aria-label="Sign in with Google"
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 text-xs font-sans font-medium border border-stone-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="hidden sm:inline">{signingIn ? 'Connecting...' : 'Sign in with Google'}</span>
        <span className="sm:hidden">{signingIn ? '...' : 'Sign in'}</span>
      </button>
    );
  }

  const displayName = profile?.fullName || user.email?.split('@')[0] || 'Student';
  const firstName = displayName.split(' ')[0];
  const avatarUrl = profile?.avatarUrl;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 text-stone-800 text-xs font-sans font-medium border border-stone-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        aria-expanded={dropdownOpen}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-4.5 h-4.5 rounded-full object-cover ring-1 ring-stone-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-4.5 h-4.5 rounded-full bg-linear-to-tr from-amber-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center ring-1 ring-stone-300">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="max-w-[90px] truncate text-stone-700 font-semibold">{firstName}</span>
        <ChevronDown className="w-3 h-3 text-stone-400 transition-transform duration-200" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-stone-200 shadow-xl py-2 z-50 text-stone-800 animate-in fade-in zoom-in-95 duration-150 font-sans">
          <div className="px-4 py-2 border-b border-stone-100">
            <p className="text-xs font-bold text-stone-900 truncate">{displayName}</p>
            <p className="text-[11px] text-stone-400 truncate mt-0.5">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold w-fit">
              <Cloud className="w-3 h-3 text-emerald-600" />
              <span>Cloud Memory Active</span>
            </div>
          </div>

          <div className="px-1.5 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
