export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-green-900 flex flex-col 
    items-center justify-center gap-6">
      
      {/* Bouncing Balls */}
      <div className="flex gap-3">
        <div className="w-5 h-5 bg-yellow-400 rounded-full animate-bounce 
        [animation-delay:0ms]"></div>
        <div className="w-5 h-5 bg-yellow-400 rounded-full animate-bounce 
        [animation-delay:150ms]"></div>
        <div className="w-5 h-5 bg-yellow-400 rounded-full animate-bounce 
        [animation-delay:300ms]"></div>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-yellow-400 text-xl font-bold">SyllabusSync</p>
        <p className="text-green-300 text-sm">Loading your dashboard...</p>
      </div>

    </div>
  );
}