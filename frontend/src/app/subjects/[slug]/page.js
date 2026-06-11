'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { SubjectPageSkeleton } from '@/components/SkeletonLoader';
import { FaArrowLeft, FaFire, 
         FaExclamationTriangle, FaChevronRight } from 'react-icons/fa';

export default function SubjectPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    // Get slug from URL path
    const pathParts = pathname.split('/');
    const currentSlug = pathParts[pathParts.length - 1];
    setSlug(currentSlug);

    // Check login
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    // Fetch data
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/subjects/${currentSlug}/topics`
        );
        setSubject(res.data.subject);
        setTopics(res.data.topics);
      } catch (err) {
        setError('Could not load subject. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (currentSlug) fetchData();
  }, [pathname]);

  const handleTopicClick = (topicSlug) => {
    router.push(`/subjects/${slug}/topics/${topicSlug}`);
  };

  if (loading) return <SubjectPageSkeleton />;

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 text-center shadow">
        <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 bg-green-700 text-white px-6 py-2 
          rounded-lg hover:bg-green-600 transition">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-100">

      <Navbar user={user} />

      {/* Subject Header */}
      <section className="bg-green-700 px-8 py-10 text-white">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-green-200 
          hover:text-white transition mb-4 text-sm">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold">{subject?.name}</h1>
        <div className="flex items-center gap-4 mt-3">
          <span className="bg-yellow-400 text-green-900 text-sm 
          font-bold px-3 py-1 rounded-full">
            {subject?.exam_body}
          </span>
          <span className="text-green-200 text-sm">
            {topics.length} Topics
          </span>
        </div>
      </section>

      {/* Study Tip */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 
      px-8 py-4 flex items-start gap-3">
        <FaFire className="text-yellow-500 text-xl mt-1 shrink-0" />
        <p className="text-yellow-800 text-sm">
          <span className="font-bold">Study Tip:</span> Work through 
          topics in order from top to bottom for best results.
        </p>
      </div>

      {/* Topics List */}
      <section className="px-8 py-8 max-w-4xl mx-auto">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          All Topics
        </h2>
        <div className="flex flex-col gap-3">
          {topics.map((topic, index) => (
            <div
              key={topic.id}
              onClick={() => handleTopicClick(topic.slug)}
              className="bg-white rounded-xl px-6 py-5 shadow 
              hover:shadow-md transition cursor-pointer 
              flex items-center justify-between
              hover:border-l-4 hover:border-green-600 group">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-green-100 
                text-green-700 font-bold text-sm flex items-center 
                justify-center shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 
                  group-hover:text-green-700 transition">
                    {topic.name}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">
                    {topic.exam_body} Curriculum
                  </p>
                </div>
              </div>
              <FaChevronRight className="text-gray-300 
              group-hover:text-green-600 transition" />
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}