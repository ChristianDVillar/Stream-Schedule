import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, Globe } from 'lucide-react';
import { AppRoutes } from './routes/AppRoutes';
import HeaderBanners from './components/HeaderBanners';
import MessagesAndNotificationsDropdown from './components/MessagesAndNotificationsDropdown';
import ThemeImage from './components/ThemeImage';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './store/authStore';
import { getStoredAccentColor, applyAccentColor, THEME_CHANGE_EVENT } from './utils/themeUtils';
import { APP_VERSION } from './version';
import { getUnreadMessageCount, getAdminFeatures, apiClient } from './api';

const PUBLIC_PAGES_WITH_OWN_FOOTER = ['/', '/pricing', '/privacy', '/terms', '/faq'];

function Header({ user, token, onLogout, onMenuClick, installPromptEvent, onInstallApp }) {
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tid = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tid);
  }, []);

  if (!user) return null;
  const locale = language === 'es' ? 'es' : 'en';
  const dateTimeStr = now.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const settingsLabel = t('settings.profile') || t('settings.title') || 'Settings';
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b mb-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16 min-h-[44px] gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            type="button"
            className="md:hidden flex-shrink-0 p-2 -ml-1 rounded focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
            onClick={onMenuClick}
            aria-label={t('common.openMenu')}
          >
            <Menu className="w-6 h-6 text-accent" />
          </button>
          <button
            type="button"
            onClick={() => navigate(user.isAdmin ? '/admin' : '/dashboard')}
            className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
            title={user.isAdmin ? (t('common.goToAdminDashboard') || 'Go to Admin') : (t('common.goToUserDashboard') || 'Go to Dashboard')}
            aria-label={user.isAdmin ? (t('common.goToAdminDashboard') || 'Go to Admin') : (t('common.goToUserDashboard') || 'Go to Dashboard')}
          >
            <ThemeImage
              srcLight="/blacklogo.png"
              srcDark="/whitelogo.png"
              alt=""
              className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 object-contain rounded-lg ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-white dark:ring-offset-gray-800"
              aria-hidden
            />
            <span className="font-bold text-accent truncate text-sm sm:text-base hover:opacity-90">Streamer Scheduler</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0 flex items-center justify-center ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-white dark:ring-offset-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
            title={settingsLabel}
            aria-label={settingsLabel}
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt=""
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
                aria-hidden
              />
            ) : (
              <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'var(--accent)' }}>
                {user.username?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </button>
          <span className="hidden sm:inline text-gray-600 dark:text-gray-300 truncate text-sm">{user.isAdmin ? t('common.admin') : t('common.user')}: <span className="font-semibold">{user.username}</span></span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {process.env.REACT_APP_SHOW_PWA_INSTALL === 'true' && installPromptEvent && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 hidden sm:inline focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
            >
              {t('common.installApp') || 'Install app'}
            </button>
          )}
          {!user.isAdmin && token && <MessagesAndNotificationsDropdown token={token} />}
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-2 sm:px-3 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
            title={language === 'es' ? t('common.switchToEnglish') : t('common.switchToSpanish')}
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline text-sm font-medium">{language.toUpperCase()}</span>
          </button>
          <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 tabular-nums" title={dateTimeStr}>
            {dateTimeStr}
          </span>
          <button
            type="button"
            onClick={() => { onLogout(); navigate('/login'); }}
            className="px-3 py-2 sm:px-4 bg-red-600 text-white rounded hover:bg-red-700 text-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
          >
            {t('common.logout')}
          </button>
        </div>
      </div>
      <HeaderBanners />
    </header>
  );
}

