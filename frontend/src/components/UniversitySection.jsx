import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Data ────────────────────────────────────────────────────────────────────
const UNIVERSITIES = [
  {
    id: "dei",
    shortName: "DEI",
    fullName: "Dayalbagh Educational Institute",
    location: "Agra, India",
    established: "1981",
    notesCount: 670,
    subjectsCount: 54,
    contributorsCount: 178,
    accentColor: "#0EA5A0",
    glowColor: "rgba(14, 165, 160, 0.18)",
    borderColor: "rgba(14, 165, 160, 0.28)",
    badgeLabel: "Rising",
    logoUrl: "/logos/dei.png",
    logoFallback: "DEI",
    tags: ["Engineering", "Management", "Sciences"],
    filterTarget: 'college',
    filterValue: 'DEI'
  },
  {
    id: "du",
    shortName: "DU",
    fullName: "University of Delhi",
    location: "New Delhi, India",
    established: "1922",
    notesCount: 3850,
    subjectsCount: 214,
    contributorsCount: 890,
    accentColor: "#7C3AED",
    glowColor: "rgba(124, 58, 237, 0.18)",
    borderColor: "rgba(124, 58, 237, 0.28)",
    badgeLabel: "Most Notes",
    logoUrl: "/logos/du.png",
    logoFallback: "DU",
    tags: ["Commerce", "Arts", "Sciences"],
    filterTarget: 'college',
    filterValue: 'Delhi University'
  },
  {
    id: "jnu",
    shortName: "JNU",
    fullName: "Jawaharlal Nehru University",
    location: "New Delhi, India",
    established: "1969",
    notesCount: 1240,
    subjectsCount: 87,
    contributorsCount: 312,
    accentColor: "#3B6FE8",
    glowColor: "rgba(59, 111, 232, 0.18)",
    borderColor: "rgba(59, 111, 232, 0.28)",
    badgeLabel: "Top Rated",
    logoUrl: "/logos/jnu.png",
    logoFallback: "JNU",
    tags: ["Social Sciences", "Sciences", "Languages"],
    filterTarget: 'college',
    filterValue: 'JNU'
  },
  {
    id: "btech",
    shortName: "B.Tech",
    fullName: "B.Tech / Engg",
    location: "All India",
    established: "Various",
    notesCount: 5100,
    subjectsCount: 340,
    contributorsCount: 1205,
    accentColor: "#E83B8B",
    glowColor: "rgba(232, 59, 139, 0.18)",
    borderColor: "rgba(232, 59, 139, 0.28)",
    badgeLabel: "Trending",
    logoUrl: "/logos/btech.png",
    logoFallback: "BT",
    tags: ["Engineering", "Technology", "Programming"],
    filterTarget: 'search',
    filterValue: 'B.Tech'
  },
];

// ─── Stat Item ────────────────────────────────────────────────────────────────
function StatItem({ value, label, accentColor }) {
  const formatted =
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-sm font-bold tracking-tight"
        style={{ color: accentColor }}
      >
        {formatted}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-medium">
        {label}
      </span>
    </div>
  );
}

// ─── Tag Pill ─────────────────────────────────────────────────────────────────
function TagPill({ label, accentColor }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border whitespace-nowrap"
      style={{
        color: accentColor,
        borderColor: `${accentColor}44`,
        background: `${accentColor}12`,
      }}
    >
      {label}
    </span>
  );
}

