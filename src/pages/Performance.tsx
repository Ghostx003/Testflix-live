import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowRight, Award, BarChart3, Brain,
  ChevronDown, ChevronUp, Clock3, Flame, Gauge, Layers3,
  ShieldCheck, Target, Tags, TrendingDown,
  TrendingUp, Trophy, Zap, Calendar, X, Archive, EyeOff, ExternalLink
} from 'lucide-react';
import { db, type Question } from '../services/db';
import { cn } from '../utils/cn';
import { QuestionDetailPane } from './Bookmarks';

const EscapeHandler = ({ onEscape }: { onEscape: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
  return null;
};

type QuestionMetric = {
  question: Question;
  subjectId?: number;
  topicIds: number[];
  correct: boolean;
  incorrect: boolean;
  leftOut: boolean;
  doubt: boolean;
};

type Breakdown = {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  doubts: number;
  accuracy: number;
  averageTime: number;
  score: number;
  maxScore: number;
};

const percent = (value: number, total: number) => total ? (value / total) * 100 : 0;
const round = (value: number) => Math.round(value * 10) / 10;
const safeDate = (value: number) => new Date(value || Date.now());

const parseMinutes = (time?: string) => {
  if (!time) return 0;
  const value = time.toLowerCase().trim();
  const hours = Number(value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)/)?.[1] || 0);
  const minutes = Number(value.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute)/)?.[1] || 0);
  if (hours || minutes) return Math.round(hours * 60 + minutes);
  const standalone = Number(value.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  return Number.isFinite(standalone) ? standalone : 0;
};

const formatTime = (minutes: number) => {
  if (!minutes) return '—';
  if (minutes < 1) return '< 1 min';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours ? `${hours}h ${mins ? `${mins}m` : ''}` : `${mins} min`;
};

const formatPerQuestion = (minutes: number) => minutes ? `${minutes < 1 ? `${Math.round(minutes * 60)} sec` : `${round(minutes)} min`}/q` : '—';

const Trend = ({ value, compact = false }: { value: number; compact?: boolean }) => {
  const up = value >= 0;
  return <span className={cn('inline-flex items-center gap-1 font-bold', up ? 'text-emerald-400' : 'text-rose-400', compact ? 'text-xs' : 'text-sm')}>
    {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
    {up ? '+' : ''}{round(value)}%
  </span>;
};

const StatCard = ({ label, value, hint, icon: Icon, color = 'indigo' }: { label: string; value: string; hint: React.ReactNode; icon: React.ElementType; color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' }) => {
  const colors = {
    indigo: 'bg-primary-500/12 text-primary-300 border-primary-500/20',
    emerald: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/12 text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/12 text-rose-300 border-rose-500/20',
    sky: 'bg-sky-500/12 text-sky-300 border-sky-500/20'
  };
  return <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/8 min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-surface-500 truncate">{label}</p><p className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">{value}</p></div>
      <div className={cn('p-2.5 rounded-xl border shrink-0', colors[color])}><Icon className="w-5 h-5" /></div>
    </div>
    <div className="mt-3 text-xs text-surface-400 min-h-4">{hint}</div>
  </div>;
};

const ProgressBar = ({ value, color = 'bg-primary-400', className }: { value: number; color?: string; className?: string }) => <div className={cn('h-2 rounded-full overflow-hidden bg-white/6', className)}><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: .55 }} className={cn('h-full rounded-full', color)} /></div>;

const EmptyState = ({ title, message }: { title: string; message: string }) => <div className="py-14 px-6 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]"><BarChart3 className="w-9 h-9 mx-auto text-surface-600" /><h3 className="mt-3 font-bold text-surface-300">{title}</h3><p className="mt-1 text-sm text-surface-500 max-w-sm mx-auto">{message}</p></div>;

type DateRangeFilter = {
  type: 'all' | 'preset' | 'today' | 'month' | 'week' | 'custom';
  start?: number;
  end?: number;
  label: string;
};

