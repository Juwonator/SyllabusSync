'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('ALL');

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `http://localhost:5000/api/classroom/subjects/${slug}/topics`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSubject({ name: res.data.subjectName, id: res.data.subjectId });
        setTopics(res.data.topics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [slug]);

  // Determine topic status based on completed subtopics
  const getTopicStatus = (topic) => {
    if (topic.completedSubtopicCount === 0) return 'not_started';
    if (topic.completedSubtopicCount === topic.subtopicCount) return 'completed';
    return 'in_progress';
  };

  // Filter topics by exam body – this requires that each topic has an `exam_body` field or we need a relation.
  // For now, we assume all topics belong to the subject; filtering by exam body will be done later.
  // We'll keep the filter tabs but they won't filter yet until we add exam_body to topics.
  const filteredTopics = topics.filter(topic => {
    if (examFilter === 'ALL') return true;
    // TODO: filter by topic.exam_body if that column exists
    return true;
  });

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => getTopicStatus(t) === 'completed').length;
  const completedPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading subject...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-700 pt-6 pb-4 px-4">
        <button onClick={() => router.back()} className="text-white text-2xl mb-2">←</button>
        <h1 className="text-white text-2xl font-bold">{subject?.name}</h1>
      </div>

      <div className="px-4 py-4">
        {/* Filter Tabs (horizontal scroll) */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {['ALL', 'WAEC', 'NECO', 'JAMB/UTME', 'GCE', 'JUPEB'].map(filter => (
            <button
              key={filter}
              onClick={() => setExamFilter(filter)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
                examFilter === filter
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Progress Summary Card */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <div className="text-sm text-gray-600">Your Progress</div>
          <div className="text-xl font-bold">{completedTopics} of {totalTopics} topics done</div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${completedPercent}%` }} />
          </div>
        </div>

        {/* Topic List */}
        <div className="space-y-3">
          {filteredTopics.map(topic => {
            const status = getTopicStatus(topic);
            const isInProgress = status === 'in_progress';
            const isCompleted = status === 'completed';
            const progressPercent = isInProgress ? Math.round((topic.completedSubtopicCount / topic.subtopicCount) * 100) : 0;

            return (
              <button
                key={topic.id}
                onClick={() => router.push(`/topics/${topic.slug}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left border hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {isCompleted && '✅'}
                    {isInProgress && '🔄'}
                    {status === 'not_started' && '○'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{topic.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isCompleted && `${topic.subtopicCount} subtopics · Done`}
                      {isInProgress && `${topic.subtopicCount} subtopics · ${topic.completedSubtopicCount} done`}
                      {status === 'not_started' && `${topic.subtopicCount} subtopics`}
                    </div>
                    {isInProgress && (
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full w-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredTopics.length === 0 && (
            <div className="text-center text-gray-500 py-8">No topics found for this filter.</div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}