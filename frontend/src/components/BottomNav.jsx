'use client';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', icon: '<svg viewBox="0 0 20 20"><path d="M3 10l7-7 7 7v8H13v-5H7v5H3V10z"/></svg>', path: '/dashboard' },
    { name: 'Classroom', icon: '<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>', path: '/classroom' },
    { name: 'Practice', icon: '<svg viewBox="0 0 20 20"><path d="M4 17V5a2 2 0 012-2h8a2 2 0 012 2v12M9 9h2m-1-1v4"/></svg>', path: '/exam-setup' },
    { name: 'Leaders', icon: '<svg viewBox="0 0 20 20"><polygon points="10,2 12.5,7.5 18.5,8 14,12 15.5,18 10,15 4.5,18 6,12 1.5,8 7.5,7.5"/></svg>', path: '/leaderboard' },
    { name: 'Profile', icon: '<svg viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.5"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-gray-200 flex items-center justify-around px-2 pb-2 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-1 min-w-[56px] py-1 rounded-xl"
          >
            <div className="w-5 h-5" dangerouslySetInnerHTML={{ __html: item.icon }} />
            <span className={`text-xs font-medium ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {item.name}
            </span>
            {isActive && <div className="w-1 h-1 rounded-full bg-green-700 mt-0.5" />}
          </button>
        );
      })}
    </div>
  );
}