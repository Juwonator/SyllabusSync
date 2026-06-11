'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function ResultsHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/cbt/user-sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(res.data.sessions);
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-green-700 animate-pulse">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-4 px-4">
        <button onClick={() => router.back()} className="text-white text-2xl mb-2">←</button>
        <h1 className="text-white text-2xl font-bold">Result History</h1>
        <p className="text-white/70 text-sm">All your past practice sessions</p>
      </div>

      <div className="p-4 space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No sessions yet. Start a practice session!</div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-800">{session.exam_name} · {session.mode}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(session.completed_at).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Questions: {session.total_questions}</div>
                </div>
                <div className={`text-xl font-bold ${getScoreColor(session.score)}`}>
                  {Math.round(session.score)}%
                </div>
              </div>
              <button
                onClick={() => router.push(`/results/${session.id}`)}
                className="mt-3 text-green-700 text-sm font-medium"
              >
                View details →
              </button>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}