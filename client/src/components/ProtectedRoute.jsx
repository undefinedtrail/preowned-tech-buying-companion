import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/search" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-red-500/30 rounded-2xl text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Access Restricted</h2>
        <p className="text-slate-400">
          Your current role is <span className="font-semibold text-white">'{user.role}'</span>. This section requires one of: [{allowedRoles.join(', ')}].
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