// ─── University Card ──────────────────────────────────────────────────────────
function UniversityCard({ university, index, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef(null);

  // 3-D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), {
    stiffness: 200,
    damping: 20,
  });

  function handleMouseMove(e) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setHovered(false);
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.23, 1, 0.32, 1] }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative group cursor-pointer h-full flex flex-col"
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          boxShadow: hovered
            ? `0 0 48px 12px ${university.glowColor}, 0 0 0 1px ${university.borderColor}`
            : `0 0 0 0 transparent, 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
        transition={{ duration: 0.35 }}
      />

      {/* Card shell */}
      <div
        className="relative rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          background:
            "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid rgba(0,0,0,0.08)`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-px w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${university.accentColor}88, transparent)`,
          }}
        />

        <div className="p-4 flex flex-col gap-3 h-full">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 shrink-0">
            {/* Logo container */}
            <motion.div
              animate={{ scale: hovered ? 1.04 : 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at center, ${university.glowColor} 0%, rgba(255,255,255,0.04) 100%)`,
                border: `1px solid ${university.borderColor}`,
              }}
            >
              {!imgError ? (
                <img
                  src={university.logoUrl}
                  alt={`${university.shortName} logo`}
                  loading="lazy"
                  onError={() => setImgError(true)}
                  className="w-8 h-8 object-contain drop-shadow-md"
                  style={{ filter: "brightness(1.05)" }}
                />
              ) : (
                // Fallback monogram
                <span
                  className="text-lg font-black tracking-tight"
                  style={{ color: university.accentColor }}
                >
                  {university.logoFallback}
                </span>
              )}
            </motion.div>

            {/* Badge */}
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: `${university.accentColor}1A`,
                color: university.accentColor,
                border: `1px solid ${university.accentColor}33`,
              }}
            >
              {university.badgeLabel}
            </span>
          </div>

          {/* University name & meta */}
          <div className="space-y-1 shrink-0">
            <div className="flex items-baseline gap-2">
              <h3 className="text-gray-900 font-bold text-sm leading-tight tracking-[-0.01em]">
                {university.fullName}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-[10px] flex-wrap">
              <svg width="8" height="10" viewBox="0 0 10 12" fill="none">
                <path
                  d="M5 0C2.79 0 1 1.79 1 4c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 1 1 5 2.5a1.5 1.5 0 0 1 0 3z"
                  fill="currentColor"
                />
              </svg>
              <span className="truncate">{university.location}</span>
              <span className="text-gray-300">·</span>
              <span className="truncate">Est. {university.established}</span>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-3 gap-2 py-3 rounded-xl shrink-0"
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <StatItem
              value={university.notesCount}
              label="Notes"
              accentColor={university.accentColor}
            />
            <div
              className="w-px self-stretch"
              style={{ background: "rgba(0,0,0,0.08)" }}
            />
            <StatItem
              value={university.subjectsCount}
              label="Subjects"
              accentColor={university.accentColor}
            />
            <div
              className="col-span-3 h-px mx-4"
              style={{ background: "rgba(0,0,0,0.07)" }}
            />
            <div className="col-span-3">
              <StatItem
                value={university.contributorsCount}
                label="Contributors"
                accentColor={university.accentColor}
              />
            </div>
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-1 mt-auto mb-3">
            {(university.tags || []).map((tag) => (
              <TagPill key={tag} label={tag} accentColor={university.accentColor} />
            ))}
          </div>

          {/* CTA Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="relative w-full py-2 rounded-xl text-xs font-semibold tracking-wide overflow-hidden transition-all duration-300 mt-auto shrink-0"
            style={{
              background: hovered
                ? `linear-gradient(135deg, ${university.accentColor}DD, ${university.accentColor}99)`
                : "rgba(0,0,0,0.05)",
              color: hovered ? "#fff" : "rgba(55,65,81,0.7)",
              border: `1px solid ${hovered ? university.accentColor + "66" : "rgba(0,0,0,0.10)"}`,
            }}
          >
            <AnimatePresence mode="wait">
              {hovered ? (
                <motion.span
                  key="explore"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-center gap-2"
                >
                  Explore Notes
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7h10M7 2l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.span>
              ) : (
                <motion.span
                  key="view"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  View Collection
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function UniversitySection({ categoryStats }) {
  const navigate = useNavigate();

  const handleUniversityClick = (uni) => {
    if (uni.filterTarget === 'college') {
      navigate(`/explorer?college=${encodeURIComponent(uni.filterValue)}`);
    } else if (uni.filterTarget === 'search') {
      navigate(`/explorer?search=${encodeURIComponent(uni.filterValue)}`);
    }
  };

  const universityData = UNIVERSITIES.map(staticUni => {
    const realUni = categoryStats?.universityCategories?.find(u => u.id === staticUni.id);
    return {
      ...staticUni,
      notesCount: realUni?.notesCount ?? staticUni.notesCount,
      subjectsCount: realUni?.subjectsCount ?? staticUni.subjectsCount,
      contributorsCount: realUni?.contributorsCount ?? staticUni.contributorsCount,
    };
  });

  return (
    <section className="relative">
      <div className="relative z-10 w-full">
        {/* Responsive card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {universityData.map((uni, idx) => (
            <UniversityCard 
              key={uni.id} 
              university={uni} 
              index={idx} 
              onClick={() => handleUniversityClick(uni)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
