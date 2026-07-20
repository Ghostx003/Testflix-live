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
    { label: "Total Tests", value: stats.totalTests, icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Average Score", value: `${stats.avgScore}%`, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Longest Streak", value: `${stats.maxStreak} Days`, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Active Days", value: stats.activeDays, icon: CalendarIcon, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Total Time", value: formatTime(stats.totalMinutes), icon: Clock, color: "text-pink-400", bg: "bg-pink-500/10" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
      {statCards.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-4 rounded-2xl flex flex-col items-center text-center justify-center space-y-2 border border-white/5"
        >
          <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-white">{stat.value}</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-surface-400">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
};
