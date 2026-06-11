'use client';
import Link from 'next/link';

export default function SubjectCard({ subject }) {
  const slug = subject.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <Link href={`/subjects/${slug}`} prefetch={true}>
      <div className={`bg-white rounded-xl p-6 shadow hover:shadow-lg 
        transition cursor-pointer border-l-4 ${subject.color}
        hover:scale-105 active:scale-95`}>
        
        {/* Icon and Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`text-2xl p-2 rounded-lg ${subject.bg} ${subject.text}`}>
            {subject.icon}
          </div>
          <h4 className="font-bold text-gray-800">{subject.name}</h4>
        </div>

        {/* Progress */}
        <p className="text-gray-500 text-sm">0% Complete</p>
        <div className="bg-gray-200 rounded-full h-2 mt-2">
          <div className={`h-2 rounded-full w-0 ${subject.bg}`}></div>
        </div>

      </div>
    </Link>
  );
}