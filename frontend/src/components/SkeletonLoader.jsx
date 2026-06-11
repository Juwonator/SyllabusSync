export function TopicPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 animate-pulse">
      {/* Navbar skeleton */}
      <div className="bg-green-900 px-8 py-4 h-16"></div>

      {/* Header skeleton */}
      <div className="bg-green-700 px-8 py-10">
        <div className="h-4 bg-green-600 rounded w-32 mb-4"></div>
        <div className="h-8 bg-green-600 rounded w-64 mb-3"></div>
        <div className="flex gap-3">
          <div className="h-6 bg-green-600 rounded-full w-16"></div>
          <div className="h-6 bg-green-600 rounded-full w-16"></div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-8 py-8 flex flex-col gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-xl px-6 py-5 shadow">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-32"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubjectPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 animate-pulse">
      {/* Navbar skeleton */}
      <div className="bg-green-900 px-8 py-4 h-16"></div>

      {/* Header skeleton */}
      <div className="bg-green-700 px-8 py-10">
        <div className="h-4 bg-green-600 rounded w-32 mb-4"></div>
        <div className="h-8 bg-green-600 rounded w-48 mb-3"></div>
        <div className="flex gap-3">
          <div className="h-6 bg-green-600 rounded-full w-20"></div>
          <div className="h-6 bg-green-600 rounded-full w-16"></div>
        </div>
      </div>

      {/* Topics skeleton */}
      <div className="px-8 py-8 max-w-4xl mx-auto flex flex-col gap-3">
        {[1,2,3,4,5,6,7].map(i => (
          <div key={i} className="bg-white rounded-xl px-6 py-5 shadow
          flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-gray-200"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-56 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-32"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 animate-pulse">
      <div className="bg-green-900 px-8 py-4 h-16"></div>
      <div className="bg-green-700 px-8 py-10">
        <div className="h-8 bg-green-600 rounded w-64 mb-3"></div>
        <div className="h-4 bg-green-600 rounded w-40"></div>
      </div>
      <div className="grid grid-cols-3 gap-6 px-8 py-8">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 shadow h-28"></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 px-8">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 shadow h-24"></div>
        ))}
      </div>
    </div>
  );
}