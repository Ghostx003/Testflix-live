import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Activity, ListChecks } from 'lucide-react';


interface DayDetailModalProps {
  date: Date;
  tests: any[];
  onClose: () => void;
  getTestDetails: (test: any) => { coachingName: string; subjectName: string; typeName: string };
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, tests, onClose, getTestDetails }) => {
  const totalTests = tests.length;
  
  let totalScore = 0;
  let totalMaxScore = 0;
  let totalMinutes = 0;

  tests.forEach(t => {
    totalScore += t.marksObtained || 0;
    totalMaxScore += t.maxMarks || 0;
    if (t.timeTaken) {
      const timeStr = t.timeTaken.toLowerCase();
      if (timeStr.includes('min')) {
        const match = timeStr.match(/(\d+)/);
        if (match) totalMinutes += parseInt(match[1], 10);
      } else if (timeStr.includes('h')) {
        const match = timeStr.match(/(\d+)/);
        if (match) totalMinutes += parseInt(match[1], 10) * 60;
      }
    }
  });

  const avgScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
  const formattedTime = totalMinutes > 0 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : '0h';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="bg-surface-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500" />
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-surface-300">
                  <ListChecks className="w-4 h-4 text-primary-400" /> {totalTests} Tests Taken
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-surface-300">
                  <Activity className="w-4 h-4 text-emerald-400" /> {Math.round(avgScore)}% Avg
                </span>
                {totalMinutes > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-surface-300">
                    <Clock className="w-4 h-4 text-pink-400" /> {formattedTime}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/5 hover:bg-white/10 text-surface-300 hover:text-white rounded-xl transition-all duration-300 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <ListChecks className="w-12 h-12 text-surface-500 mb-4" />
                <p className="text-lg font-medium text-surface-300">No tests taken on this day.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((test, idx) => {
                  const { coachingName, subjectName, typeName } = getTestDetails(test);
                  const percentage = Math.round((test.marksObtained / test.maxMarks) * 100);
                  
                  return (
                    <motion.div 
                      key={test.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-card p-5 rounded-2xl border border-white/5 hover:border-primary-500/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary-400">{coachingName}</span>
                          <span className="text-surface-600 text-xs">•</span>
                          {subjectName && (
                            <>
                              <span className="text-xs font-bold uppercase tracking-wider text-surface-300">{subjectName}</span>
                              <span className="text-surface-600 text-xs">•</span>
                            </>
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">{typeName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-surface-400">
                          <span>{test.questionsCount} Questions</span>
                          {test.timeTaken && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {test.timeTaken}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xl font-black text-white">{percentage}%</div>
                          <div className="text-xs font-medium text-surface-500">{test.marksObtained}/{test.maxMarks}</div>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-surface-800 flex items-center justify-center relative">
                           <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-surface-800" strokeWidth="4" />
                            <circle 
                              cx="18" cy="18" r="16" 
                              fill="none" 
                              stroke={percentage < 40 ? '#ef4444' : percentage < 75 ? '#eab308' : '#22c55e'} 
                              strokeWidth="4" 
                              strokeDasharray={`${percentage} 100`} 
                              strokeLinecap="round" 
                            />
                           </svg>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
