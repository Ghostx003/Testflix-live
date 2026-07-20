import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { db } from '../services/db';
import { importDatabase } from '../services/backup';
import { Upload, X } from 'lucide-react';

export const SetupWizard: React.FC = () => {
  const [userProfile, setUserProfile] = useLocalStorage('userProfile', { name: '', isFirstTime: true, hasCompletedSetup: false });
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<0 | 1 | 2>(0);
  
  // Step 1: Coachings
  const [coachingInput, setCoachingInput] = useState('');
  const [coachings, setCoachings] = useState<string[]>([]);
  
  // Step 2: Test Types
  const [testTypeInput, setTestTypeInput] = useState('');
  const [testTypes, setTestTypes] = useState<string[]>([]);

  const handleAddCoaching = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && coachingInput.trim()) {
      if (!coachings.includes(coachingInput.trim())) {
        setCoachings([...coachings, coachingInput.trim()]);
      }
      setCoachingInput('');
    }
  };

  const handleRemoveCoaching = (name: string) => {
    setCoachings(coachings.filter(c => c !== name));
  };

  const handleAddTestType = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && testTypeInput.trim()) {
      if (!testTypes.includes(testTypeInput.trim())) {
        setTestTypes([...testTypes, testTypeInput.trim()]);
      }
      setTestTypeInput('');
    }
  };

  const handleRemoveTestType = (name: string) => {
    setTestTypes(testTypes.filter(c => c !== name));
  };

  const handleCompleteSetup = async () => {
    // Save to Dexie
    if (coachings.length > 0) {
      await db.coachings.bulkAdd(coachings.map(name => ({ name })));
    }
    if (testTypes.length > 0) {
      await db.testTypes.bulkAdd(testTypes.map(name => ({ name })));
    }
    
    // Default statuses
    const defaultStatuses = [
      { name: 'Correct', color: '#10b981', isOutcome: true },
      { name: 'Incorrect', color: '#ef4444', isOutcome: true },
      { name: 'Left Out', color: '#6b7280', isOutcome: true },
      { name: 'Doubt', color: '#f59e0b', isOutcome: false },
    ];
    await db.statuses.bulkAdd(defaultStatuses);

    setUserProfile({ ...userProfile, isFirstTime: false, hasCompletedSetup: true });
    navigate('/app');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importDatabase(file);
        setUserProfile({ ...userProfile, isFirstTime: false, hasCompletedSetup: true });
        alert("Database imported successfully! Refreshing app...");
        window.location.reload();
      } catch (error) {
        alert("Failed to import database");
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const renderStep0 = () => (
    <motion.div 
      key="step0"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold">Welcome, {userProfile.name}</h2>
      <p className="text-surface-600 dark:text-surface-400">Is this your first time setting up the application?</p>
      
      <div className="grid gap-4 sm:grid-cols-2 mt-8">
        <Button size="lg" onClick={() => setStep(1)} className="h-32 flex flex-col gap-2 bg-primary-50 text-primary-900 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:hover:bg-primary-900/40">
          <span className="text-xl">Yes</span>
          <span className="text-sm font-normal opacity-80">Start fresh setup</span>
        </Button>
        
        <Button size="lg" variant="outline" className="h-32 flex flex-col gap-2" onClick={handleImportClick}>
          <Upload className="w-6 h-6" />
          <span className="text-lg">No, restore backup</span>
        </Button>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
    </motion.div>
  );

  const renderStep1 = () => (
    <motion.div 
      key="step1"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold">Coaching Institutes</h2>
        <p className="text-surface-600 dark:text-surface-400 mt-2">Which coaching institutes are you enrolled in? Press Enter to add.</p>
      </div>
      
      <div className="space-y-4">
        <Input 
          placeholder="e.g., PW, Unacademy, Made Easy" 
          value={coachingInput}
          onChange={(e) => setCoachingInput(e.target.value)}
          onKeyDown={handleAddCoaching}
          autoFocus
        />
        
        <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-surface-100 dark:bg-surface-800 rounded-xl">
          <AnimatePresence>
            {coachings.map(c => (
              <motion.span 
                key={c}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface-700 rounded-lg text-sm font-medium shadow-sm"
              >
                {c}
                <button onClick={() => handleRemoveCoaching(c)} className="opacity-50 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
              </motion.span>
            ))}
          </AnimatePresence>
          {coachings.length === 0 && (
            <span className="text-surface-400 dark:text-surface-500 m-auto text-sm">No coachings added yet</span>
          )}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button onClick={() => setStep(2)}>Continue</Button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      key="step2"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold">Types of Tests</h2>
        <p className="text-surface-600 dark:text-surface-400 mt-2">What types of tests do you take? Press Enter to add.</p>
      </div>
      
      <div className="space-y-4">
        <Input 
          placeholder="e.g., Subject-wise, Full-Length" 
          value={testTypeInput}
          onChange={(e) => setTestTypeInput(e.target.value)}
          onKeyDown={handleAddTestType}
          autoFocus
        />
        
        <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-surface-100 dark:bg-surface-800 rounded-xl">
          <AnimatePresence>
            {testTypes.map(c => (
              <motion.span 
                key={c}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface-700 rounded-lg text-sm font-medium shadow-sm"
              >
                {c}
                <button onClick={() => handleRemoveTestType(c)} className="opacity-50 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
              </motion.span>
            ))}
          </AnimatePresence>
          {testTypes.length === 0 && (
            <span className="text-surface-400 dark:text-surface-500 m-auto text-sm">No test types added yet</span>
          )}
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
        <Button onClick={handleCompleteSetup}>Complete Setup</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-surface-900 border border-border-color rounded-3xl p-8 sm:p-12 shadow-[var(--shadow)]">
        <AnimatePresence mode="wait">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </AnimatePresence>
      </div>
    </div>
  );
};
