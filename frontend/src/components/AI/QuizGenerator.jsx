import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiRotateCw, FiCheck, FiX, FiAward } from 'react-icons/fi';
import API from '../../utils/api';

const QuizGenerator = () => {
  const [step, setStep] = useState('input');
  const [text, setText] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quizId, setQuizId] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 100) {
      setError('Please enter at least 100 characters of text');
      return;
    }

    setLoading(true);
    setError('');
    setStep('loading');

    try {
      const { data } = await API.post('/ai/quiz/generate', {
        text: text.trim(),
        numQuestions,
        difficulty,
      });
      // Expecting { quizId, quiz }
      setQuizId(data.quizId);
      setQuiz(data.quiz);
      setAnswers({});
      setStep('quiz');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionIdx, option) => {
    setAnswers(prev => ({ ...prev, [questionIdx]: option }));
    if (error) setError('');
  };

  const handleSubmitQuiz = async () => {
    const allAnswered = quiz.every((_, idx) => answers[idx]);
    if (!allAnswered) {
      setError('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send only quizId + answers array (order preserved)
      const answersArray = quiz.map((_, idx) => answers[idx]);
      const { data } = await API.post('/ai/quiz/evaluate', {
        quizId,
        answers: answersArray,
      });
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to evaluate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setText('');
    setQuiz([]);
    setAnswers({});
    setResult(null);
    setQuizId(null);
    setStep('input');
    setError('');
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Study Material</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste study material here to generate quiz from..."
                className="w-full h-40 p-4 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
              <div className="text-xs text-gray-400">{text.length} / 100 characters minimum</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Number of Questions</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  aria-label="Number of questions"
                >
                  {[3, 5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n} Questions</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  aria-label="Difficulty"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateQuiz}
              disabled={loading || text.trim().length < 100}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FiPlay className="text-lg" />
              {loading ? 'Generating Quiz...' : 'Generate Quiz'}
            </button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <div className="animate-spin"><FiRotateCw className="text-4xl text-purple-500" /></div>
            <p className="text-gray-300 font-medium">Creating your quiz...</p>
            <p className="text-gray-500 text-sm">AI is generating {numQuestions} questions</p>
          </motion.div>
        )}

        {step === 'quiz' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{Object.keys(answers).length} / {quiz.length} answered</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(Object.keys(answers).length / quiz.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {quiz.map((question, qIdx) => (
                <motion.div
                  key={qIdx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: qIdx * 0.1 }}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3"
                >
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{qIdx + 1}</span>
                    </div>
                    <p className="text-white font-medium">{question.question}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 ml-9">
                    {question.options.map((option, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectAnswer(qIdx, option)}
                        className={`p-3 text-left rounded-lg border-2 transition-all ${
                          answers[qIdx] === option
                            ? 'border-purple-500 bg-purple-500/10 text-white'
                            : 'border-gray-600 bg-gray-900/30 text-gray-300 hover:border-gray-500'
                        }`}
                        aria-pressed={answers[qIdx] === option}
                      >
                        <div className="font-bold text-sm mb-1">{option}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmitQuiz}
              disabled={loading || Object.keys(answers).length !== quiz.length}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {loading ? 'Evaluating...' : `Submit Quiz (${Object.keys(answers).length}/${quiz.length})`}
            </button>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <FiAward className="text-4xl text-white" />
                </div>
              </div>
              <p className="text-5xl font-black text-white mb-2">{result.score}%</p>
              <p className="text-2xl font-bold text-purple-300 mb-4">{result.performance}</p>
              <p className="text-gray-300">
                You got {result.correctCount} out of {result.totalQuestions} questions correct
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {result.results.map((res, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    res.isCorrect ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'
                  }`}
                >
                  <div className="flex gap-2 mb-2">
                    {res.isCorrect ? <FiCheck className="text-green-400 flex-shrink-0 mt-1" /> : <FiX className="text-red-400 flex-shrink-0 mt-1" />}
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">Q{res.questionIndex + 1}: {res.question}</p>
                      {!res.isCorrect && (
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-red-300">Your answer: <strong>{res.userAnswer}</strong></p>
                          <p className="text-green-300">Correct answer: <strong>{res.correctAnswer}</strong></p>
                        </div>
                      )}
                      <p className="mt-2 text-gray-400 text-xs">{res.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all"
              >
                📝 Try Another Quiz
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizGenerator;
