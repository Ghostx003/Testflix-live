import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { Search, Hash, Star, ArrowLeft, Image as ImageIcon, UploadCloud, CheckSquare, Trash2, Plus, ExternalLink, Eye, Edit3, Filter, X, Tag, Check } from 'lucide-react';
import { QuestionDetailPane } from './Bookmarks';
import { MultiSelect } from '../components/ui/MultiSelect';

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
  const allTests = useLiveQuery(() => db.tests.toArray()) || [];
  const coachings = useLiveQuery(() => db.coachings.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const globalTags = useLiveQuery(() => db.tags.toArray()) || [];
  const allStatuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const allQuestions = useLiveQuery(() => db.questions.toArray()) || [];

  const [sortKey, setSortKey] = useState<'date' | 'accuracy' | 'score' | 'coaching' | 'subject' | 'type' | 'time'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const [filterCoaching, setFilterCoaching] = useState<number[]>([]);
  const [filterSubject, setFilterSubject] = useState<number[]>([]);
  const [filterTestType, setFilterTestType] = useState<number[]>([]);
  const [filterAccuracy, setFilterAccuracy] = useState<'all' | 'lt25' | 'lt50' | 'gt75' | 'gt90' | 'custom'>('all');
  const [customAccuracy, setCustomAccuracy] = useState<{ op: 'lt' | 'gt' | 'eq', val: number | '' }>({ op: 'gt', val: '' });
  const [filterImportant, setFilterImportant] = useState<boolean | 'all'>('all');
  const [filterTag, setFilterTag] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<number[]>([]);
  const [viewingQuestion, setViewingQuestion] = useState<any>(null);

  const testIdToTags = useMemo(() => {
    const map = new Map<number, Set<number>>();
    allQuestions.forEach(q => {
      if (!map.has(q.testId)) map.set(q.testId, new Set());
      q.tagIds?.forEach(t => map.get(q.testId)!.add(t));
    });
    return map;
  }, [allQuestions]);

  const testIdToStatuses = useMemo(() => {
    const map = new Map<number, Set<number>>();
    allQuestions.forEach(q => {
      if (!map.has(q.testId)) map.set(q.testId, new Set());
      q.statusIds?.forEach(s => map.get(q.testId)!.add(s));
    });
    return map;
  }, [allQuestions]);

  const clearFilters = () => {
    setFilterCoaching([]);
    setFilterSubject([]);
    setFilterTestType([]);
    setFilterAccuracy('all');
    setFilterImportant('all');
    setFilterTag([]);
    setFilterStatus([]);
    setSortKey('date');
    setSortOrder('desc');
  };

  const filteredTests = useMemo(() => {
    return allTests.filter(t => {
      if (filterCoaching.length > 0 && !filterCoaching.includes(t.coachingId)) return false;
      if (filterSubject.length > 0 && (!t.subjectId || !filterSubject.includes(t.subjectId))) return false;
      if (filterTestType.length > 0 && !filterTestType.includes(t.testTypeId)) return false;
      if (filterImportant !== 'all') {
        const isImp = !!t.isImportant;
        if (filterImportant !== isImp) return false;
      }
      
      if (filterAccuracy !== 'all') {
        const acc = (t.marksObtained / t.maxMarks) * 100;
        if (filterAccuracy === 'lt25' && acc >= 25) return false;
        if (filterAccuracy === 'lt50' && acc >= 50) return false;
        if (filterAccuracy === 'gt75' && acc <= 75) return false;
        if (filterAccuracy === 'gt90' && acc <= 90) return false;
        if (filterAccuracy === 'custom' && customAccuracy.val !== '') {
          const v = Number(customAccuracy.val);
          if (customAccuracy.op === 'lt' && acc >= v) return false;
          if (customAccuracy.op === 'gt' && acc <= v) return false;
          if (customAccuracy.op === 'eq' && Math.round(acc) !== Math.round(v)) return false;
        }
      }
      
      if (filterTag.length > 0) {
        const tags = testIdToTags.get(t.id!);
        const testTags = t.tagIds || [];
        const hasQuestionTag = tags ? filterTag.some(ft => tags.has(ft)) : false;
        const hasTestTag = filterTag.some(ft => testTags.includes(ft));
        if (!hasQuestionTag && !hasTestTag) return false;
      }
      
      if (filterStatus.length > 0) {
        const statuses = testIdToStatuses.get(t.id!);
        if (!statuses) return false;
        if (!filterStatus.some(fs => statuses.has(fs))) return false;
      }

      return true;
    });
  }, [allTests, filterCoaching, filterSubject, filterTestType, filterImportant, filterAccuracy, filterTag, filterStatus, testIdToTags, testIdToStatuses]);

  const sortedTests = useMemo(() => {
    const getCoachingName = (id: number) => coachings.find(c => c.id === id)?.name || '';
    const getSubjectName = (id?: number) => subjects.find(c => c.id === id)?.name || '';
    const getTestTypeName = (id: number) => testTypes.find(c => c.id === id)?.name || '';
    
    const parseTime = (timeStr?: string) => {
      if (!timeStr) return 0;
      let mins = 0;
      const hMatch = timeStr.match(/(\d+)\s*h/i);
      const mMatch = timeStr.match(/(\d+)\s*m/i);
      if (hMatch) mins += parseInt(hMatch[1]) * 60;
      if (mMatch) mins += parseInt(mMatch[1]);
      return mins;
    };

    return [...filteredTests].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date':
          cmp = a.createdAt - b.createdAt;
          break;
        case 'accuracy':
          const accA = a.marksObtained / a.maxMarks;
          const accB = b.marksObtained / b.maxMarks;
          cmp = accA - accB;
          break;
        case 'score':
          cmp = a.marksObtained - b.marksObtained;
          break;
        case 'coaching':
          cmp = getCoachingName(a.coachingId).localeCompare(getCoachingName(b.coachingId));
          break;
        case 'subject':
          cmp = getSubjectName(a.subjectId).localeCompare(getSubjectName(b.subjectId));
          break;
        case 'type':
          cmp = getTestTypeName(a.testTypeId).localeCompare(getTestTypeName(b.testTypeId));
          break;
        case 'time':
          cmp = parseTime(a.timeTaken) - parseTime(b.timeTaken);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredTests, sortKey, sortOrder, coachings, subjects, testTypes]);

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

  
  const filteredQuestions = useMemo(() => {
    if (filterTag.length === 0 && filterStatus.length === 0) return [];
    return allQuestions.filter(q => {
      const hasTag = filterTag.length > 0 && filterTag.some(ft => q.tagIds?.includes(ft));
      const hasStatus = filterStatus.length > 0 && filterStatus.some(fs => q.statusIds?.includes(fs));
      
      if (filterTag.length > 0 && filterStatus.length > 0) return hasTag && hasStatus;
      if (filterTag.length > 0) return hasTag;
      if (filterStatus.length > 0) return hasStatus;
      return false;
    });
  }, [allQuestions, filterTag, filterStatus]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Test Dashboard</h1>
          <div className="px-3 py-1.5 rounded-full glass-card border border-white/10 text-xs sm:text-sm font-medium text-surface-300 whitespace-nowrap">
            {sortedTests.length} Tests
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button 
            onClick={() => setFilterImportant(prev => prev === true ? 'all' : true)}
            className={cn("px-4 py-2.5 rounded-xl border transition-all text-sm font-bold flex items-center gap-2", filterImportant === true ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "glass-card border-white/10 text-surface-300 hover:text-white hover:bg-surface-800")}
          >
            <Star className={cn("w-4 h-4", filterImportant === true && "fill-current")} /> Starred
          </button>
          <button 
            onClick={clearFilters} 
            className="px-4 py-2.5 rounded-xl border glass-card border-white/10 text-surface-300 hover:text-white hover:bg-surface-800 transition-all text-sm font-bold flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Clear
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={cn(
              "px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all w-full sm:w-auto text-sm", 
              showFilters ? "bg-primary-500 text-white border-primary-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "glass-card border-white/10 text-surface-300 hover:text-white"
            )}
          >
            <Filter className="w-4 h-4" /> Filters & Sort
          </button>
        </div>
      </div>

      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 border border-white/10 shadow-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-50">
          {/* Sort */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Sort & Order</label>
            <select 
              value={`${sortKey}-${sortOrder}`} 
              onChange={e => {
                const [key, order] = e.target.value.split('-');
                setSortKey(key as any);
                setSortOrder(order as any);
              }} 
              className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-500 h-10"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="accuracy-desc">Most Accurate (Highest %)</option>
              <option value="accuracy-asc">Least Accurate (Lowest %)</option>
              <option value="score-desc">Highest Scored (Max Marks)</option>
              <option value="score-asc">Lowest Scored (Min Marks)</option>
              <option value="time-desc">Longest Time Taken</option>
              <option value="time-asc">Shortest Time Taken</option>
              <option value="coaching-asc">Coaching (A-Z)</option>
              <option value="subject-asc">Subject (A-Z)</option>
              <option value="type-asc">Test Type (A-Z)</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Filter: Accuracy</label>
            <div className="flex gap-2">
              <select value={filterAccuracy} onChange={e => setFilterAccuracy(e.target.value as any)} className="flex-1 bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-500 h-10">
                <option value="all">Any Accuracy</option>
                <option value="lt25">&lt; 25%</option>
                <option value="lt50">&lt; 50%</option>
                <option value="gt75">&gt; 75%</option>
                <option value="gt90">&gt; 90%</option>
                <option value="custom">Custom...</option>
              </select>
              {filterAccuracy === 'custom' && (
                <div className="flex gap-1 flex-1">
                  <select 
                    value={customAccuracy.op} 
                    onChange={e => setCustomAccuracy({...customAccuracy, op: e.target.value as any})}
                    className="w-16 bg-surface-900 border border-white/10 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-primary-500 h-10"
                  >
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">=</option>
                  </select>
                  <input 
                    type="number" 
                    placeholder="%"
                    value={customAccuracy.val}
                    onChange={e => setCustomAccuracy({...customAccuracy, val: e.target.value ? Number(e.target.value) : ''})}
                    className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-500 h-10 placeholder:text-surface-500"
                  />
                </div>
              )}
            </div>
          </div>


          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Filter: Coaching</label>
            <MultiSelect 
              values={filterCoaching as number[]} 
              onChange={(v: any) => setFilterCoaching(v as number[])} 
              options={coachings.map(c => ({ value: c.id!, label: c.name }))}
              placeholder="Any Coaching"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Filter: Subject</label>
            <MultiSelect 
              values={filterSubject as number[]} 
              onChange={(v: any) => setFilterSubject(v as number[])} 
              options={subjects.map(c => ({ value: c.id!, label: c.name }))}
              placeholder="Any Subject"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Filter: Test Type</label>
            <MultiSelect 
              values={filterTestType as number[]} 
              onChange={(v: any) => setFilterTestType(v as number[])} 
              options={testTypes.map(c => ({ value: c.id!, label: c.name }))}
              placeholder="Any Type"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Contains Tag</label>
            <MultiSelect 
              values={filterTag as number[]} 
              onChange={(v: any) => setFilterTag(v as number[])} 
              options={globalTags.map(c => ({ value: c.id!, label: `#${c.name}` }))}
              placeholder="Any Tag"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Contains Status</label>
            <MultiSelect 
              values={filterStatus as number[]} 
              onChange={(v: any) => setFilterStatus(v as number[])} 
              options={allStatuses.map(c => ({ value: c.id!, label: c.name }))}
              placeholder="Any Status"
            />
          </div>
        </motion.div>
      )}

      {sortedTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
          <div className="w-20 h-20 glass-card rounded-3xl flex items-center justify-center">
            <Search className="w-10 h-10 text-surface-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-surface-50 tracking-tight">No Tests Found</h3>
            <p className="text-surface-400 mt-2">Try adjusting your filters, or add a new test.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedTests.map((test: any) => {
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
                  {test.isImportant && (
                    <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-xl">
                      <Star className="w-4 h-4" fill="currentColor" />
                    </div>
                  )}
                  {/* Trash Button */}
                  <button 
                    onClick={(e) => handleDelete(e, test.id!)}
                    className="p-2.5 bg-red-500/90 hover:bg-red-500 text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-0 group-hover:delay-[1000ms]"
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
                    <div className="flex flex-wrap gap-2 mt-1">
                      {subjectName && (
                        <span className="inline-block self-start text-[10px] font-bold uppercase tracking-wider text-surface-300 bg-surface-800/80 px-2.5 py-1 rounded-md border border-white/5">
                          {subjectName}
                        </span>
                      )}
                      {test.tagIds?.map((tagId: number) => {
                        const tag = globalTags.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <span 
                            key={tagId} 
                            className="inline-block self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                            style={{ backgroundColor: tag.color ? tag.color + '20' : 'rgba(99,102,241,0.1)', color: tag.color || '#818cf8', border: `1px solid ${tag.color ? tag.color + '40' : 'rgba(99,102,241,0.2)'}` }}
                          >
                            #{tag.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <CircularProgress percentage={percentage} />
                </div>

                <div className="mt-auto z-10 pt-5 border-t border-white/5 flex items-center justify-between text-sm font-medium text-surface-400 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-surface-800/50 px-3 py-1.5 rounded-lg">{test.marksObtained} / {test.maxMarks}</span>
                    <span className="bg-surface-800/50 px-3 py-1.5 rounded-lg">{test.questionsCount} Qs</span>
                  </div>
                  <span className="text-xs font-bold text-surface-500 bg-surface-900/50 px-2 py-1.5 rounded-lg whitespace-nowrap">
                    {new Date(test.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {test.timeTaken && ` • ${test.timeTaken}`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredQuestions.length > 0 && (
        <div className="pt-10 border-t border-white/10 mt-10">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Matching Questions</h2>
            <div className="px-3 py-1 rounded-full bg-surface-800 border border-white/5 text-xs font-bold text-surface-300">
              {filteredQuestions.length} Found
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredQuestions.map((q: any) => {
              const test = allTests.find(t => t.id === q.testId);
              const testTitle = test ? `${getCoachingName(test.coachingId)} - ${getTestTypeName(test.testTypeId)}` : 'Unknown Test';
              return (
                <div key={q.id} onClick={() => setViewingQuestion(q)} className="cursor-pointer glass-card rounded-2xl p-5 border border-white/5 hover:border-primary-500/30 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-bold text-primary-400 bg-primary-500/10 px-2 py-1 rounded">Q{q.questionNumber}</span>
                    <span className="text-xs font-medium text-surface-400 truncate text-right flex-1">{testTitle}</span>
                  </div>
                  
                  {/* Statuses and Tags */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {q.statusIds?.map((sid: number) => {
                      const status = allStatuses.find(s => s.id === sid);
                      if (!status) return null;
                      return (
                        <span key={sid} className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40` }}>
                          {status.name}
                        </span>
                      );
                    })}
                    {q.tagIds?.map((tid: number) => {
                      const tag = globalTags.find(t => t.id === tid);
                      if (!tag) return null;
                      return (
                        <span 
                          key={tid} 
                          className="text-[10px] font-bold px-2 py-1 rounded-md"
                          style={{ backgroundColor: tag.color ? tag.color + '20' : 'var(--tw-colors-surface-800)', color: tag.color || 'var(--tw-colors-surface-300)', border: `1px solid ${tag.color ? tag.color + '40' : 'rgba(255,255,255,0.1)'}` }}
                        >
                          #{tag.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewingQuestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 backdrop-blur-xl bg-surface-950/80">
          <div className="relative w-full max-w-5xl h-full max-h-full flex flex-col bg-surface-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-4 border-b border-white/10 bg-surface-900/50 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setViewingQuestion(null)}
                  className="p-2.5 bg-surface-800 hover:bg-surface-700 text-white rounded-xl shadow-sm border border-white/5 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-white text-lg tracking-tight">Question {viewingQuestion.questionNumber}</span>
              </div>
              <button 
                onClick={() => setViewingQuestion(null)}
                className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white rounded-xl shadow-sm border border-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-surface-950/50">
              <QuestionDetailPane question={viewingQuestion} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReviewTest: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const testId = Number(searchParams.get('testId'));
  
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'viewer'>('editor');
  const [showTestTags, setShowTestTags] = useState(false);
  
  // Data Fetching
  const test = useLiveQuery(() => testId ? db.tests.get(testId) : undefined, [testId]);
  const questions = useLiveQuery(() => testId ? db.questions.where('testId').equals(testId).toArray() : [], [testId]) || [];
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const globalTags = useLiveQuery(() => db.tags.toArray()) || [];
  const allTopics = useLiveQuery(() => db.topics.toArray()) || [];
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
        
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-30 border-b border-white/5">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <button onClick={() => setSearchParams({})} className="p-2 bg-surface-800 hover:bg-surface-700 rounded-xl text-surface-300 hover:text-white transition-colors shadow-sm shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h2 className={cn("font-bold text-white tracking-tight leading-tight break-words", testTitle.length > 40 ? "text-sm" : testTitle.length > 22 ? "text-base" : "text-xl")}>{testTitle}</h2>
                {test?.link && (
                  <a 
                    href={test.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-1.5 bg-surface-800 hover:bg-surface-700 text-primary-400 rounded-lg transition-colors shadow-sm shrink-0"
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
          </div>
          
          {test && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <div className="relative">
                <button
                  onClick={() => setShowTestTags(!showTestTags)}
                  className={cn(
                    "p-2.5 h-10 rounded-xl transition-all shadow-sm flex items-center justify-center border gap-2",
                    test.tagIds && test.tagIds.length > 0
                      ? "bg-primary-500/20 text-primary-400 border-primary-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                      : "bg-surface-800 border-white/5 text-surface-400 hover:text-white hover:bg-surface-700"
                  )}
                  title="Tag Test"
                >
                  <Tag className="w-5 h-5" />
                  {test.tagIds && test.tagIds.length > 0 && (
                    <span className="text-xs font-bold">{test.tagIds.length}</span>
                  )}
                </button>
                
                {showTestTags && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTestTags(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#0B0F19] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[100] p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                      <div className="px-2 py-1.5 text-xs font-bold text-surface-400 uppercase tracking-widest border-b border-white/5 mb-1">
                        Select Tags
                      </div>
                      {globalTags.map(tag => {
                        const isSelected = test.tagIds?.includes(tag.id!);
                        return (
                          <button
                            key={tag.id}
                            onClick={async () => {
                              const current = test.tagIds || [];
                              const next = isSelected 
                                ? current.filter(id => id !== tag.id)
                                : [...current, tag.id!];
                              await db.tests.update(test.id!, { tagIds: next });
                            }}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left hover:-translate-y-0.5 hover:shadow-md",
                              isSelected 
                                ? "bg-primary-500/20 text-primary-300 hover:bg-primary-500/30" 
                                : "text-surface-300 hover:text-white hover:bg-surface-800"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: tag.color || '#818cf8' }} 
                              />
                              {tag.name}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-primary-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await db.tests.update(test.id!, { isImportant: !test.isImportant });
                }}
                className={cn(
                  "p-2.5 h-10 w-10 rounded-xl transition-all shadow-sm flex items-center justify-center border",
                  test.isImportant 
                    ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
                    : "bg-surface-800 border-white/5 text-surface-400 hover:text-white hover:bg-surface-700"
                )}
                title="Mark Test as Important"
              >
                <Star className="w-5 h-5" fill={test.isImportant ? "currentColor" : "none"} />
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 relative z-20 flex gap-2">
          <div className="relative group flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-surface-400 group-focus-within:text-primary-400 transition-colors" />
            <Input className="pl-10 h-10 bg-surface-800/50 border-transparent focus:bg-surface-800 focus:border-primary-500/50 rounded-xl w-full text-sm placeholder:text-surface-500 shadow-inner" placeholder="Search..." />
          </div>
          <button
            onClick={() => setViewMode(m => m === 'editor' ? 'viewer' : 'editor')}
            className={cn(
              "px-3 h-10 rounded-xl border transition-all flex items-center justify-center gap-2 shrink-0 font-bold text-sm",
              viewMode === 'viewer' 
                ? "bg-primary-500 text-white border-primary-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                : "bg-surface-800/50 text-surface-400 border-transparent hover:border-white/10 hover:text-white hover:bg-surface-800"
            )}
            title={viewMode === 'editor' ? 'Switch to Viewer Mode' : 'Switch to Editor Mode'}
          >
            {viewMode === 'viewer' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          {questions.map((q) => {
            const primaryStatusId = q.statusIds?.find(id => {
              const name = statusMap[id]?.name?.toLowerCase();
              return name === 'correct' || name === 'incorrect' || name === 'left out';
            });
            const primaryStatus = primaryStatusId ? statusMap[primaryStatusId] : (q.statusIds?.[0] ? statusMap[q.statusIds[0]] : null);

            if (viewMode === 'viewer') {
              const isActive = selectedQuestionId === q.id;
              let title = `Question ${q.questionNumber}`;
              if (q.customTitle) {
                const stripped = q.customTitle.replace(/^question\s+(?:number\s+)?\d+[\s-:]*/i, '');
                if (stripped) {
                  title = `${title} ${stripped}`;
                }
              }
              const sId = q.subjectId || test?.subjectId;
              const subjectName = sId ? subjects.find(s => s.id === sId)?.name : null;
              const topicName = q.topicIds?.[0] ? allTopics.find(t => t.id === q.topicIds![0])?.name : undefined;
              
              return (
                <button 
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id!)}
                  className={cn(
                    "w-full text-left bg-surface-900/50 p-4 rounded-2xl border flex flex-col gap-3 transition-all group",
                    isActive ? "border-primary-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] bg-surface-800/80 scale-[1.02]" : "border-white/5 hover:bg-surface-800 hover:border-white/10 hover:scale-[1.01] shadow-lg"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                    <div className="flex flex-col gap-2">
                      <h1 className={cn("text-sm sm:text-base font-bold truncate max-w-[200px]", isActive ? "text-primary-300" : "text-white group-hover:text-primary-200 transition-colors")}>
                        {title}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        {subjectName && (
                          <span className="text-xs font-bold text-primary-300 bg-primary-500/10 px-2 py-1 rounded-md border border-primary-500/20">
                            {subjectName}
                          </span>
                        )}
                        {topicName && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            {topicName}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {q.statusIds && q.statusIds.length > 0 && (
                        <div className="flex bg-surface-950/80 p-1 rounded-lg border border-white/5">
                          {q.statusIds.map(sid => {
                            const s = statusMap[sid];
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
                      {q.isFavorite && (
                        <div className="p-1.5 rounded-xl text-yellow-500 bg-yellow-500/10 shrink-0 ml-1">
                          <Star className="w-4 h-4" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            }

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
          <motion.div key={`${selectedQuestion.id}-${viewMode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto pb-20 relative z-10">
            {viewMode === 'viewer' ? (
              <>
                <div className="bg-surface-900/50 p-5 rounded-[2rem] border border-white/5 shadow-lg flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {(() => {
                        const sId = selectedQuestion.subjectId || test?.subjectId;
                        const subjectName = sId ? subjects.find(s => s.id === sId)?.name : null;
                        return subjectName ? (
                          <span className="text-xs font-bold text-primary-300 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 shadow-inner">
                            {subjectName}
                          </span>
                        ) : null;
                      })()}
                      <h1 className="text-lg md:text-xl font-bold text-white break-words leading-snug">
                        {selectedQuestion.customTitle || `Question ${selectedQuestion.questionNumber}`}
                      </h1>
                      {selectedQuestion.topicIds?.[0] && (() => {
                        const topic = allTopics.find(t => t.id === selectedQuestion.topicIds![0]);
                        return topic ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-inner">
                            {topic.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
                      {selectedQuestion.tagIds?.map(tid => {
                        const t = globalTags.find(tag => tag.id === tid);
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
                      {selectedQuestion.statusIds && selectedQuestion.statusIds.length > 0 && (
                        <div className="flex bg-surface-950/80 p-1 rounded-xl border border-white/5 shadow-inner">
                          {selectedQuestion.statusIds.map(sid => {
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
                      )}
                      {selectedQuestion.isFavorite && (
                        <div className={cn("p-2 rounded-xl transition-all shadow-sm shrink-0", "text-yellow-500 bg-yellow-500/10")}>
                          <Star className="w-5 h-5" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-surface-950/30 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-2 sm:p-4 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
                  <QuestionDetailPane question={selectedQuestion} />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
