'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaSyncAlt } from 'react-icons/fa';

export default function Navbar({ user }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <nav className="bg-green-900 px-6 py-4 flex justify-between items-center shadow-lg">
      
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <FaSyncAlt className="text-yellow-400 text-xl" />
        <span className="text-white text-xl font-bold">SyllabusSync</span>
      </Link>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-green-200 hidden md:block">
            👋 {user.full_name}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg 
          hover:bg-red-400 transition text-sm font-medium">
          Logout
        </button>
      </div>

    </nav>
  );
}