import React, { useState } from 'react';
import { db } from '../../services/db';
import type { PracticeSession, Question } from '../../services/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, ArrowLeft, Tag as TagIcon, BookOpen, Layers, Activity } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface Props {
  session: PracticeSession;
  questions: Question[];
  onBack: () => void;
}

const renderWithMath = (text?: string) => {
  if (!text) return null;
  const parts = text.split(/(\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={i} math={part.slice(1, -1)} />;
    }
    return <span key={i}>{part}</span>;
  });
};

export const PracticePerformance: React.FC<Props> = ({ session, questions, onBack }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const topics = useLiveQuery(() => db.topics.toArray(), []);
  const tags = useLiveQuery(() => db.tags.toArray(), []);
  const statuses = useLiveQuery(() => db.statuses.toArray(), []);

  const correctCount = session.responses.filter(r => r.isCorrect).length;
  const incorrectCount = session.responses.filter(r => r.status.includes('answered') && !r.isCorrect).length;
  const unattemptedCount = session.responses.filter(r => !r.status.includes('answered')).length;
  const accuracy = correctCount + incorrectCount > 0 
    ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) 
    : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="h-screen w-full bg-slate-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20 px-6 py-4 flex items-center gap-6 justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Performance Review</h1>
            <p className="text-sm text-slate-400">{session.name}</p>
          </div>
        </div>
        <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Time Spent</span>
          <span className="text-lg font-bold text-white">{formatTime(session.timeElapsed)}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8 pb-32">
        {/* Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Score</span>
            <span className="text-3xl font-bold text-white">{session.marksObtained.toFixed(1).replace('.0', '')} / {session.maxMarks}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Accuracy</span>
            <span className="text-3xl font-bold text-blue-400">{accuracy}%</span>
          </div>
          <div className="bg-slate-900 border border-green-900/30 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-green-500" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Correct</span>
            <span className="text-3xl font-bold text-green-400">{correctCount}</span>
          </div>
          <div className="bg-slate-900 border border-red-900/30 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-red-500" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Incorrect</span>
            <span className="text-3xl font-bold text-red-400">{incorrectCount}</span>
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-6">Detailed Analysis</h2>
          {questions.map((q, i) => {
            const response = session.responses[i];
            const isAnswered = response.status.includes('answered');
            const isCorrect = response.isCorrect;
            const isExpanded = expandedIndex === i;
            
            const Icon = isAnswered 
              ? (isCorrect ? CheckCircle2 : XCircle)
              : MinusCircle;
            
            const statusColor = isAnswered
              ? (isCorrect ? 'text-green-500' : 'text-red-500')
              : 'text-slate-500';
            
            const bgColor = isAnswered
              ? (isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')
              : 'bg-slate-800/50 border-slate-700/50';

            return (
              <div key={q.id} className={`border rounded-xl transition-all duration-200 overflow-hidden ${bgColor}`}>
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  <div className="flex items-center gap-4">
                    <Icon className={`w-6 h-6 shrink-0 ${statusColor}`} />
                    <div>
                      <div className="font-bold text-white">Question {i + 1}</div>
                      <div className="text-sm text-slate-400">
                        {isAnswered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Unattempted'} 
                        {' • '}{response.marks || 0} Marks
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                {/* Expanded View */}
                {isExpanded && (
                  <div className="p-6 border-t border-white/5 bg-slate-900/50 space-y-6">
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {q.subjectId && subjects && (
                        <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {subjects.find(s => s.id === q.subjectId)?.name || 'Subject'}
                        </span>
                      )}
                      {q.topicIds && q.topicIds.length > 0 && topics && (
                        <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {topics.find(t => t.id === q.topicIds![0])?.name || 'Topic'}
                        </span>
                      )}
                      {q.tagIds && q.tagIds.length > 0 && tags && (
                        <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <TagIcon className="w-3 h-3" /> {tags.find(t => t.id === q.tagIds[0])?.name || 'Tag'}
                        </span>
                      )}
                      {q.statusIds && q.statusIds.length > 0 && statuses && (
                        <span className="bg-orange-500/20 text-orange-300 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <Activity className="w-3 h-3" /> {statuses.find(s => s.id === q.statusIds[0])?.name || 'Status'}
                        </span>
                      )}
                    </div>

                    {/* Question Content */}
                    <div className="prose prose-invert max-w-none">
                      {q.questionImage && <img src={URL.createObjectURL(q.questionImage)} alt="Question" className="max-h-64 rounded-lg object-contain mb-4 bg-white p-2" />}
                      <div className="mb-4">{renderWithMath(q.questionText)}</div>
                      {q.questionTextBottom && <div className="mt-4">{renderWithMath(q.questionTextBottom)}</div>}
                    </div>

                    {/* Options / NAT */}
                    <div className="space-y-3 mt-6">
                      {q.optionsType !== 'NAT' ? (
                        ['A', 'B', 'C', 'D'].map((optStr) => {
                          const isCorrectOption = q.selectedOptions?.includes(optStr);
                          const isMarkedOption = response.selectedOptions?.includes(optStr);
                          
                          let optBg = "bg-slate-800 border-slate-700 text-slate-300";
                          if (isCorrectOption) {
                            optBg = "bg-green-500/20 border-green-500 text-green-100 ring-1 ring-green-500";
                          } else if (isMarkedOption && !isCorrectOption) {
                            optBg = "bg-red-500/20 border-red-500 text-red-100 ring-1 ring-red-500";
                          }

                          return (
                            <div key={optStr} className={`p-4 rounded-lg border flex items-center gap-3 ${optBg}`}>
                              <div className="flex-1 font-bold">{optStr}</div>
                              {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                              {isMarkedOption && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="p-4 rounded-lg border bg-green-500/20 border-green-500 text-green-100 ring-1 ring-green-500">
                            <span className="font-bold text-green-400 block mb-1">Correct Answer:</span>
                            {q.numericalAnswer}
                          </div>
                          {isAnswered && !isCorrect && (
                            <div className="p-4 rounded-lg border bg-red-500/20 border-red-500 text-red-100 ring-1 ring-red-500">
                              <span className="font-bold text-red-400 block mb-1">Your Answer:</span>
                              {response.numericalAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Solution */}
                    {(q.answerImage || q.notes) && (
                      <div className="mt-8 p-6 bg-slate-800/80 rounded-xl border border-slate-700">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-400" />
                          Detailed Solution
                        </h4>
                        {q.answerImage && <img src={URL.createObjectURL(q.answerImage)} alt="Solution" className="max-h-64 rounded-lg object-contain mb-4 bg-white p-2" />}
                        {q.notes && <div className="prose prose-invert max-w-none text-slate-300">{renderWithMath(q.notes)}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
