import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMail, FiPhone, FiMapPin, FiSend, FiX, FiMessageCircle,
  FiPackage, FiFileText, FiCreditCard, FiLock, FiChevronDown,
  FiInstagram, FiTwitter, FiLinkedin, FiGithub
} from 'react-icons/fi';
import { useForm } from 'react-hook-form';

// ──────────────────────────────────────────────────────────────────
// TYPING ANIMATION HOOK
// ──────────────────────────────────────────────────────────────────
const TypingText = ({ text, speed = 50 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return displayedText;
};

// ──────────────────────────────────────────────────────────────────
// CONFETTI BURST EFFECT
// ──────────────────────────────────────────────────────────────────
const ConfettiBurst = ({ onComplete }) => {
  const confetti = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 400,
    y: -Math.random() * 200 - 50,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.1,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none">
      {confetti.map((conf) => (
        <motion.div
          key={conf.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: conf.rotation }}
          animate={{ x: conf.x, y: conf.y + 300, opacity: 0, rotate: conf.rotation + 180 }}
          transition={{ duration: 2.5, delay: conf.delay, ease: 'easeIn' }}
          onAnimationComplete={conf.id === 19 ? onComplete : undefined}
          className="absolute w-2 h-2 bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full"
          style={{ left: '50%', top: '50%' }}
        />
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────
// FLOATING PARTICLES BACKGROUND
// ──────────────────────────────────────────────────────────────────
const FloatingParticles = () => {
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    x: Math.random() * 100,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: window.innerHeight + 10, opacity: [0, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
          className="absolute rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
          }}
        />
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────
// 3D TILT CARD (Contact Form)
// ──────────────────────────────────────────────────────────────────
const TiltCard = ({ children }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = (e) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 10;
    const y = (e.clientX - rect.left - rect.width / 2) / -10;
    setRotation({ x, y });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: rotation.x, rotateY: rotation.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────
// FLIP CARD (Support Categories)
// ──────────────────────────────────────────────────────────────────
const FlipCard = ({ icon: Icon, title, description, delay }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => setIsFlipped(!isFlipped)}
      className="h-64 cursor-pointer perspective"
      style={{ perspective: '1000px' }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        {/* FRONT */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-cyan-900/40 backdrop-blur-xl border border-white/20 rounded-xl p-6 flex flex-col items-center justify-center hover:border-violet-500/50 transition-all group"
        >
          <div className="text-4xl mb-4 text-violet-400 group-hover:text-cyan-400 transition transform group-hover:scale-110">
            <Icon />
          </div>
          <h3 className="text-white font-bold text-center">{title}</h3>
          <p className="text-gray-400 text-xs mt-2 text-center">Click to learn more</p>
        </div>

        {/* BACK */}
        <div
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 to-violet-900/40 backdrop-blur-xl border border-cyan-500/50 rounded-xl p-6 flex items-center justify-center"
        >
          <p className="text-gray-300 text-sm text-center">{description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────
// FAQ ACCORDION
// ──────────────────────────────────────────────────────────────────
const FAQItem = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="mb-4"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-gradient-to-r from-violet-900/30 to-cyan-900/30 backdrop-blur-xl border border-white/10 hover:border-violet-500/50 rounded-lg flex items-center justify-between group transition-all"
      >
        <span className="text-left text-white font-medium group-hover:text-violet-400 transition">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-violet-400 text-xl"
        >
          <FiChevronDown />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 py-4 bg-gray-900/50 border-x border-b border-white/10 text-gray-300 text-sm">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────
// LIVE CHAT BUTTON
// ──────────────────────────────────────────────────────────────────
const LiveChatButton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring' }}
      className="fixed bottom-6 right-6 z-40"
    >
      {/* Chat Bubble */}
      <motion.button
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="relative group"
      >
        {/* Pulse Ring */}
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-emerald-400/30"
        />

        <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-emerald-500/50 transition-shadow cursor-pointer">
          <FiMessageCircle className="text-white text-2xl" />
        </div>
      </motion.button>

      {/* Hover Label */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-20 top-1/2 transform -translate-y-1/2 bg-gray-900 px-4 py-2 rounded-lg text-white text-sm font-medium whitespace-nowrap border border-white/20"
          >
            Chat with us!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute bottom-24 right-0 w-80 h-96 bg-gray-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-bold">Support Chat</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:bg-white/20 p-1 rounded"
              >
                <FiX />
              </button>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center">
              <p className="text-gray-400 text-center text-sm">
                Our support team is here to help! Send your message below. 💬
              </p>
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Type message..."
                className="flex-1 bg-gray-900 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition">
                <FiSend />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────
// MAIN CONTACT PAGE
// ──────────────────────────────────────────────────────────────────
export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1500));
      setShowConfetti(true);
      setSubmitMessage('Message sent! We will get back to you soon ✓');
      reset();
      setTimeout(() => setShowConfetti(false), 2500);
      setTimeout(() => setSubmitMessage(''), 3500);
    } catch (err) {
      setSubmitMessage('Error sending message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportCategories = [
    {
      icon: FiPackage,
      title: 'Order Issues',
      description: 'Having trouble with your downloads or purchases? We\'re here to help resolve any issues.',
    },
    {
      icon: FiFileText,
      title: 'Note Quality',
      description: 'Found an issue with note content or formatting? Let us know and we\'ll investigate.',
    },
    {
      icon: FiCreditCard,
      title: 'Payments',
      description: 'Payment problems? Our team can help resolve billing and transaction issues quickly.',
    },
    {
      icon: FiLock,
      title: 'Account Help',
      description: 'Need help with your account? Password reset, profile updates, and more support.',
    },
  ];

  const faqs = [
    {
      question: 'How long does it take to get a response?',
      answer:
        'We typically respond within 24 hours. For urgent issues, our live chat is available 24/7 to help.',
    },
    {
      question: 'Can I get a refund on my purchase?',
      answer:
        'Yes, we offer refunds within 7 days of purchase if you\'re not satisfied with the quality of the notes.',
    },
    {
      question: 'How do I report inappropriate content?',
      answer:
        'Use the report button on any note listing, or contact us directly via email or live chat with details.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards, debit cards, and UPI payments through Razorpay integration.',
    },
    {
      question: 'How can I become a seller?',
      answer:
        'Click on "Upload" in the navbar to start uploading your notes. Verification typically takes 2-3 days.',
    },
  ];

  const socialLinks = [
    { name: 'Twitter', icon: FiTwitter, color: 'hover:text-blue-400', url: '#' },
    { name: 'Instagram', icon: FiInstagram, color: 'hover:text-pink-400', url: '#' },
    { name: 'LinkedIn', icon: FiLinkedin, color: 'hover:text-blue-600', url: '#' },
    { name: 'GitHub', icon: FiGithub, color: 'hover:text-gray-300', url: '#' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-24 pb-12 relative overflow-hidden">
      {/* Background Particles */}
      <FloatingParticles />

      {/* Confetti Burst */}
      {showConfetti && <ConfettiBurst onComplete={() => setShowConfetti(false)} />}

      {/* Live Chat Button */}
      <LiveChatButton />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION
            ══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-white">
              <TypingText text="We're here to help you" speed={50} />
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Got questions? We'd love to hear from you. Send us a message!
          </p>

          {/* Glowing Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto relative"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(124, 58, 237, 0.3)', '0 0 40px rgba(124, 58, 237, 0.5)', '0 0 20px rgba(124, 58, 237, 0.3)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative"
            >
              <input
                type="text"
                placeholder="Search your issue..."
                className="w-full px-6 py-4 bg-gray-900/50 backdrop-blur-xl border border-violet-500/30 hover:border-violet-500/60 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all"
              >
                Search
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            CONTACT FORM & INFO SECTION
            ══════════════════════════════════════════════════════════════ */}
        <section className="grid md:grid-cols-2 gap-8 mb-20">
          {/* Contact Form */}
          <TiltCard>
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-gradient-to-br from-violet-900/20 to-cyan-900/20 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>

              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Full Name</label>
                  <motion.input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-gray-900/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all"
                    whileFocus={{ scale: 1.02 }}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email Input */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Email Address</label>
                  <motion.input
                    type="email"
                    {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-gray-900/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all"
                    whileFocus={{ scale: 1.02 }}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Subject Input */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Subject</label>
                  <motion.input
                    type="text"
                    {...register('subject', { required: 'Subject is required' })}
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 bg-gray-900/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all"
                    whileFocus={{ scale: 1.02 }}
                  />
                  {errors.subject && (
                    <p className="text-red-400 text-xs mt-1">{errors.subject.message}</p>
                  )}
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Message</label>
                  <motion.textarea
                    {...register('message', { required: 'Message is required' })}
                    placeholder="Tell us more..."
                    rows="5"
                    className="w-full px-4 py-3 bg-gray-900/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all resize-none"
                    whileFocus={{ scale: 1.02 }}
                  />
                  {errors.message && (
                    <p className="text-red-400 text-xs mt-1">{errors.message.message}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full mt-6 relative group overflow-hidden px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
              >
                <motion.div
                  className="absolute inset-0 bg-white/20 rounded-lg"
                  animate={isSubmitting ? { x: ['100%', '-100%'] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend /> Send Message
                    </>
                  )}
                </span>
              </motion.button>

              {/* Success Message */}
              <AnimatePresence>
                {submitMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mt-4 p-3 rounded-lg text-center font-medium ${
                      submitMessage.includes('Error')
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {submitMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>
          </TiltCard>

          {/* Contact Info */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 backdrop-blur-xl border border-white/15 rounded-xl p-6 hover:border-emerald-500/50 transition-all"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiMail className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">Email</h3>
                  <p className="text-gray-400">support@notesmarketplace.com</p>
                  <p className="text-gray-500 text-sm">We respond within 24 hours</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-900/20 to-violet-900/20 backdrop-blur-xl border border-white/15 rounded-xl p-6 hover:border-blue-500/50 transition-all"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiPhone className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">Phone</h3>
                  <p className="text-gray-400">+91 98765 43210</p>
                  <p className="text-gray-500 text-sm">Mon-Fri, 10am-6pm IST</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-pink-900/20 to-red-900/20 backdrop-blur-xl border border-white/15 rounded-xl p-6 hover:border-pink-500/50 transition-all"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">Address</h3>
                  <p className="text-gray-400">New Delhi, India</p>
                  <p className="text-gray-500 text-sm">Available online 24/7</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SUPPORT CATEGORIES (FLIP CARDS)
            ══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">
            How Can We Help?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supportCategories.map((cat, i) => (
              <FlipCard
                key={i}
                icon={cat.icon}
                title={cat.title}
                description={cat.description}
                delay={i * 0.1}
              />
            ))}
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            FAQ SECTION
            ══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} index={i} />
            ))}
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            SOCIAL LINKS
            ══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center py-12 border-t border-white/10"
        >
          <h3 className="text-white font-bold mb-6">Follow Us</h3>
          <div className="flex justify-center gap-6">
            {socialLinks.map((link, i) => (
              <motion.a
                key={i}
                href={link.url}
                whileHover={{ scale: 1.2, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className={`text-2xl text-gray-400 ${link.color} transition-all`}
                title={link.name}
              >
                <link.icon />
              </motion.a>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
