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
        <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-white">
          {display}
        </span>
        <span className="text-xl font-bold mb-1 text-white">{suffix}</span>
      </div>

      {/* Label */}
      <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
        {label}
      </span>
    </motion.div>
  );
}

const UNIVERSITY_CATEGORIES = [
  { id: 'dei',        title: 'DEI Dayalbagh',   subtitle: 'Official college notes',    icon: FiBriefcase, iconBg: 'bg-[#1e293b]', iconColor: 'text-blue-400', notesCount: '1.2K', filterTarget: 'college', filterValue: 'DEI' },
  { id: 'du',         title: 'Delhi University', subtitle: 'Official DU syllabus',      icon: FiBook,      iconBg: 'bg-[#2e1065]', iconColor: 'text-purple-400', notesCount: '3.4K', filterTarget: 'college', filterValue: 'Delhi University' },
  { id: 'jnu',        title: 'JNU New Delhi',   subtitle: 'Official JNU resources',    icon: FiCompass,   iconBg: 'bg-[#064e3b]', iconColor: 'text-emerald-500', notesCount: '890', filterTarget: 'college', filterValue: 'JNU' },
  { id: 'btech',      title: 'B.Tech / Engg',   subtitle: 'All engineering notes',     icon: FiCpu,       iconBg: 'bg-[#451a03]', iconColor: 'text-orange-500', notesCount: '5.1K', filterTarget: 'search', filterValue: 'B.Tech' },
  { id: 'cs',         title: 'Computer Science', subtitle: 'Programming & DB',          icon: FiMonitor,   iconBg: 'bg-[#4c1d95]', iconColor: 'text-violet-400', notesCount: '2.8K', filterTarget: 'search', filterValue: 'Computer' },
  { id: 'gaming',     title: 'Gaming Tech',     subtitle: 'Design, Dev & E-Sports',    icon: FiPlayCircle,iconBg: 'bg-[#701a75]', iconColor: 'text-fuchsia-400', notesCount: '940', filterTarget: 'search', filterValue: 'Gaming' },
  { id: 'first_year', title: 'First Year',       subtitle: 'Sem 1 & Sem 2 Common',     icon: FiBookOpen,  iconBg: 'bg-[#134e4a]', iconColor: 'text-teal-400', notesCount: '4.2K', filterTarget: 'search', filterValue: 'First Year' },
];

const SCHOOL_CATEGORIES = [
  { id: '9th',        title: '9th Class',        subtitle: 'CBSE & State Board',        imgUrl: '/classes/class_9_icon_1779705473105.png',       iconBg: 'bg-[#450a0a]', iconColor: 'text-red-500', notesCount: '720', filterTarget: 'search', filterValue: '9th' },
  { id: '10th',       title: '10th Class',       subtitle: 'Board exam prep',           imgUrl: '/classes/class_10_icon_1779705488759.png',    iconBg: 'bg-[#451a03]', iconColor: 'text-amber-500', notesCount: '1.1K', filterTarget: 'search', filterValue: '10th' },
  { id: '11th',       title: '11th Class',       subtitle: 'Science & Commerce',        imgUrl: '/classes/class_11_icon_1779705504886.png',   iconBg: 'bg-[#14532d]', iconColor: 'text-green-500', notesCount: '980', filterTarget: 'search', filterValue: '11th' },
  { id: '12th',       title: '12th Class',       subtitle: 'JEE / NEET & Boards',       imgUrl: '/classes/class_12_icon_1779705522501.png',     iconBg: 'bg-[#1e3a8a]', iconColor: 'text-blue-500', notesCount: '2.3K', filterTarget: 'search', filterValue: '12th' },
];

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-60px' });

  const [stats, setStats] = useState({ totalNotes: 312, totalStudents: 37, totalDownloads: 120 });
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
    { value: stats.totalNotes, suffix: '+', label: 'Notes', delay: 0 },
    { value: stats.totalStudents, suffix: '+', label: 'Students', delay: 0.12 },
    { value: stats.totalDownloads, suffix: '+', label: 'Downloads', delay: 0.24 },
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


        {/* ── Live Stats Bar ────────────────────────────────────────────────── */}
        <div ref={statsRef} className="mb-14 mt-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={statsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="w-full relative"
          >
            <div className="flex gap-8 sm:gap-12 md:gap-20 flex-wrap pb-4 border-b border-white/20 w-full">
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

        {/* ── Universities Section ───────────────────────────────────────────── */}
        <div className="mb-4 sm:mb-6 relative z-20">
          <UniversitySection />
        </div>

        {/* ── School Classes Section ──────────────────────────────────────────── */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {SCHOOL_CATEGORIES.map((cat, i) => {
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: (UNIVERSITY_CATEGORIES.length + i) * 0.05, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="group cursor-pointer bg-[#0f111a] border border-white/[0.04] rounded-2xl p-5 flex flex-col hover:border-white/[0.1] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all h-full relative overflow-hidden"
                  onClick={() => handleCategoryClick(cat)}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 ${cat.iconBg} rounded-full blur-[50px] opacity-20 group-hover:opacity-50 transition-opacity duration-500`} />
                  
                  <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center shadow-inner relative z-10 border border-white/[0.05] overflow-hidden`}>
                    <img src={cat.imgUrl} alt={cat.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-[15px] font-bold text-white mb-1.5 leading-tight">{cat.title}</h3>
                    <p className="text-[12px] text-[#8b92a5] font-medium mb-4">{cat.subtitle}</p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-white/[0.04] flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-bold text-[#6b7280] group-hover:text-[#9ca3af] transition-colors">{cat.notesCount} notes</span>
                    <div className="w-6 h-6 flex items-center justify-center rounded-md border border-white/[0.05] bg-white/[0.02] text-[#6b7280] group-hover:text-white group-hover:bg-white/[0.1] group-hover:border-white/[0.2] transition-all">
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

