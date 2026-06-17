'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function ClassroomPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({}); // { subjectId: { completedTopics, totalTopics, lastTopic } }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch all subjects
        const subjectsRes = await axios.get('http://localhost:5000/api/classroom/subjects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubjects(subjectsRes.data.subjects);

        // Fetch user progress summary (if endpoint exists)
        try {
          const progressRes = await axios.get('http://localhost:5000/api/classroom/user/progress-summary', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setProgress(progressRes.data);
        } catch (err) {
          console.warn('Progress summary not available yet');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSubjects = subjects.filter(subj =>
    subj.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasProgress = Object.keys(progress).length > 0;

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading classroom...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-4 px-4">
        <div className="flex justify-between items-center">
          <div className="text-white text-2xl font-bold">Classroom</div>
          <div className="flex gap-3">
            <button className="text-white">🔍</button>
            <button onClick={() => router.push('/dashboard')} className="text-white">🏠</button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mt-4 p-2 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none"
        />
      </div>

      <div className="px-4 py-4">
        {/* Continue Studying section */}
        {hasProgress && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Continue Studying</h2>
            <div className="space-y-3 mb-6">
              {Object.entries(progress).map(([subjectId, data]) => {
                const subject = subjects.find(s => s.id === parseInt(subjectId));
                if (!subject) return null;
                return (
                  <div key={subjectId} className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-xl font-bold">{subject.name}</div>
                        <div className="text-sm text-gray-500">Last studied: {data.lastTopic || '—'}</div>
                        <div className="text-xs text-gray-400 mt-1">{data.completedTopics} of {data.totalTopics} topics done</div>
                      </div>
                      <button
                        onClick={() => router.push(`/subject/${subject.slug}`)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Continue →
                      </button>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(data.completedTopics / data.totalTopics) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* All Subjects */}
        <h2 className="text-lg font-bold text-gray-800 mb-2">All Subjects</h2>
        {filteredSubjects.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No subjects match "{searchTerm}"</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredSubjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => router.push(`/subject/${subj.slug}`)}
                className="bg-white rounded-xl p-4 shadow-sm text-center hover:shadow-md transition"
              >
                <div className="text-4xl mb-2">📘</div>
                <div className="font-semibold text-gray-800">{subj.name}</div>
                <div className="text-xs text-gray-500 mt-1">Topics: {subj.topicCount || 0}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}