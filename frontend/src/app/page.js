import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 to-green-700">
      
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-4">
        <div className="text-white text-2xl font-bold">
          📚 SyllabusSync
        </div>
        <div className="flex gap-4">
          <Link href="/login" 
            className="text-white border border-white px-4 py-2 rounded-lg hover:bg-white hover:text-green-900 transition">
            Login
          </Link>
          <Link href="/register" 
            className="bg-yellow-400 text-green-900 font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center px-4 py-20">
        <h1 className="text-white text-5xl font-bold leading-tight max-w-3xl">
          Pass WAEC, NECO & JAMB With 
          <span className="text-yellow-400"> Confidence</span>
        </h1>
        <p className="text-green-100 text-xl mt-6 max-w-2xl">
          Stop memorizing. Start understanding. SyllabusSync gives you 
          structured lessons, past questions, and gamified learning — 
          built for Nigerian students.
        </p>
        <Link href="/register" 
          className="mt-10 bg-yellow-400 text-green-900 font-bold text-xl px-8 py-4 rounded-xl hover:bg-yellow-300 transition">
          Start Learning for Free 🚀
        </Link>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 py-16 max-w-6xl mx-auto">
        
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-2">Curriculum Aligned</h3>
          <p className="text-green-100">
            Every topic mapped to WAEC, NECO, and JAMB syllabi. 
            No more guessing what to study.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-xl font-bold mb-2">Adaptive Learning</h3>
          <p className="text-green-100">
            Our engine finds your weak areas and focuses your 
            study time where it matters most.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-bold mb-2">Gamified Experience</h3>
          <p className="text-green-100">
            Earn XP, maintain streaks, climb leaderboards, and 
            defeat Boss Fight mock exams.
          </p>
        </div>

      </section>

      {/* Footer */}
      <footer className="text-center text-green-200 py-8">
        <p>© 2026 SyllabusSync — Built for Nigerian Students 🇳🇬</p>
      </footer>

    </main>
  );
}