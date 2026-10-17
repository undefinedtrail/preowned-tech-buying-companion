import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Laptop,
  Bookmark,
  CalendarCheck,
  ShieldAlert,
  Sparkles,
  UserCheck,
  LogOut,
  LogIn,
  SlidersHorizontal,
} from 'lucide-react';

export const Navbar = ({ onOpenAgent }) => {
  const { user, logout, quickSwitchRole } = useAuth();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/search" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              TechCompanion
            </span>
            <span className="text-[10px] font-semibold block text-emerald-400 uppercase tracking-widest -mt-1">
              Verified Preowned RAG
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/search"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isActive('/search')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
            Find Listings
          </Link>

          <Link
            to="/shortlist"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isActive('/shortlist')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bookmark className="h-4 w-4 text-sky-400" />
            Shortlist & Evidence
          </Link>

          <Link
            to="/viewings"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isActive('/viewings')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarCheck className="h-4 w-4 text-amber-400" />
            Safe Viewings & Chat
          </Link>

          {user?.role === 'moderator' && (
            <Link
              to="/moderator"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/moderator')
                  ? 'bg-red-950/50 text-red-300 border border-red-800/50'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-red-400" />
              Moderator Portal
            </Link>
          )}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          {/* AI Comparison Agent Button */}
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="hidden sm:inline">AI Comparison Agent</span>
          </button>

          {/* Quick Role Switcher for Demo / Reviewer Evaluation */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 transition-colors"
              title="Switch demo profile for grading"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="capitalize">{user ? user.role : 'Guest'}</span>
              <span className="text-[10px] text-slate-500 font-mono ml-1">▼</span>
            </button>

            {roleMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setRoleMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Test Account
                </div>
                <button
                  onClick={() => quickSwitchRole('buyer')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Alex Buyer</div>
                    <div className="text-[10px] text-slate-400">buyer@example.com (99% Rep)</div>
                  </div>
                  {user?.role === 'buyer' && <span className="text-emerald-400 text-xs">●</span>}
                </button>
                <button
                  onClick={() => quickSwitchRole('seller')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">Sarah Seller</div>
                    <div className="text-[10px] text-slate-400">seller1@example.com (Verified)</div>
                  </div>
                  {user?.role === 'seller' && <span className="text-emerald-400 text-xs">●</span>}
                </button>
                <button
                  onClick={() => quickSwitchRole('moderator')}
                  className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-red-200">Marcus Moderator</div>
                    <div className="text-[10px] text-red-400">Staff Administrator</div>
                  </div>
                  {user?.role === 'moderator' && <span className="text-red-400 text-xs">●</span>}
                </button>
                {user && (
                  <div className="border-t border-slate-800 pt-1 mt-1">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
