import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import Templates from './pages/Templates';
import MediaUpload from './pages/MediaUpload';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import AdminDashboard from './pages/AdminDashboard';
import { ShieldOff, UserX, Menu, X, ShoppingBag, Globe } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './store/authStore';
import { getStoredAccentColor, applyAccentColor } from './utils/themeUtils';

function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ user, children }) {
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

function UserRoute({ user, children }) {
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

function Header({ user, onLogout, onMenuClick, installPromptEvent, onInstallApp }) {
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  if (!user) return null;
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b mb-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16 min-h-[44px] gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button className="md:hidden flex-shrink-0 p-2 -ml-1" onClick={onMenuClick} aria-label={t('common.openMenu')}>
            <Menu className="w-6 h-6 text-accent" />
          </button>
          <span className="font-bold text-accent truncate text-sm sm:text-base">Streamer Scheduler</span>
          <span className="hidden sm:inline text-gray-600 dark:text-gray-300 truncate text-sm">{user.isAdmin ? t('common.admin') : t('common.user')}: <span className="font-semibold">{user.username}</span></span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {process.env.REACT_APP_SHOW_PWA_INSTALL === 'true' && installPromptEvent && onInstallApp && (
            <button
              onClick={onInstallApp}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 hidden sm:inline"
            >
              {t('common.installApp') || 'Install app'}
            </button>
          )}
          <button
            onClick={toggleLanguage}
            className="p-2 sm:px-3 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 sm:gap-2"
            title={language === 'es' ? t('common.switchToEnglish') : t('common.switchToSpanish')}
          >
            <Globe className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">{language.toUpperCase()}</span>
          </button>
          <button
            onClick={() => { onLogout(); navigate('/login'); }}
            className="px-3 py-2 sm:px-4 bg-red-600 text-white rounded hover:bg-red-700 text-sm whitespace-nowrap"
          >
            {t('common.logout')}
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ user, open, onClose }) {
  const { t } = useLanguage();
  return (
    <>
      {/* Mobile overlay: tap to close sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          role="button"
          tabIndex={0}
          aria-label={t('common.closeMenu')}
        />
      )}
      <div className={`fixed inset-y-0 left-0 z-40 md:static md:inset-auto md:translate-x-0 transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 bg-white dark:bg-gray-800 md:bg-transparent shadow-xl md:shadow-none w-64 max-w-[85vw] md:w-56 h-full md:h-auto flex flex-col safe-area-inset-left`}>
        <div className="flex items-center justify-between px-4 py-4 md:hidden border-b border-gray-200 dark:border-gray-700">
          <span className="font-bold text-accent">{t('common.menu')}</span>
          <button onClick={onClose} className="p-2 -mr-2" aria-label={t('common.closeMenu')}><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        <Link to={user?.isAdmin ? "/admin" : "/dashboard"} className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">{t('dashboard.title')}</Link>
        {!user?.isAdmin && <Link to="/schedule" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">{t('schedule.newPost')}</Link>}
        {!user?.isAdmin && <Link to="/templates" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">{t('templates.menu') || 'Templates'}</Link>}
        {!user?.isAdmin && <Link to="/media" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">{t('media.menu') || t('media.title') || 'Media'}</Link>}
        <Link to="/settings" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">{t('settings.title')}</Link>
        <Link to="/profile" className="block px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-gray-700 font-medium">{t('profile.title')}</Link>
        {user?.isAdmin && <Link to="/admin" className="block px-3 py-2 rounded hover:bg-purple-100 dark:hover:bg-gray-700 font-medium">{t('admin.title')}</Link>}
      </nav>
    </div>
    </>
  );
}

function AppContent() {
  const { user, token, setAuth, clearAuth, setUser } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  // Close sidebar on mobile/tablet when route changes (e.g. after tapping Dashboard, Profile, Settings)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // PWA install: capture beforeinstallprompt and show our own button that calls prompt()
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(() => setDeferredInstallPrompt(null));
  };

  // Supabase OAuth redirects to app origin with hash (#access_token=...). Send to /auth/callback to process.
  useEffect(() => {
    const { pathname, hash } = window.location;
    if (pathname === '/' && hash && hash.includes('access_token')) {
      window.location.replace('/auth/callback' + hash);
    }
  }, []);

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
    applyAccentColor(getStoredAccentColor());

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

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 min-w-0">
        {user && <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Header user={user} onLogout={clearAuth} onMenuClick={() => setSidebarOpen(true)} installPromptEvent={deferredInstallPrompt} onInstallApp={handleInstallClick} />
          <div className="flex-1">
            <Routes>
              <Route path="/login" element={<Login setAuth={setAuth} />} />
              <Route path="/auth/callback" element={<AuthCallback setAuth={setAuth} />} />
              <Route path="/dashboard" element={
                <UserRoute user={user}>
                  <Dashboard user={user} token={token} />
                </UserRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute user={user}>
                  <AdminDashboard user={user} token={token} onLogout={clearAuth} />
                </AdminRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute user={user}>
                  <Settings user={user} token={token} setUser={setUser} />
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
              <Route path="/templates" element={
                <PrivateRoute user={user}>
                  <Templates user={user} token={token} />
                </PrivateRoute>
              } />
              <Route path="/discord" element={<Navigate to="/schedule" replace />} />
              <Route path="/media" element={
                <PrivateRoute user={user}>
                  <MediaUpload user={user} token={token} />
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
          {/* Icono de bolsa flotante para merchandising */}
          {user && user.merchandisingLink && (
            <a
              href={user.merchandisingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-accent text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label={t('common.merchandisingLink')}
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
          )}
          <footer className="text-center text-gray-500 py-3 sm:py-4 px-4 text-sm border-t bg-white dark:bg-gray-800">© 2025 Christian - Develop</footer>
        </div>
      </div>
    </>
  );
}

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </Router>
    </AuthProvider>
  </LanguageProvider>
);

export default App; 
