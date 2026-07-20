import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { Search, Hash, Star, ArrowLeft, Image as ImageIcon, UploadCloud, CheckSquare, Trash2, Plus, ExternalLink } from 'lucide-react';

const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (percentage / 100) * circ;
  const color = percentage < 25 ? '#ef4444' : percentage < 50 ? '#eab308' : '#22c55e';

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent" className="text-surface-800" />
        <motion.circle 
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          cx="30" cy="30" r={radius} 
          stroke={color} 
          strokeWidth="5" 
          fill="transparent" 
          strokeDasharray={circ}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold text-surface-50">{Math.round(percentage)}%</span>
    </div>
  );
};

const ImagePreview = ({ file, onRemove }: { file: Blob, onRemove: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="relative inline-flex justify-center rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group/img mx-auto">
      <img 
        src={url} 
        alt="Pasted" 
        className="max-w-full h-auto max-h-[500px] object-contain" 
      />
      <button 
        onClick={onRemove} 
        className="absolute top-3 right-3 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg shadow-xl opacity-0 group-hover/img:opacity-100 transition-opacity"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};

const TestGrid: React.FC<{ onSelect: (id: number) => void }> = ({ onSelect }) => {
  const tests = useLiveQuery(() => db.tests.orderBy('createdAt').reverse().toArray()) || [];
  const coachings = useLiveQuery(() => db.coachings.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  const getCoachingName = (id: number) => coachings.find(c => c.id === id)?.name || 'Unknown';
  const getTestTypeName = (id: number) => testTypes.find(c => c.id === id)?.name || 'Unknown';
  const getSubjectName = (id?: number) => subjects.find(c => c.id === id)?.name || '';

  const handleDelete = async (e: React.MouseEvent, testId: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this test? All questions inside it will also be deleted.")) {
      await db.questions.where('testId').equals(testId).delete();
      await db.tests.delete(testId);
    }
  };

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 glass-card rounded-3xl flex items-center justify-center">
          <Search className="w-10 h-10 text-surface-500" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-surface-50 tracking-tight">No Tests Found</h3>
          <p className="text-surface-400 mt-2">You haven't added any tests yet. Go to Add Test to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white tracking-tight">Test Dashboard</h1>
        <div className="px-4 py-2 rounded-full glass-card border border-white/10 text-sm font-medium text-surface-300">
          Total: {tests.length} Tests
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tests.map(test => {
          const coachingName = getCoachingName(test.coachingId);
          const typeName = getTestTypeName(test.testTypeId);
          const subjectName = getSubjectName(test.subjectId);
          const percentage = Math.max(0, Math.min(100, (test.marksObtained / test.maxMarks) * 100));

          return (
            <motion.div
              key={test.id}
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => onSelect(test.id!)}
              className={cn(
                "cursor-pointer glass-card rounded-[2rem] p-6 flex flex-col gap-5 transition-all relative overflow-hidden group border hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] min-h-[220px]",
                test.isImportant ? "border-yellow-500/50 hover:border-yellow-400" : "border-white/5 hover:border-primary-500/30"
              )}
            >
              {/* Actions Area */}
              <div className="absolute top-4 right-4 flex gap-2 z-20">
                {/* Trash Button */}
                <button 
                  onClick={(e) => handleDelete(e, test.id!)}
                  className="p-2.5 bg-red-500/90 hover:bg-red-500 text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-0 group-hover:delay-[3000ms]"
                  title="Delete Test"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
              
              <div className="flex items-start justify-between z-10">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary-400">{coachingName}</span>
                  <h3 className="text-2xl font-bold text-white leading-tight pr-10">{typeName}</h3>
                  {subjectName && (
                    <span className="inline-block self-start text-[10px] font-bold uppercase tracking-wider text-surface-300 bg-surface-800/80 px-2.5 py-1 rounded-md border border-white/5 mt-1">
                      {subjectName}
                    </span>
                  )}
                </div>
                <CircularProgress percentage={percentage} />
              </div>

              <div className="mt-auto z-10 pt-5 border-t border-white/5 flex items-center justify-between text-sm font-medium text-surface-400">
                <div className="flex items-center gap-2">
                  <span className="bg-surface-800/50 px-3 py-1.5 rounded-lg">{test.marksObtained} / {test.maxMarks}</span>
                  <span className="bg-surface-800/50 px-3 py-1.5 rounded-lg">{test.questionsCount} Qs</span>
                </div>
                <span className="text-xs font-bold text-surface-500 bg-surface-900/50 px-2 py-1.5 rounded-lg">
                  {new Date(test.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export const ReviewTest: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const testId = Number(searchParams.get('testId'));
  
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  
  // Data Fetching
  const test = useLiveQuery(() => testId ? db.tests.get(testId) : undefined, [testId]);
  const questions = useLiveQuery(() => testId ? db.questions.where('testId').equals(testId).toArray() : [], [testId]) || [];
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const globalTags = useLiveQuery(() => db.tags.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const coachings = useLiveQuery(() => db.coachings.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  
  const coachingName = test ? coachings.find(c => c.id === test.coachingId)?.name : '';
  const testTypeName = test ? testTypes.find(t => t.id === test.testTypeId)?.name : '';
  const subjectName = test && test.subjectId ? subjects.find(s => s.id === test.subjectId)?.name : '';
  const testTitle = [coachingName, testTypeName, subjectName].filter(Boolean).join(' - ') || 'Test Dashboard';
  
  const selectedQuestion = questions.find(q => q.id === selectedQuestionId);
  const effectiveSubjectId = selectedQuestion?.subjectId || test?.subjectId;
  
  // Global Paste Handler
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if they are actively pasting into an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (!selectedQuestionId) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Try image first
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            db.questions.update(selectedQuestionId, { questionImage: file });
            e.preventDefault();
            return;
          }
        }
      }
      
      // If no image, try text
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        db.questions.update(selectedQuestionId, { questionText: text });
        e.preventDefault();
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [selectedQuestionId]);
  // States for Editable Fields
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  // Subject Topics
  const suggestedTopics = useLiveQuery(
    () => effectiveSubjectId ? db.topics.where('subjectId').equals(effectiveSubjectId).toArray() : [], 
    [effectiveSubjectId]
  ) || [];

  // Status mapping
  const statusMap = statuses.reduce((acc, curr) => ({ ...acc, [curr.id!]: curr }), {} as Record<number, any>);

  const updateQuestion = async (data: Partial<any>) => {
    if (selectedQuestion?.id) {
      await db.questions.update(selectedQuestion.id, data);
    }
  };

  const handleStatusToggle = async (questionId: number, statusId: number) => {
    const question = await db.questions.get(questionId);
    if (!question) return;

    const status = statusMap[statusId];
    if (!status) return;
    
    let newStatusIds = [...(question.statusIds || [])];
    const statusName = status.name.toLowerCase();
    const isCorrect = statusName === 'correct';
    const isBaseStatus = isCorrect || statusName === 'incorrect' || statusName === 'left out';

    if (isCorrect) {
      if (newStatusIds.includes(statusId)) {
        newStatusIds = [];
      } else {
        newStatusIds = [statusId];
      }
    } else if (isBaseStatus) {
      if (newStatusIds.includes(statusId)) {
        newStatusIds = newStatusIds.filter(id => id !== statusId);
      } else {
        newStatusIds = newStatusIds.filter(id => {
          const name = statusMap[id]?.name?.toLowerCase() || '';
          return name !== 'correct' && name !== 'incorrect' && name !== 'left out';
        });
        newStatusIds.push(statusId);
      }
    } else {
      const hasCorrect = newStatusIds.some(id => statusMap[id]?.name?.toLowerCase() === 'correct');
      if (hasCorrect && !newStatusIds.includes(statusId)) {
        return;
      }
      if (newStatusIds.includes(statusId)) {
        newStatusIds = newStatusIds.filter(id => id !== statusId);
      } else {
        newStatusIds.push(statusId);
      }
    }

    await db.questions.update(questionId, { statusIds: newStatusIds });
  };

  const handleTopicToggle = async (questionId: number, topicId: number) => {
    const question = await db.questions.get(questionId);
    if (!question) return;
    let newTopicIds = [...(question.topicIds || [])];
    if (newTopicIds.includes(topicId)) newTopicIds = newTopicIds.filter(id => id !== topicId);
    else newTopicIds.push(topicId);
    await db.questions.update(questionId, { topicIds: newTopicIds });
  };

  const handleTagToggle = async (questionId: number, tagId: number) => {
    const question = await db.questions.get(questionId);
    if (!question) return;
    let newTagIds = [...(question.tagIds || [])];
    if (newTagIds.includes(tagId)) newTagIds = newTagIds.filter(id => id !== tagId);
    else newTagIds.push(tagId);
    await db.questions.update(questionId, { tagIds: newTagIds });
  };

  const [newTagInput, setNewTagInput] = useState('');
  const [newTopicInput, setNewTopicInput] = useState('');

  const handleAddNewGlobalTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim() && selectedQuestion) {
      const tagId = (await db.tags.add({ name: newTagInput.trim() })) as number;
      await handleTagToggle(selectedQuestion.id!, tagId);
      setNewTagInput('');
    }
  };

  const handleAddNewTopic = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTopicInput.trim() && selectedQuestion && effectiveSubjectId) {
      const topicId = (await db.topics.add({ name: newTopicInput.trim(), subjectId: effectiveSubjectId })) as number;
      await handleTopicToggle(selectedQuestion.id!, topicId);
      setNewTopicInput('');
    }
  };

  // 1-Click Clipboard Paste
  const handleOneClickPaste = async (blockId?: string) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "pasted-image.png", { type: imageType });
          if (blockId) {
            updateCustomBlock(blockId, { image: file });
          } else {
            await updateQuestion({ questionImage: file });
          }
          return;
        }
      }
      // If no image, try to read text
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (blockId) {
            updateCustomBlock(blockId, { content: text });
          } else {
            await updateQuestion({ questionText: text });
          }
          return;
        }
      } catch (err) {
        console.error("Failed to read text from clipboard", err);
      }
      
      alert("No image or text found on clipboard.");
    } catch (err) {
      console.error(err);
      
      // Fallback: sometimes clipboard.read() fails due to permissions, try readText() directly
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (blockId) {
            updateCustomBlock(blockId, { content: text });
          } else {
            await updateQuestion({ questionText: text });
          }
          return;
        }
      } catch (e) {}

      alert("Failed to read clipboard. Please make sure you granted permission.");
    }
  };

  // Options Toggling
  const toggleOption = (opt: string) => {
    const current = selectedQuestion?.selectedOptions || [];
    let next = [...current];
    if (next.includes(opt)) next = next.filter(o => o !== opt);
    else next.push(opt);
    updateQuestion({ selectedOptions: next });
  };

  // Custom Blocks
  const addCustomBlock = (defaultTitle: string = 'New Block') => {
    const current = selectedQuestion?.customBlocks || [];
    const newBlock = { id: Date.now().toString(), title: defaultTitle, content: '' };
    updateQuestion({ customBlocks: [...current, newBlock] });
  };

  const updateCustomBlock = (id: string, updates: any) => {
    const current = selectedQuestion?.customBlocks || [];
    const next = current.map(b => b.id === id ? { ...b, ...updates } : b);
    updateQuestion({ customBlocks: next });
  };

  const deleteCustomBlock = (id: string) => {
    const current = selectedQuestion?.customBlocks || [];
    updateQuestion({ customBlocks: current.filter(b => b.id !== id) });
  };

  if (!testId) {
    return <TestGrid onSelect={(id) => setSearchParams({ testId: id.toString() })} />;
  }

  if (testId && !test) {
    return <div className="p-8 text-center text-surface-400">Loading test data...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-4 md:gap-6 max-w-7xl mx-auto w-full p-4 sm:p-6">
      
      {/* Left Sidebar: Modern Sleek Pills */}
      <div className="w-full md:w-[300px] h-[35vh] md:h-full flex flex-col bg-surface-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shrink-0 shadow-[0_0_40px_rgba(0,0,0,0.2)] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        
        <div className="p-4 flex items-start gap-3 relative z-10 border-b border-white/5">
          <button onClick={() => setSearchParams({})} className="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-300 hover:text-white transition-colors shadow-sm shrink-0 mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 pr-12">
            <div className="flex items-start gap-2">
              <h2 className={cn("font-bold text-white tracking-tight leading-tight break-words", testTitle.length > 40 ? "text-sm" : testTitle.length > 22 ? "text-base" : "text-xl")}>{testTitle}</h2>
              {test?.link && (
                <a 
                  href={test.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-1.5 bg-surface-800 hover:bg-surface-700 text-primary-400 rounded-lg transition-colors shadow-sm shrink-0 mt-0.5"
                  title="Open Test Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs font-medium text-surface-400 mt-1">
              {questions.length} Questions {test?.timeTaken ? `• ${test.timeTaken}` : ''}
            </p>
          </div>
          {test && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await db.tests.update(test.id!, { isImportant: !test.isImportant });
              }}
              className={cn(
                "absolute top-4 right-4 p-2 rounded-xl transition-all shadow-sm",
                test.isImportant 
                  ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" 
                  : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700"
              )}
              title="Mark Test as Important"
            >
              <Star className="w-5 h-5" fill={test.isImportant ? "currentColor" : "none"} />
            </button>
          )}
        </div>
        
        <div className="p-4 relative z-10">
          <div className="relative group">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-surface-400 group-focus-within:text-primary-400 transition-colors" />
            <Input className="pl-10 h-10 bg-surface-800/50 border-transparent focus:bg-surface-800 focus:border-primary-500/50 rounded-xl w-full text-sm placeholder:text-surface-500 shadow-inner" placeholder="Search..." />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          {questions.map((q) => {
            const primaryStatusId = q.statusIds?.find(id => {
              const name = statusMap[id]?.name?.toLowerCase();
              return name === 'correct' || name === 'incorrect' || name === 'left out';
            });
            const primaryStatus = primaryStatusId ? statusMap[primaryStatusId] : (q.statusIds?.[0] ? statusMap[q.statusIds[0]] : null);

            return (
              <button
                key={q.id}
                onClick={() => setSelectedQuestionId(q.id!)}
                className={cn(
                  "w-full text-left px-4 py-3.5 rounded-2xl text-sm font-medium transition-all flex items-center justify-between group",
                  selectedQuestionId === q.id 
                    ? "bg-primary-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.25)] scale-[1.02]" 
                    : "hover:bg-surface-800 hover:scale-[1.01] text-surface-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("flex-1 truncate", selectedQuestionId === q.id ? "font-bold" : "")}>{`Question ${q.questionNumber}`}</span>
                  {q.isFavorite && <Star className={cn("w-3.5 h-3.5", selectedQuestionId === q.id ? "text-yellow-300" : "text-yellow-500")} fill="currentColor" />}
                </div>
                {primaryStatus && (
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0 ml-2" style={{ backgroundColor: selectedQuestionId === q.id ? '#fff' : primaryStatus.color }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Area: Immersive Content Canvas */}
      <div className="flex-1 min-h-[50vh] bg-surface-900/30 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 md:p-6 overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.2)] relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-[2.5rem]" />
        
        {selectedQuestion ? (
          <motion.div key={selectedQuestion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto pb-20 relative z-10">
            
            {/* Header: Subject + Status + Title */}
            <div className="bg-surface-900/50 p-5 rounded-[2rem] border border-white/5 shadow-lg flex flex-col gap-4">
              
              {/* Top Row: Subject & Status */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Subject */}
                <div className="shrink-0">
                  {test?.subjectId ? (
                    <span className="text-xs font-bold text-primary-300 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 shadow-inner">
                      {subjects.find(s => s.id === test.subjectId)?.name || 'Unknown'}
                    </span>
                  ) : (
                    <select 
                      className="bg-surface-800 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer shadow-inner"
                      value={selectedQuestion.subjectId || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await updateQuestion({ subjectId: val ? Number(val) : undefined, topicIds: [] });
                      }}
                    >
                      <option value="">+ Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Status Pills right-hand side */}
                <div className="flex items-center gap-3 shrink-0 overflow-x-auto">
                  <div className="flex bg-surface-950/80 p-1 rounded-xl border border-white/5 shadow-inner">
                    {statuses.map(s => {
                      const isActive = selectedQuestion.statusIds?.includes(s.id!);
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleStatusToggle(selectedQuestion.id!, s.id!)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                            isActive 
                              ? "text-surface-950 shadow-[0_2px_10px_rgba(0,0,0,0.3)] scale-105" 
                              : "text-surface-400 hover:text-white"
                          )}
                          style={isActive ? { backgroundColor: s.color } : undefined}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => updateQuestion({ isFavorite: !selectedQuestion.isFavorite })}
                    className={cn("p-2 rounded-xl transition-all shadow-sm shrink-0", selectedQuestion.isFavorite ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20" : "text-surface-500 hover:text-white bg-surface-800/50 hover:bg-surface-800")}
                  >
                    <Star className="w-5 h-5" fill={selectedQuestion.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>

              {/* Title Row */}
              <div className="w-full">
                {isEditingTitle ? (
                  <textarea 
                    autoFocus 
                    value={editTitleValue} 
                    onChange={e => setEditTitleValue(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      updateQuestion({ customTitle: editTitleValue });
                    }} 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setIsEditingTitle(false);
                        updateQuestion({ customTitle: editTitleValue });
                      }
                    }}
                    className="w-full text-lg md:text-xl font-bold bg-surface-800/50 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary-500/50 resize-none min-h-[60px]"
                    rows={2}
                  />
                ) : (
                  <h1 
                    onDoubleClick={() => {
                      setIsEditingTitle(true);
                      setEditTitleValue(selectedQuestion.customTitle || `Question ${selectedQuestion.questionNumber}`);
                    }} 
                    className="text-lg md:text-xl font-bold text-white cursor-text hover:text-primary-200 transition-colors break-words leading-snug"
                    title="Double click to edit title"
                  >
                    {selectedQuestion.customTitle || `Question ${selectedQuestion.questionNumber}`}
                  </h1>
                )}
              </div>
            </div>

            {/* Topics & Tags Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Topics Selection */}
              <div className="glass-card p-6 md:p-8 rounded-[2rem] border-t border-white/10 shadow-2xl space-y-4">
                <span className="text-sm font-bold text-surface-400 uppercase tracking-widest block">Topics</span>
                {!effectiveSubjectId ? (
                  <p className="text-surface-500 text-sm font-medium">Please select a subject to assign topics.</p>
                ) : (
                  <div className="flex flex-wrap gap-3 items-center">
                    {suggestedTopics.map(topic => {
                      const isActive = selectedQuestion.topicIds?.includes(topic.id!);
                      return (
                        <button
                          key={topic.id}
                          onClick={() => handleTopicToggle(selectedQuestion.id!, topic.id!)}
                          className={cn(
                            "px-4 py-2 text-sm rounded-xl border transition-all font-bold",
                            isActive
                              ? "bg-primary-500 text-white border-primary-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                              : "bg-surface-800 text-surface-300 border-white/5 hover:bg-surface-700 hover:text-white"
                          )}
                        >
                          {topic.name}
                        </button>
                      );
                    })}
                    <Input 
                      placeholder="+ Topic..." 
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={handleAddNewTopic}
                      className="h-10 text-sm w-32 bg-surface-900 border-dashed border-white/10 focus:border-primary-500 focus:bg-surface-800 rounded-xl px-4"
                    />
                  </div>
                )}
              </div>

              {/* Tags Selection */}
              <div className="glass-card p-6 md:p-8 rounded-[2rem] border-t border-white/10 shadow-2xl space-y-4">
                <span className="text-sm font-bold text-surface-400 uppercase tracking-widest block">Tags</span>
                <div className="flex flex-wrap gap-3 items-center">
                  {globalTags.map(tag => {
                    const isActive = selectedQuestion.tagIds?.includes(tag.id!);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(selectedQuestion.id!, tag.id!)}
                        style={isActive && tag.color ? { backgroundColor: tag.color, borderColor: tag.color, boxShadow: `0 0 15px ${tag.color}66` } : undefined}
                        className={cn(
                          "px-4 py-2 text-sm rounded-xl border transition-all font-bold",
                          isActive
                            ? (tag.color ? "text-white" : "bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]")
                            : "bg-surface-800 text-surface-300 border-white/5 hover:bg-surface-700 hover:text-white"
                        )}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                  <Input 
                    placeholder="+ Tag..." 
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddNewGlobalTag}
                    className="h-10 text-sm w-32 bg-surface-900 border-dashed border-white/10 focus:border-purple-500 focus:bg-surface-800 rounded-xl px-4"
                  />
                </div>
              </div>
            </div>

            {/* Image OR Text Question Block */}
            <div className="glass-card p-6 md:p-8 rounded-[2rem] border-t border-white/10 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Question Content</h3>
              </div>
              
              {selectedQuestion.questionImage ? (
                <ImagePreview file={selectedQuestion.questionImage} onRemove={() => updateQuestion({ questionImage: undefined })} />
              ) : (
                <div 
                  className="w-full bg-surface-900/50 rounded-2xl border border-white/5 shadow-inner flex flex-col focus-within:ring-2 focus-within:ring-primary-500/50 transition-all overflow-hidden relative"
                >
                  <textarea 
                    value={selectedQuestion.questionText || ''}
                    onChange={e => updateQuestion({ questionText: e.target.value })}
                    className="w-full bg-transparent border-none text-surface-100 placeholder:text-surface-600 resize-none focus:outline-none focus:ring-0 font-medium leading-relaxed p-5 h-auto min-h-[140px]"
                    rows={(selectedQuestion.questionText || '').split('\n').length || 1}
                    placeholder="Type text, or Ctrl+V / Click the button to paste an image instead..."
                  />
                  {!selectedQuestion.questionText && (
                    <button 
                      onClick={() => handleOneClickPaste()}
                      className="absolute right-5 bottom-5 px-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white rounded-xl text-sm font-bold flex items-center gap-2 border border-white/5 shadow-md transition-all z-10 group"
                    >
                      <UploadCloud className="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors" /> 
                      Click to Paste Image/Text
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Answer Options Block */}
            <div className="glass-card p-5 md:p-6 rounded-2xl border-t border-white/10 space-y-6 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2"><CheckSquare className="w-4 h-4"/> Answer Selection</h3>
                
                <div className="flex bg-surface-900/80 p-1.5 rounded-xl border border-white/5 shadow-inner">
                  <button 
                    onClick={() => updateQuestion({optionsType: selectedQuestion.optionsType === 'MCQ' ? 'NONE' : 'MCQ'})} 
                    className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", selectedQuestion.optionsType === 'MCQ' ? "bg-primary-500 text-white shadow-[0_5px_15px_rgba(99,102,241,0.4)]" : "text-surface-400 hover:text-white")}
                  >
                    + MCQ/MSQ
                  </button>
                  <button 
                    onClick={() => updateQuestion({optionsType: selectedQuestion.optionsType === 'NAT' ? 'NONE' : 'NAT'})} 
                    className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", selectedQuestion.optionsType === 'NAT' ? "bg-primary-500 text-white shadow-[0_5px_15px_rgba(99,102,241,0.4)]" : "text-surface-400 hover:text-white")}
                  >
                    + NAT
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selectedQuestion.optionsType === 'MCQ' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex gap-4 md:gap-6 items-center justify-center py-6">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const isSelected = selectedQuestion.selectedOptions?.includes(opt);
                      return (
                        <button 
                          key={opt}
                          onClick={() => toggleOption(opt)}
                          className={cn(
                            "w-16 h-16 md:w-20 md:h-20 rounded-full text-2xl font-black flex items-center justify-center transition-all border-4", 
                            isSelected 
                              ? "bg-primary-500 border-primary-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.6)] scale-110" 
                              : "bg-surface-800 border-surface-600 text-surface-400 hover:border-surface-400 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
                
                {selectedQuestion.optionsType === 'NAT' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-center py-6">
                    <Input 
                      type="number" 
                      placeholder="Enter numerical answer..." 
                      value={selectedQuestion.numericalAnswer ?? ''} 
                      onChange={e => updateQuestion({numericalAnswer: e.target.value ? Number(e.target.value) : undefined})} 
                      className="w-full max-w-xs text-center text-3xl font-black h-20 rounded-2xl bg-surface-900/80 border-surface-600 shadow-inner placeholder:text-surface-600 placeholder:text-xl placeholder:font-medium focus:ring-primary-500 focus:border-primary-500" 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Custom Blocks (Seamless Editor) */}
            <div className="space-y-6">
              <AnimatePresence>
                {selectedQuestion.customBlocks?.map(block => (
                  <motion.div key={block.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 md:p-8 rounded-[2rem] border-t border-white/10 space-y-4 relative group shadow-2xl">
                    <button onClick={() => deleteCustomBlock(block.id)} className="absolute top-6 right-6 p-2 rounded-xl text-surface-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10 bg-surface-900/50 backdrop-blur-md"><Trash2 className="w-5 h-5"/></button>
                    
                    <input 
                      value={block.title}
                      onChange={e => updateCustomBlock(block.id, { title: e.target.value })}
                      className="w-full bg-transparent border-none focus:ring-0 text-xl font-black text-primary-300 placeholder:text-surface-600 p-0 focus:outline-none pr-12"
                      placeholder="Block Title..."
                    />
                    <div className="w-full mt-4">
                      {/* EITHER Image OR Text */}
                      {block.image ? (
                        <ImagePreview file={block.image} onRemove={() => updateCustomBlock(block.id, { image: undefined })} />
                      ) : (
                        <div 
                          className="w-full bg-surface-900/50 rounded-2xl border border-white/5 shadow-inner flex flex-col focus-within:ring-2 focus-within:ring-purple-500/50 transition-all overflow-hidden relative"
                        >
                          <textarea 
                            value={block.content || ''}
                            onChange={e => updateCustomBlock(block.id, { content: e.target.value })}
                            className="w-full bg-transparent border-none text-surface-100 placeholder:text-surface-600 resize-none focus:outline-none focus:ring-0 font-medium leading-relaxed p-5 h-auto min-h-[140px]"
                            rows={(block.content || '').split('\n').length || 1}
                            placeholder="Type text, or Ctrl+V / Click the button to paste an image instead..."
                          />
                          {!block.content && (
                            <button 
                              onClick={() => handleOneClickPaste(block.id)}
                              className="absolute right-5 bottom-5 px-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white rounded-xl text-sm font-bold flex items-center gap-2 border border-white/5 shadow-md transition-all z-10"
                            >
                              <ImageIcon className="w-4 h-4" /> Click to Paste Image
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button onClick={() => addCustomBlock('Detailed Solution')} className="w-full h-16 bg-surface-800/30 hover:bg-surface-800/50 border-dashed border-2 border-surface-600 hover:border-emerald-500/50 text-surface-300 hover:text-emerald-400 rounded-3xl flex items-center justify-center gap-3 transition-all font-bold text-lg shadow-sm">
                  <Plus className="w-6 h-6" /> Add Solution Block
                </Button>
                <Button onClick={() => addCustomBlock('New Block')} className="w-full h-16 bg-surface-800/30 hover:bg-surface-800/50 border-dashed border-2 border-surface-600 hover:border-purple-500/50 text-surface-300 hover:text-purple-400 rounded-3xl flex items-center justify-center gap-3 transition-all font-bold text-lg shadow-sm">
                  <Plus className="w-6 h-6" /> Add Custom Block
                </Button>
              </div>
            </div>

            {/* Question Reference Link */}
            <div className="glass-card p-5 md:p-6 rounded-[2rem] border-t border-white/10 shadow-2xl mt-8 space-y-4">
              <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2"><ExternalLink className="w-4 h-4"/> Reference Link</h3>
              <div className="flex items-center gap-3">
                <Input 
                  value={selectedQuestion.link || ''}
                  onChange={(e) => updateQuestion({ link: e.target.value })}
                  placeholder="Paste URL for reference..."
                  className="flex-1 bg-surface-900/50 border-white/5 focus:border-primary-500/50 h-12"
                />
                {selectedQuestion.link && (
                  <a 
                    href={selectedQuestion.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="h-12 w-12 bg-surface-800 hover:bg-surface-700 text-primary-400 rounded-xl transition-colors shadow-inner flex items-center justify-center shrink-0 border border-white/5"
                    title="Open Link"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-24 h-24 bg-surface-800 rounded-[2rem] flex items-center justify-center border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
              <Hash className="w-12 h-12 text-surface-500 relative z-10" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight">Select a Question</h3>
              <p className="text-surface-400 mt-2 font-medium text-lg">Choose a question from the sidebar to review and enhance it.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
