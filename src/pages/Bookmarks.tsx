import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Question } from '../services/db';
import { Bookmark, ArrowLeft, Star, CheckSquare, HelpCircle, Eye, EyeOff, Search, X, Menu } from 'lucide-react';
import { cn } from '../utils/cn';

// Reuse ImagePreview but read-only
export const ReadOnlyImagePreview = ({ file }: { file: Blob }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="relative inline-flex justify-center rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner mx-auto">
      <img src={url} alt="Question Resource" className="max-w-full h-auto max-h-[500px] object-contain" />
    </div>
  );
};

export const QuestionDetailPane = ({ question }: { question: Question }) => {
  const [isAnswerBlurred, setIsAnswerBlurred] = useState(true);
  const [revealedBlocks, setRevealedBlocks] = useState<Set<string>>(new Set());
  
  // Reset blur when question changes
  useEffect(() => {
    setIsAnswerBlurred(true);
    setRevealedBlocks(new Set());
  }, [question.id]);

  const hasContent = question.questionImage || question.questionText;
  const hasOptions = question.optionsType && question.optionsType !== 'NONE';
  const hasBlocks = question.customBlocks && question.customBlocks.length > 0;

  return (
    <div className="space-y-4 px-2 w-full h-full overflow-y-auto pb-20 pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
      <div className={cn(
        "flex gap-4",
        question.questionImage ? "flex-col lg:flex-row items-stretch" : "flex-col"
      )}>
        {hasContent && (
          <div className={cn(
            "glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-primary-500 border-y border-r border-white/5 shadow-xl bg-surface-900/40 flex flex-col justify-center",
            question.questionImage ? "flex-1" : "w-full"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest"><HelpCircle className="w-4 h-4 inline mr-1"/> Question</h3>
            </div>
            {question.questionImage ? (
              <ReadOnlyImagePreview file={question.questionImage} />
            ) : (
              <div className="w-full bg-surface-900/50 rounded-2xl border border-white/5 shadow-inner p-4 min-h-[100px]">
                <p className="text-surface-100 font-medium leading-relaxed whitespace-pre-wrap">{question.questionText}</p>
              </div>
            )}
          </div>
        )}

        {hasOptions && (
          <div className={cn(
            "glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-emerald-500 border-y border-r border-white/5 shadow-xl bg-surface-900/40 flex flex-col justify-center",
            question.questionImage ? "w-full lg:w-[320px] shrink-0" : "w-full"
          )}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest"><CheckSquare className="w-4 h-4 inline mr-1"/> Answer</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsAnswerBlurred(!isAnswerBlurred); }}
                className="flex items-center gap-1.5 px-2 py-1 bg-surface-800 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors text-xs font-bold border border-white/5 shadow-sm"
              >
                {isAnswerBlurred ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {isAnswerBlurred ? 'Reveal' : 'Hide'}
              </button>
            </div>
            <div className={cn("transition-all duration-300", isAnswerBlurred ? "blur-md select-none opacity-40 pointer-events-none" : "blur-0")}>
              {question.optionsType === 'MCQ' && (
                <div className="flex flex-col gap-4 sm:gap-6 items-center justify-center py-4">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const isSelected = question.selectedOptions?.includes(opt);
                    return (
                      <div 
                        key={opt}
                        className={cn(
                          "w-12 h-12 sm:w-16 sm:h-16 rounded-full text-xl font-black flex items-center justify-center border-[3px] shrink-0", 
                          isSelected 
                            ? "bg-primary-500 border-primary-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110" 
                            : "bg-surface-800 border-surface-600 text-surface-400 opacity-60"
                        )}
                      >
                        {opt}
                      </div>
                    );
                  })}
                </div>
              )}
              {question.optionsType === 'NAT' && (
                <div className="flex justify-center">
                  <div className="w-full max-w-xs text-center text-2xl font-black h-16 rounded-xl bg-surface-900/80 border border-surface-600 shadow-inner flex items-center justify-center text-white">
                    {question.numericalAnswer ?? '—'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {hasBlocks && question.customBlocks!.map(block => {
        const isSolution = block.title?.toLowerCase().includes('solution');
        const isRevealed = revealedBlocks.has(block.id);
        return (
          <div key={block.id} className="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-purple-500 border-y border-r border-white/5 shadow-xl bg-surface-900/40">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-black text-primary-300">{block.title || 'Block'}</h2>
              {isSolution && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setRevealedBlocks(prev => {
                      const next = new Set(prev);
                      if (next.has(block.id)) next.delete(block.id);
                      else next.add(block.id);
                      return next;
                    });
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-surface-800 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors text-xs font-bold border border-white/5 shadow-sm"
                >
                  {isRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isRevealed ? 'Hide' : 'Reveal'}
                </button>
              )}
            </div>
            <div className={cn("w-full transition-all duration-300", isSolution && !isRevealed ? "blur-md select-none opacity-40 pointer-events-none" : "blur-0")}>
              {block.image ? (
                <ReadOnlyImagePreview file={block.image} />
              ) : (
                <div className="w-full bg-surface-900/50 rounded-2xl border border-white/5 shadow-inner p-4 min-h-[100px]">
                  <p className="text-surface-100 font-medium leading-relaxed whitespace-pre-wrap">{block.content}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const QuestionCard = ({ question, subjectName, testLink, topicName, displayNumber, isExpanded, onToggle }: { question: Question, subjectName: string, testLink?: string, topicName?: string, displayNumber: number, isExpanded: boolean, onToggle: () => void }) => {
  const [isAnswerBlurred, setIsAnswerBlurred] = useState(true);
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const tags = useLiveQuery(() => db.tags.toArray()) || [];
  
  const statusMap = statuses.reduce((acc, curr) => ({ ...acc, [curr.id!]: curr }), {} as Record<number, any>);
  const tagMap = tags.reduce((acc, curr) => ({ ...acc, [curr.id!]: curr }), {} as Record<number, any>);

  const hasContent = question.questionImage || question.questionText;
  const hasOptions = question.optionsType && question.optionsType !== 'NONE';
  const hasBlocks = question.customBlocks && question.customBlocks.length > 0;
  
  // A card is expandable if it has any rich content
  const isExpandable = hasContent || hasOptions || hasBlocks;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-5xl mx-auto relative z-10 mb-4">
      <button 
        onClick={() => isExpandable && onToggle()}
        className={cn(
          "w-full text-left bg-surface-900/50 p-4 sm:p-5 rounded-2xl border shadow-lg flex flex-col gap-3 transition-all",
          isExpanded ? "border-primary-500/50" : "border-white/5 hover:bg-surface-800 hover:border-white/10",
          isExpandable ? "cursor-pointer" : "cursor-default"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary-300 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 shadow-inner">
              {subjectName}
            </span>
            <h1 
              onClick={(e) => {
                const link = question.link || testLink;
                if (link) {
                  e.stopPropagation();
                  window.open(link, '_blank');
                }
              }}
              className={cn("text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs", (question.link || testLink) && "cursor-pointer hover:underline hover:text-primary-300")}
            >
              {(() => {
                let title = `Question ${displayNumber}`;
                if (question.customTitle) {
                  const stripped = question.customTitle.replace(/^question\s+(?:number\s+)?\d+[\s-:]*/i, '');
                  if (stripped) {
                    title = `${title} ${stripped}`;
                  }
                }
                return title;
              })()}
            </h1>
            {topicName && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-inner">
                {topicName}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
            {/* Tags */}
            <div className="flex gap-1">
              {question.tagIds?.map(tid => {
                const t = tagMap[tid];
                if (!t) return null;
                return (
                  <span
                    key={tid}
                    className="px-2 py-1 rounded-md text-[10px] font-bold shadow-sm"
                    style={{ backgroundColor: t.color + '20', color: t.color, border: `1px solid ${t.color}40` }}
                  >
                    #{t.name}
                  </span>
                );
              })}
            </div>

            {/* Statuses */}
            <div className="flex bg-surface-950/80 p-1 rounded-xl border border-white/5 shadow-inner">
              {question.statusIds?.map(sid => {
                const s = statusMap[sid];
                if (!s) return null;
                return (
                  <span
                    key={sid}
                    className="px-2 py-1 rounded-lg text-xs font-bold shadow-[0_2px_10px_rgba(0,0,0,0.3)] text-surface-950 mx-0.5"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.name}
                  </span>
                );
              })}
            </div>
            
            <div className="p-2 rounded-xl text-yellow-500 bg-yellow-500/10 shrink-0 ml-1">
              <Star className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && isExpandable && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-4 px-2"
          >
            <div className={cn(
              "flex gap-4",
              question.questionImage ? "flex-col lg:flex-row items-stretch" : "flex-col"
            )}>
              {hasContent && (
                <div className={cn(
                  "glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-primary-500 border-y border-r border-white/5 shadow-xl bg-surface-900/40 flex flex-col justify-center",
                  question.questionImage ? "flex-1" : "w-full"
                )}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest"><HelpCircle className="w-4 h-4 inline mr-1"/> Question</h3>
                  </div>
                  {question.questionImage ? (
                    <ReadOnlyImagePreview file={question.questionImage} />
                  ) : (
                    <div className="w-full bg-surface-900/50 rounded-2xl border border-white/5 shadow-inner p-4 min-h-[100px]">
                      <p className="text-surface-100 font-medium leading-relaxed whitespace-pre-wrap">{question.questionText}</p>
                    </div>
                  )}
                </div>
              )}

              {hasOptions && (
                <div className={cn(
                  "glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-emerald-500 border-y border-r border-white/5 shadow-xl bg-surface-900/40 flex flex-col justify-center",
                  question.questionImage ? "w-full lg:w-[320px] shrink-0" : "w-full"
                )}>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest"><CheckSquare className="w-4 h-4 inline mr-1"/> Answer</h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsAnswerBlurred(!isAnswerBlurred); }}
                      className="flex items-center gap-1.5 px-2 py-1 bg-surface-800 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors text-xs font-bold border border-white/5 shadow-sm"
                    >
                      {isAnswerBlurred ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {isAnswerBlurred ? 'Reveal' : 'Hide'}
                    </button>
                  </div>
                  <div className={cn("transition-all duration-300", isAnswerBlurred ? "blur-md select-none opacity-40 pointer-events-none" : "blur-0")}>
                    {question.optionsType === 'MCQ' && (
                      <div className="flex flex-col gap-4 sm:gap-6 items-center justify-center py-4">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const isSelected = question.selectedOptions?.includes(opt);
                          return (
                            <div 
                              key={opt}
                              className={cn(
                                "w-12 h-12 sm:w-16 sm:h-16 rounded-full text-xl font-black flex items-center justify-center border-[3px] shrink-0", 
                                isSelected 
                                  ? "bg-primary-500 border-primary-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110" 
                                  : "bg-surface-800 border-surface-600 text-surface-400 opacity-60"
                              )}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {question.optionsType === 'NAT' && (
                      <div className="flex justify-center">
                        <div className="w-full max-w-xs text-center text-2xl font-black h-16 rounded-xl bg-surface-900/80 border border-surface-600 shadow-inner flex items-center justify-center text-white">
                          {question.numericalAnswer ?? '—'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {hasBlocks && question.customBlocks!.map(block => {
              const isSolution = block.title?.toLowerCase().includes('solution');
              return (
                <div key={block.id} className="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-purple-500 border-y border-r border-white/5 shadow-xl bg-surface-900/40">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-lg font-black text-primary-300">{block.title || 'Block'}</h2>
                    {isSolution && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsAnswerBlurred(!isAnswerBlurred); }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-surface-800 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors text-xs font-bold border border-white/5 shadow-sm"
                      >
                        {isAnswerBlurred ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {isAnswerBlurred ? 'Reveal' : 'Hide'}
                      </button>
                    )}
                  </div>
                  <div className={cn("w-full transition-all duration-300", isSolution && isAnswerBlurred ? "blur-md select-none opacity-40 pointer-events-none" : "blur-0")}>
                    {block.image ? (
                      <ReadOnlyImagePreview file={block.image} />
                    ) : (
                      <div className="w-full bg-surface-900/50 rounded-2xl border border-white/5 shadow-inner p-4 min-h-[100px]">
                        <p className="text-surface-100 font-medium leading-relaxed whitespace-pre-wrap">{block.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const Bookmarks: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const tests = useLiveQuery(() => db.tests.toArray()) || [];
  const topics = useLiveQuery(() => db.topics.toArray()) || [];
  const tags = useLiveQuery(() => db.tags.toArray()) || [];
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const favoriteQuestions = useLiveQuery(() => 
    db.questions.toArray().then(arr => arr.filter(q => q.isFavorite === true))
  ) || [];

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id!, s.name])), [subjects]);
  const testMap = useMemo(() => new Map(tests.map(t => [t.id!, t])), [tests]);
  const topicMap = useMemo(() => new Map(topics.map(t => [t.id!, t.name])), [topics]);
  const tagMap = useMemo(() => new Map(tags.map(t => [t.id!, t.name])), [tags]);
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id!, s])), [statuses]);

  // Resolve the effective subject ID for each favorite question
  const questionsBySubject = new Map<number, Question[]>();
  favoriteQuestions.forEach(q => {
    // If the question has a direct subjectId, use it; otherwise fallback to its test's subjectId
    let sId = q.subjectId;
    if (!sId && q.testId) {
      sId = testMap.get(q.testId)?.subjectId;
    }
    
    // Group it if we resolved a subject
    if (sId) {
      if (!questionsBySubject.has(sId)) {
        questionsBySubject.set(sId, []);
      }
      questionsBySubject.get(sId)!.push(q);
    }
  });

    if (selectedSubjectId !== null) {
      const selectedQuestions = questionsBySubject.get(selectedSubjectId) || [];
      const subjectName = subjectMap.get(selectedSubjectId) || 'Unknown Subject';
      const activeQuestion = expandedQuestionId ? selectedQuestions.find(q => q.id === expandedQuestionId) : undefined;
  
      return (
        <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 h-screen overflow-hidden">
          <div className="flex items-center gap-4 mb-6 shrink-0">
            <button 
              onClick={() => {
                setSelectedSubjectId(null);
                setExpandedQuestionId(null);
              }} 
              className="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-300 hover:text-white transition-colors shadow-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-2 bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-300 hover:text-white transition-colors shadow-sm"
              title="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">{subjectName} Bookmarks</h1>
              <p className="text-surface-400 font-medium">{selectedQuestions.length} saved questions</p>
            </div>
          </div>
  
          <div className="flex flex-1 min-h-0 overflow-hidden relative">
            {/* Left Panel: Question List */}
            <AnimatePresence initial={false}>
              {(isSidebarOpen || !expandedQuestionId) && (
                <motion.div 
                  initial={{ width: 0, opacity: 0, marginRight: 0 }}
                  animate={{ 
                    width: typeof window !== 'undefined' && window.innerWidth >= 1280 ? 400 : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 350 : '100%'), 
                    opacity: 1, 
                    marginRight: 24 
                  }}
                  exit={{ width: 0, opacity: 0, marginRight: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={cn(
                    "w-full flex-col gap-4 overflow-y-auto pr-2 pb-20 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 shrink-0",
                    expandedQuestionId ? "hidden lg:flex" : "flex"
                  )}
                >
              {selectedQuestions.map((q, index) => {

                const topicName = q.topicIds?.[0] ? topicMap.get(q.topicIds[0]) : undefined;
                
                const isActive = activeQuestion?.id === q.id;
                
                return (
                  <button 
                    key={q.id}
                    onClick={() => setExpandedQuestionId(q.id!)}
                    className={cn(
                      "w-full text-left bg-surface-900/50 p-4 rounded-2xl border flex flex-col gap-3 transition-all",
                      isActive ? "border-primary-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] bg-surface-800/80" : "border-white/5 hover:bg-surface-800 hover:border-white/10 shadow-lg"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                      <div className="flex flex-col gap-2">
                        <h1 className={cn("text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-xs", isActive ? "text-primary-300" : "text-white")}>
                          {(() => {
                            let title = `Question ${index + 1}`;
                            if (q.customTitle) {
                              const stripped = q.customTitle.replace(/^question\s+(?:number\s+)?\d+[\s-:]*/i, '');
                              if (stripped) {
                                title = `${title} ${stripped}`;
                              }
                            }
                            return title;
                          })()}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-primary-300 bg-primary-500/10 px-2 py-1 rounded-md border border-primary-500/20">
                            {subjectName}
                          </span>
                          {topicName && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                              {topicName}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Statuses */}
                        {q.statusIds && q.statusIds.length > 0 && (
                          <div className="flex bg-surface-950/80 p-1 rounded-lg border border-white/5">
                            {q.statusIds.map(sid => {
                              const s = statusMap.get(sid);
                              if (!s) return null;
                              return (
                                <span
                                  key={sid}
                                  className="w-3 h-3 rounded-full mx-0.5"
                                  style={{ backgroundColor: s.color }}
                                  title={s.name}
                                />
                              );
                            })}
                          </div>
                        )}
                        <div className="p-2 rounded-xl text-yellow-500 bg-yellow-500/10 shrink-0 ml-1">
                          <Star className="w-4 h-4" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {selectedQuestions.length === 0 && (
                <div className="text-center text-surface-500 mt-10 italic">No bookmarks found for this subject.</div>
              )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Panel: Detail View */}
            <div className={cn(
              "flex-1 glass-card rounded-3xl border border-white/5 p-4 bg-surface-950 overflow-hidden relative",
              !expandedQuestionId ? "hidden lg:flex" : "flex flex-col"
            )}>
              {expandedQuestionId && (
                <button 
                  onClick={() => setExpandedQuestionId(null)}
                  className="lg:hidden mb-4 p-2 w-fit bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-300 flex items-center gap-2 text-sm font-bold shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
              )}
              {activeQuestion ? (
                <QuestionDetailPane 
                  key={activeQuestion.id}
                  question={activeQuestion} 
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-surface-500 font-medium">
                  Select a question to view details
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching 
    ? favoriteQuestions.filter(q => {
        const query = searchQuery.toLowerCase();
        
        // Subject name
        let sId = q.subjectId;
        if (!sId && q.testId) sId = testMap.get(q.testId)?.subjectId;
        const subjectName = sId ? subjectMap.get(sId)?.toLowerCase() : '';
        if (subjectName?.includes(query)) return true;

        // Topic name
        const topicName = q.topicIds?.[0] ? topicMap.get(q.topicIds[0])?.toLowerCase() : '';
        if (topicName?.includes(query)) return true;

        // Question content/title
        if (q.customTitle?.toLowerCase().includes(query)) return true;
        if (q.questionText?.toLowerCase().includes(query)) return true;
        
        // Options
        if (q.selectedOptions?.some(opt => opt.toLowerCase().includes(query))) return true;

        // Custom blocks
        if (q.customBlocks?.some(b => b.title?.toLowerCase().includes(query) || b.content?.toLowerCase().includes(query))) return true;

        // Tags
        if (q.tagIds?.some(tagId => {
          const tagName = tagMap.get(tagId)?.toLowerCase() || '';
          return tagName === query || tagName.startsWith(query + ' ') || tagName.startsWith(query);
        })) return true;

        // Statuses
        if (q.statusIds?.some(statusId => {
          const statusName = statusMap.get(statusId)?.name?.toLowerCase() || '';
          return statusName === query || statusName.startsWith(query + ' ') || statusName.startsWith(query);
        })) return true;

        return false;
      })
    : [];

  return (
    <div className={cn("max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8", isSearching ? "flex flex-col flex-1" : "space-y-8")}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-400">
            <Bookmark className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Bookmarks</h1>
            <p className="text-surface-400 font-medium mt-1">Review your important questions grouped by subject.</p>
          </div>
        </div>
        
        {/* Small Aesthetic Search Box */}
        <div className="flex items-center bg-surface-800 border border-surface-600 rounded-[20px] px-[14px] py-[6px] w-full sm:w-[220px] transition-all duration-300 shadow-sm focus-within:border-primary-500/50 focus-within:bg-surface-700/80">
          <Search className="text-surface-400 mr-2 w-4 h-4 shrink-0" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none bg-transparent text-surface-100 text-[0.85rem] w-full outline-none placeholder:text-surface-600 focus:ring-0"
            autoComplete="off"
            placeholder=""
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-surface-500 hover:text-white transition-colors ml-2 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto space-y-8 mt-8 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Search Results</h2>
            <span className="text-sm font-bold text-primary-400 bg-primary-500/10 px-3 py-1 rounded-lg">{searchResults.length} found</span>
          </div>
          {searchResults.map((q, index) => {
            const test = q.testId ? testMap.get(q.testId) : undefined;
            const topicName = q.topicIds?.[0] ? topicMap.get(q.topicIds[0]) : undefined;
            let sId = q.subjectId;
            if (!sId && q.testId) sId = test?.subjectId;
            const subjectName = sId ? subjectMap.get(sId) || 'Unknown' : 'Unknown';
            return (
              <QuestionCard 
                key={q.id} 
                question={q} 
                subjectName={subjectName} 
                testLink={test?.link}
                topicName={topicName}
                displayNumber={index + 1}
                isExpanded={expandedQuestionId === q.id}
                onToggle={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id!)}
              />
            );
          })}
          {searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-16 h-16 text-surface-700 mb-4" />
              <h3 className="text-xl font-bold text-surface-300">No results found</h3>
              <p className="text-surface-500 mt-2 max-w-sm">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {subjects.map(subject => {
          const count = questionsBySubject.get(subject.id!)?.length || 0;
          if (count === 0) return null; // Only show subjects with bookmarked questions

          return (
            <motion.div
              key={subject.id}
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => setSelectedSubjectId(subject.id!)}
              className="cursor-pointer glass-card rounded-[2rem] p-6 flex flex-col justify-between transition-all relative overflow-hidden group border border-white/5 hover:border-primary-500/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] min-h-[160px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
              
              <div className="z-10 flex justify-between items-start">
                <h3 className="text-2xl font-bold text-white leading-tight pr-4">{subject.name}</h3>
                
                {/* Small green circle with count */}
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-white font-black text-sm">{count}</span>
                </div>
              </div>

              <div className="mt-auto z-10 pt-4 flex items-center gap-2 text-primary-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity group-hover:-translate-y-1 transform">
                View Questions &rarr;
              </div>
            </motion.div>
          );
        })}

        {subjects.length === 0 || Array.from(questionsBySubject.values()).flat().length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <Bookmark className="w-16 h-16 text-surface-700 mb-4" />
            <h3 className="text-xl font-bold text-surface-300">No bookmarks yet</h3>
            <p className="text-surface-500 mt-2 max-w-sm">Star some questions in your test reviews to see them organized here.</p>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
};
