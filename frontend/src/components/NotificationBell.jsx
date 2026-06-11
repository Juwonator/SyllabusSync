'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) &&
          bellRef.current && !bellRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative" ref={bellRef}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a7 7 0 017 7v1l1.5 2.5H1.5L3 10V9a7 7 0 017-7z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 15.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
      {showPanel && (
        <div ref={panelRef} className="absolute right-0 top-12 w-80 z-50">
          <NotificationPanel onClose={() => setShowPanel(false)} onRead={fetchUnreadCount} />
        </div>
      )}
    </>
  );
}