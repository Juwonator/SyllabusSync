export default function AchievementIcon({ name, className = "w-6 h-6" }) {
  const icons = {
    'play-circle': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7l5 3-5 3V7z" fill="currentColor"/>
      </svg>
    ),
    'fire': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <path d="M10 2c-.5 3.5-4 5-3 8s4 4 3 8c2-2 4-4 3-7s-2.5-3-2-5c1 1 2.5 3 1 6 2-1 3.5-4 2-7S9 3 10 2z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    'check-circle': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    'trophy': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <path d="M6 5h8v3a4 4 0 01-8 0V5z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 13v4M7 17h6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 5h3v3a4 4 0 01-3 0V5zM17 5h-3v3a4 4 0 003 0V5z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    'layers': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <path d="M10 3l7 4-7 4-7-4 7-4z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 10l7 4 7-4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 13.5l7 4 7-4" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    'star': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <path d="M10 1l2.5 5.5 5.5.8-4 3.9.9 5.5L10 14.7l-4.9 2.5.9-5.5-4-3.9 5.5-.8z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    'star-filled': (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 1l2.5 5.5 5.5.8-4 3.9.9 5.5L10 14.7l-4.9 2.5.9-5.5-4-3.9 5.5-.8z"/>
      </svg>
    ),
    'book-open': (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <path d="M3 4h6a2 2 0 012 2v11a2 2 0 00-2-2H3V4z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 4h-6a2 2 0 00-2 2v11a2 2 0 012-2h6V4z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )
  };
  return icons[name] || <div className={className}>🏆</div>;
}