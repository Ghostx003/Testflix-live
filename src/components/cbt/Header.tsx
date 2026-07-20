import React, { useEffect, useState } from 'react';


export interface HeaderProps {
  initialTimeElapsed: number;
  timeLimit?: number;
  onTimeUpdateRef: React.MutableRefObject<() => number>;
  onSubmit: () => void;
  onBack?: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ initialTimeElapsed, timeLimit, onTimeUpdateRef, onSubmit, onBack }) => {
  const [time, setTime] = useState(initialTimeElapsed);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => {
        const newTime = prev + 1;
        if (timeLimit && newTime >= timeLimit) {
          clearInterval(timer);
          setTimeout(() => onSubmit(), 0);
          return timeLimit;
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLimit, onSubmit]);

  useEffect(() => {
    onTimeUpdateRef.current = () => time;
  }, [time, onTimeUpdateRef]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLimit && (timeLimit - time) <= 300; // 5 mins left

  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700 bg-slate-900 shrink-0">
      <div className="w-1/4 flex items-center justify-start">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-md border border-slate-700 hover:border-slate-600 transition-colors">
            <span className="text-sm font-semibold">Back</span>
          </button>
        )}
      </div>
      <div className="flex gap-3 justify-center items-center">
        <div className={`px-4 py-1 rounded-md border-t-2 flex flex-col items-center justify-center leading-tight transition-colors ${isWarning ? 'bg-red-900/40 border-red-500' : 'bg-slate-800 border-blue-500'}`}>
          <span className={`text-[10px] uppercase ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>
            {timeLimit ? 'TIME LEFT' : 'TIME ELAPSED'}
          </span>
          <span className={`text-lg font-bold font-mono ${isWarning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeLimit ? formatTime(Math.max(0, timeLimit - time)) : formatTime(time)}
          </span>
        </div>
      </div>
      <div className="w-1/4 flex items-center justify-end">
        <button onClick={onSubmit} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md text-sm transition-colors font-bold shadow-lg shadow-orange-500/20">
          Submit Test
        </button>
      </div>
    </div>
  );
};
