import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Test } from '../services/db';
import { ChevronLeft, ChevronRight, X, Clock, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CalendarStats } from '../components/calendar/CalendarStats';
import { cn } from '../utils/cn';

// ─── Helpers ──────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateKeyFromTs(ts: number) {
  return toDateKey(new Date(ts));
}

function parseDuration(t?: string): number {
  if (!t) return 0;
  const s = t.toLowerCase();
  let m = 0;
  const hm = s.match(/(\d+)\s*h/);
  const mm = s.match(/(\d+)\s*m/);
  if (hm) m += parseInt(hm[1]) * 60;
  if (mm) m += parseInt(mm[1]);
  if (!hm && !mm) { const n = s.match(/(\d+)/); if (n) m = parseInt(n[1]); }
  return m;
}

function fmtMins(m: number) {
  if (!m) return '—';
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r}m`;
  if (!r) return `${h}h`;
  return `${h}h ${r}m`;
}

// ─── Color Logic ──────────────────────────────────────────────────
function levelClass(count: number) {
  if (count === 0) return 'bg-surface-900/90 border border-white/5 hover:border-white/20 text-surface-500';
  if (count === 1) return 'bg-gradient-to-br from-primary-950/80 to-blue-900/60 border border-primary-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)] text-primary-300';
  if (count <= 3) return 'bg-gradient-to-br from-primary-600 to-indigo-600 border border-primary-400/50 shadow-[0_0_16px_rgba(99,102,241,0.45)] text-white';
  if (count <= 5) return 'bg-gradient-to-br from-indigo-500 to-sky-500 border border-sky-300/60 shadow-[0_0_22px_rgba(14,165,233,0.6)] text-white';
  return 'bg-gradient-to-br from-emerald-400 to-cyan-400 border border-emerald-300/70 shadow-[0_0_28px_rgba(52,211,153,0.75)] text-surface-950';
}

// ─── Types ────────────────────────────────────────────────────────
interface DayData {
  day: number;
  dateKey: string;
  date: Date;
  tests: Test[];
  count: number;
}

type TimeRangeOption = 'this_month' | 'all_time' | 'last_7_days' | 'last_30_days' | 'custom';

// ─── Main Component ──────────────────────────────────────────────
export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [vMonth, setVMonth] = useState(now.getMonth());
  const [vYear, setVYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState<DayData | null>(null);
  const [hovered, setHovered] = useState<DayData | null>(null);

  // Date Range state
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all_time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);

  const allTests = useLiveQuery(() => db.tests.toArray()) ?? [];
  const coachings = useLiveQuery(() => db.coachings.toArray()) ?? [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) ?? [];
  const topics = useLiveQuery(() => db.topics.toArray()) ?? [];

  const cMap = useMemo(() => new Map(coachings.map(c => [c.id!, c.name])), [coachings]);
  const sMap = useMemo(() => new Map(subjects.map(s => [s.id!, s.name])), [subjects]);
  const tMap = useMemo(() => new Map(testTypes.map(t => [t.id!, t.name])), [testTypes]);
  const topMap = useMemo(() => new Map(topics.map(t => [t.id!, t.name])), [topics]);

  const resolve = (t: Test) => {
    const coachingName = cMap.get(t.coachingId) ?? 'Unknown';
    const subjectName = t.subjectId ? (sMap.get(t.subjectId) ?? '') : '';
    const testTypeName = tMap.get(t.testTypeId) ?? 'Unknown';
    const topicName = t.topicId ? (topMap.get(t.topicId) ?? '') : '';
    const testName = topicName || subjectName || 'Multiple Subjects';

    return {
      coaching: coachingName,
      subject: subjectName,
      testType: testTypeName,
      topic: topicName,
      name: testName,
      pct: t.maxMarks > 0 ? Math.round((t.marksObtained / t.maxMarks) * 100) : 0,
      dur: parseDuration(t.timeTaken),
    };
  };

  // Filtered tests based on selected time range
  const filteredTests = useMemo(() => {
    const today = new Date();
    return allTests.filter(t => {
      const d = new Date(t.createdAt);
      if (timeRange === 'this_month') {
        return d.getMonth() === vMonth && d.getFullYear() === vYear;
      }
      if (timeRange === 'last_7_days') {
        const cutoff = new Date();
        cutoff.setDate(today.getDate() - 7);
        cutoff.setHours(0, 0, 0, 0);
        return d >= cutoff;
      }
      if (timeRange === 'last_30_days') {
        const cutoff = new Date();
        cutoff.setDate(today.getDate() - 30);
        cutoff.setHours(0, 0, 0, 0);
        return d >= cutoff;
      }
      if (timeRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : Infinity;
        return t.createdAt >= start && t.createdAt <= end;
      }
      return true; // 'all_time'
    });
  }, [allTests, timeRange, vMonth, vYear, customStartDate, customEndDate]);

  // Group tests by date
  const byDate = useMemo(() => {
    const m = new Map<string, Test[]>();
    allTests.forEach(t => {
      const k = toDateKeyFromTs(t.createdAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    });
    return m;
  }, [allTests]);

  // Build weeks grid for calendar view
  const weeks = useMemo(() => {
    const total = getDaysInMonth(vYear, vMonth);
    const first = getFirstDayOfWeek(vYear, vMonth);
    const all: (DayData | null)[][] = [];
    let row: (DayData | null)[] = new Array(first).fill(null);

    for (let d = 1; d <= total; d++) {
      const date = new Date(vYear, vMonth, d);
      const key = toDateKey(date);
      const tests = byDate.get(key) ?? [];
      row.push({ day: d, dateKey: key, date, tests, count: tests.length });
      if (row.length === 7) { all.push(row); row = []; }
    }
    if (row.length) { while (row.length < 7) row.push(null); all.push(row); }
    return all;
  }, [vYear, vMonth, byDate]);

  const goNext = () => { if (vMonth === 11) { setVMonth(0); setVYear(y => y + 1); } else setVMonth(m => m + 1); };
  const goPrev = () => { if (vMonth === 0) { setVMonth(11); setVYear(y => y - 1); } else setVMonth(m => m - 1); };
  const label = new Date(vYear, vMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Tooltip data
  const tipData = useMemo(() => {
    if (!hovered || hovered.count === 0) return null;
    const r = hovered.tests.map(resolve);
    const tObt = hovered.tests.reduce((a, t) => a + t.marksObtained, 0);
    const tMax = hovered.tests.reduce((a, t) => a + t.maxMarks, 0);
    return { resolved: r, avg: tMax > 0 ? Math.round((tObt / tMax) * 100) : 0 };
  }, [hovered, cMap, sMap, tMap]);

  // Timeline / Test History filtered strictly by date range selection
  const historyTests = useMemo(() => {
    return [...filteredTests].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredTests]);

  return (
    <div className="max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-20">
      {/* Page Header */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative overflow-hidden bg-gradient-to-r from-primary-500/10 via-purple-500/5 to-transparent p-6 sm:p-7 rounded-3xl border border-white/10 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <CalendarIcon className="w-3.5 h-3.5 animate-pulse text-primary-400" /> TEST ACTIVITY CALENDAR
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
            Track your test consistency.
          </h1>
          <p className="mt-2 text-surface-300 max-w-xl text-sm sm:text-base font-medium leading-relaxed">
            Visual heat map of tests taken, scores achieved, and study streaks over time.
          </p>
        </div>

        {/* Date Range Selector Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 bg-surface-950/80 backdrop-blur-xl border border-white/15 p-1.5 rounded-2xl shadow-xl">
            <button 
              onClick={() => setTimeRange('this_month')} 
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer", 
                timeRange === 'this_month' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30" : "text-surface-400 hover:text-white hover:bg-white/5"
              )}
            >
              This Month
            </button>
            <button 
              onClick={() => setTimeRange('all_time')} 
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer", 
                timeRange === 'all_time' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30" : "text-surface-400 hover:text-white hover:bg-white/5"
              )}
            >
              All Time
            </button>
            <button 
              onClick={() => setTimeRange('last_7_days')} 
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer", 
                timeRange === 'last_7_days' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30" : "text-surface-400 hover:text-white hover:bg-white/5"
              )}
            >
              Last 7 Days
            </button>
            <button 
              onClick={() => setTimeRange('last_30_days')} 
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer", 
                timeRange === 'last_30_days' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30" : "text-surface-400 hover:text-white hover:bg-white/5"
              )}
            >
              Last 30 Days
            </button>
            <button 
              onClick={() => { setTimeRange('custom'); setShowCustomDateModal(true); }} 
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5", 
                timeRange === 'custom' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30" : "text-surface-400 hover:text-white hover:bg-white/5"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-primary-300" />
              {timeRange === 'custom' && (customStartDate || customEndDate) ? `${customStartDate || 'Start'} - ${customEndDate || 'Now'}` : 'Custom Range'}
            </button>
          </div>
        </div>
      </section>

      {/* Top Stats Cards (Dynamically reflects filteredTests based on date range!) */}
      <CalendarStats tests={filteredTests} currentMonthDates={[]} />

      {/* Main Grid: Heatmap + History */}
      <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-6 max-w-[1380px] mx-auto">
        {/* ── Calendar (Left Side) ────────────────────────────────────────── */}
        <div className="w-full lg:w-[56%]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${vYear}-${vMonth}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="relative bg-gradient-to-b from-surface-900/90 via-surface-900/70 to-surface-950/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-5 sm:p-6"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl overflow-hidden" />

              {/* Month Navigation Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary-500/15 border border-primary-500/30 text-primary-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-primary-400">Monthly View</p>
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Test Activity Grid</h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-surface-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-inner">
                  <button onClick={goPrev} className="p-2 rounded-xl hover:bg-white/10 text-surface-400 hover:text-white transition cursor-pointer active:scale-95">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-black text-white min-w-[120px] text-center uppercase tracking-wider">{label}</span>
                  <button onClick={goNext} className="p-2 rounded-xl hover:bg-white/10 text-surface-400 hover:text-white transition cursor-pointer active:scale-95">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mb-2.5 relative z-10 max-w-[420px] mx-auto">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[11px] font-black uppercase tracking-wider text-surface-400 py-0.5">{d}</div>
                ))}
              </div>

              {/* Grid */}
              <div className="space-y-1.5 sm:space-y-2.5 relative z-10 max-w-[420px] mx-auto">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                    {week.map((cell, ci) => {
                      const isLeftEdge = ci <= 1;
                      const isRightEdge = ci >= 5;
                      const isTopRow = wi === 0;

                      const horizPos = isLeftEdge ? 'left-0 translate-x-0' : isRightEdge ? 'right-0 left-auto translate-x-0' : 'left-1/2 -translate-x-1/2';
                      const vertPos = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';

                      return (
                        <div key={ci} className="relative aspect-square max-w-[48px] w-full mx-auto">
                          {cell ? (
                            <button
                              onMouseEnter={() => setHovered(cell)}
                              onMouseLeave={() => setHovered(null)}
                              onClick={() => setSelected(cell)}
                              className={cn(
                                "w-full h-full rounded-xl transition-all duration-200 relative flex items-center justify-center font-extrabold text-xs cursor-pointer group",
                                levelClass(cell.count),
                                "hover:ring-2 hover:ring-white/40 hover:scale-[1.08] hover:z-30"
                              )}
                            >
                              <span className={cn("text-[10px] sm:text-xs font-bold", cell.count > 0 ? "opacity-90" : "opacity-40 group-hover:opacity-80")}>
                                {cell.day}
                              </span>
                              {cell.count > 0 && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                              )}
                            </button>
                          ) : (
                            <div />
                          )}

                          {/* Hover Tooltip - Smartly positioned so it never gets cut off */}
                          {hovered && cell && hovered.dateKey === cell.dateKey && (
                            <div className={cn("absolute z-50 pointer-events-none w-60", horizPos, vertPos)}>
                              <motion.div
                                initial={{ opacity: 0, y: isTopRow ? -4 : 4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="bg-surface-950/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] p-3.5 text-left relative"
                              >
                                <p className="text-xs font-black text-white mb-1 flex items-center gap-1.5">
                                  <CalendarIcon className="w-3.5 h-3.5 text-primary-400" />
                                  {cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                {cell.count === 0 ? (
                                  <p className="text-[11px] text-surface-400 font-medium">No tests taken on this day.</p>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                      <span className="text-surface-300 font-bold">{cell.count} Test{cell.count > 1 ? 's' : ''}</span>
                                      {tipData && <span className="text-emerald-400 font-black text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">{tipData.avg}% Avg</span>}
                                    </div>
                                    {tipData && (
                                      <div className="space-y-1.5 border-t border-white/10 pt-1.5">
                                        {tipData.resolved.slice(0, 4).map((r, i) => (
                                          <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                                            <span className="text-surface-300 font-medium truncate">
                                              {r.coaching} · {r.name}
                                            </span>
                                            <span className="font-black text-white shrink-0">{r.pct}%</span>
                                          </div>
                                        ))}
                                        {cell.count > 4 && <p className="text-[10px] text-surface-500 font-bold text-center">+{cell.count - 4} more tests</p>}
                                      </div>
                                    )}
                                  </>
                                )}
                              </motion.div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── History Timeline (Right Side - strictly filtered by date range!) ────────────────────────────────────────── */}
        <div className="w-full lg:w-[44%]">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative overflow-hidden bg-gradient-to-b from-surface-900/90 via-surface-900/70 to-surface-950/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 flex flex-col h-[600px] lg:h-[calc(100vh-14rem)] min-h-[500px]"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 shrink-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Timeline</p>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Test History</h2>
                </div>
              </div>
              <span className="text-xs font-bold text-surface-300 bg-surface-950/80 border border-white/10 px-3 py-1 rounded-full shadow-inner">
                {historyTests.length} {historyTests.length === 1 ? 'test' : 'tests'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar relative z-10">
              {historyTests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Clock className="w-10 h-10 text-surface-600 mb-3" />
                  <p className="text-sm font-bold text-surface-300">No test history for this range</p>
                  <p className="text-xs text-surface-500 mt-1 max-w-xs">Try selecting a different date range above.</p>
                </div>
              ) : (
                historyTests.map((t, i) => {
                  const r = resolve(t);
                  const dateObj = new Date(t.createdAt);
                  const dateStr = dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => navigate(`/app/test-dashboard?testId=${t.id}`)}
                      className="p-4 rounded-2xl bg-surface-900/60 border border-white/8 hover:border-primary-500/40 hover:bg-surface-800/80 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group shadow-sm active:scale-98"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Coaching Logo/Initials Badge */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 via-indigo-500/15 to-purple-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          <span className="text-xs font-black text-primary-300">
                            {r.coaching.substring(0, 3).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-primary-300 transition-colors">
                            {r.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-surface-300 uppercase tracking-wider">
                              {r.testType}
                            </span>
                            {r.subject && r.subject !== r.name && (
                              <span className="text-[10px] text-surface-400 font-medium truncate">
                                · {r.subject}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="text-base font-black text-emerald-400">{r.pct}%</div>
                        <div className="text-[10px] text-surface-400 font-medium mt-0.5">{dateStr} · {timeStr}</div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Custom Date Range Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showCustomDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl" onClick={() => setShowCustomDateModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-b from-surface-900 via-surface-900 to-surface-950 border border-white/15 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 relative overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-2xl" />

              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10 relative z-10">
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary-400" />
                  Select Custom Date Range
                </h3>
                <button onClick={() => setShowCustomDateModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition text-surface-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-300 mb-1.5">Start Date</label>
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    className="w-full bg-surface-950 border border-white/15 rounded-xl px-4 py-3 text-white font-bold text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-inner" 
                    style={{ colorScheme: 'dark' }} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-surface-300 mb-1.5">End Date</label>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    className="w-full bg-surface-950 border border-white/15 rounded-xl px-4 py-3 text-white font-bold text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-inner" 
                    style={{ colorScheme: 'dark' }} 
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button 
                    onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setTimeRange('all_time'); setShowCustomDateModal(false); }}
                    className="flex-1 py-3 rounded-2xl border border-white/10 text-surface-300 font-bold text-xs hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Reset Filter
                  </button>
                  <button 
                    onClick={() => setShowCustomDateModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-primary-500/25 hover:from-primary-500 hover:to-indigo-500 transition-all cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Day Details Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl" onClick={() => setSelected(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-b from-surface-900 via-surface-900 to-surface-950 border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-2xl" />

              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-start justify-between relative z-10 bg-surface-900/80">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary-400" />
                    {selected.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-xs font-bold text-surface-300">
                    <span>Tests: <strong className="text-white">{selected.count}</strong></span>
                    {selected.count > 0 && (() => {
                      const tO = selected.tests.reduce((a, t) => a + t.marksObtained, 0);
                      const tM = selected.tests.reduce((a, t) => a + t.maxMarks, 0);
                      const avg = tM > 0 ? Math.round((tO / tM) * 100) : 0;
                      const mins = selected.tests.reduce((a, t) => a + parseDuration(t.timeTaken), 0);
                      return (
                        <>
                          <span>Avg: <strong className="text-emerald-400">{avg}%</strong></span>
                          {mins > 0 && <span>Time: <strong className="text-sky-300">{fmtMins(mins)}</strong></span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/10 rounded-xl transition text-surface-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Test List */}
              <div className="p-6 overflow-y-auto flex-1 space-y-3 relative z-10 custom-scrollbar">
                {selected.count === 0 ? (
                  <div className="py-12 text-center text-surface-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-surface-600" />
                    <p className="font-bold text-surface-300">No tests taken on this day</p>
                  </div>
                ) : (
                  selected.tests.map((t, i) => {
                    const r = resolve(t);
                    let gradientClass = 'bg-surface-900/70 border-white/10 hover:border-white/20';
                    if (r.pct >= 90) {
                      gradientClass = 'bg-gradient-to-r from-emerald-950/60 to-surface-900/90 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
                    } else if (r.pct >= 75) {
                      gradientClass = 'bg-gradient-to-r from-primary-950/50 to-surface-900/90 border-primary-500/30 hover:border-primary-500/50';
                    } else if (r.pct < 50 && t.maxMarks > 0) {
                      gradientClass = 'bg-gradient-to-r from-rose-950/40 to-surface-900/90 border-rose-500/20 hover:border-rose-500/40';
                    }
                    
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/app/test-dashboard?testId=${t.id}`)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer hover:-translate-y-0.5 active:scale-98 shadow-sm",
                          gradientClass
                        )}
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-black text-primary-300">{r.coaching}</p>
                          {r.subject && <p className="text-xs font-bold text-white truncate">{r.subject}</p>}
                          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{r.testType}</p>
                          <div className="flex items-center gap-3 text-[10px] font-medium text-surface-400 mt-1">
                            {t.questionsCount > 0 && <span>{t.questionsCount} Qs</span>}
                            {r.dur > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-sky-400" />{fmtMins(r.dur)}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-white drop-shadow-sm">{r.pct}%</div>
                          <div className="text-[10px] font-bold text-surface-400 mt-0.5">{t.marksObtained}/{t.maxMarks} pts</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
