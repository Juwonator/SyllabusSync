'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function PerformancePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/performance/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        console.error('Failed to load performance data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-green-700 text-xl animate-pulse">Loading performance...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-600">Complete some practice sessions to see your performance.</div>
      </div>
    );
  }

  const { overall, subjects, weak_topics, trend } = data;

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header with green gradient */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-8 px-4">
        <button onClick={() => router.back()} className="text-white text-2xl mb-4">←</button>
        <h1 className="text-white text-2xl font-bold">Performance</h1>
        <p className="text-white/70 text-sm mt-1">Track your progress across all subjects</p>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Overall Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">Overall Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl">{overall.total_sessions}</div>
              <div className="text-xs text-gray-600">Sessions</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl">{overall.total_questions}</div>
              <div className="text-xs text-gray-600">Questions</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl">{overall.correct_answers}</div>
              <div className="text-xs text-gray-600">Correct</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl">{overall.accuracy}%</div>
              <div className="text-xs text-gray-600">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">Subject Breakdown</h2>
          <div className="space-y-3">
            {subjects.map(subj => (
              <div key={subj.subject_name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{subj.subject_name}</span>
                  <span className="text-gray-600">{subj.avg_score}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full" style={{ width: `${subj.avg_score}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{subj.correct} / {subj.answered} correct</div>
              </div>
            ))}
            {subjects.length === 0 && <div className="text-gray-500 text-sm">No subject data yet.</div>}
          </div>
        </div>

        {/* Weak Topics */}
        {weak_topics.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-red-500">
            <h2 className="font-bold text-red-700 mb-3">⚠️ Needs Attention</h2>
            <div className="space-y-2">
              {weak_topics.map(topic => (
                <div key={topic.topic_name} className="flex justify-between items-center">
                  <span className="text-gray-800">{topic.topic_name}</span>
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{topic.avg_score}%</span>
                </div>
              ))}
            </div>
            <button className="mt-3 text-green-700 text-sm font-medium w-full text-center">
              Practice weak topics →
            </button>
          </div>
        )}

        {/* Trend Chart (simplified with bars) */}
        {trend.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">Last 7 Sessions</h2>
            <div className="flex items-end gap-2 h-32">
              {trend.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-green-200 rounded-t" style={{ height: `${item.score}%`, maxHeight: '80px' }} />
                  <div className="text-xs text-gray-500 mt-1">{new Date(item.date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}