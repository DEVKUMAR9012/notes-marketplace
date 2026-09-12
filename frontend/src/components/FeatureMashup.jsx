import { motion } from 'framer-motion';
import { FiEye, FiMessageCircle, FiShoppingCart, FiUserX, FiZap } from 'react-icons/fi';

const features = [
  {
    id: 1,
    title: '👻 Ghost Mode',
    desc: 'Bina signup kiye explore karo! Apni identity chupa ke notes dekho.',
    icon: FiUserX,
    color: 'bg-indigo-100 text-indigo-600',
    delay: 0.1
  },
  {
    id: 2,
    title: '📖 Instant PDF Previews',
    desc: 'Khareedne se pehle notes ka preview dekho. No blind buys!',
    icon: FiEye,
    color: 'bg-rose-100 text-rose-600',
    delay: 0.2
  },
  {
    id: 3,
    title: '💬 Live Chat',
    desc: 'Sellers se direct baat karo, doubt pucho, aur deal final karo!',
    icon: FiMessageCircle,
    color: 'bg-emerald-100 text-emerald-600',
    delay: 0.3
  },
  {
    id: 4,
    title: '🛒 Seamless Cart',
    desc: 'Ek click me notes cart me dalo, sab kuch perfectly sync hoga.',
    icon: FiShoppingCart,
    color: 'bg-amber-100 text-amber-600',
    delay: 0.4
  },
  {
    id: 5,
    title: '⚡ Lightning Fast Search',
    desc: 'Apne college ya subject ke notes milliseconds me dhundo.',
    icon: FiZap,
    color: 'bg-cyan-100 text-cyan-600',
    delay: 0.5
  }
];

export default function FeatureMashup() {
  return (
    <div className="py-12 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob" />
      <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-2000" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-black text-gray-900 tracking-tight"
          >
            ✨ The Magic Inside!
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 mt-2 font-medium"
          >
            A cute mashup of all our superpower features.
          </motion.p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {features.map((feat) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: feat.delay, type: 'spring', stiffness: 100 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-6 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 relative group overflow-hidden"
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 ${feat.color.split(' ')[0]} rounded-full blur-[40px] opacity-20 group-hover:opacity-50 transition-opacity duration-500`} />
              
              <div className={`w-14 h-14 rounded-2xl ${feat.color} flex items-center justify-center text-2xl mb-5 shadow-sm transform group-hover:rotate-6 transition-transform duration-300`}>
                <feat.icon />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
