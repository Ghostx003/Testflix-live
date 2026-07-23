import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Activity, Flame, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CalendarStatsProps {
  tests: any[];
  currentMonthDates: Date[];
}

export const CalendarStats: React.FC<CalendarStatsProps> = ({ tests, currentMonthDates }) => {
  const stats = useMemo(() => {
    let totalTests = 0;
    let totalScore = 0;
    let totalMaxScore = 0;
    let activeDays = 0;
    let maxStreak = 0;
    let totalMinutes = 0;

    const testCountsByDate = new Map<string, number>();

    tests.forEach(t => {
      totalTests++;
      totalScore += t.marksObtained || 0;
      totalMaxScore += t.maxMarks || 0;
      
      const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
      testCountsByDate.set(dateStr, (testCountsByDate.get(dateStr) || 0) + 1);

      if (t.timeTaken) {
        const timeStr = t.timeTaken.toLowerCase();
        if (timeStr.includes('min')) {
          const match = timeStr.match(/(\d+)/);
          if (match) totalMinutes += parseInt(match[1], 10);
        } else if (timeStr.includes('h')) {
          const match = timeStr.match(/(\d+)/);
          if (match) totalMinutes += parseInt(match[1], 10) * 60;
        }
      }
    });

    activeDays = testCountsByDate.size;
    const avgScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    const sortedDates = Array.from(testCountsByDate.keys()).sort();
    
    let tempStreak = 0;
    let lastDate: Date | null = null;
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(date.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
      lastDate = date;
    }

    return {
      totalTests,
      avgScore: Math.round(avgScore),
      activeDays,
      maxStreak,
      totalMinutes
    };
  }, [tests, currentMonthDates]);

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const statCards = [
    { label: "Total Tests", value: stats.totalTests, icon: Target, color: "text-blue-400 border-blue-500/30 bg-blue-500/15 shadow-[0_0_15px_rgba(59,130,246,0.2)]" },
    { label: "Average Score", value: `${stats.avgScore}%`, icon: Activity, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
    { label: "Longest Streak", value: `${stats.maxStreak} Days`, icon: Flame, color: "text-amber-400 border-amber-500/30 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.2)]" },
    { label: "Active Days", value: stats.activeDays, icon: CalendarIcon, color: "text-purple-400 border-purple-500/30 bg-purple-500/15 shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
    { label: "Total Time", value: formatTime(stats.totalMinutes), icon: Clock, color: "text-pink-400 border-pink-500/30 bg-pink-500/15 shadow-[0_0_15px_rgba(236,72,153,0.2)]" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 w-full">
      {statCards.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="relative overflow-hidden bg-gradient-to-br from-surface-900/90 via-surface-900/60 to-surface-950/90 backdrop-blur-xl p-4 sm:p-5 rounded-2xl flex flex-col items-start justify-between space-y-3 border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:-translate-y-0.5 group"
        >
          <div className="pointer-events-none absolute -top-10 -right-10 w-20 h-20 bg-white/[0.03] rounded-full blur-xl group-hover:bg-white/[0.06] transition-colors" />
          <div className="flex items-center justify-between w-full relative z-10">
            <span className="text-[11px] font-black uppercase tracking-widest text-surface-400 group-hover:text-surface-300 transition-colors truncate">{stat.label}</span>
            <div className={cn("p-2 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-110", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm relative z-10">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
};
