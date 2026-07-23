import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { PracticeSession } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Tag as TagIcon, Book, Activity, Star, Trash2, History, Layers, ClipboardList, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export const Practice: React.FC = () => {
  const navigate = useNavigate();

  // Builder State
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<number[]>([]);
  const [includeBookmarked, setIncludeBookmarked] = useState<boolean>(false);
  const [allowNegativeMarking, setAllowNegativeMarking] = useState<boolean>(false);
  
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [wantsTimeLimit, setWantsTimeLimit] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);

  // Data fetching
  const inProgressSessions = useLiveQuery(() => db.practiceSessions.where('status').equals('InProgress').reverse().sortBy('createdAt')) || [];
  const completedSessions = useLiveQuery(() => db.practiceSessions.where('status').equals('Completed').reverse().sortBy('createdAt')) || [];
  
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const topics = useLiveQuery(() => db.topics.toArray()) || [];
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const tags = useLiveQuery(() => db.tags.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  const questions = useLiveQuery(() => db.questions.toArray()) || [];
  const tests = useLiveQuery(() => db.tests.toArray()) || [];

  // Derived filtered data
  const { matchingQuestions, visibleTopics, visibleStatuses, visibleTags, visibleTestTypes, hasBookmarked } = useMemo(() => {
    // 1. Filter Topics by Subject
    const visibleTopics = selectedSubjectId 
      ? topics.filter(t => t.subjectId === selectedSubjectId)
      : topics;

    // 2. Base Matching Questions (Subject + Topics)
    const baseMatchingQuestions = questions.filter(q => {
      const hasQuestionContent = (q.questionText && q.questionText.trim().length > 0) || !!q.questionImage;
      const hasAnswerContent = 
        (q.selectedOptions && q.selectedOptions.length > 0) || 
        (q.numericalAnswer !== undefined && q.numericalAnswer !== null) || 
        !!q.answerImage || 
        (q.customBlocks && q.customBlocks.length > 0);

      if (!hasQuestionContent || !hasAnswerContent) return false;

      let matchesSubject = true;
      if (selectedSubjectId) {
        const test = tests.find(t => t.id === q.testId);
        matchesSubject = q.subjectId === selectedSubjectId || test?.subjectId === selectedSubjectId;
      }
      
      let matchesTopic = true;
      if (selectedTopicIds.length > 0) {
        matchesTopic = q.topicIds ? q.topicIds.some(tid => selectedTopicIds.includes(tid)) : false;
      }

      return matchesSubject && matchesTopic;
    });

    // 3. Extract available IDs for Status, Tag, TestType
    const availableStatusIds = new Set(baseMatchingQuestions.flatMap(q => q.statusIds || []));
    const availableTagIds = new Set(baseMatchingQuestions.flatMap(q => q.tagIds || []));
    const availableTestTypeIds = new Set(baseMatchingQuestions.map(q => {
      const test = tests.find(t => t.id === q.testId);
      return test ? test.testTypeId : null;
    }).filter(Boolean));

    const visibleStatuses = statuses.filter(s => availableStatusIds.has(s.id!));
    const visibleTags = tags.filter(t => availableTagIds.has(t.id!));
    const visibleTestTypes = testTypes.filter(tt => availableTestTypeIds.has(tt.id!));
    const hasBookmarked = baseMatchingQuestions.some(q => q.isFavorite);

    return {
      matchingQuestions: baseMatchingQuestions,
      visibleTopics,
      visibleStatuses,
      visibleTags,
      visibleTestTypes,
      hasBookmarked
    };
  }, [selectedSubjectId, selectedTopicIds, questions, topics, statuses, tags, testTypes, tests]);

  // Final Questions computation
  const finalQuestions = useMemo(() => {
    return matchingQuestions.filter(q => {
      let matchesStatus = true;
      if (selectedStatusIds.length > 0 || includeBookmarked) {
        const hasSelectedStatus = selectedStatusIds.length > 0 && q.statusIds?.some(id => selectedStatusIds.includes(id));
        const isBookmarkedMatch = includeBookmarked && q.isFavorite;
        matchesStatus = hasSelectedStatus || isBookmarkedMatch;
      }

      let matchesTag = true;
      if (selectedTagIds.length > 0) {
        matchesTag = q.tagIds?.some(id => selectedTagIds.includes(id)) ?? false;
      }

      let matchesTestType = true;
      if (selectedTestTypeIds.length > 0) {
        const test = tests.find(t => t.id === q.testId);
        matchesTestType = !!test && selectedTestTypeIds.includes(test.testTypeId);
      }

      return matchesStatus && matchesTag && matchesTestType;
    });
  }, [matchingQuestions, selectedStatusIds, includeBookmarked, selectedTagIds, selectedTestTypeIds, tests]);

  // Actions
  const handleResume = (sessionId: number) => {
    navigate(`/practice-test/${sessionId}`);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this test session?')) {
      await db.practiceSessions.delete(id);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all completed test history?')) {
      const ids = completedSessions.map(s => s.id!);
      await db.practiceSessions.bulkDelete(ids);
    }
  };

  const toggleSelection = (id: number, currentList: number[], setList: React.Dispatch<React.SetStateAction<number[]>>) => {
    if (currentList.includes(id)) {
      setList(currentList.filter(item => item !== id));
    } else {
      setList([...currentList, id]);
    }
  };

  const handleSubjectSelect = (id: number) => {
    if (selectedSubjectId === id) {
      setSelectedSubjectId(null);
      setSelectedTopicIds([]);
    } else {
      setSelectedSubjectId(id);
      setSelectedTopicIds([]);
      setTimeout(() => {
        document.getElementById('topics-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleGenerateClick = () => {
    if (finalQuestions.length === 0) {
      alert("No questions found for the current selection.");
      return;
    }
    setShowTimeModal(true);
  };

  const confirmGenerateTest = async () => {
    const shuffled = [...finalQuestions].sort(() => 0.5 - Math.random());

    const title = selectedSubjectId 
      ? `Custom Test: ${subjects.find(s => s.id === selectedSubjectId)?.name}` 
      : 'Custom Mixed Test';

    const newSession: PracticeSession = {
      name: title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'InProgress',
      timeElapsed: 0,
      marksObtained: 0,
      maxMarks: shuffled.length,
      allowNegativeMarking,
      timeLimit: wantsTimeLimit ? timeLimitMinutes * 60 : undefined,
      responses: shuffled.map(q => ({
        questionId: q.id!,
        status: 'not_visited'
      }))
    };

    const sessionId = await db.practiceSessions.add(newSession);
    setShowTimeModal(false);
    navigate(`/practice-test/${sessionId}`);
  };

  const formatMinSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };
  
  const formatCompactTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-36">
      {/* Hero Header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-primary-500/10 via-purple-500/5 to-transparent p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-primary-500/15 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary-400" /> PRACTICE INTELLIGENCE BUILDER
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
            Practice Builder
          </h1>
          <p className="mt-2 text-surface-300 max-w-2xl text-sm sm:text-base font-medium leading-relaxed">
            Build custom targeted test sessions by selecting specific subjects, chapters, tags, and question status flags.
          </p>
        </div>

        {/* Quick Target Indicator Badges */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="bg-surface-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/15 text-primary-300 border border-primary-500/30">
              <Book className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-surface-400 uppercase tracking-wider">Available Qs</div>
              <div className="text-xl font-black text-white">{questions.length}</div>
            </div>
          </div>

          <div className="bg-surface-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-surface-400 uppercase tracking-wider">Targeted Qs</div>
              <div className="text-xl font-black text-emerald-400">{finalQuestions.length}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Futuristic Control & Action Bar */}
      <div className="sticky top-16 z-30 bg-surface-950/85 backdrop-blur-2xl py-3 border border-white/15 rounded-full px-5 sm:px-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 transition-all">
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => document.getElementById('subjects-section')?.scrollIntoView({ behavior: 'smooth' })} 
            className="bg-surface-900/90 hover:bg-surface-800 border border-white/10 hover:border-indigo-500/50 text-surface-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Subjects
          </button>
          <button 
            onClick={() => document.getElementById('topics-section')?.scrollIntoView({ behavior: 'smooth' })} 
            className="bg-surface-900/90 hover:bg-surface-800 border border-white/10 hover:border-blue-500/50 text-surface-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg"
          >
            <Book className="w-3.5 h-3.5 text-blue-400" /> Topics
          </button>
          <button 
            onClick={() => document.getElementById('status-section')?.scrollIntoView({ behavior: 'smooth' })} 
            className="bg-surface-900/90 hover:bg-surface-800 border border-white/10 hover:border-emerald-500/50 text-surface-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Status
          </button>
          <button 
            onClick={() => document.getElementById('tags-section')?.scrollIntoView({ behavior: 'smooth' })} 
            className="bg-surface-900/90 hover:bg-surface-800 border border-white/10 hover:border-orange-500/50 text-surface-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg"
          >
            <TagIcon className="w-3.5 h-3.5 text-orange-400" /> Tags
          </button>
          <button 
            onClick={() => document.getElementById('testtypes-section')?.scrollIntoView({ behavior: 'smooth' })} 
            className="bg-surface-900/90 hover:bg-surface-800 border border-white/10 hover:border-pink-500/50 text-surface-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg"
          >
            <ClipboardList className="w-3.5 h-3.5 text-pink-400" /> Test Types
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleGenerateClick}
            className="bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-full text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Generate Test ({finalQuestions.length} Qs)
          </button>
        </div>
      </div>

      <div className="space-y-10 mt-6">
        {/* Continue Section (In-Progress Sessions) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Play className="w-4 h-4" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Continue where you left off
            </h3>
          </div>

          {inProgressSessions.length === 0 ? (
            <div className="bg-surface-900/60 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
              <Clock className="w-8 h-8 text-surface-500 mx-auto mb-2" />
              <p className="text-surface-400 font-bold text-sm">No tests in progress.</p>
              <p className="text-xs text-surface-500 mt-1">Select filters below and click Generate Test to start practicing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressSessions.map(session => {
                const answeredCount = session.responses.filter(r => r.status === 'answered').length;
                const totalCount = session.responses.length;
                const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

                return (
                  <motion.div 
                    key={session.id} 
                    whileHover={{ y: -3 }} 
                    onClick={() => handleResume(session.id!)} 
                    className="group relative bg-gradient-to-br from-surface-900/90 via-surface-900/60 to-surface-950/90 backdrop-blur-xl border border-primary-500/30 hover:border-primary-500/60 rounded-3xl p-5 cursor-pointer transition-all duration-300 shadow-xl overflow-hidden"
                  >
                    <div className="pointer-events-none absolute -top-16 -right-16 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-colors" />
                    
                    <button 
                      onClick={(e) => handleDeleteSession(e, session.id!)} 
                      className="absolute top-4 right-4 p-2 bg-rose-500/10 text-rose-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20 z-10 border border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex justify-between items-start mb-3 gap-2 relative z-10">
                      <h4 className="font-black text-white text-base truncate flex-1 group-hover:text-primary-300 transition-colors">{session.name}</h4>
                      <span className="text-[10px] bg-primary-500/20 border border-primary-500/30 text-primary-300 px-2.5 py-1 rounded-full shrink-0 uppercase font-black tracking-wider group-hover:opacity-0 transition-opacity">In Progress</span>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-surface-300">{answeredCount} / {totalCount} Answered</span>
                        <span className="text-primary-400">{progressPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-950 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* 1. Subjects Section */}
        <section id="subjects-section" className="scroll-mt-32 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Step 1</p>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Select a Subject</h3>
              </div>
            </div>
            {selectedSubjectId && (
              <button onClick={() => setSelectedSubjectId(null)} className="text-xs font-bold text-surface-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors">Clear Selection</button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {subjects.map(subject => {
              const isSelected = selectedSubjectId === subject.id;
              return (
                <motion.button
                  key={subject.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubjectSelect(subject.id!)}
                  className={cn(
                    "flex items-center gap-3.5 border rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer shadow-md",
                    isSelected 
                      ? 'bg-gradient-to-br from-indigo-500/25 via-indigo-900/30 to-surface-950 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)] text-white' 
                      : 'bg-surface-900/60 border-white/10 hover:border-white/20 hover:bg-surface-800/80 text-surface-300'
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors", isSelected ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200' : 'bg-surface-800 border-white/10 text-surface-400')}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm truncate">{subject.name}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* 2. Topics Section */}
        <section id="topics-section" className="scroll-mt-32 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Book className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">Step 2</p>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Select Topics</h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-surface-400">{selectedTopicIds.length === 0 ? 'All Topics Selected' : `${selectedTopicIds.length} Selected`}</span>
              {selectedTopicIds.length > 0 && (
                <button onClick={() => setSelectedTopicIds([])} className="text-xs font-bold text-surface-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors">Clear All</button>
              )}
            </div>
          </div>

          {visibleTopics.length === 0 ? (
            <div className="bg-surface-900/40 border border-white/5 rounded-2xl p-6 text-center text-surface-400 text-sm font-medium italic">No topics available for current selection.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar p-1">
              {visibleTopics.map(topic => {
                const isSelected = selectedTopicIds.includes(topic.id!);
                return (
                  <motion.button
                    key={topic.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleSelection(topic.id!, selectedTopicIds, setSelectedTopicIds)}
                    className={cn(
                      "flex items-center gap-3 border rounded-xl p-3.5 text-left transition-all duration-200 cursor-pointer shadow-sm",
                      isSelected 
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                        : 'bg-surface-900/60 border-white/10 hover:border-white/20 hover:bg-surface-800/80 text-surface-300'
                    )}
                  >
                    <div className={cn("w-3.5 h-3.5 rounded-full shrink-0 border transition-all", isSelected ? 'bg-blue-400 border-blue-300 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'border-surface-600 bg-surface-800')} />
                    <span className="text-xs font-bold truncate">{topic.name}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Status Section */}
        <section id="status-section" className="scroll-mt-32 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Step 3</p>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Filter by Question Status</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-surface-400">{selectedStatusIds.length === 0 && !includeBookmarked ? 'All Statuses' : 'Filtered'}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {hasBookmarked && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIncludeBookmarked(!includeBookmarked)}
                className={cn(
                  "flex items-center gap-2 border rounded-full px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm",
                  includeBookmarked 
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                    : 'bg-surface-900/60 border-white/10 text-surface-400 hover:border-amber-500/40 hover:text-amber-300'
                )}
              >
                <Star className={cn("w-4 h-4", includeBookmarked ? 'fill-amber-400 text-amber-400' : '')} /> Bookmarked
              </motion.button>
            )}
            {visibleStatuses.map(status => {
              const isSelected = selectedStatusIds.includes(status.id!);
              return (
                <motion.button
                  key={status.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleSelection(status.id!, selectedStatusIds, setSelectedStatusIds)}
                  className={cn(
                    "flex items-center gap-2.5 border rounded-full px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm",
                    isSelected ? 'bg-surface-800 border-white/30 text-white shadow-md' : 'bg-surface-900/60 border-white/10 text-surface-400 hover:border-white/20 hover:text-white'
                  )}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: status.color }} />
                  {status.name}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* 4. Tags Section */}
        <section id="tags-section" className="scroll-mt-32 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <TagIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-400">Step 4</p>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Filter by Tags</h3>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {visibleTags.length === 0 && <span className="text-xs text-surface-500 font-medium">No tags available in current selection.</span>}
            {visibleTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id!);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleSelection(tag.id!, selectedTagIds, setSelectedTagIds)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm",
                    isSelected ? 'bg-orange-500/20 border-orange-500/60 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.2)]' : 'bg-surface-900/60 border-white/10 text-surface-400 hover:border-orange-500/40 hover:text-white'
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. Test Types Section */}
        <section id="testtypes-section" className="scroll-mt-32 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-pink-400">Step 5</p>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Filter by Test Type</h3>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {visibleTestTypes.length === 0 && <span className="text-xs text-surface-500 font-medium">No test types in current selection.</span>}
            {visibleTestTypes.map(tt => {
              const isSelected = selectedTestTypeIds.includes(tt.id!);
              return (
                <button
                  key={tt.id}
                  onClick={() => toggleSelection(tt.id!, selectedTestTypeIds, setSelectedTestTypeIds)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm",
                    isSelected ? 'bg-pink-500/20 border-pink-500/60 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.25)]' : 'bg-surface-900/60 border-white/10 text-surface-400 hover:border-pink-500/40 hover:text-white'
                  )}
                >
                  {tt.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Test History Section */}
        <section className="space-y-4 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-purple-400">Archive</p>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Completed Test History</h3>
              </div>
            </div>
            {completedSessions.length > 0 && (
              <button onClick={handleClearHistory} className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5"/> Clear All
              </button>
            )}
          </div>

          {completedSessions.length === 0 ? (
            <div className="bg-surface-900/60 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
              <History className="w-8 h-8 text-surface-500 mx-auto mb-2" />
              <p className="text-surface-400 font-bold text-sm">No completed practice tests yet.</p>
              <p className="text-xs text-surface-500 mt-1">Completed custom test sessions will appear here for review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSessions.map(session => {
                const scorePercentage = session.maxMarks > 0 ? Math.max(0, (session.marksObtained / session.maxMarks) * 100) : 0;
                const hasTimeLimit = session.timeLimit !== undefined;
                const allottedTime = hasTimeLimit ? session.timeLimit! : session.responses.length * 60;
                const isFast = session.timeElapsed < allottedTime * 0.5;
                const isSlow = session.timeElapsed > allottedTime * 0.9;
                const timeColor = isFast ? 'border-emerald-500 text-emerald-400' : isSlow ? 'border-rose-500 text-rose-400' : 'border-sky-500 text-sky-400';
                
                const timeTitle = hasTimeLimit 
                  ? `Time Taken: ${formatMinSec(session.timeElapsed)} / Allotted: ${formatMinSec(session.timeLimit!)}`
                  : `Time Taken: ${formatMinSec(session.timeElapsed)} (No Limit)`;

                return (
                  <motion.div 
                    key={session.id} 
                    whileHover={{ y: -3 }} 
                    onClick={() => handleResume(session.id!)} 
                    className="group relative bg-gradient-to-br from-surface-900/90 via-surface-900/60 to-surface-950/90 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 rounded-3xl p-5 cursor-pointer transition-all duration-300 shadow-xl overflow-hidden"
                  >
                    <button 
                      onClick={(e) => handleDeleteSession(e, session.id!)} 
                      className="absolute top-4 right-4 p-2 bg-rose-500/10 text-rose-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20 z-10 border border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex justify-between items-start mb-3 gap-2 relative z-10">
                      <h4 className="font-black text-white text-base truncate flex-1 group-hover:text-purple-300 transition-colors">{session.name}</h4>
                      <span className="text-[10px] uppercase font-black tracking-wider bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-full shrink-0 group-hover:opacity-0 transition-opacity">Completed</span>
                    </div>

                    <div className="flex items-center gap-4 mb-3 relative z-10">
                      <div className="text-sm font-black text-white flex-1">Score: <span className="text-purple-300">{session.marksObtained.toFixed(1).replace('.0', '')} / {session.maxMarks}</span></div>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full border-2 border-purple-500/80 bg-purple-500/10 flex items-center justify-center shadow-inner" title={`Score: ${Math.round(scorePercentage)}%`}>
                          <span className="text-[10px] font-black text-purple-200">{Math.round(scorePercentage)}%</span>
                        </div>
                        <div className={`w-9 h-9 rounded-full border-2 ${timeColor} bg-white/5 flex items-center justify-center shadow-inner`} title={timeTitle}>
                          <span className="text-[10px] font-black text-white">{formatCompactTime(session.timeElapsed)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-surface-400 font-medium flex justify-between border-t border-white/10 pt-3 relative z-10">
                      <span>Completed: {new Date(session.updatedAt).toLocaleDateString()}</span>
                      <span>{new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Time Limit Modal */}
      <AnimatePresence>
        {showTimeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowTimeModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-gradient-to-b from-surface-900 via-surface-900 to-surface-950 border border-white/15 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-2xl" />

              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Time Limit Options</h3>
              <p className="text-surface-300 text-sm mb-4 font-medium leading-relaxed">
                Do you want to set a time limit for this practice test?
              </p>
              
              <div className="bg-primary-500/15 border border-primary-500/30 text-primary-300 rounded-2xl p-3.5 mb-6 text-xs font-bold flex items-center gap-2">
                <span>Insight:</span> This custom test contains <strong>{finalQuestions.length} questions</strong>.
              </div>
              
              <div className="flex gap-3 mb-6">
                <button 
                  onClick={() => setWantsTimeLimit(false)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl border-2 font-black text-xs transition-all cursor-pointer",
                    !wantsTimeLimit ? 'bg-primary-600/20 border-primary-500 text-primary-300 shadow-md' : 'border-white/10 text-surface-400 hover:bg-white/5'
                  )}
                >
                  No Time Limit
                </button>
                <button 
                  onClick={() => setWantsTimeLimit(true)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl border-2 font-black text-xs transition-all cursor-pointer",
                    wantsTimeLimit ? 'bg-primary-600 border-primary-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-white/10 text-surface-400 hover:bg-white/5'
                  )}
                >
                  Set Time Limit
                </button>
              </div>

              {wantsTimeLimit && (
                <div className="mb-6">
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-300 mb-2">Duration (minutes)</label>
                  <input 
                    type="number" 
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    min="1"
                    className="w-full bg-surface-950 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-black text-sm shadow-inner"
                  />
                  <p className="text-[11px] text-surface-400 mt-1.5 font-medium">The test will automatically submit when time expires.</p>
                </div>
              )}

              <div className="bg-surface-950/80 rounded-2xl p-4 mb-6 border border-white/10 flex items-center justify-between shadow-inner">
                <div>
                  <h4 className="text-xs font-black text-white">Negative Marking</h4>
                  <p className="text-[11px] text-surface-400 mt-0.5">Deduct 0.33 marks for incorrect answers.</p>
                </div>
                <button
                  onClick={() => setAllowNegativeMarking(!allowNegativeMarking)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer",
                    allowNegativeMarking ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-surface-800 border-white/10 text-surface-400'
                  )}
                >
                  {allowNegativeMarking ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowTimeModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-white font-bold text-xs hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmGenerateTest}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] active:scale-95 cursor-pointer"
                >
                  Start Test!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
