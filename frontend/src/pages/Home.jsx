import { motion, useInView, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import API from '../utils/api';

// ─── Animated Count-Up Hook ───────────────────────────────────────────────────
function useCountUp(target, duration = 1.8, inView = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView || target === 0) return;
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return controls.stop;
  }, [target, duration, inView]);
  return value;
}

// ─── Single Stat Cell ─────────────────────────────────────────────────────────
function StatCell({ icon, value, suffix = '+', label, color, delay, inView, isRating }) {
  const counted = useCountUp(isRating ? Math.round(value * 10) : value, 1.8, inView);
  const display = isRating
    ? (counted / 10).toFixed(1)
    : counted.toLocaleString('en-IN');

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: 'easeOut' }}
      className="flex flex-col items-center gap-1.5 px-6 py-5 relative group"
    >
      {/* Icon glow */}
      <div className={`text-2xl mb-1 drop-shadow-[0_0_10px_currentColor] ${color}`}>{icon}</div>

      {/* Number */}
      <div className="flex items-end gap-0.5 leading-none">
        <span className={`text-3xl sm:text-4xl font-black tabular-nums ${color}`}>
          {display}
        </span>
        <span className={`text-xl font-bold mb-0.5 ${color}`}>{suffix}</span>
      </div>

      {/* Label */}
      <span className="text-[11px] sm:text-xs text-gray-500 font-semibold uppercase tracking-widest text-center">
        {label}
      </span>
    </motion.div>
  );
}

// ─── Featured Categories ──────────────────────────────────────────────────────
const FEATURED_CATEGORIES = [
  { id: 'dei',        title: 'DEI Dayalbagh',   subtitle: 'Official College Notes',    icon: '🏛️', color: 'from-blue-600 to-cyan-500',    filterTarget: 'college', filterValue: 'DEI' },
  { id: 'btech',      title: 'B.Tech / Engg',   subtitle: 'All Engineering Notes',     icon: '⚙️', color: 'from-violet-600 to-fuchsia-500', filterTarget: 'search', filterValue: 'B.Tech' },
  { id: 'cs',         title: 'Computer Science', subtitle: 'Programming & DB',          icon: '💻', color: 'from-orange-500 to-rose-500',    filterTarget: 'search', filterValue: 'Computer' },
  { id: 'first_year', title: 'First Year',       subtitle: 'Sem 1 & Sem 2 Common',     icon: '🌱', color: 'from-emerald-500 to-teal-400',   filterTarget: 'search', filterValue: 'First Year' },
];

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-60px' });

  const [stats, setStats] = useState({ totalNotes: 0, totalStudents: 0, totalDownloads: 0, avgRating: 4.8 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    API.get('/notes/stats')
      .then(res => {
        if (res.data?.success) {
          setStats(res.data.stats);
          setStatsLoaded(true);
        }
      })
      .catch(() => {
        // silent fail — fallback numbers stay
        setStatsLoaded(true);
      });
  }, []);

  const handleCategoryClick = (cat) => {
    if (cat.filterTarget === 'search') {
      navigate(`/explorer?search=${encodeURIComponent(cat.filterValue)}`);
    } else if (cat.filterTarget === 'college') {
      navigate(`/explorer?college=${encodeURIComponent(cat.filterValue)}`);
    }
  };

  const statItems = [
    {
      icon: '📚', value: stats.totalNotes, suffix: '+', label: 'Notes & Books',
      color: 'text-violet-400', delay: 0,
    },
    {
      icon: '🎓', value: stats.totalStudents, suffix: '+', label: 'Students',
      color: 'text-fuchsia-400', delay: 0.12,
    },
    {
      icon: '⬇️', value: stats.totalDownloads, suffix: '+', label: 'Downloads',
      color: 'text-cyan-400', delay: 0.24,
    },
    {
      icon: '⭐', value: stats.avgRating, suffix: '★', label: 'Avg Rating',
      color: 'text-amber-400', delay: 0.36, isRating: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col justify-center relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-800/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-800/12 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-10 w-[300px] h-[300px] bg-blue-800/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 w-full">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
            Unlock Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Academic Potential
            </span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Access the most comprehensive library of student-curated notes, books, and resources.
          </p>
        </motion.div>

        {/* ── Live Stats Bar ────────────────────────────────────────────────── */}
        <div ref={statsRef} className="mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={statsInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="relative max-w-3xl mx-auto"
          >
            {/* Outer glow */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-600/40 via-fuchsia-500/40 to-cyan-500/40 blur-sm" />

            {/* Glass card */}
            <div className="relative bg-[#0d0d1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              {/* Top shimmer line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              <div className="flex flex-wrap sm:flex-nowrap items-stretch justify-center divide-y sm:divide-y-0 sm:divide-x divide-white/8">
                {statItems.map((s, i) => (
                  <div key={s.label} className={`flex-1 min-w-[140px] sm:min-w-0 ${i < statItems.length - 1 ? '' : ''}`}>
                    <StatCell
                      icon={s.icon}
                      value={statsLoaded ? s.value : 0}
                      suffix={s.suffix}
                      label={s.label}
                      color={s.color}
                      delay={s.delay}
                      inView={statsInView && statsLoaded}
                      isRating={s.isRating}
                    />
                  </div>
                ))}
              </div>

              {/* Live indicator */}
              <div className="flex items-center justify-center gap-1.5 py-2 border-t border-white/6 bg-white/[0.02]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                <span className="text-[10px] text-gray-600 font-semibold tracking-widest uppercase">
                  Live Platform Data
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Category Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {FEATURED_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ y: -8 }}
              className="relative group cursor-pointer h-full"
              onClick={() => handleCategoryClick(cat)}
            >
              {/* Glow */}
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
  );
}

// Helper icon
const FiArrowRight = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"
    strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);