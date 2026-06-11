'use client';

import { useEffect, useState, useRef } from 'react';
import './ResultsScreen.css';

export default function ResultsScreen({ results, mode, questionsWithAnswers, timeSpent }) {
  // results = { objective_score_percentage, theory_score_percentage, total_score_percentage, grade, remark, theory_feedback }
  // questionsWithAnswers = array of { id, text, userAnswer, correctAnswer, isCorrect, explanation, topic? }
  const [scorePercent, setScorePercent] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [openCardId, setOpenCardId] = useState(null);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const ringFillRef = useRef(null);
  const scorePctRef = useRef(null);

  const totalPercent = results?.total_score_percentage ?? 0;
  const grade = results?.grade ?? 'F9';
  const remark = results?.remark ?? '';

  // Compute correct/wrong/skipped
  const correctCount = questionsWithAnswers.filter(q => q.isCorrect === true).length;
  const wrongCount = questionsWithAnswers.filter(q => q.isCorrect === false && q.answered !== undefined).length;
  const skippedCount = questionsWithAnswers.filter(q => q.answered === undefined).length;

  // XP calculation (example: 10 per correct objective, but here just based on percentage)
  useEffect(() => {
    let xp = 0;
    if (totalPercent >= 75) xp = 120;
    else if (totalPercent >= 60) xp = 80;
    else if (totalPercent >= 45) xp = 50;
    else xp = 25;
    setXpEarned(xp);
  }, [totalPercent]);

  // Grade info for color and label
  const getGradeInfo = (percent) => {
    if (percent >= 75) return { grade: 'A1', label: 'Excellent Performance!', ringColor: '#34d399', msg: 'Outstanding! You\'re exam-ready.' };
    if (percent >= 70) return { grade: 'B2', label: 'Good Performance!', ringColor: '#fbbf24', msg: 'Great work — keep pushing!' };
    if (percent >= 65) return { grade: 'B3', label: 'Good Performance', ringColor: '#fbbf24', msg: 'Solid effort. A bit more and you hit A1.' };
    if (percent >= 60) return { grade: 'C4', label: 'Average Performance', ringColor: '#f59e0b', msg: 'You\'re in credit range — good foundation.' };
    if (percent >= 55) return { grade: 'C5', label: 'Average Performance', ringColor: '#f59e0b', msg: 'Keep practising — you\'re close to credit.' };
    if (percent >= 50) return { grade: 'C6', label: 'Fair Performance', ringColor: '#f59e0b', msg: 'Work on your weak areas to cross 60%.' };
    if (percent >= 45) return { grade: 'D7', label: 'Below Credit', ringColor: '#ef4444', msg: 'More practice needed. Review your weak topics.' };
    if (percent >= 40) return { grade: 'E8', label: 'Needs Improvement', ringColor: '#ef4444', msg: 'Don\'t give up — focus on the basics first.' };
    return { grade: 'F9', label: 'Failed', ringColor: '#ef4444', msg: 'Start from the beginning. You can turn this around.' };
  };

  const gradeInfo = getGradeInfo(totalPercent);

  // Animate ring and percentage on mount
  useEffect(() => {
    const circumference = 345.4; // 2 * pi * 55
    const targetOffset = circumference - (totalPercent / 100) * circumference;
    const ring = document.getElementById('scoreRingFill');
    const pctElem = document.getElementById('scorePct');
    if (ring && pctElem) {
      ring.style.strokeDashoffset = circumference;
      let startTime = null;
      const duration = 1200;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentPct = Math.round(eased * totalPercent);
        pctElem.textContent = `${currentPct}%`;
        ring.style.strokeDashoffset = circumference - (eased * totalPercent / 100) * circumference;
        if (progress < 1) requestAnimationFrame(animate);
        else {
          pctElem.textContent = `${Math.round(totalPercent)}%`;
          ring.style.strokeDashoffset = targetOffset;
        }
      };
      requestAnimationFrame(animate);
    }
  }, [totalPercent]);

  // Confetti if score >= 60
  useEffect(() => {
    if (totalPercent >= 60) {
      spawnConfetti();
    }
  }, [totalPercent]);

  const spawnConfetti = () => {
    const wrap = document.getElementById('confettiWrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const colours = ['#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb7185'];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'cp';
      p.style.cssText = `
        left: ${10 + Math.random() * 80}%;
        top: ${-5 + Math.random() * 10}%;
        background: ${colours[Math.floor(Math.random() * colours.length)]};
        width: ${4 + Math.random() * 6}px;
        height: ${4 + Math.random() * 6}px;
        animation-duration: ${1.5 + Math.random() * 2}s;
        animation-delay: ${Math.random() * 0.8}s;
      `;
      wrap.appendChild(p);
    }
  };

  const toggleCard = (idx) => {
    setOpenCardId(openCardId === idx ? null : idx);
  };

  const filteredQuestions = questionsWithAnswers.filter(q => {
    if (reviewFilter === 'correct') return q.isCorrect;
    if (reviewFilter === 'wrong') return !q.isCorrect && q.answered !== undefined;
    return true;
  });

  // Compute weak topics (topics with most wrong answers)
  const weakTopics = [];
  const topicWrongCount = {};
  if (questionsWithAnswers.length > 0) {
    questionsWithAnswers.forEach(q => {
      if (!q.isCorrect && q.answered !== undefined && q.topic) {
        topicWrongCount[q.topic] = (topicWrongCount[q.topic] || 0) + 1;
      }
    });
    const sortedTopics = Object.entries(topicWrongCount).sort((a, b) => b[1] - a[1]);
    weakTopics.push(...sortedTopics.slice(0, 3).map(t => t[0]));
  }

  const shareResult = () => {
    if (navigator.share) {
      navigator.share({
        title: 'SyllabusSync Exam Result',
        text: `I scored ${Math.round(totalPercent)}% (${gradeInfo.grade}) in ${mode} mode!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="phone results-screen">
      {/* Status bar – optional, we can hide or keep minimal */}
      <div className="status-bar">
        <span className="sb-time">11:02</span>
        <div className="sb-icons">
          <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="7" width="3" height="5" rx=".5" fill="rgba(255,255,255,.7)"/><rect x="4.5" y="4.5" width="3" height="7.5" rx=".5" fill="rgba(255,255,255,.7)"/><rect x="9" y="2" width="3" height="10" rx=".5" fill="rgba(255,255,255,.7)"/><rect x="13.5" y="0" width="3" height="12" rx=".5" fill="rgba(255,255,255,.25)"/></svg>
          <svg width="20" height="12" viewBox="0 0 20 12"><rect x=".5" y=".5" width="16" height="11" rx="2" stroke="rgba(255,255,255,.6)" strokeWidth="1"/><rect x="2" y="2" width="10" height="8" rx="1" fill="rgba(255,255,255,.8)"/><path d="M17.5 4.5v3" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>

      {/* Fixed header */}
      <div className="results-header">
        <div className="rh-back" onClick={() => window.history.back()}>
          <svg viewBox="0 0 20 20"><path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
        <div className="rh-title">Results</div>
        <div className="rh-home" onClick={() => window.location.href = '/dashboard'}>
          <svg viewBox="0 0 20 20"><path d="M3 10l7-7 7 7v8H13v-5H7v5H3V10z" stroke="currentColor" strokeWidth="1.8"/></svg>
        </div>
      </div>

      {/* Mode tabs (only display, not interactive) */}
      <div className="mode-tabs">
        <div className={`mode-tab ${mode === 'practice' ? 'active' : 'inactive'}`}>Practice Mode</div>
        <div className={`mode-tab ${mode === 'mock' ? 'active' : 'inactive'}`}>Mock Exam</div>
        <div className={`mode-tab ${mode === 'study' ? 'active' : 'inactive'}`}>Study Mode</div>
      </div>

      <div className="scroll-body">
        {/* Hero section */}
        <div className="hero">
          <div className="confetti-wrap" id="confettiWrap"></div>
          <div className="score-glow"></div>
          <div className="score-ring">
            <svg className="ring-svg" viewBox="0 0 130 130">
              <circle className="ring-bg" cx="65" cy="65" r="55" />
              <circle id="scoreRingFill" className="ring-fill" cx="65" cy="65" r="55"
                strokeDasharray="345.4" strokeDashoffset="345.4"
                stroke={gradeInfo.ringColor} />
            </svg>
            <div className="score-inner">
              <div className="score-pct" id="scorePct">0%</div>
              <div className="score-grade">{gradeInfo.grade}</div>
            </div>
          </div>
          <div className="score-label">{gradeInfo.label}</div>
          <div className="score-sub">Physics · WAEC 2022 · {questionsWithAnswers.length} Questions</div>
          <div className="xp-banner">
            <svg viewBox="0 0 16 16"><polygon points="8,1 10,6 15.5,6.5 11.5,10 12.5,15.5 8,13 3.5,15.5 4.5,10 0.5,6.5 6,6" /></svg>
            <span>+{xpEarned} XP earned</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-cell"><div className="stat-val green">{correctCount}</div><div className="stat-lbl">Correct</div></div>
          <div className="stat-cell"><div className="stat-val red">{wrongCount}</div><div className="stat-lbl">Wrong</div></div>
          <div className="stat-cell"><div className="stat-val slate">{skippedCount}</div><div className="stat-lbl">Skipped</div></div>
          <div className="stat-cell"><div className="stat-val amber">{timeSpent || '00:00'}</div><div className="stat-lbl">Time Taken</div></div>
        </div>

        {/* Share card */}
        <div className="share-card" onClick={shareResult}>
          <div className="share-icon">
            <svg viewBox="0 0 20 20"><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><circle cx="5" cy="10" r="2"/><path d="M7 9l6-3M7 11l6 3"/></svg>
          </div>
          <div className="share-text">
            <div className="share-title">Share your result</div>
            <div className="share-sub">Flex your score — share to WhatsApp, Twitter, Instagram</div>
          </div>
          <div className="share-arrow"><svg viewBox="0 0 16 16"><path d="M4 8h8M9 4l4 4-4 4"/></svg></div>
        </div>

        {/* Weak areas insight (practice/study only) */}
        {mode !== 'mock' && weakTopics.length > 0 && (
          <div className="insight-card">
            <div className="insight-icon">
              <svg viewBox="0 0 20 20"><path d="M10 2a7 7 0 100 14A7 7 0 0010 2z"/><path d="M10 8v4M10 14v.5"/></svg>
            </div>
            <div className="insight-body">
              <div className="insight-title">Weak Areas Detected</div>
              <div className="insight-text">You missed most questions on <strong>{weakTopics.join(', ')}</strong>. Revise these topics before your next session.</div>
              <div className="insight-chips">
                {weakTopics.map(topic => <div key={topic} className="insight-chip">{topic}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* Review section */}
        {mode !== 'mock' ? (
          <>
            <div className="section-divider">
              <div className="sd-title">Review Questions</div>
              <div className="sd-filter">
                <button className={`sf-btn ${reviewFilter === 'all' ? 'active' : ''}`} onClick={() => setReviewFilter('all')}>All</button>
                <button className={`sf-btn ${reviewFilter === 'wrong' ? 'active' : ''}`} onClick={() => setReviewFilter('wrong')}>Wrong</button>
                <button className={`sf-btn ${reviewFilter === 'correct' ? 'active' : ''}`} onClick={() => setReviewFilter('correct')}>Correct</button>
              </div>
            </div>
            <div className="review-list">
              {filteredQuestions.map((q, idx) => {
                const isOpen = openCardId === idx;
                return (
                  <div key={idx} className={`qcard ${isOpen ? 'open' : ''}`}>
                    <div className="qcard-header" onClick={() => toggleCard(idx)}>
                      <span className="qcard-qnum">Q{idx+1}</span>
                      <span className={`qcard-badge ${q.isCorrect ? 'correct' : 'wrong'}`}>{q.isCorrect ? '✓ CORRECT' : '✗ WRONG'}</span>
                      <span className="qcard-question">{q.text}</span>
                      <div className="qcard-chevron"><svg viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg></div>
                    </div>
                    <div className="qcard-body">
                      <div className="qcard-inner">
                        <div className="answer-row">
                          <div className="ar-item"><span className="ar-label">Your answer</span><span className={`ar-val ${q.isCorrect ? 'correct-ans' : 'wrong-ans'}`}>{q.userAnswer}</span></div>
                          {!q.isCorrect && <div className="ar-item"><span className="ar-label">Correct</span><span className="ar-val correct-ans">{q.correctAnswer}</span></div>}
                        </div>
                        <div className="expl-section">
                          <div className="expl-head"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="5"/><path d="M6 4v3M6 8v.5"/></svg>Explanation</div>
                          <div className="expl-txt">{q.explanation}</div>
                        </div>
                        <div className="bookmark-tag" onClick={(e) => { e.stopPropagation(); alert('Bookmark feature coming soon'); }}>
                          <svg viewBox="0 0 12 12"><path d="M2 1h8v10l-4-2.5L2 11V1z"/></svg> Bookmark question
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredQuestions.length === 0 && (
                <div style={{padding:'20px',textAlign:'center',fontSize:'13px',color:'var(--s400)'}}>No questions match this filter.</div>
              )}
            </div>
          </>
        ) : (
          <div className="mock-lockout">
            <div className="mock-lock-icon">
              <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
            </div>
            <div className="mock-lock-title">Review Locked</div>
            <div className="mock-lock-sub">Question review is disabled in Mock Exam mode to simulate real exam conditions. Your result has been saved.</div>
          </div>
        )}

        {/* Action buttons */}
        <div className="action-section">
          <button className="action-btn btn-retry" onClick={() => window.location.reload()}>
            <svg viewBox="0 0 20 20"><path d="M4 4v5h5M16 16v-5h-5"/><path d="M4 9A8 8 0 0116 9M16 11a8 8 0 01-12 6"/></svg>
            Try Again
          </button>
          <button className="action-btn btn-home" onClick={() => window.location.href = '/dashboard'}>
            <svg viewBox="0 0 20 20"><path d="M3 10l7-7 7 7v8H13v-5H7v5H3V10z"/></svg>
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Share overlay (optional – can be expanded later) */}
      {showShareOverlay && (
        <div className="share-overlay open" onClick={() => setShowShareOverlay(false)}>
          <div className="share-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="share-handle"><div className="share-handle-bar"></div></div>
            <div className="share-sheet-header">
              <div className="ssh-title">Share Score Card</div>
              <button className="ssh-close" onClick={() => setShowShareOverlay(false)}>
                <svg viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
              </button>
            </div>
            {/* Score card preview – simplified */}
            <div className="score-card-preview">
              <div className="scp-bg"><svg viewBox="0 0 347 140"><text x="8" y="28" fill="#fff" fontSize="14" fontFamily="serif">E=mc²</text><text x="80" y="52" fill="#fff" fontSize="12" fontFamily="serif">sin²θ+cos²θ=1</text></svg></div>
              <div className="scp-logo">Syllabus<span>Sync</span></div>
              <div className="scp-body">
                <div className="scp-ring"><div className="scp-pct">{Math.round(totalPercent)}%</div></div>
                <div className="scp-info">
                  <div className="scp-grade">{gradeInfo.grade} · {gradeInfo.label}</div>
                  <div className="scp-subject">Physics</div>
                  <div className="scp-meta">WAEC 2022 · {questionsWithAnswers.length} Qs</div>
                </div>
              </div>
              <div className="scp-stats-row">
                <div className="scp-stat"><div className="scp-stat-val">{correctCount}</div><div className="scp-stat-lbl">Correct</div></div>
                <div className="scp-stat"><div className="scp-stat-val">{wrongCount}</div><div className="scp-stat-lbl">Wrong</div></div>
                <div className="scp-stat"><div className="scp-stat-val">{timeSpent || '00:00'}</div><div className="scp-stat-lbl">Time</div></div>
                <div className="scp-tag">WAEC 2025</div>
              </div>
            </div>
            <div className="share-platforms">
              {['WhatsApp', 'Twitter', 'Instagram', 'Facebook', 'Telegram'].map(platform => (
                <div key={platform} className="platform" onClick={() => alert(`Share via ${platform} (coming soon)`)}>
                  <div className="platform-icon" style={{background: platform==='WhatsApp' ? '#d1fae5' : '#dbeafe'}}>
                    <svg viewBox="0 0 24 24" style={{stroke: '#065f46'}}><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.12-1.35A9.93 9.93 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
                  </div>
                  <div className="platform-label">{platform}</div>
                </div>
              ))}
            </div>
            <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); }}>
              <svg viewBox="0 0 16 16"><rect x="4" y="4" width="9" height="10" rx="1.5"/><rect x="2" y="2" width="9" height="10" rx="1.5"/></svg>
              Copy shareable link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}