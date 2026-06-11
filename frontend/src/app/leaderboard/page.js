'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [filter, setFilter] = useState('all');
  const [subject, setSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (userStr) setCurrentUserId(JSON.parse(userStr).id);

        const res = await axios.get(`http://localhost:5000/api/leaderboard?filter=${filter}&subject=${subject}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLeaders(res.data.leaders);
        setCurrentUserRank(res.data.currentUserRank);
      } catch (err) {
        console.error('Failed to load leaderboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [filter, subject]);

  // Helper to get avatar color based on rank
  const getAvatarColor = (rank) => {
    if (rank === 1) return 'bg-amber-400 text-amber-900';
    if (rank === 2) return 'bg-gray-300 text-gray-800';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-green-100 text-green-800';
  };

  // Get top 3 for podium
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-green-700 text-xl animate-pulse">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-4 px-4">
        <button onClick={() => router.back()} className="text-white text-2xl mb-2">←</button>
        <h1 className="text-white text-2xl font-bold">Leaderboard</h1>
        <p className="text-white/70 text-sm">Top performers across all exams</p>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-gray-200 bg-white">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          All Time
        </button>
        <button
          onClick={() => setFilter('week')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === 'week' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          This Week
        </button>
        <button
          onClick={() => setFilter('month')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === 'month' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          This Month
        </button>
        <div className="w-px bg-gray-300 mx-1"></div>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border-none"
        >
          <option value="all">All Subjects</option>
          <option value="Mathematics">Mathematics</option>
          <option value="English Language">English</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Biology">Biology</option>
        </select>
      </div>

      {/* Podium (top 3) */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-4 py-6 px-4 bg-gradient-to-b from-green-50 to-white">
          {/* 2nd place */}
          {top3[1] && (
            <div className="text-center flex-1">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700 border-4 border-gray-300">
                {top3[1].full_name.charAt(0)}
              </div>
              <div className="font-bold text-gray-800 mt-2">{top3[1].full_name.split(' ')[0]}</div>
              <div className="text-xs text-gray-500">{top3[1].total_xp} XP</div>
              <div className="mt-1 text-2xl">🥈</div>
            </div>
          )}
          {/* 1st place */}
          {top3[0] && (
            <div className="text-center flex-1 -mt-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-3xl font-bold text-amber-900 border-4 border-amber-300 shadow-lg">
                {top3[0].full_name.charAt(0)}
              </div>
              <div className="font-bold text-gray-800 mt-2 text-lg">{top3[0].full_name.split(' ')[0]}</div>
              <div className="text-sm text-green-700 font-semibold">{top3[0].total_xp} XP</div>
              <div className="mt-1 text-3xl">🥇</div>
            </div>
          )}
          {/* 3rd place */}
          {top3[2] && (
            <div className="text-center flex-1">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-800 border-4 border-orange-200">
                {top3[2].full_name.charAt(0)}
              </div>
              <div className="font-bold text-gray-800 mt-2">{top3[2].full_name.split(' ')[0]}</div>
              <div className="text-xs text-gray-500">{top3[2].total_xp} XP</div>
              <div className="mt-1 text-2xl">🥉</div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard list */}
      <div className="px-4 py-3 space-y-2">
        {rest.map((user, idx) => {
          const rank = idx + 4; // because top3 already displayed
          const isCurrentUser = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${isCurrentUser ? 'bg-green-50 border border-green-200' : 'bg-white shadow-sm'}`}
            >
              <div className="w-8 text-center font-mono font-bold text-gray-500">{rank}</div>
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(rank)} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{user.full_name}</div>
                <div className="text-xs text-gray-500">{user.total_xp} XP</div>
              </div>
              {isCurrentUser && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">You</span>}
            </div>
          );
        })}

        {leaders.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No leaderboard data yet. Complete practice sessions to earn XP!
          </div>
        )}

        {/* Show current user rank if not in top50 */}
        {currentUserRank && currentUserRank > 50 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="w-8 text-center font-mono font-bold text-gray-500">{currentUserRank}</div>
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold">You</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">Your rank</div>
                <div className="text-xs text-gray-500">Keep practicing to climb!</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}