'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ResultsScreen from '@/components/ResultsScreen';

export default function CBTExamPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [showPalette, setShowPalette] = useState(false);

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `http://localhost:5000/api/cbt/questions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSession(res.data.session);
        setQuestions(res.data.questions);
        if (res.data.session.is_timed && res.data.session.duration_minutes) {
          setTimeLeft(res.data.session.duration_minutes * 60);
        }
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [sessionId]);

  // Check if a question is already bookmarked
  const checkBookmarkStatus = async (questionId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/bookmarks/check', 
        { question_id: questionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookmarked(prev => ({ ...prev, [questionId]: res.data.isBookmarked }));
    } catch (err) {
      console.error('Failed to check bookmark status', err);
    }
  };

  // Toggle bookmark on/off
  const toggleBookmark = async (questionId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (bookmarked[questionId]) {
        // First, get the bookmark ID
        const checkRes = await axios.post('http://localhost:5000/api/bookmarks/check',
          { question_id: questionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (checkRes.data.bookmarkId) {
          await axios.delete(`http://localhost:5000/api/bookmarks/${checkRes.data.bookmarkId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } else {
        // Add new bookmark
        await axios.post('http://localhost:5000/api/bookmarks', 
          { question_id: questionId, session_id: sessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      // Update local state
      setBookmarked(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  // Check bookmark status when current question changes
  const currentQuestion = questions[currentIndex];
  
  // Check if question is theory (no multiple choice options)
const isTheoryQuestion = !currentQuestion?.option_a && 
                         !currentQuestion?.option_b && 
                         !currentQuestion?.option_c && 
                         !currentQuestion?.option_d;
  useEffect(() => {
    if (currentQuestion?.id) {
      checkBookmarkStatus(currentQuestion.id);
    }
  }, [currentQuestion]);

  // handleSubmit defined before timer effect
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/cbt/submit-session/${sessionId}`,
        { answers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(res.data);
      setSubmitted(true);
    } catch (err) {
      console.error('Submit failed', err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, sessionId, answers]);

  // Countdown timer with color urgency
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, handleSubmit]);

  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (!timeLeft) return 'text-white';
    const totalTime = session?.duration_minutes * 60 || 1800;
    const percentage = timeLeft / totalTime;
    if (percentage < 0.1) return 'text-red-400 bg-red-900/50 animate-pulse';
    if (percentage < 0.2) return 'text-orange-400 bg-orange-900/50';
    return 'text-green-400 bg-green-900/30';
  };

  const handleSelectAnswer = async (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/cbt/submit-answer',
        { session_id: sessionId, question_id: questionId, selected_answer: answer },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Auto-save failed', err);
    }
  };

  const toggleFlag = (questionId) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setShowPalette(false);
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  // Get status for palette
  const getQuestionStatus = (index) => {
    const q = questions[index];
    if (!q) return 'unanswered';
    if (currentIndex === index) return 'current';
    if (answers[q.id]) return 'answered';
    if (flagged[q.id]) return 'flagged';
    return 'unanswered';
  };

  // ─── RESULTS SCREEN ───────────────────────────────────────────
  if (submitted && results) {
  // Build questionsWithAnswers from session.questions and answers
  const questionsWithAnswers = questions.map((q, idx) => {
    const userChoice = answers[q.id];
    const isCorrect = userChoice === q.correct_answer;
    const optionLetters = ['A', 'B', 'C', 'D'];
    const userAnswerText = userChoice ? `${userChoice}. ${q[`option_${userChoice.toLowerCase()}`]}` : 'Not answered';
    const correctAnswerText = `${q.correct_answer}. ${q[`option_${q.correct_answer.toLowerCase()}`]}`;
    return {
      id: q.id,
      text: q.question_text,
      userAnswer: userAnswerText,
      correctAnswer: correctAnswerText,
      isCorrect: isCorrect,
      explanation: q.explanation,
      answered: !!userChoice,
      topic: q.topic || 'General', // if you have topic field
    };
  });

  // Time spent (if you stored start time, compute difference)
  // For now placeholder
  const timeSpent = '00:00';
  // Compute time spent
let timeSpent = '00:00';
if (session?.created_at) {
  const startTime = new Date(session.created_at).getTime();
  const endTime = new Date().getTime();
  const secondsElapsed = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;
  timeSpent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
  return <ResultsScreen
    results={results.results}
    mode={session?.mode}
    questionsWithAnswers={questionsWithAnswers}
    timeSpent={timeSpent}
  />;
}

  // ─── LOADING SCREEN ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading exam...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl">No questions found for this session.</p>
          <p className="text-gray-400 mt-2">Check your exam filter settings.</p>
        </div>
      </div>
    );
  }

  // ─── EXAM SCREEN ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="text-sm text-gray-400">
          Q<span className="text-white font-bold">{currentIndex + 1}</span>/{totalQuestions}
        </div>
        {timeLeft !== null && (
          <div className={`font-mono text-base font-bold px-3 py-1 rounded-lg transition-all ${getTimerColor()}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
        <div className="text-sm text-gray-400">
          <span className="text-green-400 font-bold">{answeredCount}</span>/{totalQuestions}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-800">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Question Card */}
        <div className="p-4">
          <div className="bg-gray-900 rounded-xl p-5 mb-4 border border-gray-700">
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                  {currentQuestion?.exam_body || session?.exam_name}
                </span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                  {currentQuestion?.year || '2024'}
                </span>
              </div>
              <div className="flex gap-2">
                {/* Flag button */}
                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`text-lg ${flagged[currentQuestion.id] ? 'text-yellow-400' : 'text-gray-500'}`}
                >
                  🚩
                </button>
                {/* Bookmark button */}
                <button
                  onClick={() => toggleBookmark(currentQuestion.id)}
                  className={`text-lg ${bookmarked[currentQuestion.id] ? 'text-blue-400' : 'text-gray-500'}`}
                >
                  {bookmarked[currentQuestion.id] ? '★' : '☆'}
                </button>
              </div>
            </div>
            <p className="text-base leading-relaxed">{currentQuestion?.question_text}</p>
          </div>
            {/* Options - Multiple choice OR Theory textarea */}
{isTheoryQuestion ? (
  <div className="space-y-2">
    <label className="text-sm text-gray-400 block mb-2">📝 Your Answer / Workings:</label>
    <textarea
      value={answers[currentQuestion?.id] || ''}
      onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
      placeholder="Type your full answer or show your step-by-step workings here..."
      className="w-full p-4 rounded-xl border border-gray-700 bg-gray-900 text-white min-h-[150px] focus:border-green-500 focus:outline-none transition resize-y"
    />
    <div className="text-xs text-gray-500 flex items-center gap-2">
      <span>💡</span> For theory questions, write your complete answer or show all workings.
    </div>
  </div>
) : (
  <div className="space-y-2">
    {[
      { letter: 'A', text: currentQuestion?.option_a },
      { letter: 'B', text: currentQuestion?.option_b },
      { letter: 'C', text: currentQuestion?.option_c },
      { letter: 'D', text: currentQuestion?.option_d },
    ].map((opt) => {
      const selected = answers[currentQuestion?.id] === opt.letter;
      return (
        <button
          key={opt.letter}
          onClick={() => handleSelectAnswer(currentQuestion.id, opt.letter)}
          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
            selected
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-gray-900 border-gray-700 hover:border-green-500 hover:bg-gray-800'
          }`}
        >
          <span className="font-bold mr-3">{opt.letter}.</span>
          {opt.text || 'Option not available'}
        </button>
      );
    })}
  </div>
)}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-3 flex gap-3 z-20">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition font-medium"
        >
          ← Previous
        </button>
        {currentIndex < totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-medium"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 transition font-semibold"
          >
            {submitting ? 'Submitting...' : '✅ Submit Exam'}
          </button>
        )}
      </div>

      {/* Floating Action Button for Palette */}
      <button
        onClick={() => setShowPalette(true)}
        className="fixed bottom-20 right-4 w-12 h-12 bg-green-600 rounded-full shadow-lg flex items-center justify-center text-white text-xl z-20 hover:bg-green-700 transition"
      >
        ⊞
      </button>

      {/* Bottom Sheet Palette */}
      {showPalette && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-30"
            onClick={() => setShowPalette(false)}
          />
          
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl z-40 max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">Question Navigator</h3>
                <button onClick={() => setShowPalette(false)} className="text-gray-400 text-2xl">✕</button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(idx);
                  let bgClass = 'bg-gray-800 text-gray-400';
                  if (status === 'answered') bgClass = 'bg-green-600 text-white';
                  if (status === 'current') bgClass = 'bg-blue-600 text-white ring-2 ring-blue-400';
                  if (status === 'flagged') bgClass = 'bg-yellow-600 text-white';
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
                      className={`w-full aspect-square rounded-lg font-mono text-sm font-bold transition ${bgClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-600"></div><span className="text-gray-400">Answered</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-600"></div><span className="text-gray-400">Current</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-600"></div><span className="text-gray-400">Flagged</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-800 border border-gray-600"></div><span className="text-gray-400">Unanswered</span></div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Add animation CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}