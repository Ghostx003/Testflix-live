import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeatmapProps {
  year: number;
  month: number;
  monthName: string;
  tests: any[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: Date, tests: any[]) => void;
  getTestDetails: (test: any) => { coachingName: string; subjectName: string; typeName: string };
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ 
  year, 
  month, 
  monthName,
  tests, 
  onPrevMonth,
  onNextMonth,
  onDayClick, 
  getTestDetails 
}) => {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weeks = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const testsByDate = new Map<string, any[]>();
    tests.forEach(t => {
      const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
      if (!testsByDate.has(dateStr)) testsByDate.set(dateStr, []);
      testsByDate.get(dateStr)!.push(t);
    });

    const weeksArray = [];
    let currentWeek = new Array(7).fill(null);
    
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay(); // 0 is Sunday
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const dayTests = testsByDate.get(dateStr) || [];
      
      let intensityClass = "bg-[#161b22] hover:bg-[#1f2937] ring-1 ring-white/5"; // No tests (Level 0)
      
      if (dayTests.length === 1) intensityClass = "bg-[#0e4429] hover:bg-[#115835]";
      else if (dayTests.length >= 2 && dayTests.length <= 3) intensityClass = "bg-[#006d32] hover:bg-[#00823c]";
      else if (dayTests.length >= 4 && dayTests.length <= 5) intensityClass = "bg-[#26a641] hover:bg-[#2ebc4f]";
      else if (dayTests.length >= 6) intensityClass = "bg-[#39d353] hover:bg-[#4be066] shadow-[0_0_10px_rgba(57,211,83,0.3)]";

      currentWeek[dayOfWeek] = {
        type: 'day',
        id: dateStr,
        date,
        day: i,
        tests: dayTests,
        intensityClass,
      };
      
      // If it's Saturday or the last day of the month, push the week and start a new one
      if (dayOfWeek === 6 || i === lastDayOfMonth.getDate()) {
        weeksArray.push(currentWeek);
        currentWeek = new Array(7).fill(null);
      }
    }

    return weeksArray;
  }, [year, month, tests]);

  const renderTooltip = (day: any) => {
    if (!day || day.type === 'empty') return null;

    const totalTests = day.tests.length;
    let totalScore = 0;
    let totalMaxScore = 0;
    day.tests.forEach((t: any) => {
      totalScore += t.marksObtained || 0;
      totalMaxScore += t.maxMarks || 0;
    });
    const avgScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    return (
      <AnimatePresence>
        {hoveredDate?.getTime() === day.date.getTime() && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-[#1e293b] backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-4 z-50 pointer-events-none flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-sm font-bold text-white">
                {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {totalTests > 0 && (
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                  {Math.round(avgScore)}% Avg
                </span>
              )}
            </div>

            {totalTests === 0 ? (
              <p className="text-xs text-surface-400 font-medium">No tests taken.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">{totalTests} Tests</p>
                <div className="space-y-2 max-h-40 overflow-hidden">
                  {day.tests.slice(0, 3).map((test: any, idx: number) => {
                    const { coachingName, subjectName, typeName } = getTestDetails(test);
                    const percentage = Math.round((test.marksObtained / test.maxMarks) * 100);
                    return (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <div className="text-[10px] font-bold text-surface-300 leading-tight truncate">
                          {coachingName} • {subjectName ? `${subjectName} • ` : ''}{typeName}
                        </div>
                        <div className="text-xs font-black text-white">{percentage}%</div>
                      </div>
                    );
                  })}
                  {day.tests.length > 3 && (
                    <div className="text-xs text-surface-500 font-medium pt-1">
                      + {day.tests.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-[#1e293b]" />
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="flex justify-center w-full">
      <div className="bg-[#0d1117] rounded-[24px] p-6 md:p-8 border border-white/5 shadow-2xl inline-block max-w-full overflow-x-auto">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8 space-y-2">
          <h2 className="text-xl font-bold text-white tracking-wide">Test Activity</h2>
          <div className="flex items-center gap-6">
            <button 
              onClick={onPrevMonth}
              className="p-1 text-surface-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white tracking-wide min-w-[100px] text-center">
              {monthName}
            </span>
            <button 
              onClick={onNextMonth}
              className="p-1 text-surface-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Heatmap Layout: Days on Y-axis, Weeks on X-axis */}
        <div className="flex gap-2">
          {/* Y-axis Day Labels */}
          <div className="grid grid-rows-7 gap-2">
            {dayNames.map(day => (
              <div key={day} className="text-[11px] font-semibold text-surface-400 h-10 w-8 sm:h-12 sm:w-10 flex items-center justify-end pr-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* X-axis Weeks */}
          <div className="flex gap-2">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-2">
                {week.map((dayObj, dIdx) => (
                  <div key={dIdx} className="relative">
                    {dayObj ? (
                      <button
                        onMouseEnter={() => setHoveredDate(dayObj.date)}
                        onMouseLeave={() => setHoveredDate(null)}
                        onClick={() => onDayClick(dayObj.date, dayObj.tests)}
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-[4px] sm:rounded-md transition-colors duration-200 block",
                          dayObj.intensityClass
                        )}
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12" />
                    )}
                    {dayObj && renderTooltip(dayObj)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-8 flex items-center justify-end gap-2 text-[11px] font-semibold text-surface-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3.5 h-3.5 rounded-sm bg-[#161b22] ring-1 ring-white/5" title="0 tests" />
            <div className="w-3.5 h-3.5 rounded-sm bg-[#0e4429]" title="1 test" />
            <div className="w-3.5 h-3.5 rounded-sm bg-[#006d32]" title="2-3 tests" />
            <div className="w-3.5 h-3.5 rounded-sm bg-[#26a641]" title="4-5 tests" />
            <div className="w-3.5 h-3.5 rounded-sm bg-[#39d353]" title="6+ tests" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
