import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const Welcome: React.FC = () => {
  const [name, setName] = useState('');
  const [_, setUserProfile] = useLocalStorage('userProfile', { name: '', isFirstTime: true, hasCompletedSetup: false });
  const navigate = useNavigate();

  const handleContinue = () => {
    if (name.trim()) {
      setUserProfile((prev: any) => ({ ...prev, name: name.trim() }));
      navigate('/setup');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold tracking-tight text-primary-600 dark:text-primary-500"
          >
            Welcome to TestFlix
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg text-surface-600 dark:text-surface-400"
          >
            Your premium test analysis companion.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-6 pt-8"
        >
          <div className="space-y-2 text-left">
            <label htmlFor="name" className="text-sm font-medium ml-1">
              What should we call you?
            </label>
            <Input 
              id="name"
              type="text" 
              placeholder="Enter your name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              autoFocus
            />
          </div>
          
          <Button 
            onClick={handleContinue} 
            disabled={!name.trim()}
            className="w-full"
            size="lg"
          >
            Get Started
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
