import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Test } from '../services/db';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
// Matches the reference: empty = dark slate, active = blue intensities
function levelClass(count: number) {
  if (count === 0) return 'bg-[#1a2030]';
  if (count === 1) return 'bg-[#1d4ed8]/50';
  if (count <= 3) return 'bg-[#3b82f6]/70';
  if (count <= 5) return 'bg-[#3b82f6]';
  return 'bg-[#60a5fa] shadow-[0_0_12px_rgba(96,165,250,0.5)]';
}

// ─── Types ────────────────────────────────────────────────────────
interface DayData {
  day: number;
  dateKey: string;
  date: Date;
  tests: Test[];
  count: number;
}

// ─── Main Component ──────────────────────────────────────────────
export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [vMonth, setVMonth] = useState(now.getMonth());
  const [vYear, setVYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState<DayData | null>(null);
  const [hovered, setHovered] = useState<DayData | null>(null);

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
    
    // Determine the name of the test
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

  // Build weeks grid
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

  const historyTests = useMemo(() => {
    return [...allTests].sort((a, b) => b.createdAt - a.createdAt);
  }, [allTests]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row items-start justify-center px-4 py-6 gap-6 max-w-[90rem] mx-auto">
      {/* ── Calendar (Left Side) ────────────────────────────────────────── */}
      <div className="w-full lg:w-2/3 max-w-3xl lg:max-w-none mx-auto lg:mx-0">

        <AnimatePresence mode="wait">
          <motion.div
            key={`${vYear}-${vMonth}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-[#0f1623] rounded-3xl border border-[#1e293b] shadow-[0_0_80px_rgba(0,0,0,0.4)] p-6 sm:p-8"
          >
            {/* Header */}
            <div className="flex flex-col items-center mb-10 gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Test Activity</h2>
              <div className="flex items-center gap-6">
                <button onClick={goPrev} className="p-2 rounded-lg hover:bg-white/5 text-[#64748b] hover:text-white transition">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-base sm:text-lg font-bold text-white min-w-[140px] text-center">{label}</span>
                <button onClick={goNext} className="p-2 rounded-lg hover:bg-white/5 text-[#64748b] hover:text-white transition">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs sm:text-sm font-semibold text-[#64748b]">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-2 sm:space-y-3">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-2 sm:gap-3">
                  {week.map((cell, ci) => (
                    <div key={ci} className="relative aspect-square">
                      {cell ? (
                        <button
                          onMouseEnter={() => setHovered(cell)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => setSelected(cell)}
                          className={`
                            w-full h-full rounded-lg sm:rounded-xl transition-all duration-200
                            ${levelClass(cell.count)}
                            hover:ring-2 hover:ring-white/20 hover:scale-[1.06]
                          `}
                        />
                      ) : (
                        <div />
                      )}

                      {/* Tooltip */}
                      {hovered && cell && hovered.dateKey === cell.dateKey && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none">
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1a2030] border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-4 w-60 text-left"
                          >
                            <p className="text-sm font-bold text-white mb-1">
                              📅 {cell.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            {cell.count === 0 ? (
                              <p className="text-xs text-[#64748b]">No tests taken.</p>
                            ) : (
                              <>
                                <p className="text-xs text-[#94a3b8]">{cell.count} Test{cell.count > 1 ? 's' : ''} Taken</p>
                                {tipData && (
                                  <>
                                    <p className="text-xs text-emerald-400 font-bold mt-1 mb-2">Overall Average: {tipData.avg}%</p>
                                    <div className="space-y-1.5 border-t border-white/5 pt-2">
                                      {tipData.resolved.slice(0, 4).map((r, i) => (
                                        <div key={i} className="flex items-start justify-between gap-2">
                                          <span className="text-[10px] text-[#94a3b8] leading-snug">
                                            {r.coaching} • {r.subject ? `${r.subject} • ` : ''}{r.testType}
                                          </span>
                                          <span className="text-[11px] font-black text-white shrink-0">{r.pct}%</span>
                                        </div>
                                      ))}
                                      {cell.count > 4 && <p className="text-[10px] text-[#475569]">+{cell.count - 4} more</p>}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#1a2030]" />
                          </motion.div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f1623] border border-[#1e293b] rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    {selected.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#94a3b8]">
                    <span>Tests: <strong className="text-white">{selected.count}</strong></span>
                    {selected.count > 0 && (() => {
                      const tO = selected.tests.reduce((a, t) => a + t.marksObtained, 0);
                      const tM = selected.tests.reduce((a, t) => a + t.maxMarks, 0);
                      const avg = tM > 0 ? Math.round((tO / tM) * 100) : 0;
                      const mins = selected.tests.reduce((a, t) => a + parseDuration(t.timeTaken), 0);
                      return (
                        <>
                          <span>Avg: <strong className="text-emerald-400">{avg}%</strong></span>
                          {mins > 0 && <span>Time: <strong className="text-white">{fmtMins(mins)}</strong></span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/10 rounded-xl transition text-[#64748b] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tests */}
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                {selected.count === 0 ? (
                  <p className="text-center text-[#64748b] py-12">No tests taken on this day.</p>
                ) : (
                  selected.tests.map((t, i) => {
                    const r = resolve(t);
                    let gradientClass = 'bg-white/[0.03] border-white/5 hover:border-white/10';
                    if (r.pct >= 90) {
                      gradientClass = 'bg-gradient-to-r from-emerald-900/60 to-white/[0.03] border-emerald-500/30 hover:border-emerald-500/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]';
                    } else if (r.pct >= 75) {
                      gradientClass = 'bg-gradient-to-r from-emerald-900/30 to-white/[0.03] border-emerald-500/20 hover:border-emerald-500/40';
                    } else if (r.pct < 50 && t.maxMarks > 0) {
                      gradientClass = 'bg-gradient-to-r from-red-900/20 to-white/[0.03] border-red-500/10 hover:border-red-500/30';
                    }
                    
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/app/test-dashboard?testId=${t.id}`)}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer hover:-translate-y-0.5 ${gradientClass}`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-blue-400">{r.coaching}</p>
                          {r.subject && <p className="text-xs font-medium text-[#94a3b8]">{r.subject}</p>}
                          <p className="text-xs text-purple-400">{r.testType}</p>
                          <div className="flex items-center gap-3 text-[10px] text-[#475569] mt-1">
                            {t.questionsCount > 0 && <span>{t.questionsCount} Qs</span>}
                            {r.dur > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtMins(r.dur)}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-white">{r.pct}%</div>
                          <div className="text-[10px] text-[#475569]">{t.marksObtained}/{t.maxMarks}</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── History (Right Side) ────────────────────────────────────────── */}
      <div className="w-full lg:w-1/3 max-w-3xl lg:max-w-none mx-auto lg:mx-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[#0f1623] rounded-3xl border border-[#1e293b] shadow-[0_0_80px_rgba(0,0,0,0.4)] p-6 sm:p-8 flex flex-col h-[600px] lg:h-[calc(100vh-8rem)] min-h-[500px]"
        >
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <Clock className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Test History</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#1e293b] scrollbar-track-transparent">
            {historyTests.length === 0 ? (
              <p className="text-center text-[#64748b] py-12">No test history available.</p>
            ) : (
              historyTests.map((t, i) => {
                const r = resolve(t);
                const dateObj = new Date(t.createdAt);
                const dateStr = dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
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
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Coaching Logo/Initials */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-indigo-300">
                          {r.coaching.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {r.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-[#94a3b8]">
                            {r.testType}
                          </span>
                          {r.subject && r.subject !== r.name && (
                            <span className="text-[10px] text-[#64748b] truncate">
                              • {r.subject}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <Clock className="w-3.5 h-3.5" />
                        {fmtMins(r.dur)}
                      </div>
                      <div className="text-[10px] text-[#64748b] text-right">
                        <div>{dateStr}</div>
                        <div>at {timeStr}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
