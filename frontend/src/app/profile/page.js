'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';
import AchievementIcon from '@/components/AchievementIcon';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ xp: 0, streak: 0, topicsDone: 0 });
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        // Profile data
        const profileRes = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(profileRes.data);
        setForm(profileRes.data);

        // Dashboard stats (XP, streak, topicsDone)
        const statsRes = await axios.get('http://localhost:5000/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data);

        // Leaderboard rank
        const rankRes = await axios.get('http://localhost:5000/api/dashboard/leaderboard-rank', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLeaderboardRank(rankRes.data.rank);

        // Total sessions & average score from practice_sessions
        const sessionsRes = await axios.get('http://localhost:5000/api/cbt/user-sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Fetch achievements
        const achRes = await axios.get('http://localhost:5000/api/achievements/my-achievements', {
        headers: { Authorization: `Bearer ${token}` }
        });
        setAchievements(achRes.data);
        const sessions = sessionsRes.data.sessions || [];
        setTotalSessions(sessions.length);
        if (sessions.length > 0) {
          const sum = sessions.reduce((acc, s) => acc + (s.score || 0), 0);
          setAvgScore(Math.round(sum / sessions.length));
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
        if (err.response?.status === 401) router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/auth/profile', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setEditing(false);
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...res.data }));
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-green-700 text-xl animate-pulse">Loading profile...</div>
      </div>
    );
  }

  
  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology']; // dynamic later

  const examTopicsTotal = 50; // placeholder
  const topicsCompleted = stats.topicsDone;
  const examProgress = Math.min(100, Math.round((topicsCompleted / examTopicsTotal) * 100));

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header with green gradient (same as dashboard) */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-8 px-4 relative overflow-hidden">
        <button onClick={() => router.back()} className="text-white text-2xl mb-2">←</button>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-amber-300 flex items-center justify-center text-3xl font-bold text-green-900 border-2 border-white shadow-md">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold">{profile?.full_name}</h1>
            <p className="text-white/70 text-sm">{profile?.email}</p>
            <p className="text-white/50 text-xs mt-1">
              Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
            </p>
          </div>
        </div>

        {/* Stats row – same as dashboard header */}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl">⚡</div>
            <div className="text-white font-bold text-lg">{stats.xp}</div>
            <div className="text-white/60 text-xs">XP Points</div>
          </div>
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl">🔥</div>
            <div className="text-white font-bold text-lg">{stats.streak}</div>
            <div className="text-white/60 text-xs">Day Streak</div>
          </div>
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl">✅</div>
            <div className="text-white font-bold text-lg">{stats.topicsDone}</div>
            <div className="text-white/60 text-xs">Topics Done</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Additional Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-gray-500 text-xs">Sessions</div>
            <div className="text-xl font-bold text-gray-800">{totalSessions}</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-gray-500 text-xs">Avg. Score</div>
            <div className="text-xl font-bold text-green-700">{avgScore}%</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-gray-500 text-xs">Leaderboard</div>
            <div className="text-xl font-bold text-amber-700">#{leaderboardRank || '—'}</div>
          </div>
        </div>

        {/* School & Edit Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          {!editing ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-gray-500 text-xs">School</div>
                  <div className="font-medium text-gray-800">{profile?.school_name || 'Not set'}</div>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="text-green-700 text-sm font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M13.5 2.5L17.5 6.5M2 18l3-1 9-9-3-3-9 9-1 3z" stroke="currentColor" strokeWidth="1.5" /></svg>
                  Edit
                </button>
              </div>
              <div className="mt-3 text-gray-500 text-xs">Class Level: {profile?.class_level || 'Not set'}</div>
              <div className="text-gray-500 text-xs">Exam Target: {profile?.exam_target || 'WAEC 2025'}</div>
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="School name"
                value={form.school_name || ''}
                onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
              <select
                value={form.class_level || ''}
                onChange={(e) => setForm({ ...form, class_level: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select class</option>
                <option>SS1</option><option>SS2</option><option>SS3</option>
              </select>
              <select
                value={form.exam_target || ''}
                onChange={(e) => setForm({ ...form, exam_target: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option>WAEC</option><option>JAMB</option><option>NECO</option><option>GCE</option>
              </select>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm disabled:opacity-50">Save</button>
                <button onClick={() => setEditing(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Exam Target Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-800">WAEC 2025 Progress</h3>
            <span className="text-xs text-green-700">{examProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${examProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{topicsCompleted} of {examTopicsTotal} topics completed</p>
        </div>

        {/* Subjects Enrolled */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Subjects Enrolled</h3>
          <div className="flex flex-wrap gap-2">
            {subjects.map(sub => (
              <span key={sub} className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full">{sub}</span>
            ))}
          </div>
        </div>

        {/* Achievements / Badges */}
<div className="bg-white rounded-xl p-4 shadow-sm">
  <h3 className="font-semibold text-gray-800 mb-3">Achievements</h3>
  <div className="flex gap-3 flex-wrap">
    {achievements.map(ach => (
      <div key={ach.id} className={`text-center w-16 ${ach.earned_at ? 'opacity-100' : 'opacity-30 grayscale'}`}>
        <AchievementIcon name={ach.icon} className="w-6 h-6 mx-auto text-2xl" />
        <div className="text-[10px] text-gray-600 mt-1">{ach.name}</div>
      <div className={`${ach.earned_at ? 'text-green-700' : 'text-gray-400'}`}>
  <AchievementIcon name={ach.icon} className="w-6 h-6 mx-auto" />
</div>
      </div>
    ))}
  </div>
</div>

        {/* Settings Shortcuts */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Settings</h3>
          <div className="space-y-2">
            <button className="w-full text-left text-gray-700 text-sm py-2 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h8" stroke="currentColor" strokeWidth="1.5" /></svg>
              Notifications
            </button>
            <button className="w-full text-left text-gray-700 text-sm py-2 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" /><path d="M10 2.5c-2.5 2-4 4.5-4 7.5s1.5 5.5 4 7.5" /></svg>
              Language (English/Pidgin)
            </button>
            <button className="w-full text-left text-gray-700 text-sm py-2 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h4" /></svg>
              Change Password
            </button>
          </div>
        </div>

        {/* Logout Button (not full width) */}
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={handleLogout}
            className="px-8 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
          >
            Log Out
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}