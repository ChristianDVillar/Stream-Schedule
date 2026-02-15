import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import MyMessages from '../components/MyMessages';
import { getNotifications, markNotificationRead } from '../api';

/**
 * Centro de mensajes: conversaciones con soporte (MyMessages) + notificaciones del admin.
 */
export default function MessagesPage({ token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!token) return;
    getNotifications(token)
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => setNotifications([]));
  }, [token]);

  const handleMarkRead = async (id) => {
    if (!token) return;
    try {
      await markNotificationRead(id, token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (_) {}
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : '');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mensajes y notificaciones</h1>

      {/* Notificaciones del admin */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 font-semibold">
          <Bell className="w-5 h-5" />
          Notificaciones
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-gray-500 dark:text-gray-400 text-sm">No hay notificaciones.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-4 ${!n.read ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{n.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="flex-shrink-0 px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Conversaciones con soporte */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 font-semibold">
          <MessageSquare className="w-5 h-5" />
          Respuestas de soporte
        </div>
        <div className="p-4">
          <MyMessages token={token} />
        </div>
      </section>
    </div>
  );
}
