import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '../components/cbt/Header';
import { QuestionMetaGrid } from '../components/cbt/QuestionMetaGrid';
import { QuestionView } from '../components/cbt/QuestionView';
import { ActionFooter } from '../components/cbt/ActionFooter';
import { Sidebar } from '../components/cbt/Sidebar';
import { PracticePerformance } from '../components/cbt/PracticePerformance';

export const PracticeTest: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const id = Number(sessionId);

  const session = useLiveQuery(() => db.practiceSessions.get(id), [id]);
  const questions = useLiveQuery(async () => {
    if (!session) return [];
    const qIds = session.responses.map(r => r.questionId);
    const qs = await db.questions.where('id').anyOf(qIds).toArray();
    // Maintain order
    return qIds.map(id => qs.find(q => q.id === id)).filter(Boolean);
  }, [session]);

  const [activeIndex, setActiveIndex] = useState(0);
  // Local state for the current response to avoid frequent DB writes on every keystroke/radio click
  const [localResponse, setLocalResponse] = useState<any>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const timeRef = useRef<() => number>(() => session?.timeElapsed || 0);

  // Sync local response when changing questions
  React.useEffect(() => {
    const fetchAndMarkVisited = async () => {
      if (session && session.responses[activeIndex]) {
        let currentResponse = session.responses[activeIndex];
        
        if (currentResponse.status === 'not_visited') {
          currentResponse = { ...currentResponse, status: 'not_answered' };
          setLocalResponse(currentResponse);
          
          const newResponses = [...session.responses];
          newResponses[activeIndex] = currentResponse;
          await db.practiceSessions.update(id, { responses: newResponses });
        } else {
          setLocalResponse(currentResponse);
        }
      }
    };
    fetchAndMarkVisited();
  }, [activeIndex, session]);

  if (!session || !questions || questions.length === 0) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Loading Test...</div>;
  }

  const currentQuestion = questions[activeIndex];
  const totalQuestions = session.responses.length;

  const saveCurrentResponseToDB = async (overrideStatus?: 'answered' | 'review' | 'pending') => {
    if (!localResponse) return;
    const newResponses = [...session.responses];
    let status = overrideStatus || localResponse.status;
    
    if (!overrideStatus) {
      const hasAnswer = (localResponse.selectedOptions && localResponse.selectedOptions.length > 0) || 
                        (localResponse.numericalAnswer !== undefined && localResponse.numericalAnswer !== null && localResponse.numericalAnswer.toString() !== '');
      status = hasAnswer ? 'answered' : 'not_answered';
    } else if (overrideStatus === 'review') {
      const hasAnswer = (localResponse.selectedOptions && localResponse.selectedOptions.length > 0) || 
                        (localResponse.numericalAnswer !== undefined && localResponse.numericalAnswer !== null && localResponse.numericalAnswer.toString() !== '');
      status = hasAnswer ? 'answered_review' : 'review';
    }

    // Auto grading
    let isCorrect = false;
    const qOptions = currentQuestion?.selectedOptions || [];
    const rOptions = localResponse.selectedOptions || [];

    if (currentQuestion?.optionsType === 'NAT') {
      isCorrect = currentQuestion.numericalAnswer !== undefined && currentQuestion.numericalAnswer === localResponse.numericalAnswer;
    } else if (qOptions.length > 1) {
      if (qOptions.length > 0 && rOptions.length === qOptions.length) {
        isCorrect = qOptions.every(opt => rOptions.includes(opt));
      }
    } else {
      if (qOptions.length > 0 && rOptions.length > 0) {
        isCorrect = qOptions[0] === rOptions[0];
      }
    }

    let negativeMark = 0;
    if (currentQuestion?.optionsType !== 'NAT' && session.allowNegativeMarking) {
      negativeMark = -0.33;
    }

    newResponses[activeIndex] = {
      ...localResponse,
      status,
      isCorrect,
      marks: (status === 'answered' || status === 'answered_review') ? (isCorrect ? 1 : negativeMark) : 0
    };

    await db.practiceSessions.update(id, { 
      responses: newResponses,
      timeElapsed: timeRef.current()
    });
  };

  const handleSaveNext = async () => {
    await saveCurrentResponseToDB();
    if (activeIndex < totalQuestions - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  const handleMarkReview = async () => {
    await saveCurrentResponseToDB('review');
    if (activeIndex < totalQuestions - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  const handleClear = async () => {
    const updated = { ...localResponse, selectedOptions: [], numericalAnswer: undefined, status: 'not_answered' };
    setLocalResponse(updated);
    const newResponses = [...session.responses];
    newResponses[activeIndex] = { ...updated, marks: 0 };
    await db.practiceSessions.update(id, { responses: newResponses });
  };

  const handlePrevious = async () => {
    await saveCurrentResponseToDB();
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  const handleNavigate = async (index: number) => {
    await saveCurrentResponseToDB();
    setActiveIndex(index);
  };

  const handleSubmit = async () => {
    await saveCurrentResponseToDB();
    
    // Re-fetch latest to calculate final score
    const finalSession = await db.practiceSessions.get(id);
    if (finalSession) {
      let totalMarks = 0;
      finalSession.responses.forEach(r => {
        if (r.status === 'answered' || r.status === 'answered_review') {
          totalMarks += r.marks || 0;
        }
      });
      await db.practiceSessions.update(id, { 
        status: 'Completed', 
        marksObtained: totalMarks,
        timeElapsed: timeRef.current()
      });
    }
    
    setShowSubmitModal(true);
  };

  const handleQuit = async () => {
    await saveCurrentResponseToDB();
    navigate('/app/practice');
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'not_visited': return 'Not Visited';
      case 'not_answered': return 'Not Answered';
      case 'answered': return 'Answered';
      case 'review': return 'Marked for Review';
      case 'answered_review': return 'Answered & Marked for Review';
      default: return 'Not Visited';
    }
  };

  if (session.status === 'Completed' && !showSubmitModal) {
    return <PracticePerformance session={session} questions={questions as any[]} onBack={() => navigate('/app/practice')} />;
  }

  return (
    <>
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-900 font-sans relative">
      <Header 
        title={session.name}
        initialTimeElapsed={session.timeElapsed} 
        timeLimit={session.timeLimit}
        onTimeUpdateRef={timeRef}
        onSubmit={handleSubmit}
        onBack={() => setShowQuitModal(true)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Pane (Question Area) */}
        <div className="flex-[3] flex flex-col gap-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <QuestionMetaGrid 
            subjectName={session.name}
            questionNumberText={`Q.${activeIndex + 1} of ${totalQuestions}`}
            typeText={`${currentQuestion?.optionsType === 'NAT' ? 'NAT' : ((currentQuestion?.selectedOptions && currentQuestion.selectedOptions.length > 1) ? 'MSQ' : 'MCQ')} | +1 / ${currentQuestion?.optionsType === 'NAT' ? '0' : (session.allowNegativeMarking ? '-0.33' : '0')}`}
            statusText={formatStatus(localResponse?.status || 'not_visited')}
          />
          <QuestionView 
            question={currentQuestion}
            response={localResponse}
            onResponseChange={(val) => setLocalResponse({ ...localResponse, selectedOptions: val })}
            onNumericalChange={(val) => setLocalResponse({ ...localResponse, numericalAnswer: val })}
            questionNumber={activeIndex + 1}
          />
          <ActionFooter 
            onPrevious={handlePrevious}
            onClear={handleClear}
            onReview={handleMarkReview}
            onSaveNext={handleSaveNext}
            disablePrevious={activeIndex === 0}
          />
        </div>
        
        {/* Right Pane (Sidebar) */}
        <div className="flex-[1] min-w-[300px] flex flex-col gap-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Sidebar 
            questionsCount={totalQuestions}
            responses={session.responses}
            activeIndex={activeIndex}
            onNavigate={handleNavigate}
          />
        </div>
      </div>

      {/* Quit Modal */}
      <AnimatePresence>
        {showQuitModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2">Pause Test?</h2>
              <p className="text-slate-400 mb-6 text-sm">Your progress is saved. You can resume this test anytime from the Practice Builder.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowQuitModal(false)} className="px-6 py-2 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleQuit} className="px-6 py-2 rounded-xl font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors">Yes, Pause</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Submit Success Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Test Submitted!</h2>
              <p className="text-slate-400 mb-8">Your responses have been saved and evaluated.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={() => setShowSubmitModal(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-500/20">See Performance</button>
                 <button onClick={() => navigate('/app/practice')} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">Back to Practice</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};
