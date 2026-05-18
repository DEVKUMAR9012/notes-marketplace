import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const FEATURED_CATEGORIES = [
  { id: 'dei', title: 'DEI Dayalbagh', subtitle: 'Official College Notes', icon: '🏛️', color: 'from-blue-600 to-cyan-500', filterTarget: 'college', filterValue: 'DEI' },
  { id: 'btech', title: 'B.Tech / Engg', subtitle: 'All Engineering Notes', icon: '⚙️', color: 'from-violet-600 to-fuchsia-500', filterTarget: 'search', filterValue: 'B.Tech' },
  { id: 'cs', title: 'Computer Science', subtitle: 'Programming & DB', icon: '💻', color: 'from-orange-500 to-rose-500', filterTarget: 'search', filterValue: 'Computer' },
  { id: 'first_year', title: 'First Year', subtitle: 'Sem 1 & Sem 2 Common', icon: '🌱', color: 'from-emerald-500 to-teal-400', filterTarget: 'search', filterValue: 'First Year' },
];

export default function Home() {
  const navigate = useNavigate();

  const handleCategoryClick = (cat) => {
    if (cat.filterTarget === 'search') {
      navigate(`/explorer?search=${encodeURIComponent(cat.filterValue)}`);
    } else if (cat.filterTarget === 'college') {
      navigate(`/explorer?college=${encodeURIComponent(cat.filterValue)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col justify-center relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-10 w-[300px] h-[300px] bg-blue-800/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 w-full">
        {/* Premium Discovery Engine */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
              Unlock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Academic Potential</span>
            </h1>
            <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Access the most comprehensive library of student-curated notes, books, and resources.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {FEATURED_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ y: -8 }}
                className="relative group cursor-pointer h-full"
                onClick={() => handleCategoryClick(cat)}
              >
                {/* Glow Effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${cat.color} rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500`} />
                
                <div className="relative h-full bg-[#0d0d1a] border border-white/10 rounded-[2rem] p-8 flex flex-col items-center text-center transition-colors group-hover:border-white/20">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-4xl shadow-2xl mb-6 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10">{cat.icon}</span>
                  </motion.div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">{cat.title}</h3>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">{cat.subtitle}</p>

                  <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-400 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    Explore Notes <FiArrowRight />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for arrow icon (used in categories)
const FiArrowRight = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);