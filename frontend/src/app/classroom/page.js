'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function ClassroomPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState('WAEC'); // could come from user profile

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/classroom/subjects?exam=${exam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubjects(res.data.subjects);
        if (res.data.subjects.length > 0 && !selectedSubject) {
          setSelectedSubject(res.data.subjects[0]);
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [exam]);

  useEffect(() => {
    if (!selectedSubject) return;
    const fetchTopics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/classroom/topics/${selectedSubject.id}?exam=${exam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTopics(res.data.topics);
      } catch (err) {
        console.error('Failed to load topics', err);
        setTopics([]);
      }
    };
    fetchTopics();
  }, [selectedSubject, exam]);

  const startPracticeForTopic = (topicId, topicName) => {
    // Navigate to exam setup with pre-selected topic
    router.push(`/exam-setup?topicId=${topicId}&topicName=${encodeURIComponent(topicName)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-green-700 text-xl animate-pulse">Loading classroom...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-4 px-4">
        <button onClick={() => router.back()} className="text-white text-2xl mb-2">←</button>
        <h1 className="text-white text-2xl font-bold">Classroom</h1>
        <p className="text-white/70 text-sm">Browse subjects and start topic‑wise practice</p>
      </div>

      {/* Exam selector (simplified – you can expand) */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex gap-2">
        {['WAEC', 'JAMB', 'NECO'].map(e => (
          <button
            key={e}
            onClick={() => setExam(e)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${exam === e ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Subject sidebar */}
        <div className="w-full md:w-1/3 bg-white border-r border-gray-200">
          <div className="p-3 font-semibold text-gray-700 border-b">Subjects</div>
          <div className="max-h-[60vh] overflow-y-auto">
            {subjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition ${selectedSubject?.id === subj.id ? 'bg-green-50 border-l-4 border-green-600' : ''}`}
              >
                <span className="text-xl">{subj.icon || '📚'}</span>
                <div>
                  <div className="font-medium text-gray-800">{subj.name}</div>
                  <div className="text-xs text-gray-500">Click to see topics</div>
                </div>
              </button>
            ))}
            {subjects.length === 0 && <div className="p-4 text-gray-500 text-sm">No subjects found for {exam}.</div>}
          </div>
        </div>

        {/* Topics list */}
        <div className="flex-1 p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            {selectedSubject?.name || 'Select a subject'} — Topics
          </h2>
          {topics.length === 0 ? (
            <div className="text-gray-500 text-center py-10">
              No topics available for this subject. Check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topics.map(topic => (
                <div key={topic.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{topic.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{topic.description || `${topic.question_count || 0} questions available`}</p>
                    </div>
                    <button
                      onClick={() => startPracticeForTopic(topic.id, topic.name)}
                      className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-green-200 transition"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}