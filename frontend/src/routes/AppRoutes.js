/**
 * Centralized route definitions
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import Schedule from '../pages/Schedule';
import Templates from '../pages/Templates';
import MediaUpload from '../pages/MediaUpload';
import Login from '../pages/Login';
import AuthCallback from '../pages/AuthCallback';
import AdminDashboard from '../pages/AdminDashboard';
import MessagesPage from '../pages/MessagesPage';
import TodoList from '../pages/TodoList';
import Privacy from '../pages/Privacy';
import Terms from '../pages/Terms';
import FAQ from '../pages/FAQ';
import Landing from '../pages/Landing';
import Pricing from '../pages/Pricing';
import { PrivateRoute, AdminRoute, UserRoute } from './routeGuards';

export function AppRoutes({ user, token, setAuth, setUser, clearAuth }) {
  return (
    <Routes>
      <Route path="/login" element={<Login setAuth={setAuth} />} />
      <Route path="/auth/callback" element={<AuthCallback setAuth={setAuth} />} />
      <Route path="/" element={!user ? <Landing /> : (user.isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/faq" element={<FAQ />} />
      <Route
        path="/dashboard"
        element={
          <UserRoute user={user}>
            <Dashboard user={user} token={token} />
          </UserRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute user={user}>
            <AdminDashboard user={user} token={token} onLogout={clearAuth} />
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute user={user}>
            <Settings user={user} token={token} setUser={setUser} />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute user={user}>
            <Profile user={user} token={token} />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <PrivateRoute user={user}>
            <Schedule user={user} token={token} />
          </PrivateRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <PrivateRoute user={user}>
            <Templates user={user} token={token} />
          </PrivateRoute>
        }
      />
      <Route path="/discord" element={<Navigate to="/schedule" replace />} />
      <Route
        path="/media"
        element={
          <PrivateRoute user={user}>
            <MediaUpload user={user} token={token} />
          </PrivateRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <PrivateRoute user={user}>
            <MessagesPage token={token} />
          </PrivateRoute>
        }
      />
      <Route
        path="/todos"
        element={
          <PrivateRoute user={user}>
            <TodoList token={token} />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
