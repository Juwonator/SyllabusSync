'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function NotificationPanel({ onClose, onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      if (onRead) onRead();
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onRead) onRead();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIconForType = (type) => {
    switch (type) {
      case 'achievement': return '🏆';
      case 'streak': return '🔥';
      case 'reminder': return '⏰';
      default: return '📬';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
        <div className="p-4 text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-700 overflow-hidden max-h-96 overflow-y-auto">
      <div className="sticky top-0 bg-gray-900 p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-white">Notifications</h3>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="text-xs text-green-400 hover:text-green-300">
            Mark all read
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-800">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No notifications yet
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-3 cursor-pointer transition ${!notif.is_read ? 'bg-gray-800/50' : ''}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="flex gap-2">
                <div className="text-2xl">{getIconForType(notif.type)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{notif.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{notif.message}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!notif.is_read && <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}