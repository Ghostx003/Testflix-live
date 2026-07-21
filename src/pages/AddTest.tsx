import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ChevronRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export const AddTest: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form State
  const [coachingId, setCoachingId] = useState<number | ''>('');
  const [testTypeId, setTestTypeId] = useState<number | ''>('');
  const [subjectId, setSubjectId] = useState<number | 'none'>('none');
  const [newSubject, setNewSubject] = useState('');
  const [topicId, setTopicId] = useState<number | ''>('');
  const [newTopic, setNewTopic] = useState('');
  
  const [questionsCount, setQuestionsCount] = useState<number | ''>('');
  const [maxMarks, setMaxMarks] = useState<number | ''>('');
  const [marksObtained, setMarksObtained] = useState<number | ''>('');
  const [timeTaken, setTimeTaken] = useState('');
  const [timeUnit, setTimeUnit] = useState('mins');
  const [timeLimit, setTimeLimit] = useState('');
  const [timeLimitUnit, setTimeLimitUnit] = useState('mins');
  const [link, setLink] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  
  // Date and Time of giving the test
  const [testDate, setTestDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // DB Data
  const coachings = useLiveQuery(() => db.coachings.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const topics = useLiveQuery(() => db.topics.toArray()) || [];
  const tags = useLiveQuery(() => db.tags.toArray()) || [];

  const handleNext = () => {
    const selectedTestType = testTypes.find(t => t.id === testTypeId);
    const isNotDependent = testTypeId ? (!selectedTestType?.isFullyDependent && !selectedTestType?.isPartiallyDependent) : false;
    
    if (step === 1 && isNotDependent) {
      setStep(3); // Skip subject step entirely
    } else {
      setStep(s => s + 1);
    }
  };
  
  const handleBack = () => {
    const selectedTestType = testTypes.find(t => t.id === testTypeId);
    const isNotDependent = testTypeId ? (!selectedTestType?.isFullyDependent && !selectedTestType?.isPartiallyDependent) : false;
    
    if (step === 3 && isNotDependent) {
      setStep(1); // Skip subject step entirely going backwards
    } else {
      setStep(s => s - 1);
    }
  };

  const handleCreateSubject = async () => {
    if (newSubject.trim()) {
      const id = await db.subjects.add({ name: newSubject.trim() });
      setSubjectId(id as number);
      setNewSubject('');
    }
  };

  const handleCreateTopic = async () => {
    if (newTopic.trim() && subjectId && subjectId !== 'none') {
      const id = await db.topics.add({ 
        name: newTopic.trim(),
        subjectId: Number(subjectId)
      });
      setTopicId(id as number);
      setNewTopic('');
    }
  };

  const handleGenerateTest = async () => {
    if (coachingId && testTypeId && questionsCount && maxMarks && marksObtained !== '') {
      // 1. Create Test Record
      const testId = (await db.tests.add({
        coachingId: Number(coachingId),
        testTypeId: Number(testTypeId),
        subjectId: subjectId && subjectId !== 'none' ? Number(subjectId) : undefined,
        topicId: topicId !== '' ? Number(topicId) : undefined,
        questionsCount: Number(questionsCount),
        maxMarks: Number(maxMarks),
        marksObtained: Number(marksObtained),
        timeTaken: timeTaken.trim() ? `${timeTaken.trim()} ${timeUnit}` : undefined,
        timeLimit: timeLimit.trim() ? `${timeLimit.trim()} ${timeLimitUnit}` : undefined,
        link: link.trim() || undefined,
        createdAt: new Date(testDate).getTime(),
        tagIds: selectedTagIds
      })) as number;

      const questionsToInsert = Array.from({ length: Number(questionsCount) }).map((_, i) => ({
        testId,
        questionNumber: i + 1,
        statusIds: [],
        tagIds: [],
        topicIds: topicId !== '' ? [Number(topicId)] : [],
        isFavorite: false,
        testDate: new Date(testDate).getTime()
      }));

      await db.questions.bulkAdd(questionsToInsert);

      // Redirect to the newly created test
      navigate(`/app/test-dashboard?testId=${testId}`);
    }
  };

  const labelClassName = "text-sm font-medium text-surface-300 mb-1 block";

  const renderStep1 = () => (
    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }} className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Add Test</h2>
        <p className="text-surface-400 mt-1">Select the fundamental details of your test.</p>
      </div>
      
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
          <label className={labelClassName}>Coaching Institute</label>
          <Select 
            value={coachingId}
            onChange={(val) => setCoachingId(val as number)}
            options={coachings.map(c => ({ value: c.id!, label: c.name }))}
            placeholder="Select a coaching"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <label className={labelClassName}>Test Type</label>
          <Select 
            value={testTypeId}
            onChange={(val) => setTestTypeId(val as number)}
            options={testTypes.map(c => ({ value: c.id!, label: c.name }))}
            placeholder="Select a test type"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
          <label className={labelClassName}>Date & Time of Test</label>
          <Input 
            type="datetime-local" 
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="dark:[color-scheme:dark]"
          />
        </motion.div>
      </div>

      <div className="pt-6 flex justify-end">
        <Button onClick={handleNext} disabled={!coachingId || !testTypeId || !testDate} variant="primary" size="lg" className="w-full sm:w-auto px-8">
          Next Step <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => {
    const selectedTestType = testTypes.find(t => t.id === testTypeId);
    const isFullyDependent = selectedTestType?.isFullyDependent;
    const isPartiallyDependent = selectedTestType?.isPartiallyDependent;
    const isNotDependent = !isFullyDependent && !isPartiallyDependent;

    return (
      <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }} className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Subject Selection</h2>
          <p className="text-surface-400 mt-1">
            {isFullyDependent 
              ? "This test type requires a primary subject." 
              : isPartiallyDependent 
                ? "You can optionally associate a subject with this test." 
                : "This test type is not dependent on a specific subject."}
          </p>
        </div>
        
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
            <label className={labelClassName}>Primary Subject {isPartiallyDependent && "(Optional)"}</label>
            <Select 
              value={subjectId}
              onChange={(val) => {
                setSubjectId(val as number | 'none');
                setTopicId('');
              }}
              options={[
                ...(!isFullyDependent ? [{ value: 'none', label: '-- None (Not Applicable) --' }] : []),
                ...subjects.map(c => ({ value: c.id!, label: c.name }))
              ]}
              placeholder="Select a subject"
              disabled={isNotDependent}
            />
          </motion.div>

          {subjectId && subjectId !== 'none' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
              <div className="space-y-2">
                <label className={labelClassName}>Primary Topic (Optional)</label>
                <Select 
                  value={topicId}
                  onChange={(val) => setTopicId(val as number | '')}
                  options={[
                    { value: '', label: '-- None --' },
                    ...topics.filter(t => t.subjectId === subjectId).map(t => ({ value: t.id!, label: t.name }))
                  ]}
                  placeholder="Select a topic (if entire test focuses on one)"
                />
              </div>
              <div className="flex gap-3 items-center">
                <Input 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Or create a new topic..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
                />
                <Button variant="outline" onClick={handleCreateTopic} disabled={!newTopic.trim()} className="h-11">Create Topic</Button>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-900 px-4 text-sm text-surface-500">OR</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
            <label className={labelClassName}>Create a new subject</label>
            <div className="flex gap-3 items-center">
              <Input 
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Enter subject name..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
              />
              <Button variant="outline" onClick={handleCreateSubject} disabled={!newSubject.trim()} className="h-11">Create</Button>
            </div>
          </motion.div>
        </div>

        <div className="pt-6 flex justify-between gap-4">
          <Button variant="ghost" onClick={handleBack} size="lg"><ArrowLeft className="mr-2 w-5 h-5" /> Back</Button>
          
          <div className="flex gap-4 flex-1 justify-end">
            {isPartiallyDependent && (
              <Button 
                onClick={() => {
                  setSubjectId('none');
                  handleNext();
                }} 
                variant="outline" 
                size="lg" 
                className="px-6"
              >
                Skip Subject
              </Button>
            )}
            <Button onClick={handleNext} disabled={isFullyDependent && (!subjectId || subjectId === 'none')} variant="primary" size="lg" className="px-8">
              Next Step <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderStep3 = () => (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }} className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Scores & Generation</h2>
        <p className="text-surface-400 mt-1">Enter your performance details to generate the review sheet.</p>
      </div>
      
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <label className={labelClassName}>Number of Questions</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[5, 10, 15, 20, 25, 30, 65].map(num => (
              <button
                key={num}
                onClick={() => setQuestionsCount(num)}
                className={cn(
                  "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border",
                  questionsCount === num 
                    ? "bg-primary-500/20 border-primary-500 text-primary-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                    : "bg-surface-800/50 border-white/5 text-surface-300 hover:bg-white/10 hover:border-white/20 hover:text-white"
                )}
              >
                {num} Qs
              </button>
            ))}
          </div>
          <Input 
            type="number"
            value={questionsCount}
            onChange={(e) => setQuestionsCount(Number(e.target.value) || '')}
            placeholder="Or enter custom amount..."
            min="1"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelClassName}>Maximum Marks</label>
            <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value) || '')} placeholder="e.g. 100" />
          </div>
          <div className="space-y-2">
            <label className={labelClassName}>Marks Obtained</label>
            <Input type="number" value={marksObtained} onChange={(e) => setMarksObtained(Number(e.target.value) || '')} placeholder="e.g. 85" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className={labelClassName}>Time Taken (Optional)</label>
              <div className="flex gap-2">
                <Input type="number" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value)} placeholder="e.g. 45" className="flex-1" />
                <select value={timeUnit} onChange={(e) => setTimeUnit(e.target.value)} className="bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 w-24">
                  <option value="mins">Mins</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClassName}>Out of Total Time (Optional)</label>
              <div className="flex gap-2">
                <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="e.g. 60" className="flex-1" />
                <select value={timeLimitUnit} onChange={(e) => setTimeLimitUnit(e.target.value)} className="bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 w-24">
                  <option value="mins">Mins</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelClassName}>Original Test Link (Optional)</label>
            <Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
          <label className={labelClassName}>Tags (Optional)</label>
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id!);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (isSelected) setSelectedTagIds(prev => prev.filter(id => id !== tag.id!));
                    else setSelectedTagIds(prev => [...prev, tag.id!]);
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2.5",
                    !isSelected && "bg-surface-800/50 hover:bg-surface-700/50 border-white/5"
                  )}
                  style={
                    isSelected 
                      ? { 
                          backgroundColor: `${tag.color || '#6366f1'}20`, 
                          borderColor: `${tag.color || '#6366f1'}50`, 
                          color: tag.color || '#818cf8',
                          boxShadow: `0 0 15px ${tag.color || '#6366f1'}15`
                        } 
                      : { color: '#a1a1aa' }
                  }
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color || '#6366f1', opacity: isSelected ? 1 : 0.6 }} />
                  {tag.name}
                </button>
              )
            })}
            {tags.length === 0 && <span className="text-xs text-surface-500">No tags available. Create tags during test review.</span>}
          </div>
        </motion.div>
      </div>

      <div className="pt-6 flex justify-between gap-4">
        <Button variant="ghost" onClick={handleBack} size="lg"><ArrowLeft className="mr-2 w-5 h-5" /> Back</Button>
        <Button onClick={handleGenerateTest} disabled={!questionsCount || !maxMarks || marksObtained === ''} variant="primary" size="lg" className="flex-1 sm:flex-none px-8">
          <CheckCircle2 className="mr-2 w-5 h-5" /> Save & Generate Test
        </Button>
      </div>
    </motion.div>
  );

    const selectedTestTypeForProgress = testTypes.find(t => t.id === testTypeId);
    const isNotDependentForProgress = testTypeId ? (!selectedTestTypeForProgress?.isFullyDependent && !selectedTestTypeForProgress?.isPartiallyDependent) : false;
    const activeSteps = isNotDependentForProgress ? [1, 3] : [1, 2, 3];
    const currentProgressIndex = activeSteps.indexOf(step);

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-10 px-4 sm:px-6 lg:px-8 w-full relative z-10">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="mb-10 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl mb-4 shadow-lg backdrop-blur-md">
          <CheckCircle2 className="w-8 h-8 text-primary-400" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">Add New Test</h1>
        <p className="text-lg text-surface-400 font-light">Record your test parameters and prepare for detailed analysis.</p>
      </div>

      <div className="glass-panel rounded-3xl md:rounded-[2.5rem] p-5 sm:p-8 md:p-12 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] z-10">
        {/* Step Indicator */}
        <div className="relative mb-12">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-800 -translate-y-1/2 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentProgressIndex / (activeSteps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
          <div className="relative flex justify-between">
            {activeSteps.map((i, index) => {
              const isActive = i === step;
              const isCompleted = step > i;
              const displayNum = index + 1; // Visually consecutive numbering
              return (
                <div key={i} className="flex flex-col items-center">
                  <motion.div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500",
                      isActive ? "bg-surface-900 border-primary-500 text-primary-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]" :
                      isCompleted ? "bg-primary-500 border-primary-500 text-white" :
                      "bg-surface-800 border-surface-700 text-surface-500"
                    )}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : displayNum}
                  </motion.div>
                  <span className={cn(
                    "absolute -bottom-6 text-xs font-medium transition-colors duration-300",
                    isActive ? "text-primary-400" : isCompleted ? "text-surface-300" : "text-surface-600"
                  )}>
                    {i === 1 ? 'Details' : i === 2 ? 'Subject' : 'Scores'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </AnimatePresence>
      </div>
    </div>
  );
};
