/**
 * Route guards for protected routes
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldOff, UserX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function AdminRoute({ user, children }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
        <ShieldOff className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-3xl font-bold text-red-700 mb-2">{t('common.accessDenied') || 'Access Denied'}</h2>
        <p className="mb-4 text-lg text-gray-700">{t('common.noAdminPermission') || 'You do not have permission to access the Admin Dashboard.'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">{t('common.goToUserDashboard') || 'Go to User Dashboard'}</button>
      </div>
    );
  }
  return children;
}

export function UserRoute({ user, children }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  if (!user) return <Navigate to="/login" replace />;
  if (user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
        <UserX className="w-16 h-16 text-purple-600 mb-4" />
        <h2 className="text-3xl font-bold text-purple-800 mb-2">{t('common.accessDenied') || 'Access Denied'}</h2>
        <p className="mb-4 text-lg text-gray-700">{t('common.adminsCannotAccessUserDashboard') || 'Admins cannot access the User Dashboard.'}</p>
        <button onClick={() => navigate('/admin')} className="px-6 py-2 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition">{t('common.goToAdminDashboard') || 'Go to Admin Dashboard'}</button>
      </div>
    );
  }
  return children;
}
