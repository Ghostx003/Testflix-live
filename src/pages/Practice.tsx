import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { PracticeSession } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Tag as TagIcon, Book, Activity, Star, Trash2, History, Layers, ClipboardList } from 'lucide-react';

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
      // Must have question content and some form of answer/solution
      const hasQuestionContent = (q.questionText && q.questionText.trim().length > 0) || !!q.questionImage;
      const hasAnswerContent = 
        (q.selectedOptions && q.selectedOptions.length > 0) || 
        (q.numericalAnswer !== undefined && q.numericalAnswer !== null) || 
        !!q.answerImage || 
        (q.customBlocks && q.customBlocks.length > 0);

      if (!hasQuestionContent || !hasAnswerContent) return false;

      // Check subject
      let matchesSubject = true;
      if (selectedSubjectId) {
        const test = tests.find(t => t.id === q.testId);
        matchesSubject = q.subjectId === selectedSubjectId || test?.subjectId === selectedSubjectId;
      }
      
      // Check topics
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

  // Final Questions computation (incorporating all filters)
  const finalQuestions = useMemo(() => {
    return matchingQuestions.filter(q => {
      let matchesStatus = true;
      if (selectedStatusIds.length > 0 || includeBookmarked) {
        const hasSelectedStatus = selectedStatusIds.length > 0 && q.statusIds?.some(id => selectedStatusIds.includes(id));
        const isBookmarkedMatch = includeBookmarked && q.isFavorite;
        // If both are selected, either match is fine (OR logic)
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
      // Small delay to allow render, then scroll to topics
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
    // Shuffle questions
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
    <div className="p-6 max-w-6xl mx-auto pb-32">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Practice Builder</h2>
        <p className="text-surface-400 mt-1">Build a custom test by selecting subjects, topics, and filters.</p>
      </div>

      {/* Sticky Navigation & Generate Bar */}
      <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md py-4 border-b border-t border-white/10 -mx-6 px-6 !mt-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => document.getElementById('subjects-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Subjects</button>
          <button onClick={() => document.getElementById('topics-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"><Book className="w-3.5 h-3.5" /> Topics</button>
          <button onClick={() => document.getElementById('status-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Status</button>
          <button onClick={() => document.getElementById('tags-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" /> Tags</button>
          <button onClick={() => document.getElementById('testtypes-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Test Types</button>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleGenerateClick}
            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Generate Test ({finalQuestions.length} Qs)
          </button>
        </div>
      </div>

      <div className="space-y-12 mt-8">
        {/* Continue Section */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary-400" />
            Continue where you left off
          </h3>
          {inProgressSessions.length === 0 ? (
            <div className="bg-surface-800/30 border border-white/5 rounded-xl p-8 text-center"><p className="text-surface-400">No tests in progress.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressSessions.map(session => (
                <motion.div key={session.id} whileHover={{ y: -2 }} onClick={() => handleResume(session.id!)} className="group relative bg-surface-800 border border-white/10 rounded-xl p-5 cursor-pointer hover:border-primary-500/50 transition-colors">
                  <button onClick={(e) => handleDeleteSession(e, session.id!)} className="absolute top-4 right-5 p-1.5 bg-red-500/10 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 z-10"><Trash2 className="w-4 h-4" /></button>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h4 className="font-bold text-white truncate flex-1">{session.name}</h4>
                    <span className="text-[10px] bg-primary-500/20 text-primary-300 px-2 py-1 rounded-md shrink-0 uppercase font-bold tracking-wider group-hover:opacity-0 transition-opacity">In Progress</span>
                  </div>
                  <div className="text-sm text-surface-400 font-medium">
                    {session.responses.filter(r => r.status === 'answered').length} / {session.responses.length} Answered
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <hr className="border-white/5" />

        {/* Subjects Section */}
        <section id="subjects-section" className="scroll-mt-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              1. Select a Subject
            </h3>
            {selectedSubjectId && (
              <button onClick={() => setSelectedSubjectId(null)} className="text-sm text-surface-400 hover:text-white">Clear Selection</button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {subjects.map(subject => {
              const isSelected = selectedSubjectId === subject.id;
              return (
                <motion.button
                  key={subject.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubjectSelect(subject.id!)}
                  className={`flex items-center gap-3 border rounded-xl p-4 text-left transition-colors ${
                    isSelected 
                      ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[inset_0_0_15px_rgba(99,102,241,0.2)]' 
                      : 'bg-surface-800 border-white/10 hover:bg-surface-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500/30' : 'bg-surface-700'}`}>
                    <Layers className={`w-4 h-4 ${isSelected ? 'text-indigo-300' : 'text-surface-400'}`} />
                  </div>
                  <span className={`font-medium truncate ${isSelected ? 'text-indigo-100' : 'text-surface-200'}`}>{subject.name}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Topics Section */}
        <section id="topics-section" className="scroll-mt-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-400" />
              2. Select Topics
            </h3>
            <div className="flex gap-4">
              <span className="text-sm text-surface-400">{selectedTopicIds.length === 0 ? 'All Topics Selected' : `${selectedTopicIds.length} Selected`}</span>
              {selectedTopicIds.length > 0 && (
                <button onClick={() => setSelectedTopicIds([])} className="text-sm text-surface-400 hover:text-white">Select All (Clear)</button>
              )}
            </div>
          </div>
          {visibleTopics.length === 0 ? (
            <div className="text-surface-400 text-sm italic">No topics available for current selection.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {visibleTopics.map(topic => {
                const isSelected = selectedTopicIds.includes(topic.id!);
                return (
                  <motion.button
                    key={topic.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleSelection(topic.id!, selectedTopicIds, setSelectedTopicIds)}
                    className={`flex items-center gap-3 border rounded-xl p-3 text-left transition-colors ${
                      isSelected 
                        ? 'bg-blue-500/20 border-blue-500/50' 
                        : 'bg-surface-800 border-white/10 hover:bg-surface-700'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 border ${isSelected ? 'bg-blue-400 border-blue-400' : 'border-surface-500'}`} />
                    <span className={`text-sm truncate ${isSelected ? 'text-blue-100' : 'text-surface-300'}`}>{topic.name}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* Status Section */}
        <section id="status-section" className="scroll-mt-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              3. Filter by Status
            </h3>
            <span className="text-sm text-surface-400">{selectedStatusIds.length === 0 && !includeBookmarked ? 'All Statuses' : 'Filtered'}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {hasBookmarked && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIncludeBookmarked(!includeBookmarked)}
                className={`flex items-center gap-2 border rounded-full px-4 py-2 transition-colors ${
                  includeBookmarked ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-surface-800 border-white/10 text-surface-400 hover:border-yellow-500/30 hover:text-yellow-400'
                }`}
              >
                <Star className={`w-4 h-4 ${includeBookmarked ? 'fill-yellow-400' : ''}`} /> Bookmarked
              </motion.button>
            )}
            {visibleStatuses.map(status => {
              const isSelected = selectedStatusIds.includes(status.id!);
              return (
                <motion.button
                  key={status.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSelection(status.id!, selectedStatusIds, setSelectedStatusIds)}
                  className={`flex items-center gap-2 border rounded-full px-4 py-2 transition-colors ${
                    isSelected ? 'bg-surface-700 border-white/30 text-white' : 'bg-surface-800 border-white/5 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                  {status.name}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Tags Section */}
        <section id="tags-section" className="scroll-mt-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-orange-400" />
              4. Filter by Tags
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleTags.length === 0 && <span className="text-sm text-surface-500">No tags in current selection.</span>}
            {visibleTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id!);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleSelection(tag.id!, selectedTagIds, setSelectedTagIds)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected ? 'bg-orange-500/20 border-orange-500/50 text-orange-200' : 'bg-surface-800 border-white/10 text-surface-400 hover:border-orange-500/30'
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Test Types Section */}
        <section id="testtypes-section" className="scroll-mt-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-pink-400" />
              5. Filter by Test Type
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleTestTypes.length === 0 && <span className="text-sm text-surface-500">No test types in current selection.</span>}
            {visibleTestTypes.map(tt => {
              const isSelected = selectedTestTypeIds.includes(tt.id!);
              return (
                <button
                  key={tt.id}
                  onClick={() => toggleSelection(tt.id!, selectedTestTypeIds, setSelectedTestTypeIds)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    isSelected ? 'bg-pink-500/20 border-pink-500/50 text-pink-200' : 'bg-surface-800 border-white/10 text-surface-400 hover:border-pink-500/30'
                  }`}
                >
                  {tt.name}
                </button>
              );
            })}
          </div>
        </section>

        <hr className="border-white/5 my-12" />

        {/* History Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Test History
            </h3>
            {completedSessions.length > 0 && <button onClick={handleClearHistory} className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 className="w-4 h-4"/> Clear All</button>}
          </div>
          {completedSessions.length === 0 ? (
            <div className="bg-surface-800/30 border border-white/5 rounded-xl p-8 text-center"><p className="text-surface-400">No completed tests yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSessions.map(session => {
                const scorePercentage = session.maxMarks > 0 ? Math.max(0, (session.marksObtained / session.maxMarks) * 100) : 0;
                const hasTimeLimit = session.timeLimit !== undefined;
                const allottedTime = hasTimeLimit ? session.timeLimit! : session.responses.length * 60;
                const isFast = session.timeElapsed < allottedTime * 0.5;
                const isSlow = session.timeElapsed > allottedTime * 0.9;
                const timeColor = isFast ? 'border-green-500 text-green-400' : isSlow ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400';
                
                const timeTitle = hasTimeLimit 
                  ? `Time Taken: ${formatMinSec(session.timeElapsed)} / Allotted: ${formatMinSec(session.timeLimit!)}`
                  : `Time Taken: ${formatMinSec(session.timeElapsed)} (No Limit)`;

                return (
                  <motion.div key={session.id} whileHover={{ y: -2 }} onClick={() => handleResume(session.id!)} className="group relative bg-surface-800 border border-white/10 rounded-xl p-5 cursor-pointer hover:border-purple-500/50 transition-colors">
                    <button onClick={(e) => handleDeleteSession(e, session.id!)} className="absolute top-4 right-5 p-1.5 bg-red-500/10 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 z-10"><Trash2 className="w-4 h-4" /></button>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h4 className="font-bold text-white truncate flex-1">{session.name}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md shrink-0 group-hover:opacity-0 transition-opacity">Completed</span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-sm font-bold text-white flex-1">Score: {session.marksObtained.toFixed(1).replace('.0', '')} / {session.maxMarks}</div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-purple-500 flex items-center justify-center" title={`Score: ${Math.round(scorePercentage)}%`}><span className="text-[10px] font-bold text-white">{Math.round(scorePercentage)}%</span></div>
                        <div className={`w-8 h-8 rounded-full border-2 ${timeColor} flex items-center justify-center`} title={timeTitle}><span className="text-[10px] font-bold text-white">{formatCompactTime(session.timeElapsed)}</span></div>
                      </div>
                    </div>
                    <div className="text-xs text-surface-500 mt-2 flex justify-between border-t border-white/5 pt-3">
                      <span>Completed on: {new Date(session.updatedAt).toLocaleDateString()}</span>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTimeModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl m-4"
            >
              <h3 className="text-2xl font-bold text-white mb-3">Time Limit Options</h3>
              <p className="text-slate-300 mb-2 leading-relaxed">
                Do you want to set a time limit for this practice test?
              </p>
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg p-3 mb-6 text-sm flex items-center gap-2">
                <span className="font-bold">Insight:</span> This test contains <strong>{finalQuestions.length} questions</strong>.
              </div>
              
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setWantsTimeLimit(false)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${!wantsTimeLimit ? 'bg-primary-600/20 border-primary-500 text-primary-300' : 'border-slate-600 text-surface-400 hover:bg-slate-700'}`}
                >
                  No Time Limit
                </button>
                <button 
                  onClick={() => setWantsTimeLimit(true)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${wantsTimeLimit ? 'bg-primary-600 border-primary-500 text-white' : 'border-slate-600 text-surface-400 hover:bg-slate-700'}`}
                >
                  Set Time Limit
                </button>
              </div>

              {wantsTimeLimit && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-surface-300 mb-2">Duration (minutes)</label>
                  <input 
                    type="number" 
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    min="1"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors font-medium"
                  />
                  <p className="text-xs text-surface-500 mt-2">The test will automatically end when time is up.</p>
                </div>
              )}

              <div className="bg-slate-900/50 rounded-xl p-4 mb-8 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Negative Marking</h4>
                  <p className="text-xs text-surface-400 mt-1">Deduct 0.33 marks for incorrect answers.</p>
                </div>
                <button
                  onClick={() => setAllowNegativeMarking(!allowNegativeMarking)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${allowNegativeMarking ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-surface-800 border-surface-700 text-surface-400'}`}
                >
                  {allowNegativeMarking ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowTimeModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-600 text-white font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmGenerateTest}
                  className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20"
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
