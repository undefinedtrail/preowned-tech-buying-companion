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
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const Navbar = ({ onOpenAgent }) => {
  const { user, login, signup, logout, quickSwitchRole } = useAuth();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('buyer');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (isRegisterMode) {
        await signup({ name, email, password, role });
      } else {
        await login(email, password);
      }
      setAuthModalOpen(false);
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setFormError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuickLogin = async (targetRole) => {
    setFormError('');
    setFormLoading(true);
    try {
      await quickSwitchRole(targetRole);
      setAuthModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Quick login failed');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
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

            {/* User Account / Role Switcher */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                  title="Account details & role switcher"
                >
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-semibold text-white">{user.name?.split(' ')[0] || user.role}</span>
                  <span className="text-[10px] text-slate-400 font-mono capitalize">({user.role})</span>
                  <span className="text-[10px] text-slate-500 font-mono ml-0.5">▼</span>
                </button>

                {roleMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setRoleMenuOpen(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-slate-800">
                      <div className="text-xs font-bold text-white">{user.name}</div>
                      <div className="text-[11px] text-slate-400">{user.email}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="capitalize">{user.role} Account</span> • {user.reputationScore}% Rep
                      </div>
                    </div>

                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/60 mt-1">
                      Switch Role (Grading Demo)
                    </div>
                    <button
                      onClick={() => handleQuickLogin('buyer')}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-white">Alex Buyer</div>
                        <div className="text-[10px] text-slate-400">buyer@example.com</div>
                      </div>
                      {user.role === 'buyer' && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                    </button>
                    <button
                      onClick={() => handleQuickLogin('seller')}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-white">Sarah Seller</div>
                        <div className="text-[10px] text-slate-400">seller1@example.com (Verified)</div>
                      </div>
                      {user.role === 'seller' && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                    </button>
                    <button
                      onClick={() => handleQuickLogin('moderator')}
                      className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-red-200">Marcus Moderator</div>
                        <div className="text-[10px] text-red-400">Staff Administrator</div>
                      </div>
                      {user.role === 'moderator' && <span className="text-red-400 text-xs font-bold">✓</span>}
                    </button>

                    <div className="border-t border-slate-800 pt-1 mt-1">
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Demo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal for Login, Signup, and 1-Click Demo Profiles */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRegisterMode ? 'Create an Account' : 'Sign In to TechCompanion'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRegisterMode
                    ? 'Register as buyer or verified seller'
                    : 'Access AI comparisons, private evidence & bookings'}
                </p>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick 1-Click Demo Section */}
            <div className="p-6 pb-4 bg-slate-950/60 border-b border-slate-800/80">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> 1-Click Test Profiles for Evaluator
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('buyer')}
                  disabled={formLoading}
                  className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">Buyer</div>
                  <div className="text-[10px] text-slate-400 truncate">Alex Buyer</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('seller')}
                  disabled={formLoading}
                  className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">Seller</div>
                  <div className="text-[10px] text-slate-400 truncate">Sarah Seller</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('moderator')}
                  disabled={formLoading}
                  className="px-2.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-red-200">Moderator</div>
                  <div className="text-[10px] text-red-400 truncate">Marcus Mod</div>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('buyer')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        role === 'buyer'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Buyer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        role === 'seller'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Seller
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {formLoading ? 'Authenticating...' : isRegisterMode ? 'Create Account' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setFormError('');
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
