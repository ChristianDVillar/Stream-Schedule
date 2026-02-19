import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyMessages, getNotifications, getNotificationsUnreadCount, markNotificationRead } from '../api';
/**
 * Dropdown next to logout: Respuestas (admin replies to user messages) + Notificaciones (admin announcements).
 * Shown only for non-admin users.
 */
export default function MessagesAndNotificationsDropdown({ token }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const withReplies = (messages || []).filter(m => m.replies && m.replies.length > 0);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    Promise.all([
      getMyMessages(token).then(r => r.data.messages || []).catch(() => []),
      getNotifications(token).then(r => r.data.notifications || []).catch(() => []),
      getNotificationsUnreadCount(token).then(r => r.data.unreadCount ?? 0).catch(() => 0)
    ]).then(([msgs, notifs, count]) => {
      setMessages(msgs);
      setNotifications(notifs);
      setUnreadNotifCount(count);
    }).finally(() => setLoading(false));
  }, [open, token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const totalBadge = (withReplies.length) + unreadNotifCount;
  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
  };

  const handleMarkNotifRead = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    try {
      await markNotificationRead(id, token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 sm:px-3 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
        title="Mensajes y notificaciones"
        aria-label="Mensajes y notificaciones"
      >
        <MessageSquare className="w-5 h-5 flex-shrink-0" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[min(90vw,360px)] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Mensajes y notificaciones
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Cargando...</div>
            ) : (
              <>
                {/* Respuestas: admin replies to user messages */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                  <div className="px-3 py-2 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs font-semibold uppercase tracking-wide">
                    <MessageSquare className="w-4 h-4" />
                    Respuestas
                  </div>
                  {withReplies.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin respuestas nuevas</div>
                  ) : (
                    <ul className="py-1">
                      {withReplies.slice(0, 5).map((msg) => (
                        <li key={msg.id}>
                          <Link
                            to="/messages"
                            onClick={() => setOpen(false)}
                            className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                          >
                            <span className="font-medium truncate block">{msg.subject}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(msg.repliedAt || msg.updatedAt)}</span>
                          </Link>
                        </li>
                      ))}
                      {withReplies.length > 5 && (
                        <li>
                          <Link to="/messages" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-color-links hover:bg-gray-100 dark:hover:bg-gray-700">
                            Ver todas ({withReplies.length})
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                {/* Notificaciones: admin announcements */}
                <div>
                  <div className="px-3 py-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs font-semibold uppercase tracking-wide">
                    <Bell className="w-4 h-4" />
                    Notificaciones
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin notificaciones</div>
                  ) : (
                    <ul className="py-1">
                      {notifications.slice(0, 5).map((n) => (
                        <li key={n.id}>
                          <Link
                            to="/messages"
                            onClick={(e) => { if (!n.read) handleMarkNotifRead(e, n.id); setOpen(false); }}
                            className={`block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${!n.read ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                          >
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{n.title}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{n.content}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(n.createdAt)}</span>
                          </Link>
                        </li>
                      ))}
                      {notifications.length > 5 && (
                        <li>
                          <Link to="/messages" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-color-links hover:bg-gray-100 dark:hover:bg-gray-700">
                            Ver todas ({notifications.length})
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="p-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
            <Link
              to="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 text-sm font-medium text-color-links hover:underline"
            >
              Abrir centro de mensajes <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
