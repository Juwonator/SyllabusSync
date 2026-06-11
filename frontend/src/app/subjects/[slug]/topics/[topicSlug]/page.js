'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { TopicPageSkeleton } from '@/components/SkeletonLoader';
import { FaArrowLeft, FaFire, FaExclamationTriangle,
         FaPlayCircle, FaChevronRight, FaStar,
         FaExclamationCircle } from 'react-icons/fa';

const priorityConfig = {
  critical: { badge: 'bg-red-100 text-red-700 border border-red-300', icon: '🔴', label: 'Critical' },
  high:     { badge: 'bg-orange-100 text-orange-700 border border-orange-300', icon: '🟠', label: 'High Priority' },
  medium:   { badge: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: '🟡', label: 'Medium' },
  low:      { badge: 'bg-gray-100 text-gray-600 border border-gray-300', icon: '⚪', label: 'Low' },
};

const videoTypeConfig = {
  tutorial:    { label: 'Tutorial', color: 'bg-blue-100 text-blue-700' },
  exam_focused:{ label: 'Exam Focused', color: 'bg-red-100 text-red-700' },
  revision:    { label: 'Revision', color: 'bg-green-100 text-green-700' },
};

export default function TopicPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Extract slugs from URL
    // URL pattern: /subjects/[slug]/topics/[topicSlug]
    const pathParts = pathname.split('/');
    const subjectSlug = pathParts[2];
    const topicSlug = pathParts[4];

    // Check login
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    const fetchData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/subjects/${subjectSlug}/topics/${topicSlug}`
        );
        setTopic(res.data.topic);
        setSubtopics(res.data.subtopics);
        setVideos(res.data.videos);
      } catch (err) {
        setError('Could not load topic. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (subjectSlug && topicSlug) fetchData();
  }, [pathname]);

  const handleVideoSearch = (keyword) => {
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
      '_blank'
    );
  };

    const handleStartPractice = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.post(
      'http://localhost:5000/api/cbt/start-session',
      {
        user_id: 1,          // replace with actual user id from JWT
        exam_id: 1,          // WAEC = 1
        exam_year_id: null,  // null = all years
        topic_id: topic.id,
        mode: 'practice',
        total_questions: 10,
        duration_minutes: 30,
        is_timed: true,
        shuffle_questions: true,
        shuffle_options: true,
        show_explanations: true
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    router.push(`/cbt/${res.data.session.id}`);
  } catch (err) {
    console.error('Start session failed', err);
  }
};

  if (loading) return <TopicPageSkeleton />;

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 text-center shadow">
        <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{error}</p>
        <button onClick={() => router.back()}
          className="mt-4 bg-green-700 text-white px-6 py-2 
          rounded-lg hover:bg-green-600 transition">
          Go Back
        </button>
      </div>
    </div>
  );

  const criticalSubtopics = subtopics.filter(
    s => s.priority_rank === 'critical' || s.priority_rank === 'high'
  );

  return (
    <main className="min-h-screen bg-gray-100">

      <Navbar user={user} />

      {/* Topic Header */}
      <section className="bg-green-700 px-8 py-10 text-white">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-green-200 
          hover:text-white transition mb-4 text-sm">
          <FaArrowLeft /> Back to {topic?.subject_name}
        </button>
        <h1 className="text-3xl font-bold">{topic?.name}</h1>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="bg-yellow-400 text-green-900 text-sm 
          font-bold px-3 py-1 rounded-full">
            {topic?.exam_body}
          </span>
          <span className="bg-green-600 text-white text-sm 
          px-3 py-1 rounded-full">
            {topic?.class_level}
          </span>
          <span className="text-green-200 text-sm">
            {subtopics.length} Subtopics
          </span>
        </div>
      </section>

      {/* Exam Alert */}
      {criticalSubtopics.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 
        px-8 py-4 flex items-start gap-3">
          <FaExclamationCircle className="text-red-500 text-xl 
          mt-0.5 shrink-0" />
          <div>
            <p className="text-red-800 font-bold text-sm">
              Exam Alert — High Frequency Topic!
            </p>
            <p className="text-red-600 text-sm mt-1">
              {criticalSubtopics.map(s => s.name).join(', ')} — 
              appear most frequently in past WAEC exams.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8 flex flex-col gap-8">

        {/* Subtopics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              📚 Subtopics
            </h2>
            <span className="text-gray-400 text-sm">
              {subtopics.length} subtopics
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {subtopics.map((subtopic, index) => {
              const priority = priorityConfig[subtopic.priority_rank];
              return (
                <div key={subtopic.id}
                  className="bg-white rounded-xl px-6 py-5 shadow 
                  hover:shadow-md transition cursor-pointer group
                  border-l-4 border-transparent 
                  hover:border-green-600">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-100 
                      text-green-700 font-bold text-sm flex items-center 
                      justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 
                        group-hover:text-green-700 transition">
                          {subtopic.name}
                        </h3>
                        {subtopic.insight_text && (
                          <div className="mt-2 flex items-start gap-2">
                            <FaFire className="text-orange-500 
                            text-sm mt-0.5 shrink-0" />
                            <p className="text-gray-500 text-xs">
                              {subtopic.insight_text}
                            </p>
                          </div>
                        )}
                        {subtopic.frequency_percentage && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              Appears in {subtopic.frequency_percentage}% of exams
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {priority && (
                        <span className={`text-xs font-bold px-2 py-1 
                        rounded-full ${priority.badge}`}>
                          {priority.icon} {priority.label}
                        </span>
                      )}
                      <FaChevronRight className="text-gray-300 
                      group-hover:text-green-600 transition text-sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Videos */}
        {videos.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🎥 Recommended Videos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => {
                const typeConfig = videoTypeConfig[video.video_type] || 
                  { label: video.video_type, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={video.id}
                    onClick={() => handleVideoSearch(video.youtube_search_keyword)}
                    className="bg-white rounded-xl p-5 shadow hover:shadow-md 
                    transition cursor-pointer group flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-xl shrink-0">
                      <FaPlayCircle className="text-red-600 text-2xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm 
                      group-hover:text-green-700 transition">
                        {video.title}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-1 
                      rounded-full mt-2 inline-block ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      <p className="text-gray-400 text-xs mt-1">
                        Click to search on YouTube →
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Practice Button */}
        <section className="bg-green-700 rounded-2xl p-8 text-center text-white">
          <FaStar className="text-yellow-400 text-3xl mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">
            Ready to Test Yourself?
          </h2>
          <p className="text-green-200 mb-6">
            Practice questions on {topic?.name} — 
            earn XP and track your mastery!
          </p>
          <button
            onClick={handleStartPractice}
            className="bg-yellow-400 text-green-900 font-bold 
            px-8 py-3 rounded-xl hover:bg-yellow-300 transition text-lg">
            Start Practice ⚡
          </button>
        </section>

      </div>
    </main>
  );
}