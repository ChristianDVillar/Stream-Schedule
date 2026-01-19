import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { ShieldOff, UserX, Menu, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ user, children }) {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
        <ShieldOff className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-3xl font-bold text-red-700 mb-2">Access Denied</h2>
        <p className="mb-4 text-lg text-gray-700">You do not have permission to access the <span className="font-semibold text-purple-700">Admin Dashboard</span>.</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">Go to User Dashboard</button>
      </div>
    );
  }
  return children;
}

function UserRoute({ user, children }) {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
        <UserX className="w-16 h-16 text-purple-600 mb-4" />
        <h2 className="text-3xl font-bold text-purple-800 mb-2">Access Denied</h2>
        <p className="mb-4 text-lg text-gray-700">Admins cannot access the <span className="font-semibold text-blue-700">User Dashboard</span>.</p>
        <button onClick={() => navigate('/admin')} className="px-6 py-2 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition">Go to Admin Dashboard</button>
      </div>
    );
  }
  return children;
}

function Header({ user, onLogout, onMenuClick }) {
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b mb-4">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center space-x-4">
          <button className="md:hidden" onClick={onMenuClick} aria-label="Open menu">
            <Menu className="w-6 h-6 text-primary-700" />
          </button>
          <span className="font-bold text-primary-700">Streamer Scheduler</span>
          <span className="text-gray-600 dark:text-gray-300">{user.isAdmin ? 'Admin' : 'User'}: <span className="font-semibold">{user.username}</span></span>
        </div>
        <button
          onClick={() => { onLogout(); navigate('/login'); }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function Sidebar({ user, open, onClose }) {
  return (
    <div className={`fixed inset-0 z-40 md:static md:inset-auto md:translate-x-0 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 bg-white dark:bg-gray-800 md:bg-transparent shadow-lg md:shadow-none w-64 md:w-56 h-full md:h-auto flex flex-col`}>
      <div className="flex items-center justify-between px-4 py-4 md:hidden">
        <span className="font-bold text-primary-700">Menu</span>
        <button onClick={onClose} aria-label="Close menu"><X className="w-6 h-6" /></button>
      </div>
      <nav className="flex-1 px-4 py-2 space-y-2">
        <Link to={user?.isAdmin ? "/admin" : "/dashboard"} className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">Dashboard</Link>
        {!user?.isAdmin && <Link to="/schedule" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">New Content</Link>}
        <Link to="/settings" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">Settings</Link>
        <Link to="/profile" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">Profile</Link>
        {user?.isAdmin && <Link to="/admin" className="block px-3 py-2 rounded hover:bg-purple-100 dark:hover:bg-gray-700 font-medium">Admin Licenses</Link>}
      </nav>
    </div>
  );
}

const App = () => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('auth_token') || null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const storedTheme = localStorage.getItem('theme') || 'light';
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (storedTheme === 'auto') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme();
    if (media && media.addEventListener) {
      media.addEventListener('change', handler);
    }
    return () => {
      if (media && media.removeEventListener) {
        media.removeEventListener('change', handler);
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }, [token]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {user && <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <div className="flex-1 flex flex-col">
          <Header user={user} onLogout={handleLogout} onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1">
            <Routes>
              <Route path="/login" element={<Login setUser={setUser} setToken={setToken} />} />
              <Route path="/dashboard" element={
                <UserRoute user={user}>
                  <Dashboard user={user} token={token} />
                </UserRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute user={user}>
                  <AdminDashboard user={user} token={token} onLogout={handleLogout} />
                </AdminRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute user={user}>
                  <Settings user={user} token={token} />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute user={user}>
                  <Profile user={user} token={token} />
                </PrivateRoute>
              } />
              <Route path="/schedule" element={
                <PrivateRoute user={user}>
                  <Schedule user={user} token={token} />
                </PrivateRoute>
              } />
              <Route path="/" element={
                user
                  ? user.isAdmin
                    ? <Navigate to="/admin" replace />
                    : <Navigate to="/dashboard" replace />
                  : <Navigate to="/login" replace />
              } />
            </Routes>
          </div>
          <footer className="text-center text-gray-500 py-4 border-t bg-white dark:bg-gray-800">© 2025 Christian - Develop</footer>
        </div>
      </div>
    </Router>
  );
};

export default App; 
