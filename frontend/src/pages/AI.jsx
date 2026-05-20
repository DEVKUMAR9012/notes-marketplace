import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiFileText, FiCpu, FiBook, FiCode, FiBriefcase, 
  FiCalendar, FiMic, FiArrowRight, FiZap, FiX
} from 'react-icons/fi';
import NoteSummarizer from '../components/AI/NoteSummarizer';
import PDFChat from '../components/AI/PDFChat';
import QuizGenerator from '../components/AI/QuizGenerator';
import AskAI from '../components/AI/AskAI';

const AIHub = () => {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const aiFeatures = [
    {
      id: 'summarizer',
      title: 'Summarize Notes',
      icon: FiFileText,
      description: 'Upload notes & get smart summaries with key points',
      color: 'from-blue-500 to-cyan-500',
      status: '✅ Available',
      component: NoteSummarizer,
    },
    {
      id: 'pdf-chat',
      title: 'PDF Chat',
      icon: FiCpu,
      description: 'Ask questions directly from your uploaded PDFs',
      color: 'from-purple-500 to-pink-500',
      status: '✅ Available',
      component: PDFChat,
    },
    {
      id: 'quiz',
      title: 'Quiz Generator',
      icon: FiBook,
      description: 'Auto-generate MCQs, flashcards & practice tests',
      color: 'from-green-500 to-emerald-500',
      status: '✅ Available',
      component: QuizGenerator,
    },
    {
      id: 'code-explainer',
      title: 'Code Explainer',
      icon: FiCode,
      description: 'Paste code → Get line-by-line explanation',
      color: 'from-orange-500 to-red-500',
      status: '🚀 Coming Soon'
    },
    {
      id: 'roadmap',
      title: 'Learning Roadmaps',
      icon: FiCalendar,
      description: 'AI-generated study roadmaps for any topic',
      color: 'from-violet-500 to-purple-500',
      status: '📋 Phase 2'
    },
    {
      id: 'resume',
      title: 'Resume Builder',
      icon: FiBriefcase,
      description: 'ATS-optimized resume with AI suggestions',
      color: 'from-yellow-500 to-orange-500',
      status: '📋 Phase 2'
    },
    {
      id: 'interview',
      title: 'Interview Prep',
      icon: FiMic,
      description: 'Mock interviews & viva preparation',
      color: 'from-red-500 to-pink-500',
      status: '📋 Phase 2'
    },
    {
      id: 'doubt-solver',
      title: 'Ask AI',
      icon: FiZap,
      description: 'Get answers to any concept or doubt',
      color: 'from-cyan-500 to-blue-500',
      status: '✅ Available',
      component: AskAI,
    },
  ];

  // If a feature is selected, show its component
  if (selectedFeature) {
    const feature = aiFeatures.find(f => f.id === selectedFeature);
    const Component = feature?.component;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-between"
          >
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setSelectedFeature(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-all"
              >
                <FiX className="text-2xl text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                  {feature?.icon && <feature.icon className="text-3xl" />}
                  {feature?.title}
                </h1>
                <p className="text-gray-400 mt-1 text-sm">{feature?.description}</p>
              </div>
            </div>
          </motion.div>

          {/* Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-xl min-h-96"
          >
            {Component && <Component />}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-12">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <FiZap className="text-4xl text-yellow-400" />
              <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Study Assistant
              </h1>
              <FiZap className="text-4xl text-yellow-400" />
            </div>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Your personal AI-powered study companion. Summarize notes, solve doubts, 
              generate quizzes, and master any subject faster.
            </p>
          </motion.div>

          {/* Status Pills removed as per user request */}
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedFeature(feature.id)}
                className="group cursor-pointer"
              >
                <div className="h-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300 backdrop-blur-xl">
                  
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="text-2xl text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {feature.description}
                  </p>

                  {/* Status & CTA */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      {feature.status}
                    </span>
                    <FiArrowRight className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="container mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 text-center backdrop-blur-xl"
        >
          <p className="text-gray-300 mb-4">
            🎯 <strong>Pro Tip:</strong> More features coming weekly. Stay tuned for the most powerful student AI platform!
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
              Start Learning
            </button>
            <button className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all">
              See Roadmap
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIHub;
