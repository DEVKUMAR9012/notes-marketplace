import { motion, useInView, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiBook, FiBriefcase, FiCompass, FiCpu, FiMonitor, FiPlayCircle, FiBookOpen, FiBox, FiTarget, FiFeather, FiAward } from 'react-icons/fi';
import API from '../utils/api';
import UniversitySection from '../components/UniversitySection';

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
function StatCell({ value, suffix = '+', label, delay, inView, isRating }) {
  const counted = useCountUp(isRating ? Math.round(value * 10) : value, 1.8, inView);
  const display = isRating
    ? (counted / 10).toFixed(1)
    : counted.toLocaleString('en-IN');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: 'easeOut' }}
      className="flex flex-col items-start gap-1"
    >
      {/* Number */}
      <div className="flex items-end gap-0.5 leading-none">
        <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-gray-900">
          {display}
        </span>
        <span className="text-xl font-bold mb-1 text-gray-900">{suffix}</span>
      </div>

      {/* Label */}
      <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
        {label}
      </span>
    </motion.div>
  );
}

const UNIVERSITY_CATEGORIES = [
  { id: 'dei',        title: 'DEI Dayalbagh',   subtitle: 'Official college notes',    icon: FiBriefcase, iconBg: 'bg-coral-100', iconColor: 'text-coral-500', notesCount: '1.2K', filterTarget: 'college', filterValue: 'DEI' },
  { id: 'du',         title: 'Delhi University', subtitle: 'Official DU syllabus',      icon: FiBook,      iconBg: 'bg-violet-100', iconColor: 'text-violet-500', notesCount: '3.4K', filterTarget: 'college', filterValue: 'Delhi University' },
  { id: 'jnu',        title: 'JNU New Delhi',   subtitle: 'Official JNU resources',    icon: FiCompass,   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', notesCount: '890', filterTarget: 'college', filterValue: 'JNU' },
  { id: 'btech',      title: 'B.Tech / Engg',   subtitle: 'All engineering notes',     icon: FiCpu,       iconBg: 'bg-orange-100', iconColor: 'text-orange-500', notesCount: '5.1K', filterTarget: 'search', filterValue: 'B.Tech' },
  { id: 'cs',         title: 'Computer Science', subtitle: 'Programming & DB',          icon: FiMonitor,   iconBg: 'bg-blue-100', iconColor: 'text-blue-500', notesCount: '2.8K', filterTarget: 'search', filterValue: 'Computer' },
  { id: 'gaming',     title: 'Gaming Tech',     subtitle: 'Design, Dev & E-Sports',    icon: FiPlayCircle,iconBg: 'bg-pink-100', iconColor: 'text-pink-500', notesCount: '940', filterTarget: 'search', filterValue: 'Gaming' },
  { id: 'first_year', title: 'First Year',       subtitle: 'Sem 1 & Sem 2 Common',     icon: FiBookOpen,  iconBg: 'bg-teal-100', iconColor: 'text-teal-600', notesCount: '4.2K', filterTarget: 'search', filterValue: 'First Year' },
];

const SCHOOL_CATEGORIES = [
  { id: '9th',  title: '9th Class',  subtitle: 'CBSE & State Board',  imgUrl: '/classes/class_9_icon_1779705473105.png',   iconBg: 'bg-red-100',    notesCount: '720',  filterTarget: 'search', filterValue: '9th' },
  { id: '10th', title: '10th Class', subtitle: 'Board exam prep',     imgUrl: '/classes/class_10_icon_1779705488759.png',  iconBg: 'bg-amber-100',  notesCount: '1.1K', filterTarget: 'search', filterValue: '10th' },
  { id: '11th', title: '11th Class', subtitle: 'Science & Commerce',  imgUrl: '/classes/class_11_icon_1779705504886.png',  iconBg: 'bg-green-100',  notesCount: '980',  filterTarget: 'search', filterValue: '11th' },
  { id: '12th', title: '12th Class', subtitle: 'JEE / NEET & Boards', imgUrl: '/classes/class_12_icon_1779705522501.png',  iconBg: 'bg-blue-100',   notesCount: '2.3K', filterTarget: 'search', filterValue: '12th' },
];

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-60px' });

  const [stats, setStats] = useState({ totalNotes: 312, totalStudents: 37, totalDownloads: 120 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [categoryStats, setCategoryStats] = useState(null);

  useEffect(() => {
    API.get('/notes/stats')
      .then(res => {
        if (res.data?.success) {
          setStats(res.data.stats);
          setStatsLoaded(true);
        }
      })
      .catch(() => {
        setStatsLoaded(true);
      });
      
    API.get('/notes/category-stats')
      .then(res => {
        if (res.data?.success) {
          setCategoryStats(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleCategoryClick = (cat) => {
    if (cat.filterTarget === 'search') {
      navigate(`/explorer?search=${encodeURIComponent(cat.filterValue)}`);
    } else if (cat.filterTarget === 'college') {
      navigate(`/explorer?college=${encodeURIComponent(cat.filterValue)}`);
    }
  };

  const statItems = [
    { value: stats.totalNotes, suffix: '+', label: 'Notes', delay: 0 },
    { value: stats.totalStudents, suffix: '+', label: 'Students', delay: 0.12 },
    { value: stats.totalDownloads, suffix: '+', label: 'Downloads', delay: 0.24 },
  ];

  return (
    <div className="min-h-screen text-gray-900 flex flex-col justify-center relative overflow-hidden">
      {/* Soft ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px]" style={{ background: 'rgba(249,123,91,0.12)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px]" style={{ background: 'rgba(16,185,129,0.10)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 w-full">

        {/* ── Live Stats Bar ───────────────────────────────────────────── */}
        <div ref={statsRef} className="mb-14 mt-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={statsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="w-full relative"
          >
            <div
              className="flex gap-8 sm:gap-12 md:gap-20 flex-wrap pb-4 border-b w-full"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              {statItems.map((s, i) => (
                <StatCell
                  key={s.label}
                  value={statsLoaded ? s.value : 0}
                  suffix={s.suffix}
                  label={s.label}
                  delay={s.delay}
                  inView={statsInView && statsLoaded}
                  isRating={s.isRating}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Universities Section ─────────────────────────────────────── */}
        <div className="mb-4 sm:mb-6 relative z-20">
          <UniversitySection categoryStats={categoryStats} />
        </div>

        {/* ── School Classes Section ───────────────────────────────────── */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {SCHOOL_CATEGORIES.map((cat, i) => {
              const realData = categoryStats?.schoolCategories?.find(s => s.id === cat.id);
              const notesCount = realData?.notesCount || cat.notesCount;
              
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: (UNIVERSITY_CATEGORIES.length + i) * 0.05, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="group cursor-pointer rounded-2xl p-5 flex flex-col transition-all h-full relative overflow-hidden theme-card hover:shadow-raised"
                  onClick={() => handleCategoryClick(cat)}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 ${cat.iconBg} rounded-full blur-[50px] opacity-40 group-hover:opacity-70 transition-opacity duration-500`} />
                  
                  <div className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center shadow-sm relative z-10 overflow-hidden bg-white/60">
                    <img src={cat.imgUrl} alt={cat.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-[15px] font-bold text-gray-900 mb-1.5 leading-tight">{cat.title}</h3>
                    <p className="text-[12px] text-gray-500 font-medium mb-4">{cat.subtitle}</p>
                  </div>

                  <div
                    className="mt-auto pt-3 border-t flex items-center justify-between relative z-10"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                      {typeof notesCount === 'number' ? (notesCount >= 1000 ? `${(notesCount / 1000).toFixed(1)}K` : notesCount) : notesCount} notes
                    </span>
                    <div
                      className="w-6 h-6 flex items-center justify-center rounded-md border text-gray-400 group-hover:text-white transition-all"
                      style={{ borderColor: 'var(--border)', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = ''; }}
                    >
                      <FiArrowRight size={11} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
