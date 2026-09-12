import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFileText, FiShoppingCart, FiCheckCircle, FiHeart, FiTrendingUp } from 'react-icons/fi';

// ─── Mini UI Components for the Mashup Collage ───

const MiniSearchBar = () => (
  <motion.div 
    initial={{ x: -100, y: -50, opacity: 0, rotate: -10 }} 
    animate={{ x: 0, y: 0, opacity: 1, rotate: -5 }} 
    transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
    className="absolute top-[15%] left-[10%] flex items-center bg-white rounded-full px-4 py-3 shadow-2xl border border-gray-100 w-64 z-20"
  >
    <FiSearch className="text-gray-400 mr-2" />
    <div className="h-3 bg-gray-200 rounded w-full" />
  </motion.div>
);

const MiniNoteCard = ({ top, right, bottom, left, rotate, delay, colorFrom, colorTo }) => (
  <motion.div 
    initial={{ scale: 0, opacity: 0, rotate: rotate + 20 }} 
    animate={{ scale: 1, opacity: 1, rotate }} 
    transition={{ type: "spring", stiffness: 120, delay }}
    className="absolute w-36 bg-white rounded-2xl shadow-2xl p-3 border border-gray-100 z-10"
    style={{ top, right, bottom, left }}
  >
    <div className={`h-24 bg-gradient-to-br ${colorFrom} ${colorTo} rounded-xl mb-3 shadow-inner`} />
    <div className="h-2 bg-gray-200 rounded w-3/4 mb-1.5" />
    <div className="h-2 bg-gray-100 rounded w-1/2" />
  </motion.div>
);

const MiniChat = () => (
  <motion.div 
    initial={{ x: 100, y: 50, opacity: 0, rotate: 10 }} 
    animate={{ x: 0, y: 0, opacity: 1, rotate: 5 }} 
    transition={{ type: "spring", stiffness: 90, delay: 0.3 }}
    className="absolute top-[20%] right-[10%] flex flex-col gap-3 w-48 z-20"
  >
    <div className="self-start bg-white p-3 rounded-2xl rounded-tl-none shadow-xl border border-gray-100 w-40">
      <div className="h-2 bg-gray-200 rounded w-full mb-1.5" />
      <div className="h-2 bg-gray-200 rounded w-2/3" />
    </div>
    <div className="self-end bg-emerald-500 p-3 rounded-2xl rounded-tr-none shadow-xl shadow-emerald-500/20 w-36">
      <div className="h-2 bg-white/80 rounded w-full mb-1.5" />
      <div className="h-2 bg-white/80 rounded w-1/2" />
    </div>
  </motion.div>
);

const MiniPDFViewer = () => (
  <motion.div 
    initial={{ y: 100, opacity: 0, rotate: -15 }} 
    animate={{ y: 0, opacity: 1, rotate: -8 }} 
    transition={{ type: "spring", stiffness: 110, delay: 0.4 }}
    className="absolute bottom-[10%] right-[20%] w-44 h-56 bg-white shadow-2xl rounded-2xl border border-gray-100 flex flex-col p-2 z-10"
  >
    <div className="w-full h-8 bg-gray-50 rounded-lg mb-2 flex items-center justify-between px-2">
      <FiFileText className="text-gray-400 text-xs"/>
      <div className="w-12 h-2 bg-gray-200 rounded" />
    </div>
    <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-2 space-y-2">
       <div className="w-full h-2 bg-gray-200 rounded" />
       <div className="w-5/6 h-2 bg-gray-200 rounded" />
       <div className="w-full h-2 bg-gray-200 rounded" />
       <div className="w-4/6 h-2 bg-gray-200 rounded" />
    </div>
  </motion.div>
);

const FloatingIcon = ({ icon: Icon, color, top, left, right, bottom, delay, size = "text-3xl" }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: [0, 1.2, 1], opacity: 1, y: [0, -10, 0] }}
    transition={{ duration: 1.5, delay, repeat: Infinity, repeatType: 'reverse' }}
    className={`absolute ${color} bg-white p-4 rounded-full shadow-xl z-30`}
    style={{ top, left, right, bottom }}
  >
    <Icon className={size} />
  </motion.div>
);

export default function IntroReel({ onComplete }) {
  
  // The entire mashup plays for 4 seconds, then unmounts
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="mashup-overlay"
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(40px)' }}
        exit={{ opacity: 0, scale: 1.1, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/70 overflow-hidden"
      >
        {/* Animated Background Gradients */}
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 z-0 opacity-40"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-300 rounded-full mix-blend-multiply filter blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-coral-300 rounded-full mix-blend-multiply filter blur-[100px]" />
          <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-purple-300 rounded-full mix-blend-multiply filter blur-[100px]" />
        </motion.div>

        {/* ─── ALL UI ELEMENTS MASHED TOGETHER ─── */}
        <div className="relative w-full h-full max-w-6xl mx-auto flex items-center justify-center">
          
          {/* Floating UI Pieces */}
          <MiniSearchBar />
          <MiniChat />
          <MiniPDFViewer />
          
          <MiniNoteCard bottom="15%" left="15%" rotate={-12} delay={0.2} colorFrom="from-purple-100" colorTo="to-indigo-100" />
          <MiniNoteCard top="25%" right="30%" rotate={15} delay={0.3} colorFrom="from-amber-100" colorTo="to-orange-100" />
          <MiniNoteCard bottom="25%" left="35%" rotate={5} delay={0.5} colorFrom="from-rose-100" colorTo="to-pink-100" />

          {/* Floating Icons */}
          <FloatingIcon icon={FiShoppingCart} color="text-amber-500" top="15%" left="40%" delay={0.2} />
          <FloatingIcon icon={FiHeart} color="text-rose-500" bottom="20%" right="40%" delay={0.4} />
          <FloatingIcon icon={FiCheckCircle} color="text-emerald-500" top="40%" right="15%" delay={0.6} size="text-4xl" />
          <FloatingIcon icon={FiTrendingUp} color="text-indigo-500" bottom="30%" left="25%" delay={0.1} />

          {/* Center Text (The Core Focus) */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.6 }}
            className="z-50 text-center bg-white/40 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50"
          >
            <h1 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tight drop-shadow-sm mb-2">
              Notes<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Here</span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 font-bold tracking-widest uppercase">
              Everything in one place
            </p>
          </motion.div>

        </div>

        {/* Progress Bar (Time Remaining) */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-48 h-1.5 bg-gray-200/50 rounded-full overflow-hidden z-50">
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4, ease: 'linear' }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
