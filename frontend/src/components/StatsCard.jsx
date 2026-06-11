export default function StatsCard({ icon, value, label, color }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow text-center 
    border-t-4 ${color} hover:shadow-md transition`}>
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className="text-2xl font-bold text-green-900">{value}</h3>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  );
}