function Sidebar({ user, open, onClose, adminUnreadMessageCount = 0, adminFinance = true }) {
  const { t } = useLanguage();
  const location = useLocation();
  const supportCount = adminUnreadMessageCount ?? 0;
  
  // Helper to check if route is active
  const isActive = (path) => {
    if (path.includes('?')) {
      const [basePath, query] = path.split('?');
      const [queryKey] = query.split('=');
      return location.pathname === basePath && location.search.includes(`${queryKey}=`);
    }
    return location.pathname === path;
  };
  
  // Helper to get link classes
  const getLinkClasses = (path) => {
    const baseClasses = "block px-3 py-2 rounded font-medium transition-colors";
    const activeClasses = isActive(path) 
      ? "bg-color-sidebar/10 text-color-sidebar dark:bg-color-sidebar/20" 
      : "text-gray-700 dark:text-gray-300 hover:bg-color-sidebar/10 dark:hover:bg-gray-700";
    return `${baseClasses} ${activeClasses}`;
  };
  
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
        <Link to={user?.isAdmin ? "/admin" : "/dashboard"} className={getLinkClasses(user?.isAdmin ? "/admin" : "/dashboard")}>{t('dashboard.title')}</Link>
        {!user?.isAdmin && <Link to="/schedule" className={getLinkClasses("/schedule")}>{t('schedule.newPost')}</Link>}
        {!user?.isAdmin && <Link to="/templates" className={getLinkClasses("/templates")}>{t('templates.menu') || 'Templates'}</Link>}
        {!user?.isAdmin && <Link to="/media" className={getLinkClasses("/media")}>{t('media.menu') || t('media.title') || 'Media'}</Link>}
        <Link to="/todos" className={getLinkClasses("/todos")}>{t('todo.menu') || 'To-do'}</Link>
        {!user?.isAdmin && <Link to="/messages" className={getLinkClasses("/messages")}>{t('common.messages')}</Link>}
        <Link to="/settings" className={getLinkClasses("/settings")}>{t('settings.title')}</Link>
        <Link to="/profile" className={getLinkClasses("/profile")}>{t('profile.title')}</Link>
        {user?.isAdmin && (
          <>
            <Link to="/admin?section=overview" className={getLinkClasses("/admin?section=overview") + " pl-6 text-sm"}>{t('admin.menuOverview')}</Link>
            <Link to="/admin?section=users" className={getLinkClasses("/admin?section=users") + " pl-6 text-sm"}>{t('admin.menuUsers')}</Link>
            <Link to="/admin?section=support" className={getLinkClasses("/admin?section=support") + " pl-6 text-sm flex items-center justify-between"}>
              <span>{t('admin.menuSupport')}</span>
              <span className={`min-w-[1.25rem] text-center text-xs font-semibold rounded-full px-1.5 py-0.5 ${supportCount > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>{supportCount}</span>
            </Link>
            <Link to="/admin?section=notifications" className={getLinkClasses("/admin?section=notifications") + " pl-6 text-sm"}>{t('admin.menuNotifications')}</Link>
            <Link to="/admin?section=platforms" className={getLinkClasses("/admin?section=platforms") + " pl-6 text-sm"}>{t('admin.menuPlatforms')}</Link>
            <Link to="/admin?section=payments" className={getLinkClasses("/admin?section=payments") + " pl-6 text-sm"}>{t('admin.menuPayments')}</Link>
            {adminFinance && <Link to="/admin?section=alerts" className={getLinkClasses("/admin?section=alerts") + " pl-6 text-sm"}>{t('admin.menuAlerts')}</Link>}
          </>
        )}
      </nav>
    </div>
    </>
  );
}

/** Parse merchandisingButtonPosition: preset string or JSON {x,y} */
function parseMerchandisingPosition(pos) {
  if (!pos) return { x: 92, y: 92 };
  if (typeof pos === 'object' && typeof pos.x === 'number' && typeof pos.y === 'number') {
    return { x: Math.max(0, Math.min(100, pos.x)), y: Math.max(0, Math.min(100, pos.y)) };
  }
  if (typeof pos === 'string') {
    try {
      const parsed = JSON.parse(pos);
      if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return { x: Math.max(0, Math.min(100, parsed.x)), y: Math.max(0, Math.min(100, parsed.y)) };
      }
    } catch (_) {}
    const preset = { 'bottom-right': { x: 92, y: 92 }, 'bottom-left': { x: 8, y: 92 }, 'top-right': { x: 92, y: 8 }, 'top-left': { x: 8, y: 8 } };
    return preset[pos] || preset['bottom-right'];
  }
  return { x: 92, y: 92 };
}

function DraggableMerchandisingButton({ link, position, token, setUser, user, t }) {
  const parsed = parseMerchandisingPosition(position);
  const [pos, setPos] = React.useState(parsed);
  const dragStartRef = React.useRef(null);
  const hasMovedRef = React.useRef(false);

  React.useEffect(() => {
    setPos(parseMerchandisingPosition(position));
  }, [position]);

  const savePosition = React.useCallback(async (x, y) => {
    if (!token || !setUser || !user) return;
    try {
      const response = await apiClient.put('/user/profile', { merchandisingButtonPosition: { x, y } }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (response.data?.user) {
        setUser({ ...user, ...response.data.user });
      }
    } catch (_) {}
  }, [token, setUser, user]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragStartRef.current === null) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = e.clientX;
    const cy = e.clientY;
    const start = dragStartRef.current;
    const dist = Math.sqrt((cx - start.x) ** 2 + (cy - start.y) ** 2);
    if (dist > 5) hasMovedRef.current = true;
    const dx = ((cx - start.x) / w) * 100;
    const dy = ((cy - start.y) / h) * 100;
    const nx = Math.max(0, Math.min(100, start.posX + dx));
    const ny = Math.max(0, Math.min(100, start.posY + dy));
    setPos({ x: nx, y: ny });
    dragStartRef.current = { x: cx, y: cy, posX: nx, posY: ny };
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const start = dragStartRef.current;
    const finalX = start ? start.posX : pos.x;
    const finalY = start ? start.posY : pos.y;
    if (hasMovedRef.current) {
      setPos({ x: finalX, y: finalY });
      savePosition(finalX, finalY);
    }
    dragStartRef.current = null;
  };

  const handlePointerCancel = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragStartRef.current && hasMovedRef.current) {
      const start = dragStartRef.current;
      setPos({ x: start.posX, y: start.posY });
      savePosition(start.posX, start.posY);
    }
    dragStartRef.current = null;
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (!hasMovedRef.current) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="fixed z-50 bg-accent text-white rounded-full p-3 sm:p-4 shadow-lg transition-shadow duration-300 hover:scale-110 flex items-center justify-center min-w-[44px] min-h-[44px] select-none cursor-grab active:cursor-grabbing touch-none"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        margin: 0,
      }}
      aria-label={t('common.merchandisingLink')}
    >
      <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" />
    </a>
  );
}

function AppContent() {
  const { user, token, setAuth, clearAuth, setUser } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [adminUnreadMessageCount, setAdminUnreadMessageCount] = useState(0);
  const [adminFinance, setAdminFinance] = useState(true);
  // Admin: fetch unread support message count and feature flags for sidebar
  useEffect(() => {
    if (!user?.isAdmin || !token) {
      setAdminUnreadMessageCount(0);
      setAdminFinance(true);
      return;
    }
    getUnreadMessageCount(token)
      .then((r) => setAdminUnreadMessageCount(r.data?.unreadCount ?? 0))
      .catch(() => setAdminUnreadMessageCount(0));
    getAdminFeatures(token)
      .then((f) => setAdminFinance(f.adminFinance))
      .catch(() => setAdminFinance(false));
  }, [user?.isAdmin, token, location.pathname]);

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
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
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
        {user && <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} adminUnreadMessageCount={adminUnreadMessageCount} adminFinance={adminFinance} />}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Header user={user} token={token} onLogout={clearAuth} onMenuClick={() => setSidebarOpen(true)} installPromptEvent={deferredInstallPrompt} onInstallApp={handleInstallClick} />
          <div className="flex-1">
            <AppRoutes user={user} token={token} setAuth={setAuth} setUser={setUser} clearAuth={clearAuth} />
          </div>
          {/* Icono de bolsa flotante para merchandising - arrastrable */}
          {user && user.merchandisingLink && (
            <DraggableMerchandisingButton
              link={user.merchandisingLink}
              position={user.merchandisingButtonPosition}
              token={token}
              setUser={setUser}
              user={user}
              t={t}
            />
          )}
          {!PUBLIC_PAGES_WITH_OWN_FOOTER.includes(location.pathname) && (
            <footer className="text-center text-gray-500 dark:text-gray-400 py-3 sm:py-4 px-4 text-sm border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span>© {new Date().getFullYear()} Christian · Develop · v{APP_VERSION}</span>
                <Link to="/faq" className="hover:text-accent underline">{t('faq.menuTitle') || 'FAQ'}</Link>
                <Link to="/privacy" className="hover:text-accent underline">{t('footer.privacy') || 'Privacy'}</Link>
                <Link to="/terms" className="hover:text-accent underline">{t('footer.terms') || 'Terms'}</Link>
              </span>
            </footer>
          )}
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
