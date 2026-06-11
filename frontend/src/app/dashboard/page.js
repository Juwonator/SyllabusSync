'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import './dashboard.css';
import NotificationBell from '@/components/NotificationBell';

export default function DashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ xp: 0, streak: 0, topicsDone: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (userStr) setUser(JSON.parse(userStr));

        const statsRes = await axios.get('http://localhost:5000/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data);

        const rankRes = await axios.get('http://localhost:5000/api/dashboard/leaderboard-rank', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLeaderboardRank(rankRes.data.rank);

        const perfRes = await axios.get('http://localhost:5000/api/performance/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const recent = perfRes.data.trend?.slice(-3).reverse() || [];
        setRecentActivities(recent);
        setWeakTopics(perfRes.data.weak_topics || []);

        const bookmarksRes = await axios.get('http://localhost:5000/api/bookmarks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookmarkCount(bookmarksRes.data.bookmarks?.length || 0);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    fetchData();
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  const setLanguage = (newLang) => setLang(newLang);
  const t = (en, pid) => lang === 'en' ? en : pid;

  const subjects = ['Mathematics', 'Chemistry', 'Physics', 'Biology', 'English', 'Economics'];

  return (
    <div className="phone relative min-h-screen bg-slate-100">
      {/* Backdrop */}
      <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sb-header">
          <div className="sb-header-pattern">
            <svg viewBox="0 0 292 160"><circle cx="260" cy="20" r="60" fill="white"/><circle cx="10" cy="130" r="40" fill="white"/></svg>
          </div>
          <div className="sb-close" onClick={closeSidebar}>
            <svg viewBox="0 0 14 14"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
          </div>
          <div className="sb-avatar">{user?.full_name?.charAt(0) || 'U'}{user?.full_name?.split(' ')[1]?.charAt(0) || ''}</div>
          <div className="sb-name">{user?.full_name || 'Student'}</div>
          <div className="sb-email">{user?.email || ''}</div>
          <div className="sb-tags">
            <span className="sb-tag exam">{user?.exam_target || 'WAEC 2025'}</span>
            <span className="sb-tag rank">
              <svg style={{width:'9px',height:'9px',display:'inline',marginRight:'2px'}} viewBox="0 0 16 16"><polygon points="8,1 10.5,6 16,6.8 12,10.6 13,16 8,13.3 3,16 4,10.6 0,6.8 5.5,6"/></svg>
              Rank #{leaderboardRank || '--'}
            </span>
          </div>
        </div>
        <div className="sb-body">
          <div className="sb-section-label">Study</div>
          <div className="sb-item active" onClick={() => { closeSidebar(); router.push('/dashboard'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--green-50)'}}><svg viewBox="0 0 20 20"><path d="M3 10l7-7 7 7v8H13v-5H7v5H3V10z"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Dashboard</div><div className="sb-item-sub">Home screen</div></div>
          </div>
          <div className="sb-item" onClick={() => { closeSidebar(); router.push('/classroom'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--blue-100)'}}><svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Classroom</div><div className="sb-item-sub">Browse all 20 subjects</div></div>
          </div>
          <div className="sb-item" onClick={() => { closeSidebar(); router.push('/exam-setup'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--green-50)'}}><svg viewBox="0 0 20 20"><path d="M4 17V5a2 2 0 012-2h8a2 2 0 012 2v12"/><path d="M9 9h2m-1-1v4"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Practice CBT</div><div className="sb-item-sub">Start an exam session</div></div>
          </div>
          <div className="sb-item" onClick={() => { closeSidebar(); router.push('/bookmarks'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--amber-100)'}}><svg viewBox="0 0 20 20"><path d="M5 5h10M5 5v12l5-3 5 3V5"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Bookmarks</div><div className="sb-item-sub">Saved questions</div></div>
            <span className="sb-pill green">{bookmarkCount}</span>
          </div>
          <div className="sb-divider"></div>
          <div className="sb-section-label">Progress</div>
          <div className="sb-item" onClick={() => { closeSidebar(); router.push('/performance'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--blue-100)'}}><svg viewBox="0 0 20 20"><rect x="3" y="10" width="3" height="7" rx="1"/><rect x="8.5" y="6" width="3" height="11" rx="1"/><rect x="14" y="3" width="3" height="14" rx="1"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Performance</div><div className="sb-item-sub">Score trends & weak areas</div></div>
          </div>
          <div className="sb-item" onClick={() => { closeSidebar(); router.push('/results-history'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--green-50)'}}><svg viewBox="0 0 20 20"><rect x="4" y="3" width="12" height="14" rx="2"/><path d="M7 8h6M7 11h4"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Result History</div><div className="sb-item-sub">All past sessions</div></div>
          </div>
          <div className="sb-item" onClick={() => { closeSidebar(); router.push('/leaderboard'); }}>
            <div className="sb-icon-wrap" style={{background:'var(--amber-100)'}}><svg viewBox="0 0 20 20"><polygon points="10,2 12.5,7.5 18.5,8 14,12 15.5,18 10,15 4.5,18 6,12 1.5,8 7.5,7.5"/></svg></div>
            <div className="sb-item-info"><div className="sb-item-label">Leaderboard</div><div className="sb-item-sub">You're ranked #{leaderboardRank || '--'}</div></div>
          </div>
        </div>
        <div className="sb-footer">
          <div className="sb-logout" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); }}>
            <svg viewBox="0 0 20 20"><path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H8"/></svg>
            <div className="sb-logout-label">Log Out</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">

        {/* Top nav */}
        <div className="top-nav">
          <div className="hamburger" onClick={toggleSidebar}>
            <div className="hbar"></div>
            <div className="hbar short"></div>
            <div className="hbar"></div>
          </div>
          <div className="nav-logo">Syllabus<span>Sync</span></div>
          <div className="nav-actions">
            <NotificationBell />
            <div className="nav-btn" onClick={() => router.push('/profile')}>
              <svg viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.5"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>
            </div>
          </div>
        </div>

        {/* Dashboard header */}
        <div className="dash-header">
          <div className="formula-bg">
            <svg viewBox="0 0 375 130">
              <text x="10" y="26" fill="#fff" fontSize="13" fontFamily="serif">E=mc²</text>
              <text x="80" y="50" fill="#fff" fontSize="11" fontFamily="serif">sin²θ+cos²θ=1</text>
              <text x="205" y="22" fill="#fff" fontSize="12" fontFamily="serif">PV=nRT</text>
              <text x="295" y="46" fill="#fff" fontSize="13" fontFamily="serif">H₂O</text>
            </svg>
          </div>
          <div className="welcome-row">
            <div>
              <div className="greeting">{t('Good morning', 'How far, how e dey?')}</div>
              <div className="user-name">{user?.full_name?.split(' ')[0] || 'Student'}</div>
            </div>
            <div className="exam-chip">{user?.exam_target || 'WAEC 2025'}</div>
          </div>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon"><svg viewBox="0 0 20 20"><path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5L10 14.7l-4.9 2.5.9-5.5-4-3.9 5.5-.8z"/></svg></div>
              <div className="stat-value">{stats.xp}</div>
              <div className="stat-label">{t('XP Points', 'XP')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><svg viewBox="0 0 20 20"><path d="M10 2c-.5 3.5-4 5-3 8s4 4 3 8c2-2 4-4 3-7s-2.5-3-2-5c1 1 2.5 3 1 6 2-1 3.5-4 2-7S9 3 10 2z"/></svg></div>
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">{t('Day Streak', 'Streak')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M7 10l2 2 4-4"/></svg></div>
              <div className="stat-value">{stats.topicsDone}</div>
              <div className="stat-label">{t('Topics Done', 'Topics')}</div>
            </div>
          </div>
        </div>

        <div className="scroll-content">
          <div className="sp">
            {/* Primary CTA */}
            <div className="section-header"><div className="section-title">{t('Ready to practise?', 'You don ready to grind?')}</div></div>
            <div className="primary-action" onClick={() => router.push('/exam-setup')}>
              <div className="pa-content">
                <div className="pa-icon-wrap"><svg viewBox="0 0 20 20"><path d="M4 16l2-2-1-4 3-8 2 5 1-2 2 3 2-6 2 10-1 2"/></svg></div>
                <div className="pa-label">{t('Start CBT Practice', 'Start CBT Grind')}</div>
                <div className="pa-sub">{t('Pick subject, year & mode', 'Choose subject, year & style')}</div>
              </div>
              <button className="pa-btn">{t('Go', 'Oya')}<svg viewBox="0 0 14 14"><path d="M3 7h8M7 3l4 4-4 4"/></svg></button>
            </div>

            {/* Streak banner */}
            <div className="streak-banner">
              <div className="streak-icon"><svg viewBox="0 0 20 20"><path d="M10 2c-.5 3.5-4 5-3 8s4 4 3 8c2-2 4-4 3-7s-2.5-3-2-5c1 1 2.5 3 1 6 2-1 3.5-4 2-7S9 3 10 2z"/></svg></div>
              <div className="streak-text"><div className="streak-count">{stats.streak}-day streak!</div><div className="streak-sub">{t('Practice today to keep it alive', 'Do practice today, no go break am!')}</div></div>
            </div>

            {/* Language toggle */}
            <div className="lang-toggle-bar">
              <div className="lang-toggle-left">
                <div className="lang-globe"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 2.5c-2.5 2-4 4.5-4 7.5s1.5 5.5 4 7.5"/><path d="M10 2.5c2.5 2 4 4.5 4 7.5s-1.5 5.5-4 7.5"/><path d="M2.5 10h15"/></svg></div>
                <div><div className="lang-label-text">{t('Language', 'Language')}</div><div className="lang-sublabel">{t('Switch to Naija Pidgin', 'Switch back to English')}</div></div>
              </div>
              <div className="lang-switch">
                <div className={`lang-opt ${lang === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</div>
                <div className={`lang-opt ${lang === 'pid' ? 'active' : ''}`} onClick={() => setLanguage('pid')}>PID</div>
              </div>
            </div>

            {/* Study Tools */}
            <div className="section-header"><div className="section-title">{t('Study Tools', 'Study Tins')}</div></div>
            <div className="two-col">
              <div className="action-tile tile-blue" onClick={() => router.push('/classroom')}><div className="tile-icon-wrap"><svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg></div><div className="tile-label">Classroom</div><div className="tile-sub">Browse subjects</div></div>
              <div className="action-tile tile-green" onClick={() => router.push('/performance')}><div className="tile-icon-wrap"><svg viewBox="0 0 20 20"><rect x="3" y="10" width="3" height="7" rx="1"/><rect x="8.5" y="6" width="3" height="11" rx="1"/><rect x="14" y="3" width="3" height="14" rx="1"/></svg></div><div className="tile-label">Performance</div><div className="tile-sub">Score trends</div></div>
              <div className="action-tile tile-amber" onClick={() => router.push('/leaderboard')}><div className="tile-icon-wrap"><svg viewBox="0 0 20 20"><polygon points="10,2 12.5,7.5 18.5,8 14,12 15.5,18 10,15 4.5,18 6,12 1.5,8 7.5,7.5"/></svg></div><div className="tile-label">Leaderboard</div><div className="tile-sub">Rank #{leaderboardRank || '--'}</div></div>
              <div className="action-tile tile-purple" onClick={() => router.push('/bookmarks')}><div className="tile-icon-wrap"><svg viewBox="0 0 20 20"><path d="M5 5h10M5 5v12l5-3 5 3V5"/></svg></div><div className="tile-label">Bookmarks</div><div className="tile-sub">{bookmarkCount} saved</div></div>
            </div>

            {/* Squad Battle Card */}
            <div className="section-header"><div className="section-title">{t('Squad Battle', 'Squad Battle')}</div><div className="section-link">{t('See rooms', 'See rooms')}</div></div>
            <div className="squad-card">
              <div className="squad-bg"><div className="squad-dot"></div><div className="squad-dot"></div><div className="squad-dot"></div></div>
              <div className="squad-live-row"><div className="squad-live-badge"><div className="live-dot"></div><span>LIVE</span></div><div className="squad-online"><div className="squad-online-dot"></div><span>247 online now</span></div></div>
              <div className="squad-title">{t('Challenge a Candidate', 'Challenge Anoda Candidate')}</div>
              <div className="squad-sub">{t('Go head-to-head in real-time quiz battles', 'Do live quiz battle with anoda student — who go win?')}</div>
              <div className="squad-players">
                <div className="squad-avatar" style={{background:'#4f46e5',color:'#fff'}}>CE</div>
                <div className="squad-avatar" style={{background:'#0891b2',color:'#fff'}}>AO</div>
                <div className="squad-avatar" style={{background:'#d97706',color:'#fff'}}>FN</div>
                <div className="squad-avatar-more">+31</div>
                <span className="squad-player-label">{t('in battle rooms', 'dey compete now')}</span>
              </div>
              <div className="squad-vs-row"><div className="squad-subject-chip">Mathematics</div><div className="squad-vs-sep">VS</div><div className="squad-subject-chip">20 Qs</div><div className="squad-timer"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 2"/></svg><span>10 min</span></div></div>
              <button className="squad-btn" onClick={() => alert('Coming soon – real-time battles!')}><svg viewBox="0 0 16 16"><path d="M2 8a6 6 0 1112 0A6 6 0 012 8z"/><path d="M8 5v3l2 2"/></svg><span>{t('Find an Opponent', 'Find Person to Beat')}</span></button>
            </div>

            {/* Recent Activity */}
            <div className="section-header"><div className="section-title">{t('Recent Activity', 'Wetin You Do Before')}</div><div className="section-link">{t('See all', 'See all')}</div></div>
            {recentActivities.length === 0 ? (
              <div className="text-center text-slate-500 py-4">{t('No recent activity. Start a practice session!', 'No recent activity. Start practice now!')}</div>
            ) : (
              recentActivities.map((act, idx) => (
                <div key={idx} className="activity-card" onClick={() => router.push(`/results/${idx}`)}>
                  <div className="ac-icon" style={{background:'var(--blue-100)'}}><svg viewBox="0 0 20 20"><path d="M4 14l4-4 3 3 5-7"/></svg></div>
                  <div className="ac-info"><div className="ac-title">{act.subject || 'Practice Session'}</div><div className="ac-meta">{act.date ? new Date(act.date).toLocaleDateString() : 'Recent'}</div></div>
                  <div className={`ac-score ${act.score >= 70 ? 'score-hi' : act.score >= 50 ? 'score-mid' : 'score-lo'}`}>{act.score}%</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="bottom-nav">
          <div className="nav-item active" onClick={() => router.push('/dashboard')}><div className="ni-icon"><svg viewBox="0 0 20 20"><path d="M3 10l7-7 7 7v8H13v-5H7v5H3V10z"/></svg></div><div className="ni-label">Home</div><div className="nav-dot"></div></div>
          <div className="nav-item" onClick={() => router.push('/classroom')}><div className="ni-icon"><svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg></div><div className="ni-label">Classroom</div></div>
          <div className="nav-item" onClick={() => router.push('/exam-setup')}><div className="ni-icon"><svg viewBox="0 0 20 20"><path d="M4 17V5a2 2 0 012-2h8a2 2 0 012 2v12M9 9h2m-1-1v4"/></svg></div><div className="ni-label">Practice</div></div>
          <div className="nav-item" onClick={() => router.push('/leaderboard')}><div className="ni-icon"><svg viewBox="0 0 20 20"><polygon points="10,2 12.5,7.5 18.5,8 14,12 15.5,18 10,15 4.5,18 6,12 1.5,8 7.5,7.5"/></svg></div><div className="ni-label">Leaders</div></div>
          <div className="nav-item" onClick={() => router.push('/profile')}><div className="ni-icon"><svg viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.5"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg></div><div className="ni-label">Profile</div></div>
        </div>

        {/* AI Chat FAB */}
        <button className="chat-fab" onClick={() => alert('AI Chat coming soon!')}>
          <svg viewBox="0 0 20 20"><path d="M4 4h12a1 1 0 011 1v8a1 1 0 01-1 1H6l-4 3V5a1 1 0 011-1z"/><path d="M8 8h4M8 11h2"/></svg>
          <div className="chat-fab-badge">AI</div>
        </button>
      </div>
    </div>
  );
}