const DateFilterModal = ({ isOpen, onClose, currentFilter, onApply, tests }: { isOpen: boolean, onClose: () => void, currentFilter: DateRangeFilter, onApply: (f: DateRangeFilter) => void, tests: any[] }) => {
  const [mode, setMode] = useState<DateRangeFilter['type']>(currentFilter.type);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');

  const activeMonths = useMemo(() => {
    const months = new Set<string>();
    tests.forEach(t => {
      const d = new Date(t.createdAt);
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(months).map(m => {
      const [y, mo] = m.split('-').map(Number);
      return new Date(y, mo, 1);
    }).sort((a, b) => b.getTime() - a.getTime());
  }, [tests]);

  if (!isOpen) return null;

  const handleApply = (f: DateRangeFilter) => { onApply(f); onClose(); };
  const getStartOfDay = (d = new Date()) => { d.setHours(0,0,0,0); return d.getTime(); };
  const getEndOfDay = (d = new Date()) => { d.setHours(23,59,59,999); return d.getTime(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-6 border border-white/10 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-surface-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-black text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-primary-400" /> Select Date Range</h2>
        <div className="mt-6 flex flex-col md:flex-row gap-6">
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 md:w-48 shrink-0">
            {(['all', 'today', 'week', 'month', 'preset', 'custom'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={cn('px-4 py-2.5 rounded-xl text-sm font-bold text-left transition-colors whitespace-nowrap', mode === m ? 'bg-primary-500 text-white' : 'bg-surface-800/50 text-surface-400 hover:text-white hover:bg-surface-700/50')}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            {mode === 'all' && (
              <div className="h-full flex flex-col justify-center items-center py-10 text-center"><button onClick={() => handleApply({ type: 'all', label: 'All time' })} className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 text-base">Apply</button></div>
            )}
            {mode === 'today' && (
              <div className="h-full flex flex-col justify-center items-center py-10 text-center"><button onClick={() => handleApply({ type: 'today', start: getStartOfDay(), end: getEndOfDay(), label: 'Today' })} className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 text-base">Apply</button></div>
            )}
            {mode === 'preset' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Last 7 Days', days: 7 },
                  { label: 'Last 30 Days', days: 30 },
                  { label: 'Last 3 Months', days: 90 },
                  { label: 'Last 6 Months', days: 180 }
                ].map(p => (
                  <button key={p.days} onClick={() => handleApply({ type: 'preset', start: p.days, label: p.label })} className="p-4 rounded-xl bg-surface-800/40 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/10 text-left transition-all">
                    <p className="font-bold text-white">{p.label}</p>
                  </button>
                ))}
              </div>
            )}
            {mode === 'month' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {activeMonths.map(d => {
                  const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                  return (
                    <button key={d.getTime()} onClick={() => {
                      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
                      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
                      handleApply({ type: 'month', start, end, label });
                    }} className="p-3 rounded-xl bg-surface-800/40 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/10 text-center transition-all">
                      <p className="font-bold text-white text-sm">{label}</p>
                    </button>
                  );
                })}
                {activeMonths.length === 0 && <p className="text-surface-500 text-sm col-span-full">No active months found.</p>}
              </div>
            )}
            {mode === 'week' && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => {
                    const d = new Date();
                    const day = d.getDay() || 7;
                    d.setDate(d.getDate() - day + 1);
                    const start = getStartOfDay(d);
                    const end = getEndOfDay(new Date(start + 6 * 86400000));
                    handleApply({ type: 'week', start, end, label: 'This Week' });
                  }} className="p-4 rounded-xl bg-surface-800/40 border border-white/5 hover:border-primary-500/30 text-center transition-all font-bold text-white">This Week</button>
                  <button onClick={() => {
                    const d = new Date();
                    const day = d.getDay() || 7;
                    d.setDate(d.getDate() - day - 6);
                    const start = getStartOfDay(d);
                    const end = getEndOfDay(new Date(start + 6 * 86400000));
                    handleApply({ type: 'week', start, end, label: 'Last Week' });
                  }} className="p-4 rounded-xl bg-surface-800/40 border border-white/5 hover:border-primary-500/30 text-center transition-all font-bold text-white">Last Week</button>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/30 border border-white/5 space-y-4">
                  <p className="text-sm font-bold text-surface-300">Custom Week</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-surface-500 block mb-1">Start Date</label><input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" style={{colorScheme: 'dark'}} /></div>
                    <div><label className="text-xs text-surface-500 block mb-1">End Date</label><input type="date" value={weekEnd} onChange={e => setWeekEnd(e.target.value)} className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" style={{colorScheme: 'dark'}} /></div>
                  </div>
                  <button disabled={!weekStart || !weekEnd} onClick={() => handleApply({ type: 'week', start: getStartOfDay(new Date(weekStart)), end: getEndOfDay(new Date(weekEnd)), label: 'Custom Week' })} className="w-full py-2.5 rounded-lg bg-primary-500 text-white font-bold disabled:opacity-50">Apply Custom Week</button>
                </div>
              </div>
            )}
            {mode === 'custom' && (
              <div className="pt-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-bold text-surface-300 block mb-2">Start Date</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-surface-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500" style={{colorScheme: 'dark'}} /></div>
                  <div><label className="text-sm font-bold text-surface-300 block mb-2">End Date</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-surface-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500" style={{colorScheme: 'dark'}} /></div>
                </div>
                <button disabled={!customStart || !customEnd} onClick={() => handleApply({ type: 'custom', start: getStartOfDay(new Date(customStart)), end: getEndOfDay(new Date(customEnd)), label: `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}` })} className="w-full py-3 rounded-xl bg-primary-500 text-white font-bold disabled:opacity-50">Apply Custom Range</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ImprovementGraph: React.FC<{ tests: any[], questions: any[], statuses: any[], coachings: any[], testTypes: any[], subjects: any[], topics: any[], onDataChange?: (stats: any) => void }> = ({ tests, questions, statuses, coachings, testTypes, subjects, topics, onDataChange }) => {
  const [days, setDays] = useState<number>(30);
  const [metric, setMetric] = useState<'accuracy' | 'time' | 'attempted' | 'incorrect'>('accuracy');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null);
  const [filterTopicId, setFilterTopicId] = useState<number | null>(null);
  const [filterTestTypeId, setFilterTestTypeId] = useState<number | null>(null);

  const { data, relevantTests } = useMemo(() => {
    let relevantTests = tests;
    if (days === -1) {
      const s = customStart ? new Date(customStart).getTime() : 0;
      const e = customEnd ? new Date(customEnd).getTime() + 86399999 : Date.now();
      relevantTests = tests.filter(t => t.createdAt >= s && t.createdAt <= e);
    } else {
      const cutoff = days === 0 ? 0 : Date.now() - days * 86400000;
      relevantTests = tests.filter(t => t.createdAt >= cutoff);
    }
    if (filterTestTypeId) {
      relevantTests = relevantTests.filter(t => t.testTypeId === filterTestTypeId);
    }
    relevantTests = relevantTests.sort((a, b) => a.createdAt - b.createdAt);
    const statusMap = new Map(statuses.map(s => [s.id!, s.name.toLowerCase()]));
    const typeMap = new Map(testTypes.map(t => [t.id!, t.name]));
    const coachingMap = new Map(coachings.map(c => [c.id!, c.name]));
    
    const testPoints = relevantTests.map(test => {
       let tqs = questions.filter(q => q.testId === test.id);
       
       if (filterSubjectId) {
          const subjectTopics = topics.filter(t => t.subjectId === filterSubjectId).map(t => t.id);
          tqs = tqs.filter(q => {
             if (test.subjectId === filterSubjectId) return true;
             if (q.subjectId === filterSubjectId) return true;
             if (q.topicIds?.some((tid: number) => subjectTopics.includes(tid))) return true;
             return false;
          });
       }
       if (filterTopicId) {
          tqs = tqs.filter(q => q.topicIds?.includes(filterTopicId));
       }
       
       let incorrect = 0, skipped = 0;
       tqs.forEach(q => {
         const names = q.statusIds?.map((id: number) => statusMap.get(id) || '') || [];
         if (names.includes('incorrect')) incorrect++;
         if (names.includes('left out')) skipped++;
       });
       
       const total = (filterSubjectId || filterTopicId) ? tqs.length : Math.max(Number(test.questionsCount) || 0, tqs.length);
       const attempted = total - skipped;
       const correct = Math.max(0, attempted - incorrect);
       const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
       
       const timeTakenMin = parseMinutes(test.timeTaken);
       const timePerQ = attempted > 0 ? timeTakenMin / (Number(test.questionsCount) || attempted) : 0;
       
       const title = `${coachingMap.get(test.coachingId) || 'Unknown'} - ${typeMap.get(test.testTypeId) || 'Test'}`;
       
       return {
         id: test.id,
         title,
         date: test.createdAt,
         accuracy,
         timePerQ,
         correct,
         attempted,
         incorrect,
         totalQs: total,
         value: metric === 'accuracy' ? accuracy : (metric === 'time' ? timePerQ : (metric === 'attempted' ? attempted : incorrect))
       };
    }).filter(d => d.totalQs > 0);

    const groupedByDay = new Map<number, any[]>();
    testPoints.forEach(p => {
       const day = new Date(p.date).setHours(0,0,0,0);
       if (!groupedByDay.has(day)) groupedByDay.set(day, []);
       groupedByDay.get(day)!.push(p);
    });

    const finalData = Array.from(groupedByDay.entries()).map(([day, points]) => {
       const sumAttempted = points.reduce((acc, p) => acc + p.attempted, 0);
       const sumCorrect = points.reduce((acc, p) => acc + p.correct, 0);
       const sumIncorrect = points.reduce((acc, p) => acc + p.incorrect, 0);
       
       const avgAccuracy = sumAttempted > 0 ? (sumCorrect / sumAttempted) * 100 : 0;
       
       const totalTime = points.reduce((acc, p) => acc + (p.timePerQ * p.attempted), 0);
       const avgTimePerQ = sumAttempted > 0 ? totalTime / sumAttempted : 0;

       let val = 0;
       if (metric === 'accuracy') val = avgAccuracy;
       if (metric === 'time') val = avgTimePerQ;
       if (metric === 'attempted') val = sumAttempted;
       if (metric === 'incorrect') val = sumIncorrect;

       return {
          id: `day-${day}`,
          title: `Daily Average (${points.length} test${points.length > 1 ? 's' : ''})`,
          date: day,
          accuracy: avgAccuracy,
          timePerQ: avgTimePerQ,
          correct: sumCorrect,
          attempted: sumAttempted,
          incorrect: sumIncorrect,
          totalQs: points.reduce((acc, p) => acc + p.totalQs, 0),
          value: val
       };
    }).sort((a, b) => a.date - b.date);
    
    return { data: finalData, relevantTests };
  }, [tests, questions, statuses, coachings, testTypes, days, metric, customStart, customEnd, filterSubjectId, filterTopicId, filterTestTypeId, topics]);

  useEffect(() => {
    if (onDataChange && data) {
       const sumAttempted = data.reduce((acc, d) => acc + d.attempted, 0);
       const sumCorrect = data.reduce((acc, d) => acc + d.correct, 0);
       const sumIncorrect = data.reduce((acc, d) => acc + d.incorrect, 0);
       const sumTotal = data.reduce((acc, d) => acc + d.totalQs, 0);
       const sumSkipped = sumTotal - sumAttempted;
       const accuracy = sumAttempted > 0 ? (sumCorrect / sumAttempted) * 100 : 0;
       const totalTime = data.reduce((acc, d) => acc + (d.timePerQ * d.attempted), 0);
       const averageTime = sumAttempted > 0 ? totalTime / sumAttempted : 0;

       onDataChange({
          correct: sumCorrect,
          incorrect: sumIncorrect,
          skipped: sumSkipped,
          total: sumTotal,
          accuracy,
          averageTime,
          filterSubjectId,
          relevantTests
       });
    }
  }, [data, relevantTests, filterSubjectId, onDataChange]);

  let graphColorStatus: 'red' | 'yellow' | 'green' = 'green';
  if (data.length > 0) {
    const latestValue = data[data.length - 1].value;
    if (metric === 'accuracy') {
       if (latestValue < 40) graphColorStatus = 'red';
       else if (latestValue < 70) graphColorStatus = 'yellow';
       else graphColorStatus = 'green';
    } else {
       const isPos = data.length > 1 
         ? (metric === 'attempted' ? latestValue >= data[0].value : latestValue <= data[0].value) 
         : true;
       graphColorStatus = isPos ? 'green' : 'red';
    }
  }

  const colorMap = {
    green: { stroke: '#10b981', gradient: { from: 'rgba(16, 185, 129, 0.4)', to: 'rgba(16, 185, 129, 0)' } },
    yellow: { stroke: '#eab308', gradient: { from: 'rgba(234, 179, 8, 0.4)', to: 'rgba(234, 179, 8, 0)' } },
    red: { stroke: '#f43f5e', gradient: { from: 'rgba(244, 63, 94, 0.4)', to: 'rgba(244, 63, 94, 0)' } },
  };

  const currentTheme = colorMap[graphColorStatus];
  const strokeColor = currentTheme.stroke;
  const gradientColors = currentTheme.gradient;

  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;
  const width = 800;
  const height = 240;
  const graphW = width - paddingLeft - paddingRight;
  const graphH = height - paddingTop - paddingBottom;

  let pointsStr = '';
  let pathStr = '';
  const points: any[] = [];
  
  let maxValue = 100;
  let minValue = 0;
  let minDate = 0;
  let maxDate = 0;
  let timeSpan = 86400000;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  if (data.length > 0) {
    maxDate = Math.max(...data.map(d => d.date));
    minDate = Math.min(...data.map(d => d.date));
    timeSpan = Math.max(maxDate - minDate, 86400000);
    
    maxValue = Math.max(...data.map(d => d.value));
    minValue = Math.min(...data.map(d => d.value));
    if (metric === 'accuracy') {
       maxValue = 100;
       minValue = Math.max(0, minValue - 10);
    } else {
       maxValue = Math.max(maxValue * 1.2, 5);
       minValue = 0;
    }
    const valSpan = Math.max(maxValue - minValue, 1);

    data.forEach((d) => {
      const x = paddingLeft + (data.length === 1 ? graphW / 2 : ((d.date - minDate) / timeSpan) * graphW);
      const y = paddingTop + graphH - ((d.value - minValue) / valSpan) * graphH;
      points.push({ x, y, ...d });
      pointsStr += `${x},${y} `;
    });

    pathStr = `M ${points[0].x} ${points[0].y} ` + points.map((p, i) => i === 0 ? '' : `L ${p.x} ${p.y}`).join(' ');
  }

  // formatValue intentionally kept for future tooltip usage

  let title = 'Custom Time Test Analysis';
  if (days === 7) title = 'Weekly Progress';
  if (days === 30) title = 'Monthly Progress';
  if (days === 90) title = 'Quarterly Progress';
  if (days === 180) title = 'Semi-Annual Progress';
  if (days === 0) title = 'All-Time Progress';

  const tabs = [
    { label: '1W', value: 7 },
    { label: '1M', value: 30 },
    { label: '3M', value: 90 },
    { label: '6M', value: 180 },
    { label: '1Y', value: 365 },
    { label: 'Max', value: 0 },
    { label: 'Custom', value: -1 }
  ];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    
    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHoveredIndex(closest);
  };

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 relative group flex flex-col h-full min-h-[350px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Long-term view</p>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <select
                value={metric}
                onChange={e => setMetric(e.target.value as any)}
                className="bg-surface-900/50 border border-white/10 rounded-xl pl-4 pr-9 py-2 text-sm font-bold text-white focus:outline-none appearance-none cursor-pointer hover:bg-surface-800/80 transition-colors"
              >
                <option value="accuracy" className="bg-surface-900 text-white">By Accuracy (Score)</option>
                <option value="time" className="bg-surface-900 text-white">By Avg Time per Q</option>
                <option value="attempted" className="bg-surface-900 text-white">By Questions Attempted</option>
                <option value="incorrect" className="bg-surface-900 text-white">By Incorrect Count</option>
              </select>
              <ChevronDown className="w-4 h-4 text-surface-400 absolute right-3 pointer-events-none" />
            </div>
            <div className="flex gap-1 bg-surface-900/50 p-1 rounded-xl border border-white/10">
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setDays(tab.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    days === tab.value ? "bg-white/10 text-white" : "text-surface-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {days === -1 && (
            <div className="flex items-center gap-2 bg-surface-900/50 px-2 py-1.5 rounded-xl border border-white/10">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-white text-xs px-2 py-1 focus:outline-none [color-scheme:dark]" />
              <span className="text-surface-500 text-xs font-bold uppercase">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-white text-xs px-2 py-1 focus:outline-none [color-scheme:dark]" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <div className="relative flex items-center">
              <select
                value={filterSubjectId || ''}
                onChange={e => {
                  setFilterSubjectId(e.target.value ? Number(e.target.value) : null);
                  setFilterTopicId(null);
                }}
                className="bg-surface-900/50 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-surface-200 focus:outline-none appearance-none cursor-pointer hover:bg-surface-800/80 transition-colors"
              >
                <option value="" className="bg-surface-900 text-surface-200">Any Subject</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id} className="bg-surface-900 text-white">{s.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-surface-400 absolute right-2 pointer-events-none" />
            </div>
            
            <div className="relative flex items-center">
              <select
                value={filterTopicId || ''}
                onChange={e => setFilterTopicId(e.target.value ? Number(e.target.value) : null)}
                disabled={!filterSubjectId}
                className="bg-surface-900/50 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-surface-200 focus:outline-none appearance-none cursor-pointer hover:bg-surface-800/80 transition-colors disabled:opacity-50"
              >
                <option value="" className="bg-surface-900 text-surface-200">Any Topic</option>
                {topics.filter((t: any) => t.subjectId === filterSubjectId).map((t: any) => <option key={t.id} value={t.id} className="bg-surface-900 text-white">{t.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-surface-400 absolute right-2 pointer-events-none" />
            </div>
            
            <div className="relative flex items-center">
              <select
                value={filterTestTypeId || ''}
                onChange={e => setFilterTestTypeId(e.target.value ? Number(e.target.value) : null)}
                className="bg-surface-900/50 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-surface-200 focus:outline-none appearance-none cursor-pointer hover:bg-surface-800/80 transition-colors"
              >
                <option value="" className="bg-surface-900 text-surface-200">Any Test Type</option>
                {testTypes.map((t: any) => <option key={t.id} value={t.id} className="bg-surface-900 text-white">{t.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-surface-400 absolute right-2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative w-full mt-2">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-surface-500 text-sm">No tests recorded in this period.</div>
        ) : (
          <div className="w-full h-full relative" onMouseLeave={() => setHoveredIndex(null)}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-full overflow-visible preserve-3d" 
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientColors.from} />
                  <stop offset="100%" stopColor={gradientColors.to} />
                </linearGradient>
              </defs>
              
              {/* Y-Axis Grid & Labels */}
              {yTicks.map(t => {
                const yPos = paddingTop + graphH - (t * graphH);
                const val = minValue + (t * (maxValue - minValue));
                return (
                  <g key={t}>
                    <line x1={paddingLeft} y1={yPos} x2={width-paddingRight} y2={yPos} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <text x={paddingLeft - 8} y={yPos + 4} fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold" textAnchor="end">
                      {metric === 'accuracy' ? Math.round(val) : Math.round(val * 10) / 10}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Labels (Min, Mid, Max Date) */}
              {[0, 0.5, 1].map(t => {
                if (data.length < 2 && t !== 0) return null;
                const d = new Date(minDate + t * timeSpan);
                // xPos was calculated for debugging: paddingLeft + t * graphH
                const actualX = paddingLeft + t * graphW;
                return (
                  <text key={t} x={actualX} y={height - 8} fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold" textAnchor="middle">
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </text>
                );
              })}

              {data.length > 0 && (
                <>
                  {/* Fill Area */}
                  {data.length > 1 && <polygon points={`${points[0].x},${paddingTop + graphH} ${pointsStr} ${points[points.length-1].x},${paddingTop + graphH}`} fill="url(#trendGradient)" />}
                  
                  {/* Line */}
                  <path d={pathStr} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Hover Crosshair & Point */}
                  {hoveredIndex !== null && points[hoveredIndex] && (
                    <g>
                      <line 
                        x1={points[hoveredIndex].x} 
                        y1={paddingTop} 
                        x2={points[hoveredIndex].x} 
                        y2={paddingTop + graphH} 
                        stroke="rgba(255,255,255,0.2)" 
                        strokeDasharray="4 4" 
                      />
                      <circle
                        cx={points[hoveredIndex].x}
                        cy={points[hoveredIndex].y}
                        r={5}
                        fill={strokeColor}
                        stroke="#0f172a"
                        strokeWidth="2"
                        className="drop-shadow-lg"
                      />
                    </g>
                  )}
                  
                  {/* Invisible overlay to catch mouse events */}
                  <rect x={paddingLeft} y={paddingTop} width={graphW} height={graphH} fill="transparent" />
                </>
              )}
            </svg>

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredIndex !== null && points[hoveredIndex] && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full pb-3"
                  style={{ 
                    left: `${(points[hoveredIndex].x / width) * 100}%`, 
                    top: `${(points[hoveredIndex].y / height) * 100}%` 
                  }}
                >
                  <div className="glass-card bg-surface-900 rounded-lg p-3 border border-white/10 shadow-2xl min-w-[140px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black" style={{ color: strokeColor }}>
                        {metric === 'accuracy' ? `${Math.round(points[hoveredIndex].value)}%` : (metric === 'time' ? Math.round(points[hoveredIndex].value * 10)/10 : Math.round(points[hoveredIndex].value))}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-surface-500">
                        {metric === 'accuracy' ? 'Score' : (metric === 'time' ? 'min/q' : (metric === 'attempted' ? 'attempted' : 'incorrect'))}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-surface-300 truncate max-w-[150px]">{points[hoveredIndex].title}</p>
                    <p className="text-[9px] text-surface-500 uppercase tracking-widest mt-1">
                      {new Date(points[hoveredIndex].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

const StickyNav = () => {
  return (
    <div className="sticky top-4 z-40 bg-surface-950/80 backdrop-blur-xl border border-white/10 rounded-full py-1.5 px-2 mb-8 mx-auto w-fit max-w-[95vw] justify-center flex gap-1.5 overflow-x-auto shadow-2xl [&::-webkit-scrollbar]:hidden">
      {[
        { id: 'per-test', label: 'Per-test analysis' },
        { id: 'deep-dive', label: 'Deep Dive' },
        { id: 'test-category', label: 'Test Category Analysis' },
        { id: 'strength-detector', label: 'Strength detector' },
        { id: 'subject-leaderboard', label: 'Subject leaderboard' },
        { id: 'topic-precision', label: 'Topic analysis' },
        { id: 'tag-analysis', label: 'Tag analysis' },
        { id: 'me-vs-me', label: 'Self-Performance Comparison' }
      ].map(link => (
        <a key={link.id} href={`#${link.id}`} className="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold text-surface-400 bg-surface-800/50 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all shadow-sm">
          {link.label}
        </a>
      ))}
    </div>
  );
};


const MeVsMeComparison: React.FC<{
  tests: any[];
  questions: any[];
  subjects: any[];
  topics: any[];
  testTypes: any[];
  statuses: any[];
}> = ({ tests, questions, subjects, topics, testTypes, statuses }) => {
  const [range1Type, setRange1Type] = useState<string>('this-month');
  const [range1Start, setRange1Start] = useState<string>('');
  const [range1End, setRange1End] = useState<string>('');

  const [range2Type, setRange2Type] = useState<string>('last-month');
  const [range2Start, setRange2Start] = useState<string>('');
  const [range2End, setRange2End] = useState<string>('');

  const [subjFilter, setSubjFilter] = useState<number | ''>('');
  const [topicFilter, setTopicFilter] = useState<number | ''>('');
  const [testTypeFilter, setTestTypeFilter] = useState<number | ''>('');

  const getDates = (type: string, startStr: string, endStr: string) => {
    const now = new Date();
    if (type === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return { start, end: start + 86400000 - 1 };
    }
    if (type === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      return { start, end: start + 86400000 - 1 };
    }
    if (type === 'this-week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
      return { start, end: start + 7 * 86400000 - 1 };
    }
    if (type === 'last-week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7).getTime();
      return { start, end: start + 7 * 86400000 - 1 };
    }
    if (type === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() + 86400000 - 1;
      return { start, end };
    }
    if (type === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), 0).getTime() + 86400000 - 1;
      return { start, end };
    }
    if (type === 'this-year') {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      const end = new Date(now.getFullYear() + 1, 0, 0).getTime() + 86400000 - 1;
      return { start, end };
    }
    if (type === 'last-year') {
      const start = new Date(now.getFullYear() - 1, 0, 1).getTime();
      const end = new Date(now.getFullYear(), 0, 0).getTime() + 86400000 - 1;
      return { start, end };
    }
    if (type === 'custom' && startStr && endStr) {
      return { start: new Date(startStr).getTime(), end: new Date(endStr).getTime() + 86400000 - 1 };
    }
    return { start: 0, end: Date.now() };
  };

  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id!, s.name.toLowerCase()])), [statuses]);

  const computeStats = (rType: string, rStart: string, rEnd: string) => {
    const { start, end } = getDates(rType, rStart, rEnd);
    let filteredTests = tests.filter(t => t.createdAt >= start && t.createdAt <= end);
    if (testTypeFilter !== '') {
      filteredTests = filteredTests.filter(t => t.testTypeId === testTypeFilter);
    }
    const testMap = new Map(filteredTests.map(t => [t.id!, t]));
    
    let filteredQs = questions.filter(q => testMap.has(q.testId));
    
    if (subjFilter !== '') {
      filteredQs = filteredQs.filter(q => (q.subjectId || testMap.get(q.testId)?.subjectId) === subjFilter);
    }
    if (topicFilter !== '') {
      filteredQs = filteredQs.filter(q => q.topicIds?.includes(topicFilter));
    }

    const metrics = filteredQs.map(question => {
      const names = question.statusIds.map((id: number) => statusMap.get(id) || '');
      return {
        correct: names.includes('correct'),
        incorrect: names.includes('incorrect'),
        leftOut: names.includes('left out'),
      };
    });

    const total = metrics.length;
    const skipped = metrics.filter(m => m.leftOut).length;
    const incorrect = metrics.filter(m => m.incorrect).length;
    const correct = metrics.filter(m => m.correct).length;
    const attempted = total - skipped;
    const accuracy = percent(correct, attempted);
    
    let timeSum = 0;
    if (attempted > 0) {
      const testIds = new Set(filteredQs.map(q => q.testId));
      testIds.forEach(tId => {
        const t = testMap.get(tId);
        if (t && t.timeTaken) {
          timeSum += parseMinutes(t.timeTaken);
        }
      });
    }
    const averageTime = attempted ? timeSum / attempted : 0;

    return { total, attempted, correct, incorrect, skipped, accuracy, averageTime };
  };

  const stat1 = computeStats(range1Type, range1Start, range1End);
  const stat2 = computeStats(range2Type, range2Start, range2End);

  const renderDropdown = (val: string, setVal: (v: string) => void) => (
    <select
      value={val}
      onChange={e => setVal(e.target.value)}
      className="bg-surface-950/80 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none shadow-sm cursor-pointer transition-all w-full"
      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A1A1AA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto', paddingRight: '2.5rem' }}
    >
      <optgroup label="Daily" className="bg-surface-900 text-white font-bold">
        <option value="today" className="bg-surface-900 text-white">Today</option>
        <option value="yesterday" className="bg-surface-900 text-white">Yesterday</option>
      </optgroup>
      <optgroup label="Weekly" className="bg-surface-900 text-white font-bold">
        <option value="this-week" className="bg-surface-900 text-white">This Week</option>
        <option value="last-week" className="bg-surface-900 text-white">Last Week</option>
      </optgroup>
      <optgroup label="Monthly" className="bg-surface-900 text-white font-bold">
        <option value="this-month" className="bg-surface-900 text-white">This Month</option>
        <option value="last-month" className="bg-surface-900 text-white">Last Month</option>
      </optgroup>
      <optgroup label="Yearly" className="bg-surface-900 text-white font-bold">
        <option value="this-year" className="bg-surface-900 text-white">This Year</option>
        <option value="last-year" className="bg-surface-900 text-white">Last Year</option>
      </optgroup>
      <option value="custom" className="bg-surface-900 text-emerald-400 font-bold">Custom Date Range...</option>
    </select>
  );

  const getDiffNode = (val1: number, val2: number, invertGood = false, isPercentage = false) => {
    const diff = val1 - val2;
    if (val2 === 0 && val1 === 0) return <span className="text-surface-500 text-xs font-black px-2 py-1 bg-surface-800/50 rounded-lg border border-white/5">FLAT</span>;
    if (val2 === 0) return <span className="text-primary-400 text-xs font-black px-2 py-1 bg-primary-500/10 rounded-lg border border-primary-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">NEW</span>;
    
    const change = isPercentage ? diff : (diff / val2 * 100);
    const absChange = Math.abs(change);
    const isPositive = diff > 0;
    
    let isGood = isPositive;
    if (invertGood) isGood = !isGood;
    if (diff === 0) return <span className="text-surface-500 text-xs font-black px-2 py-1 bg-surface-800/50 rounded-lg border border-white/5">FLAT</span>;

    return (
      <div className={cn("flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg border", 
        isGood ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
      )}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? '+' : '-'}{round(absChange)}{isPercentage ? '%' : '%'}
      </div>
    );
  };

  const renderStatCard = (title: string, val1: number, val2: number, suffix = '', invertGood = false, isPercentage = false) => {
    const max = Math.max(val1, val2);
    const p1 = max === 0 ? 0 : (val1 / max) * 100;
    const p2 = max === 0 ? 0 : (val2 / max) * 100;

    return (
      <div className="bg-gradient-to-br from-surface-900/60 to-surface-950/60 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] group hover:border-white/10 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400 group-hover:text-white transition-colors">{title}</h4>
          {getDiffNode(val1, val2, invertGood, isPercentage)}
        </div>
        
        <div className="flex items-end justify-between gap-6">
          {/* Period 2 (Comparison) */}
          <div className="flex-1 space-y-2.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="text-2xl font-black text-white">{round(val2)}{suffix}</div>
            <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full bg-surface-500 rounded-full transition-all duration-1000" style={{ width: `${p2}%` }} />
            </div>
            <div className="text-[9px] uppercase font-bold text-surface-500 tracking-wider">Comparison (P2)</div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[2px] h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {/* Period 1 (Current) */}
          <div className="flex-1 space-y-2.5">
            <div className="text-3xl font-black text-emerald-400 drop-shadow-md">{round(val1)}{suffix}</div>
            <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${p1}%` }} />
            </div>
            <div className="text-[9px] uppercase font-bold text-emerald-500/70 tracking-wider">Selected (P1)</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="me-vs-me" className="mt-12 relative overflow-hidden scroll-mt-24 pb-20">
      {/* Decorative Header */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
          <Activity className="w-4 h-4" /> Performance Analytics
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">ME <span className="text-surface-600">VS</span> ME</h2>
        <p className="text-surface-400 text-sm md:text-base font-medium">Hyper-analyze your progress across custom timeframes.</p>
      </div>

      {/* Global Filters */}
      <div className="bg-gradient-to-br from-surface-900/60 to-surface-950/60 backdrop-blur-xl p-5 rounded-[1.5rem] border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] mb-6 flex flex-wrap gap-4 items-center group hover:border-white/10 transition-colors">
        <div className="flex items-center gap-2 text-[10px] font-black text-surface-500 uppercase tracking-widest mr-2">
          <Layers3 className="w-3.5 h-3.5" /> Filters
        </div>
        
        <select 
          className="bg-surface-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-surface-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-white/20 transition-all cursor-pointer shadow-inner"
          value={subjFilter} onChange={e => { setSubjFilter(e.target.value ? Number(e.target.value) : ''); setTopicFilter(''); }}
        >
          <option value="" className="bg-surface-900 text-white">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id} className="bg-surface-900 text-white">{s.name}</option>)}
        </select>

        {subjFilter !== '' && (
          <select 
            className="bg-surface-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-surface-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-white/20 transition-all cursor-pointer shadow-inner max-w-[200px]"
            value={topicFilter} onChange={e => setTopicFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="" className="bg-surface-900 text-white">All Topics</option>
            {topics.filter(t => t.subjectId === subjFilter).map(t => <option key={t.id} value={t.id} className="bg-surface-900 text-white">{t.name}</option>)}
          </select>
        )}

        <select 
          className="bg-surface-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-surface-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-white/20 transition-all cursor-pointer shadow-inner"
          value={testTypeFilter} onChange={e => setTestTypeFilter(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="" className="bg-surface-900 text-white">All Test Types</option>
          {testTypes.map(t => <option key={t.id} value={t.id} className="bg-surface-900 text-white">{t.name}</option>)}
        </select>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        
        {/* Period Selectors */}
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-emerald-500/5 to-surface-900/60 backdrop-blur-xl border border-emerald-500/20 rounded-[1.5rem] p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <h3 className="text-[10px] uppercase tracking-widest font-black text-emerald-400 mb-4 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Selected Period (P1)</h3>
            <div className="flex flex-col gap-3">
              {renderDropdown(range1Type, setRange1Type)}
              {range1Type === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={range1Start} onChange={e => setRange1Start(e.target.value)} className="bg-surface-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 shadow-inner" style={{colorScheme:'dark'}} />
                  <input type="date" value={range1End} onChange={e => setRange1End(e.target.value)} className="bg-surface-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 shadow-inner" style={{colorScheme:'dark'}} />
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-surface-800/30 to-surface-900/60 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-surface-500"></div>
            <h3 className="text-[10px] uppercase tracking-widest font-black text-surface-400 mb-4 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Comparison Period (P2)</h3>
            <div className="flex flex-col gap-3">
              {renderDropdown(range2Type, setRange2Type)}
              {range2Type === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={range2Start} onChange={e => setRange2Start(e.target.value)} className="bg-surface-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-surface-500 shadow-inner" style={{colorScheme:'dark'}} />
                  <input type="date" value={range2End} onChange={e => setRange2End(e.target.value)} className="bg-surface-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-surface-500 shadow-inner" style={{colorScheme:'dark'}} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderStatCard('Accuracy', stat1.accuracy, stat2.accuracy, '%', false, true)}
          {renderStatCard('Avg Time / Q', stat1.averageTime, stat2.averageTime, 'm', true, false)}
          {renderStatCard('Volume (Attempted)', stat1.attempted, stat2.attempted, '', false, false)}
          {renderStatCard('Mistakes (Incorrect)', stat1.incorrect, stat2.incorrect, '', true, false)}
        </div>
      </div>
    </section>
  );
};

export const Performance: React.FC = () => {
  useNavigate(); // keep the hook call for router context
  const tests = useLiveQuery(() => db.tests.toArray()) || [];
  const questions = useLiveQuery(() => db.questions.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const topics = useLiveQuery(() => db.topics.toArray()) || [];
  const tags = useLiveQuery(() => db.tags.toArray()) || [];
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  const coachings = useLiveQuery(() => db.coachings.toArray()) || [];

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({ type: 'all', label: 'All time' });
  const [graphStats, setGraphStats] = useState<any>(null);
  const [distMode, setDistMode] = useState<'types' | 'topics'>('types');
  const [topicFilterSubject, setTopicFilterSubject] = useState<number | null>(null);
  const [topicSortCol, setTopicSortCol] = useState<string>('attempted');
  const [topicSortDir, setTopicSortDir] = useState<'asc' | 'desc'>('desc');
  const [subjectSortCol, setSubjectSortCol] = useState<string>('attempted');
  const [subjectSortDir, setSubjectSortDir] = useState<'asc' | 'desc'>('desc');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [subjectViewMode, setSubjectViewMode] = useState<'questions' | 'tests'>('questions');

  const [expandedTag, setExpandedTag] = useState<number | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<Question[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingQuestions(null);
      if (viewingQuestions) {
        if (e.key === 'ArrowLeft') setViewingIndex(i => Math.max(0, i - 1));
        if (e.key === 'ArrowRight') setViewingIndex(i => Math.min(viewingQuestions.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingQuestions]);

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  
  // Subject Level Focus state
  const [activeSubject, setActiveSubject] = useState<number | null>(null);
  const [subjectFocusTimeFilter, setSubjectFocusTimeFilter] = useState<'all'|'7'|'30'|'180'|'custom'>('all');
  const [subjectFocusCustomStart, setSubjectFocusCustomStart] = useState('');
  const [subjectFocusCustomEnd, setSubjectFocusCustomEnd] = useState('');
  const [subjectFocusTopic, setSubjectFocusTopic] = useState<number | null>(null);

  // New Per-test analysis filters
  const [perTestFilterCoaching, setPerTestFilterCoaching] = useState<number | null>(null);
  const [perTestFilterSubject, setPerTestFilterSubject] = useState<number | null>(null);
  const [perTestFilterType, setPerTestFilterType] = useState<number | null>(null);
  const [perTestFilterTopic, setPerTestFilterTopic] = useState<number | null>(null);

  const analytics = useMemo(() => {
    const selectedTests = tests.filter(test => {
      if (dateFilter.type === 'all') return true;
      if (dateFilter.type === 'preset' && dateFilter.start) {
        return test.createdAt >= Date.now() - dateFilter.start * 86400000;
      }
      if (dateFilter.type === 'today') {
        const d = new Date();
        d.setHours(0,0,0,0);
        const startOfDay = d.getTime();
        d.setHours(23,59,59,999);
        const endOfDay = d.getTime();
        return test.createdAt >= startOfDay && test.createdAt <= endOfDay;
      }
      if (dateFilter.start && dateFilter.end) {
        return test.createdAt >= dateFilter.start && test.createdAt <= dateFilter.end;
      }
      if (dateFilter.start) return test.createdAt >= dateFilter.start;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
    const selectedTestIds = new Set(selectedTests.map(t => t.id));
    const testMap = new Map(tests.map(t => [t.id!, t]));
    const subjectMap = new Map(subjects.map(s => [s.id!, s.name]));
    const topicMap = new Map(topics.map(t => [t.id!, t]));
    const statusMap = new Map(statuses.map(s => [s.id!, s.name.toLowerCase()]));
    const typeMap = new Map(testTypes.map(t => [t.id!, t.name]));
    const questionMetrics: QuestionMetric[] = questions.filter(q => selectedTestIds.has(q.testId)).map(question => {
      const names = question.statusIds.map(id => statusMap.get(id) || '');
      const test = testMap.get(question.testId);
      return {
        question, subjectId: question.subjectId || test?.subjectId, topicIds: question.topicIds || [],
        correct: names.includes('correct'), incorrect: names.includes('incorrect'), leftOut: names.includes('left out'), doubt: names.includes('doubt')
      };
    });
    const getBreakdown = (items: QuestionMetric[], relatedTests = selectedTests, useImplicitCorrect = false): Breakdown => {
      let total = items.length;
      const incorrect = items.filter(i => i.incorrect).length;
      const skipped = items.filter(i => i.leftOut).length;
      const doubts = items.filter(i => i.doubt).length;
      let correct = items.filter(i => i.correct).length;

      if (useImplicitCorrect) {
        const testsTotal = relatedTests.reduce((sum, t) => sum + (Number(t.questionsCount) || 0), 0);
        total = Math.max(testsTotal, items.length);
      }

      const attempted = total - skipped;
      
      if (useImplicitCorrect) {
        correct = Math.max(0, attempted - incorrect);
      }

      const usedTests = relatedTests.filter(t => useImplicitCorrect ? true : items.some(i => i.question.testId === t.id));
      // Time is stored per test, not per question. Apportioning it across the
      // generated questions keeps topic/subject pace meaningful for mixed tests.
      const duration = items.reduce((sum, item) => {
        const test = testMap.get(item.question.testId);
        return sum + (test?.questionsCount ? parseMinutes(test.timeTaken) / test.questionsCount : 0);
      }, 0);
      return { total, attempted, correct, incorrect, skipped, doubts, accuracy: percent(correct, attempted), averageTime: attempted ? duration / attempted : 0, score: usedTests.reduce((sum, t) => sum + t.marksObtained, 0), maxScore: usedTests.reduce((sum, t) => sum + t.maxMarks, 0) };
    };
    const overall = getBreakdown(questionMetrics, selectedTests, true);
    const bySubject = subjects.map(subject => {
      const subjectTests = selectedTests.filter(t => t.subjectId === subject.id);
      const subjectQuestions = questionMetrics.filter(q => q.subjectId === subject.id);
      const stat = getBreakdown(subjectQuestions, subjectTests, true);
      const weakTopics = topics.filter(topic => topic.subjectId === subject.id).filter(topic => {
        const qs = questionMetrics.filter(q => q.topicIds.includes(topic.id!));
        return qs.some(q => q.incorrect || q.doubt);
      }).map(topic => topic.name);
      const strongTopics = topics.filter(topic => topic.subjectId === subject.id).filter(topic => {
        const qs = questionMetrics.filter(q => q.topicIds.includes(topic.id!));
        return qs.length >= 2 && percent(qs.filter(q => q.correct).length, qs.filter(q => !q.leftOut).length) >= 75;
      }).map(topic => topic.name);
      const ordered = [...subjectQuestions].sort((a, b) => (testMap.get(a.question.testId)?.createdAt || 0) - (testMap.get(b.question.testId)?.createdAt || 0));
      const split = Math.ceil(ordered.length / 2);
      const improvement = ordered.length >= 4 ? getBreakdown(ordered.slice(split)).accuracy - getBreakdown(ordered.slice(0, split)).accuracy : 0;
      const testCount = subjectTests.length;
      return { id: subject.id!, name: subject.name, ...stat, weakTopics, strongTopics, difficulty: stat.attempted ? Math.round(100 - stat.accuracy) : 0, improvement, testCount };
    }).filter(item => item.total || item.score);
    const byTopic = topics.map(topic => {
      const qs = questionMetrics.filter(q => q.topicIds.includes(topic.id!));
      const subject = subjectMap.get(topic.subjectId) || 'Unassigned';
      const stat = getBreakdown(qs, selectedTests.filter(t => qs.some(q => q.question.testId === t.id)), false);
      const ordered = [...qs].sort((a, b) => (testMap.get(a.question.testId)?.createdAt || 0) - (testMap.get(b.question.testId)?.createdAt || 0));
      const split = Math.ceil(ordered.length / 2);
      const improvement = ordered.length >= 4 ? getBreakdown(ordered.slice(split)).accuracy - getBreakdown(ordered.slice(0, split)).accuracy : 0;
      return { id: topic.id!, name: topic.name, subject, ...stat, improvement };
    }).filter(item => item.total);
    const byType = testTypes.map(type => ({ id: type.id!, name: type.name, tests: selectedTests.filter(t => t.testTypeId === type.id) })).filter(group => group.tests.length);
    const weekly = Array.from({ length: 8 }, (_, index) => {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (7 - index) * 7);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      const periodTests = tests.filter(t => t.createdAt >= start.getTime() && t.createdAt < end.getTime());
      const ids = new Set(periodTests.map(t => t.id));
      const stat = getBreakdown(questions.filter(q => ids.has(q.testId)).map(question => {
        const names = question.statusIds.map(id => statusMap.get(id) || ''); const test = testMap.get(question.testId);
        return { question, subjectId: question.subjectId || test?.subjectId, topicIds: question.topicIds || [], correct: names.includes('correct'), incorrect: names.includes('incorrect'), leftOut: names.includes('left out'), doubt: names.includes('doubt') };
      }), periodTests, true);
      return { label: index === 7 ? 'This wk' : `W${index + 1}`, accuracy: stat.accuracy, attempted: stat.attempted, score: percent(stat.score, stat.maxScore) };
    });
    const monthly = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
      const start = new Date(date); const end = new Date(date); end.setMonth(end.getMonth() + 1);
      const periodTests = tests.filter(t => t.createdAt >= start.getTime() && t.createdAt < end.getTime());
      const ids = new Set(periodTests.map(t => t.id));
      const stat = getBreakdown(questions.filter(q => ids.has(q.testId)).map(question => { const names = question.statusIds.map(id => statusMap.get(id) || ''); const test = testMap.get(question.testId); return { question, subjectId: question.subjectId || test?.subjectId, topicIds: question.topicIds || [], correct: names.includes('correct'), incorrect: names.includes('incorrect'), leftOut: names.includes('left out'), doubt: names.includes('doubt') }; }), periodTests, true);
      return { label: date.toLocaleDateString(undefined, { month: 'short' }), accuracy: stat.accuracy, attempted: stat.attempted, score: percent(stat.score, stat.maxScore) };
    });
    const timeTests = selectedTests.filter(t => parseMinutes(t.timeTaken) >= 170).sort((a, b) => a.createdAt - b.createdAt).map(test => ({ test, time: parseMinutes(test.timeTaken), perQuestion: test.questionsCount ? parseMinutes(test.timeTaken) / test.questionsCount : 0 }));
    const tagAnalysis = tags.map(tag => {
      const tagged = questionMetrics.filter(q => q.question.tagIds.includes(tag.id!));
      const subjectCounts = new Map<string, number>(); const topicCounts = new Map<string, number>();
      tagged.forEach(q => { const s = q.subjectId ? subjectMap.get(q.subjectId) : undefined; if (s) subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1); q.topicIds.forEach(id => { const name = topicMap.get(id)?.name; if (name) topicCounts.set(name, (topicCounts.get(name) || 0) + 1); }); });
      const top = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
      return { id: tag.id!, name: tag.name, color: tag.color || '#818cf8', tagged, subjects: top(subjectCounts), topics: top(topicCounts), errors: tagged.filter(q => q.incorrect).length };
    }).filter(tag => tag.tagged.length);
    const recent = [...selectedTests].sort((a, b) => b.createdAt - a.createdAt);
    const currentWeek = weekly[7]; const previousWeek = weekly[6]; const currentMonth = monthly[5]; const previousMonth = monthly[4];
    const fullLength = selectedTests.filter(t => t.maxMarks === 100);
    const consistencyValues = weekly.filter(w => w.attempted).map(w => w.accuracy);
    const variance = consistencyValues.length > 1 ? Math.sqrt(consistencyValues.reduce((total, value) => total + Math.pow(value - consistencyValues.reduce((a, b) => a + b, 0) / consistencyValues.length, 2), 0) / consistencyValues.length) : 0;
    const consistency = consistencyValues.length ? Math.max(0, Math.round(100 - variance * 2.1)) : 0;
    const weakTopics = byTopic.filter(t => t.incorrect || t.doubts).sort((a, b) => (b.incorrect + b.doubts) - (a.incorrect + a.doubts) || a.accuracy - b.accuracy).slice(0, 5);
    const slowChapters = [...bySubject].filter(s => s.averageTime).sort((a, b) => b.averageTime - a.averageTime).slice(0, 3);
    const forgotten = byTopic.filter(t => { const last = questionMetrics.filter(q => q.topicIds.includes(t.id)).map(q => testMap.get(q.question.testId)?.createdAt || 0); return last.length && Date.now() - Math.max(...last) > 21 * 86400000; }).slice(0, 3);
    const neverPracticed = topics.filter(t => !questionMetrics.some(q => q.topicIds.includes(t.id!))).slice(0, 3);
    const bestSubject = [...bySubject].filter(s => s.attempted).sort((a, b) => b.accuracy - a.accuracy)[0];
    const fastestSubject = [...bySubject].filter(s => s.averageTime).sort((a, b) => a.averageTime - b.averageTime)[0];
    const leastNegative = [...bySubject].filter(s => s.attempted).sort((a, b) => percent(a.incorrect, a.attempted) - percent(b.incorrect, b.attempted))[0];
    const highestAccuracyTopic = [...byTopic].filter(t => t.attempted >= 3).sort((a, b) => b.accuracy - a.accuracy)[0] || [...byTopic].filter(t => t.attempted > 0).sort((a, b) => b.accuracy - a.accuracy)[0];
    const worstSubject = [...bySubject].filter(s => s.attempted).sort((a, b) => a.accuracy - b.accuracy)[0];
    const leastAccurateTopic = [...byTopic].filter(t => t.attempted >= 3).sort((a, b) => a.accuracy - b.accuracy)[0] || [...byTopic].filter(t => t.attempted > 0).sort((a, b) => a.accuracy - b.accuracy)[0];
    return { selectedTests, questionMetrics, overall, bySubject, byTopic, byType, weekly, monthly, timeTests, tagAnalysis, recent, currentWeek, previousWeek, currentMonth, previousMonth, fullLength, consistency, weakTopics, slowChapters, forgotten, neverPracticed, bestSubject, fastestSubject, leastNegative, highestAccuracyTopic, worstSubject, leastAccurateTopic, typeMap, testMap, subjectMap, topicMap, getBreakdown, coachings };
  }, [tests, questions, subjects, topics, tags, statuses, testTypes, coachings, dateFilter]);

  const { overall } = analytics;


  return <div className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 space-y-6">
    <StickyNav />
    <DateFilterModal isOpen={showDateFilter} onClose={() => setShowDateFilter(false)} currentFilter={dateFilter} onApply={setDateFilter} tests={tests} />
    
    <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
      <div><div className="flex items-center gap-2 text-primary-300 text-sm font-bold"><Activity className="w-4 h-4" /> PERFORMANCE INTELLIGENCE</div><h1 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">See what moves your score.</h1><p className="mt-2 text-surface-400 max-w-2xl">A focused view of your test habits, speed, accuracy, and the exact concepts that need attention.</p></div>
      <div className="flex flex-col items-end relative self-start xl:self-auto">
        <button onClick={() => setShowDateFilter(true)} className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all border shadow-lg", showDateFilter ? "bg-primary-500 text-white border-primary-500/50" : "bg-surface-800/80 border-white/10 text-white hover:bg-surface-700/80 hover:border-white/20")}>
          <Calendar className="w-4 h-4 text-primary-400" /> {dateFilter.label} <ChevronDown className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </section>

    {!analytics.selectedTests.length ? <EmptyState title="Your analytics will appear here" message="Add a test and review its generated questions to unlock accuracy, topic, and weakness insights." /> : <>
      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Overall accuracy" value={`${round(overall.accuracy)}%`} icon={Target} color="indigo" hint={<span>{overall.correct} correct of {overall.attempted} attempted</span>} />
        <StatCard label="Questions solved" value={String(overall.attempted)} icon={Brain} color="emerald" hint={<span>{overall.skipped} left out</span>} />
        <StatCard label="Tests attempted" value={String(analytics.selectedTests.length)} icon={Layers3} color="sky" hint={<span>{analytics.byType.length} test categories active</span>} />
        <StatCard label="Full length avg." value={analytics.fullLength.length ? `${round(analytics.fullLength.reduce((n, t) => n + t.marksObtained, 0) / analytics.fullLength.length)}/100` : '—'} icon={Trophy} color="amber" hint={<span>Based on 100-mark tests</span>} />
        <StatCard label="Consistency" value={`${analytics.consistency}%`} icon={Gauge} color="emerald" hint={<span>Based on weekly accuracy stability</span>} />
        <StatCard label="Avg. time" value={formatPerQuestion(overall.averageTime)} icon={Clock3} color="rose" hint={<span>Across questions you attempted</span>} />
      </section>

      <section id="per-test" className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 scroll-mt-24">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Test-level insight</p>
            <h2 className="mt-1 text-xl font-black text-white">Per-test analysis</h2>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Filter: Coaching</label>
            <select
              value={perTestFilterCoaching || ''}
              onChange={e => setPerTestFilterCoaching(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
            >
              <option value="">Any Coaching</option>
              {coachings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Filter: Subject</label>
            <select
              value={perTestFilterSubject || ''}
              onChange={e => {
                setPerTestFilterSubject(e.target.value ? Number(e.target.value) : null);
                setPerTestFilterTopic(null);
              }}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
            >
              <option value="">Any Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Filter: Topic</label>
            <select
              value={perTestFilterTopic || ''}
              onChange={e => setPerTestFilterTopic(e.target.value ? Number(e.target.value) : null)}
              disabled={!perTestFilterSubject}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500 disabled:opacity-50"
            >
              <option value="">Any Topic</option>
              {topics.filter(t => t.subjectId === perTestFilterSubject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Filter: Test Type</label>
            <select
              value={perTestFilterType || ''}
              onChange={e => setPerTestFilterType(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
            >
              <option value="">Any Type</option>
              {testTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {(() => {
          const filteredTests = analytics.selectedTests.filter(t => {
            if (perTestFilterCoaching && t.coachingId !== perTestFilterCoaching) return false;
            if (perTestFilterSubject && t.subjectId !== perTestFilterSubject) return false;
            if (perTestFilterType && t.testTypeId !== perTestFilterType) return false;
            return true;
          });

          if (filteredTests.length === 0) {
            return <div className="mt-8"><EmptyState title="No tests match" message="Try adjusting your filters above." /></div>;
          }

          let filteredQuestions = analytics.questionMetrics.filter(q => filteredTests.some(t => t.id === q.question.testId));
          
          if (perTestFilterTopic) {
            filteredQuestions = filteredQuestions.filter(q => q.topicIds.includes(perTestFilterTopic));
          }

          if (filteredQuestions.length === 0 && perTestFilterTopic) {
             return <div className="mt-8"><EmptyState title="No questions found" message="No questions match the selected topic in these tests." /></div>;
          }

          const useImplicitCorrect = perTestFilterTopic ? false : true;
          const stat = analytics.getBreakdown(filteredQuestions, filteredTests, useImplicitCorrect);

          // Find weak topics: questions in these tests that are incorrect or doubt
          const weakTopicIds = new Set<number>();
          filteredQuestions.forEach(q => {
            if (q.incorrect || q.doubt) {
              q.topicIds.forEach(id => weakTopicIds.add(id));
            }
          });
          
          const weakTopicsList = Array.from(weakTopicIds).map(id => analytics.topicMap.get(id)?.name).filter(Boolean);

          return (
            <div className="mt-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Accuracy" value={`${round(stat.accuracy)}%`} icon={Target} color="indigo" hint={<span />} />
                <StatCard label="Unattempted" value={`${round(percent(stat.skipped, stat.total))}%`} icon={Clock3} color="sky" hint={<span />} />
                <StatCard label="Incorrect" value={`${round(percent(stat.incorrect, stat.attempted))}%`} icon={AlertTriangle} color="rose" hint={<span />} />
                <StatCard label="Avg. Time" value={formatPerQuestion(stat.averageTime)} icon={Clock3} color="sky" hint={<span />} />
              </div>

              {weakTopicsList.length > 0 && (
                <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                  <h3 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2"><Flame className="w-4 h-4" /> Weak Topics to Revise</h3>
                  <div className="flex flex-wrap gap-2">
                    {weakTopicsList.map(topic => (
                      <span key={topic} className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      <section id="deep-dive" className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6 mb-6 scroll-mt-24">
        <ImprovementGraph tests={tests} questions={questions} statuses={statuses} coachings={coachings} testTypes={testTypes} subjects={subjects} topics={topics} onDataChange={setGraphStats} />
        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 flex-1"><p className="text-xs font-bold uppercase tracking-widest text-surface-500">Answer pattern</p><h2 className="mt-1 text-xl font-black text-white">Per-question analysis</h2><div className="mt-6 flex items-center gap-6"><div className="w-32 h-32 rounded-full shrink-0" style={{ background: `conic-gradient(#10b981 0 ${percent((graphStats || overall).correct, (graphStats || overall).total)}%, #f43f5e ${percent((graphStats || overall).correct, (graphStats || overall).total)}% ${percent((graphStats || overall).correct + (graphStats || overall).incorrect, (graphStats || overall).total)}%, #64748b ${percent((graphStats || overall).correct + (graphStats || overall).incorrect, (graphStats || overall).total)}% 100%)` }}><div className="m-[13px] h-[102px] rounded-full bg-surface-900 flex flex-col items-center justify-center"><span className="text-2xl font-black text-white">{round((graphStats || overall).accuracy)}%</span><span className="text-[10px] uppercase text-surface-500 font-bold">accuracy</span></div></div><div className="flex-1 space-y-3 text-sm">{[{label:'Correct',value:(graphStats || overall).correct,color:'bg-emerald-400'}, {label:'Incorrect',value:(graphStats || overall).incorrect,color:'bg-rose-400'}, {label:'Left out',value:(graphStats || overall).skipped,color:'bg-slate-500'}].map(item => <div key={item.label}><div className="flex justify-between text-surface-400 mb-1"><span>{item.label}</span><span className="text-white font-bold">{round(percent(item.value, (graphStats || overall).total))}%</span></div><ProgressBar value={percent(item.value, (graphStats || overall).total)} color={item.color} /></div>)}</div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-xs text-surface-500">Unattempted</p><p className="mt-1 font-black text-white">{(graphStats || overall).skipped}</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-xs text-surface-500">Avg. time</p><p className="mt-1 font-black text-white">{formatPerQuestion((graphStats || overall).averageTime)}</p></div></div></div>
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Test distribution</p>
                <h2 className="mt-1 text-xl font-black text-white">Attempts by category</h2>
              </div>
              {graphStats?.filterSubjectId && (
                <div className="flex bg-surface-900/80 p-1 rounded-xl border border-white/10">
                  <button onClick={() => setDistMode('types')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", distMode === 'types' ? "bg-white/10 text-white" : "text-surface-400 hover:text-white hover:bg-white/5")}>Types</button>
                  <button onClick={() => setDistMode('topics')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", distMode === 'topics' ? "bg-white/10 text-white" : "text-surface-400 hover:text-white hover:bg-white/5")}>Topics</button>
                </div>
              )}
            </div>
            
            {(() => {
               let activeTests = graphStats?.relevantTests || analytics.selectedTests;
               const activeSubjectId = graphStats?.filterSubjectId;
               
               if (activeSubjectId) {
                 const subjectTopics = topics.filter((t: any) => t.subjectId === activeSubjectId).map((t: any) => t.id);
                 activeTests = activeTests.filter((t: any) => {
                    if (t.subjectId === activeSubjectId) return true;
                    return questions.some((q: any) => q.testId === t.id && (q.subjectId === activeSubjectId || q.topicIds?.some((tid: number) => subjectTopics.includes(tid))));
                 });
               }
               
               if (distMode === 'topics' && activeSubjectId) {
                  const subjectTopics = topics.filter((t: any) => t.subjectId === activeSubjectId);
                  const activeTestIds = new Set(activeTests.map((t: any) => t.id));
                  const statusMap = new Map(statuses.map((s: any) => [s.id!, s.name.toLowerCase()]));
                  const activeQs = questions.filter((q: any) => activeTestIds.has(q.testId) && q.topicIds?.some((tid: number) => subjectTopics.find((t: any) => t.id === tid)));
                  
                  const topicStats = subjectTopics.map((topic: any) => {
                    const qs = activeQs.filter((q: any) => q.topicIds?.includes(topic.id!));
                    let correct = 0, attempted = 0;
                    qs.forEach((q: any) => {
                      const names = q.statusIds?.map((id: number) => statusMap.get(id) || '') || [];
                      if (!names.includes('left out')) {
                        attempted++;
                        if (!names.includes('incorrect')) correct++;
                      }
                    });
                    return { ...topic, attempted, correct, accuracy: attempted > 0 ? (correct/attempted)*100 : 0 };
                  }).filter((t: any) => t.attempted > 0).sort((a: any, b: any) => b.accuracy - a.accuracy);
                  
                  if (!topicStats.length) return <EmptyState title="No topic data" message="No questions attempted for this subject in the selected period." />;
                  
                  return <div className="mt-2 space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                    {topicStats.map((topic: any) => (
                      <div key={topic.id}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-bold text-surface-200">{topic.name}</span>
                          <span className="text-surface-400">{round(topic.accuracy)}% acc</span>
                        </div>
                        <ProgressBar value={topic.accuracy} color={topic.accuracy < 40 ? 'bg-rose-500' : topic.accuracy < 70 ? 'bg-yellow-500' : 'bg-emerald-500'} />
                      </div>
                    ))}
                  </div>;
               }
               
               const filteredByType = testTypes.map((type: any) => ({
                 ...type,
                 tests: activeTests.filter((t: any) => t.testTypeId === type.id)
               })).filter((g: any) => g.tests.length > 0).sort((a: any, b: any) => b.tests.length - a.tests.length);
               
               if (!filteredByType.length) return <EmptyState title="No test categories" message="No tests found for this selection." />;
               
               return <div className="mt-2 space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                 {filteredByType.map((group: any) => (
                   <div key={group.id}>
                     <div className="flex justify-between text-sm mb-2">
                       <span className="font-bold text-surface-200">{group.name}</span>
                       <span className="text-surface-400">{group.tests.length} test{group.tests.length !== 1 ? 's' : ''}</span>
                     </div>
                     <ProgressBar value={percent(group.tests.length, activeTests.length)} color="bg-gradient-to-r from-primary-500 to-sky-400" />
                   </div>
                 ))}
               </div>;
            })()}
          </div>
        </div>
      </section>

      {analytics.byType.length > 0 && (
        <section id="test-category" className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 scroll-mt-24">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Deep Dive</p>
              <h2 className="mt-1 text-xl font-black text-white">Test Category Analysis</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar items-center">
              <button onClick={() => setShowDateFilter(true)} className="px-4 py-2 text-sm font-bold rounded-xl transition-all border border-white/10 text-white hover:bg-surface-700/80 hover:border-white/20 flex items-center gap-2 shrink-0">
                <Calendar className="w-4 h-4 text-primary-400" /> {dateFilter.label}
              </button>
              <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
              {analytics.byType.map(type => (
                <button 
                  key={type.id} 
                  onClick={() => setActiveCategory(type.id)}
                  className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border shrink-0", (activeCategory || analytics.byType[0]?.id) === type.id ? "bg-primary-500/20 text-primary-300 border-primary-500/30" : "bg-surface-800/50 text-surface-400 border-white/5 hover:text-white hover:bg-surface-700/50")}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
          {(() => {
            const category = analytics.byType.find(t => t.id === (activeCategory || analytics.byType[0]?.id));
            if (!category) return null;
            const catQuestions = analytics.questionMetrics.filter(q => category.tests.some(t => t.id === q.question.testId));
            const stat = analytics.getBreakdown(catQuestions, category.tests, true);
            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Total Tests" value={String(category.tests.length)} icon={Layers3} color="sky" hint={<span />} />
                <StatCard label="Questions Solved" value={String(stat.attempted)} icon={Brain} color="emerald" hint={<span>{stat.skipped} left out</span>} />
                <StatCard label="Accuracy" value={`${round(stat.accuracy)}%`} icon={Target} color="indigo" hint={<span />} />
                <StatCard label="Avg. Time" value={formatPerQuestion(stat.averageTime)} icon={Clock3} color="rose" hint={<span />} />
                <StatCard label="Incorrect" value={String(stat.incorrect)} icon={AlertTriangle} color="amber" hint={<span />} />
              </div>
            );
          })()}
        </section>
      )}

      {/* NEW SUBJECT & TOPIC ANALYSIS */}
      <section className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8">
        <div className="flex flex-col xl:flex-row justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Subject Level Focus</p>
            <h2 className="mt-1 text-xl font-black text-white">Subject & Topic Analysis</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Select Subject</label>
            <select
              value={activeSubject || ''}
              onChange={e => {
                setActiveSubject(e.target.value ? Number(e.target.value) : null);
                setSubjectFocusTopic(null);
              }}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
            >
              <option value="">-- Choose a Subject --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Time Duration</label>
              <select
                value={subjectFocusTimeFilter}
                onChange={e => setSubjectFocusTimeFilter(e.target.value as any)}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
              >
                <option value="all">All Time</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="180">Last 6 Months</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {subjectFocusTimeFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">Start Date</label>
                  <input type="date" value={subjectFocusCustomStart} onChange={e => setSubjectFocusCustomStart(e.target.value)} className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-500 text-sm" style={{colorScheme: 'dark'}} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5 block">End Date</label>
                  <input type="date" value={subjectFocusCustomEnd} onChange={e => setSubjectFocusCustomEnd(e.target.value)} className="w-full bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary-500 text-sm" style={{colorScheme: 'dark'}} />
                </div>
              </div>
            )}
          </div>
        </div>

        {(() => {
          if (!activeSubject) return <EmptyState title="No subject selected" message="Please select a subject from the dropdown above to view its detailed analysis." />;

          // 1. Filter tests based on activeSubject and subjectFocusTimeFilter
          const now = Date.now();
          let cutoff = 0;
          let maxCutoff = Infinity;
          let halfCutoff = 0;

          if (subjectFocusTimeFilter === 'custom') {
            if (subjectFocusCustomStart && subjectFocusCustomEnd) {
              const start = new Date(subjectFocusCustomStart);
              start.setHours(0,0,0,0);
              const end = new Date(subjectFocusCustomEnd);
              end.setHours(23,59,59,999);
              cutoff = start.getTime();
              maxCutoff = end.getTime();
              halfCutoff = start.getTime() + ((end.getTime() - start.getTime()) / 2);
            } else {
              return <EmptyState title="Select Custom Range" message="Please select both start and end dates to view the analysis." />;
            }
          } else if (subjectFocusTimeFilter !== 'all') {
            const daysMap: Record<string, number> = { '7': 7, '30': 30, '180': 180 };
            cutoff = now - (daysMap[subjectFocusTimeFilter] * 86400000);
            halfCutoff = now - ((daysMap[subjectFocusTimeFilter] / 2) * 86400000);
          }

          const timeWindowTests = analytics.selectedTests.filter(t => t.createdAt >= cutoff && t.createdAt <= maxCutoff);
          const timeWindowTestIds = new Set(timeWindowTests.map(t => t.id));
          const activeSubjectTopics = new Set(topics.filter(t => t.subjectId === activeSubject).map(t => t.id));

          const baseQuestions = analytics.questionMetrics.filter(q => {
            if (!timeWindowTestIds.has(q.question.testId)) return false;
            const test = timeWindowTests.find(t => t.id === q.question.testId);
            if (test?.subjectId === activeSubject) return true;
            if (q.question.subjectId === activeSubject) return true;
            if (q.question.topicIds?.some(tid => activeSubjectTopics.has(tid))) return true;
            return false;
          });
          
          const baseTests = timeWindowTests.filter(t => baseQuestions.some(q => q.question.testId === t.id));
          const stat = analytics.getBreakdown(baseQuestions, baseTests, false);

          // Improvement trend (recent half vs older half)
          const recentTests = baseTests.filter(t => t.createdAt >= halfCutoff);
          const olderTests = baseTests.filter(t => t.createdAt < halfCutoff && t.createdAt >= cutoff);
          const recentQuestions = baseQuestions.filter(q => recentTests.some(t => t.id === q.question.testId));
          const olderQuestions = baseQuestions.filter(q => olderTests.some(t => t.id === q.question.testId));
          
          const recentStat = analytics.getBreakdown(recentQuestions, recentTests, false);
          const olderStat = analytics.getBreakdown(olderQuestions, olderTests, false);
          const improvement = olderStat.attempted ? recentStat.accuracy - olderStat.accuracy : 0;

          // Compute Weak and Strong Chapters for the selected subject
          const subjectTopics = topics.filter(t => t.subjectId === activeSubject);
          const topicStats = subjectTopics.map(topic => {
            const tQs = baseQuestions.filter(q => q.topicIds.includes(topic.id!));
            const tTests = baseTests.filter(t => tQs.some(q => q.question.testId === t.id));
            const tStat = analytics.getBreakdown(tQs, tTests, false); // useImplicitCorrect=false for topics

            // Trend
            const rQs = recentQuestions.filter(q => q.topicIds.includes(topic.id!));
            const oQs = olderQuestions.filter(q => q.topicIds.includes(topic.id!));
            const rTests = recentTests.filter(t => rQs.some(q => q.question.testId === t.id));
            const oTests = olderTests.filter(t => oQs.some(q => q.question.testId === t.id));
            const rStat = analytics.getBreakdown(rQs, rTests, false);
            const oStat = analytics.getBreakdown(oQs, oTests, false);
            const tImprovement = oStat.attempted ? rStat.accuracy - oStat.accuracy : 0;

            return { topic, stat: tStat, improvement: tImprovement };
          }).filter(ts => ts.stat.attempted > 0);

          const weakChapters = [...topicStats].sort((a, b) => a.stat.accuracy - b.stat.accuracy).slice(0, 3);
          const strongChapters = [...topicStats].sort((a, b) => b.stat.accuracy - a.stat.accuracy).slice(0, 3);

          return (
            <div className="space-y-8 mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Average Score" value={stat.maxScore ? `${round(percent(stat.score, stat.maxScore))}%` : '—'} icon={Award} color="emerald" hint={<span>{stat.score} / {stat.maxScore}</span>} />
                <StatCard label="Accuracy" value={`${round(stat.accuracy)}%`} icon={Target} color="indigo" hint={<span />} />
                <StatCard label="Avg. Time" value={formatPerQuestion(stat.averageTime)} icon={Clock3} color="sky" hint={<span />} />
                <StatCard label="Difficulty Rating" value={stat.attempted ? `${Math.round(100 - stat.accuracy)}/100` : '—'} icon={AlertTriangle} color="rose" hint={<span>Based on errors</span>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <h3 className="text-sm font-bold text-surface-200 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Improvement %</h3>
                  <div className="flex items-center gap-3">
                    <p className={cn("text-2xl font-black", improvement >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {improvement > 0 ? '+' : ''}{round(improvement)}%
                    </p>
                    <span className="text-xs text-surface-500 font-medium">
                      Based on {subjectFocusTimeFilter === 'all' ? 'all time' : 
                                subjectFocusTimeFilter === '7' ? 'last 7 days' : 
                                subjectFocusTimeFilter === '30' ? 'last 30 days' : 
                                subjectFocusTimeFilter === 'custom' ? 'custom range' :
                                'last 6 months'}
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <h3 className="text-sm font-bold text-surface-200 mb-3 flex items-center gap-2"><Layers3 className="w-4 h-4 text-purple-400" /> Key Chapters</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-surface-500 mb-1.5 font-bold">Strong</p>
                      <div className="flex flex-wrap gap-1.5">
                        {strongChapters.map(c => <span key={c.topic.id} className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">{c.topic.name}</span>)}
                        {strongChapters.length === 0 && <span className="text-xs text-surface-500">Not enough data</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-surface-500 mb-1.5 font-bold">Weak</p>
                      <div className="flex flex-wrap gap-1.5">
                        {weakChapters.map(c => <span key={c.topic.id} className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold">{c.topic.name}</span>)}
                        {weakChapters.length === 0 && <span className="text-xs text-surface-500">Not enough data</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-white">Topic Drilldown</h3>
                  <p className="text-sm text-surface-400">Select a topic to analyze its specific performance within this timeframe.</p>
                </div>
                
                <div className="max-w-xs mb-6">
                  <select
                    value={subjectFocusTopic || ''}
                    onChange={e => setSubjectFocusTopic(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
                  >
                    <option value="">-- Select a Topic --</option>
                    {subjectTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {subjectFocusTopic && (() => {
                  const tData = topicStats.find(t => t.topic.id === subjectFocusTopic);
                  if (!tData) return <EmptyState title="No Data" message="No questions found for this topic in the selected time duration." />;

                  return (
                    <div className="p-5 rounded-2xl bg-primary-500/5 border border-primary-500/20">
                      <h4 className="font-bold text-primary-300 mb-4">{tData.topic.name} Performance</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Attempted</p>
                          <p className="font-bold text-white mt-0.5">{tData.stat.attempted}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Correct</p>
                          <p className="font-bold text-emerald-400 mt-0.5">{tData.stat.correct}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Wrong</p>
                          <p className="font-bold text-rose-400 mt-0.5">{tData.stat.incorrect}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Skipped</p>
                          <p className="font-bold text-surface-300 mt-0.5">{tData.stat.skipped}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Accuracy</p>
                          <p className={cn("font-bold mt-0.5", tData.stat.accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400')}>{round(tData.stat.accuracy)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Avg Time</p>
                          <p className="font-bold text-sky-400 mt-0.5">{formatPerQuestion(tData.stat.averageTime)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Difficulty</p>
                          <p className="font-bold text-rose-400 mt-0.5">{Math.round(100 - tData.stat.accuracy)}/100</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-surface-500">Trend</p>
                          <div className="mt-0.5"><Trend value={tData.improvement} compact /></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}
      </section>

      <section id="strength-detector" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8"><div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /><div><p className="text-xs font-bold uppercase tracking-widest text-surface-500">Strength detector</p><h2 className="mt-1 text-xl font-black text-white">Use your advantages</h2></div></div><div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[{icon: Target, label: 'Highest accuracy topic', value: analytics.highestAccuracyTopic?.name || '—', note: analytics.highestAccuracyTopic ? `${round(analytics.highestAccuracyTopic.accuracy)}% accuracy` : 'More attempts needed'}, {icon: Award,label:'Best subject',value:analytics.bestSubject?.name || '—',note:analytics.bestSubject ? `${round(analytics.bestSubject.accuracy)}% accuracy` : 'More attempts needed'}, {icon: Zap,label:'Fastest subject',value:analytics.fastestSubject?.name || '—',note:analytics.fastestSubject ? formatPerQuestion(analytics.fastestSubject.averageTime) : 'Timed data needed'}, {icon: ShieldCheck,label:'Least negative',value:analytics.leastNegative?.name || '—',note:analytics.leastNegative ? `${round(percent(analytics.leastNegative.incorrect, analytics.leastNegative.attempted))}% incorrect` : 'More attempts needed'}, {icon: Activity,label:'Most consistent',value: analytics.consistency ? `${analytics.consistency}% rhythm` : '—',note:'Your weekly accuracy stability'}].map(item => <div key={item.label} className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 flex flex-col justify-between min-h-[110px]"><item.icon className="w-4 h-4 text-emerald-400 shrink-0" /><p className="mt-3 text-[10px] sm:text-xs uppercase tracking-wider text-surface-500 font-bold leading-tight">{item.label}</p><p className="mt-1 font-black text-surface-100 truncate text-sm sm:text-base">{item.value}</p><p className="mt-1 text-[10px] text-emerald-300 truncate">{item.note}</p></div>)}</div></div>
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8"><div className="flex items-center gap-2"><Flame className="w-5 h-5 text-rose-400" /><div><p className="text-xs font-bold uppercase tracking-widest text-surface-500">Weakness radar</p><h2 className="mt-1 text-xl font-black text-white">Protect your score</h2></div></div><div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[ { title: "Draining topics", icon: AlertTriangle, iconColor: "text-rose-400", bgColor: "bg-rose-500/[0.04]", borderColor: "border-rose-500/10", noteColor: "text-rose-300", items: analytics.weakTopics.map(t => ({ name: t.name, detail: `${t.incorrect} mistakes` })) }, { title: "Time sinks (>3m)", icon: Clock3, iconColor: "text-amber-400", bgColor: "bg-amber-500/[0.04]", borderColor: "border-amber-500/10", noteColor: "text-amber-300", items: analytics.slowChapters.map(s => ({ name: s.name, detail: formatPerQuestion(s.averageTime) })) }, { title: "Memory decay (21d+)", icon: Archive, iconColor: "text-surface-400", bgColor: "bg-white/[0.04]", borderColor: "border-white/10", noteColor: "text-surface-300", items: analytics.forgotten.map(t => ({ name: t.name, detail: "Needs revision" })) }, { title: "Blind spots", icon: EyeOff, iconColor: "text-indigo-400", bgColor: "bg-indigo-500/[0.04]", borderColor: "border-indigo-500/10", noteColor: "text-indigo-300", items: analytics.neverPracticed.map(t => ({ name: t.name, detail: "Unattempted" })) }, { title: "Worst subject", icon: TrendingDown, iconColor: "text-rose-400", bgColor: "bg-rose-500/[0.04]", borderColor: "border-rose-500/10", noteColor: "text-rose-300", items: analytics.worstSubject ? [{ name: analytics.worstSubject.name, detail: `${round(analytics.worstSubject.accuracy)}% accuracy` }] : [] }, { title: "Least accurate topic", icon: Target, iconColor: "text-orange-400", bgColor: "bg-orange-500/[0.04]", borderColor: "border-orange-500/10", noteColor: "text-orange-300", items: analytics.leastAccurateTopic ? [{ name: analytics.leastAccurateTopic.name, detail: `${round(analytics.leastAccurateTopic.accuracy)}% accuracy` }] : [] } ].map(section => <div key={section.title} className={cn("p-4 rounded-xl border flex flex-col min-h-[140px]", section.bgColor, section.borderColor)}><div className="flex items-center gap-2 mb-4"><section.icon className={cn("w-4 h-4 shrink-0", section.iconColor)} /><p className="text-[10px] sm:text-xs uppercase tracking-wider text-surface-500 font-bold leading-tight">{section.title}</p></div>{section.items.length ? <div className="space-y-2.5 flex-1">{section.items.slice(0, 4).map(item => <div key={item.name} className="flex justify-between items-center gap-3"><p className="font-black text-surface-100 truncate text-sm">{item.name}</p><p className={cn("text-[10px] shrink-0 font-bold uppercase", section.noteColor)}>{item.detail}</p></div>)}</div> : <div className="flex-1 flex items-center justify-center"><span className="text-xs text-surface-500 italic">None detected</span></div>}</div>)}</div></div>
      </section>

      <section id="subject-leaderboard" className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 mb-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Subject performance</p>
            <h2 className="mt-1 text-xl font-black text-white">Subject leaderboard</h2>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="flex bg-surface-900/50 backdrop-blur-md border border-white/10 rounded-xl p-1 relative shadow-inner">
              <button onClick={() => setSubjectViewMode('questions')} className={cn("relative z-10 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors", subjectViewMode === 'questions' ? 'text-white' : 'text-surface-400 hover:text-surface-200')}>
                {subjectViewMode === 'questions' && <motion.div layoutId="subjectViewMode" className="absolute inset-0 bg-surface-700/80 rounded-lg border border-white/10 shadow-md -z-10" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />}
                Questions
              </button>
              <button onClick={() => setSubjectViewMode('tests')} className={cn("relative z-10 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors", subjectViewMode === 'tests' ? 'text-white' : 'text-surface-400 hover:text-surface-200')}>
                {subjectViewMode === 'tests' && <motion.div layoutId="subjectViewMode" className="absolute inset-0 bg-surface-700/80 rounded-lg border border-white/10 shadow-md -z-10" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />}
                Tests
              </button>
            </div>
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap hidden sm:block">Sort by:</label>
            <select
              className="bg-surface-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-primary-500 w-full sm:w-64 appearance-none shadow-sm cursor-pointer"
              value={['accuracy-desc', 'score-desc', 'averageTime-asc', 'incorrect-asc', 'incorrect-desc'].includes(`${subjectSortCol}-${subjectSortDir}`) ? `${subjectSortCol}-${subjectSortDir}` : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const [col, dir] = val.split('-');
                setSubjectSortCol(col as any);
                setSubjectSortDir(dir as any);
              }}
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A1A1AA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
            >
              <option value="" disabled className="hidden">Custom Sort</option>
              <option value="accuracy-desc">Highest Accuracy Subjects</option>
              <option value="score-desc">Top Subjects (Best to Worst)</option>
              <option value="averageTime-asc">Fastest Subject Ranking</option>
              <option value="incorrect-asc">Least Negative (Least Incorrect)</option>
              <option value="incorrect-desc">Highest Incorrects</option>
            </select>
          </div>
        </div>
        
        {analytics.bySubject.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="text-[10px] uppercase tracking-widest text-surface-500 border-b border-white/7">
                <tr>
                  {[
                    { id: 'name', label: 'Subject' },
                    { id: 'attempted', label: subjectViewMode === 'tests' ? 'Tests' : 'Attempted' },
                    { id: 'score', label: 'Score' },
                    { id: 'correct', label: 'Correct' },
                    { id: 'incorrect', label: 'Wrong' },
                    { id: 'skipped', label: 'Skipped' },
                    { id: 'accuracy', label: 'Accuracy' },
                    { id: 'averageTime', label: 'Avg. time' },
                    { id: 'difficulty', label: 'Difficulty' },
                    { id: 'improvement', label: 'Trend' }
                  ].map(col => (
                    <th key={col.id} className="pb-3 px-2 cursor-pointer hover:text-white transition-colors" onClick={() => {
                      if (subjectSortCol === col.id) {
                        setSubjectSortDir(subjectSortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSubjectSortCol(col.id);
                        setSubjectSortDir('desc');
                      }
                    }}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        <div className="flex flex-col opacity-50">
                          <ChevronUp className={cn("w-2.5 h-2.5 -mb-1", subjectSortCol === col.id && subjectSortDir === 'asc' ? 'text-primary-400 opacity-100' : '')} />
                          <ChevronDown className={cn("w-2.5 h-2.5", subjectSortCol === col.id && subjectSortDir === 'desc' ? 'text-primary-400 opacity-100' : '')} />
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...analytics.bySubject]
                  .sort((a: any, b: any) => {
                    let valA = a[subjectSortCol];
                    let valB = b[subjectSortCol];
                    
                    if (subjectSortCol === 'difficulty') {
                       valA = 100 - a.accuracy;
                       valB = 100 - b.accuracy;
                    } else if (subjectSortCol === 'score') {
                       valA = percent(a.score, a.maxScore);
                       valB = percent(b.score, b.maxScore);
                    }
                    
                    if (typeof valA === 'string' && typeof valB === 'string') {
                      return subjectSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    return subjectSortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
                  })
                  .map((subject: any, index: number) => (
                  <tr key={subject.id} className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-black w-5 text-center", index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-600" : "text-surface-500")}>
                          #{index + 1}
                        </span>
                        <span className="font-bold text-white">{subject.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-surface-300 font-bold">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={subjectViewMode}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="inline-block"
                        >
                          {subjectViewMode === 'tests' ? `${subject.testCount} Tests` : subject.attempted}
                        </motion.span>
                      </AnimatePresence>
                    </td>
                    <td className="py-3.5 px-2 text-surface-300">{subject.score} / {subject.maxScore} <span className="text-[10px] text-surface-500 ml-1">({round(percent(subject.score, subject.maxScore))}%)</span></td>
                    <td className="py-3.5 px-2 text-emerald-400 font-bold">{subject.correct}</td>
                    <td className="py-3.5 px-2 text-rose-400 font-bold">{subject.incorrect}</td>
                    <td className="py-3.5 px-2 text-surface-400">{subject.skipped}</td>
                    <td className="py-3.5 px-2"><span className={cn('font-bold', subject.accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400')}>{round(subject.accuracy)}%</span></td>
                    <td className="py-3.5 px-2 text-surface-300">{formatPerQuestion(subject.averageTime)}</td>
                    <td className="py-3.5 px-2 text-surface-300">{Math.round(100 - subject.accuracy)}/100</td>
                    <td className="py-3.5 px-2"><Trend value={subject.improvement} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No subject data yet" message="Add subjects to reviewed questions to reveal subject-level trends." />
        )}
      </section>

      <section id="topic-precision" className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-surface-500">Topic precision</p>
            <h2 className="mt-1 text-xl font-black text-white">Topic analysis</h2>
          </div>
          <div>
            <select
              value={topicFilterSubject || ''}
              onChange={e => setTopicFilterSubject(e.target.value ? Number(e.target.value) : null)}
              className="bg-surface-800 border border-white/10 rounded-xl px-4 py-2 text-sm text-surface-100 focus:outline-none focus:border-primary-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        
        {analytics.byTopic.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="text-[10px] uppercase tracking-widest text-surface-500 border-b border-white/7">
                <tr>
                  {[
                    { id: 'name', label: 'Topic' },
                    { id: 'subject', label: 'Subject' },
                    { id: 'attempted', label: 'Attempted' },
                    { id: 'correct', label: 'Correct' },
                    { id: 'incorrect', label: 'Wrong' },
                    { id: 'skipped', label: 'Skipped' },
                    { id: 'accuracy', label: 'Accuracy' },
                    { id: 'averageTime', label: 'Avg. time' },
                    { id: 'difficulty', label: 'Difficulty' },
                    { id: 'improvement', label: 'Trend' }
                  ].map(col => (
                    <th key={col.id} className="pb-3 px-2 cursor-pointer hover:text-white transition-colors" onClick={() => {
                      if (topicSortCol === col.id) {
                        setTopicSortDir(topicSortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setTopicSortCol(col.id);
                        setTopicSortDir('desc');
                      }
                    }}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        <div className="flex flex-col opacity-50">
                          <ChevronUp className={cn("w-2.5 h-2.5 -mb-1", topicSortCol === col.id && topicSortDir === 'asc' ? 'text-primary-400 opacity-100' : '')} />
                          <ChevronDown className={cn("w-2.5 h-2.5", topicSortCol === col.id && topicSortDir === 'desc' ? 'text-primary-400 opacity-100' : '')} />
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.byTopic
                  .filter((t: any) => !topicFilterSubject || topics.find((tt: any) => tt.id === t.id)?.subjectId === topicFilterSubject)
                  .sort((a: any, b: any) => {
                    let valA = a[topicSortCol];
                    let valB = b[topicSortCol];
                    
                    if (topicSortCol === 'difficulty') {
                       valA = 100 - a.accuracy;
                       valB = 100 - b.accuracy;
                    }
                    
                    if (typeof valA === 'string' && typeof valB === 'string') {
                      return topicSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    return topicSortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
                  })
                  .map((topic: any) => (
                  <tr key={topic.id} className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-3.5 px-2 font-bold text-white">{topic.name}</td>
                    <td className="py-3.5 px-2 text-sm text-surface-400">{topic.subject}</td>
                    <td className="py-3.5 px-2 text-surface-300">{topic.attempted}</td>
                    <td className="py-3.5 px-2 text-emerald-400 font-bold">{topic.correct}</td>
                    <td className="py-3.5 px-2 text-rose-400 font-bold">{topic.incorrect}</td>
                    <td className="py-3.5 px-2 text-surface-400">{topic.skipped}</td>
                    <td className="py-3.5 px-2"><span className={cn('font-bold', topic.accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400')}>{round(topic.accuracy)}%</span></td>
                    <td className="py-3.5 px-2 text-surface-300">{formatPerQuestion(topic.averageTime)}</td>
                    <td className="py-3.5 px-2 text-surface-300">{Math.round(100 - topic.accuracy)}/100</td>
                    <td className="py-3.5 px-2"><Trend value={topic.improvement} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No topic data yet" message="Add topic labels to reviewed questions to reveal question-level trends." />
        )}
      </section>

      <section id="tag-analysis" className="grid grid-cols-1 xl:grid-cols-[1fr_1.15fr] gap-6 scroll-mt-24">
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8"><div className="flex items-center gap-2"><Clock3 className="w-5 h-5 text-sky-300" /><div><p className="text-xs font-bold uppercase tracking-widest text-surface-500">3-hour tests only</p><h2 className="mt-1 text-xl font-black text-white">Time per test progress</h2></div></div>{analytics.timeTests.length ? <div className="mt-6 space-y-4">{analytics.timeTests.map(({ test, time, perQuestion }) => <div key={test.id}><div className="flex justify-between gap-3 text-sm"><span className="font-bold text-surface-200 truncate">{analytics.typeMap.get(test.testTypeId) || 'Test'} · {safeDate(test.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><span className="text-sky-300 font-bold shrink-0">{formatPerQuestion(perQuestion)}</span></div><div className="mt-2 flex gap-3 items-center"><ProgressBar value={percent(time, 180)} color="bg-gradient-to-r from-sky-500 to-cyan-300" className="flex-1" /><span className="text-xs text-surface-500 w-12 text-right">{formatTime(time)}</span></div></div>)}</div> : <div className="mt-5"><EmptyState title="No 3-hour tests found" message="This chart activates for tests with a recorded duration of at least 2h 50m." /></div>}</div>
        <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/8"><div className="flex items-center gap-2"><Tags className="w-5 h-5 text-violet-300" /><div><p className="text-xs font-bold uppercase tracking-widest text-surface-500">Tag analysis</p><h2 className="mt-1 text-xl font-black text-white">Patterns behind your mistakes</h2></div></div>{analytics.tagAnalysis.length ? <div className="mt-5 space-y-2">{analytics.tagAnalysis.map(tag => <div key={tag.id} className="rounded-xl border border-white/7 overflow-hidden"><button onClick={() => setExpandedTag(expandedTag === tag.id ? null : tag.id)} className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-white/[0.035] transition-colors"><div className="flex items-center gap-3 min-w-0"><span className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: tag.color}} /><div className="min-w-0"><p className="font-bold text-surface-100 truncate">{tag.name}</p><p className="text-xs text-surface-500 truncate">{tag.tagged.length} question{tag.tagged.length !== 1 ? 's' : ''} · {tag.errors} incorrect</p></div></div>{expandedTag === tag.id ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}</button>              <AnimatePresence>
                {expandedTag === tag.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3.5 pb-4 pt-1 border-t border-white/5">
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-surface-500 mb-1">Most common subject</p>
                          <p className="text-surface-200 font-bold">{tag.subjects.length ? tag.subjects.map(([n, c]) => `${n} (${c})`).join(', ') : 'Not assigned'}</p>
                        </div>
                        <div>
                          <p className="text-surface-500 mb-1">Most common topic</p>
                          <p className="text-surface-200 font-bold">{tag.topics.length ? tag.topics.map(([n, c]) => `${n} (${c})`).join(', ') : 'Not assigned'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <button onClick={() => document.getElementById(`tag-questions-${tag.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="text-sm font-bold text-surface-400 hover:text-white transition-colors">
                          Show questions ↓
                        </button>
                        <button onClick={() => { setViewingQuestions(tag.tagged.map(q => q.question)); setViewingIndex(0); }} className="text-sm font-black text-white inline-flex items-center gap-2 transition-all bg-primary-500 hover:bg-primary-400 px-4 py-2 rounded-xl shadow-lg shadow-primary-500/25 active:scale-95">
                          See these questions at once <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                      <div id={`tag-questions-${tag.id}`} className="mt-4 space-y-2">
                        {tag.tagged.slice(0, 5).map((q, idx) => (
                          <button onClick={() => { setViewingQuestions(tag.tagged.map(tq => tq.question)); setViewingIndex(idx); }} key={q.question.id} className="w-full text-left p-3.5 rounded-xl bg-white/[0.04] hover:bg-primary-500/15 text-sm text-surface-200 transition-all border border-white/5 hover:border-primary-500/30">
                            <span className="font-black text-primary-300 text-base mr-1">Q{q.question.questionNumber}</span> <span className="opacity-60">·</span> {q.subjectId ? analytics.subjectMap.get(q.subjectId) : 'Unassigned'} {q.topicIds[0] ? <><span className="opacity-60 mx-1">·</span> {analytics.topicMap.get(q.topicIds[0])?.name || 'Topic'}</> : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      : (
        <div className="mt-5">
          <EmptyState title="No tagged questions" message="Add tags such as “Silly mistake” while reviewing questions to see error patterns." />
        </div>
      )}
    </div>
  </section>

              <AnimatePresence>
        {viewingQuestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <EscapeHandler onEscape={() => setViewingQuestions(null)} />
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-950/80 backdrop-blur-xl"
              onClick={() => setViewingQuestions(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-[90vh] bg-surface-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface-800 shrink-0">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-white">Temporary Playlist</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-300 font-medium">
                    {viewingIndex + 1} of {viewingQuestions.length}
                  </span>
                </div>
                <button onClick={() => setViewingQuestions(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-surface-400" />
                </button>
              </div>
              
              <div className="flex-1 flex overflow-hidden">
                {viewingQuestions.length > 1 && (
                  <div className="w-64 border-r border-white/10 bg-surface-800/50 overflow-y-auto p-3 space-y-1.5 shrink-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
                    {viewingQuestions.map((q, idx) => (
                      <button
                        key={q.id}
                        onClick={() => setViewingIndex(idx)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between", 
                          viewingIndex === idx 
                            ? "bg-primary-500/20 border border-primary-500/30 text-primary-300 font-bold shadow-lg shadow-primary-500/5" 
                            : "text-surface-300 border border-transparent hover:bg-white/5 hover:border-white/5"
                        )}
                      >
                        <span>Question {idx + 1}</span>
                        {viewingIndex === idx && <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-900/50 relative">
                  <QuestionDetailPane question={viewingQuestions[viewingIndex]} />
                  
                  {viewingQuestions.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-800/90 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl">
                      <button 
                        onClick={() => setViewingIndex(i => Math.max(0, i - 1))}
                        disabled={viewingIndex === 0}
                        className="px-4 py-2 rounded-full text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                      >
                        Previous
                      </button>
                      <div className="w-px h-4 bg-white/20" />
                      <button 
                        onClick={() => setViewingIndex(i => Math.min(viewingQuestions.length - 1, i + 1))}
                        disabled={viewingIndex === viewingQuestions.length - 1}
                        className="px-4 py-2 rounded-full text-sm font-bold text-primary-300 hover:bg-primary-500/20 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MeVsMeComparison tests={tests} questions={questions} subjects={subjects} topics={topics} testTypes={testTypes} statuses={statuses} />

    </>}
  </div>;
};
