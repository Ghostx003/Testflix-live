import React from 'react';

export interface SidebarProps {
  questionsCount: number;
  responses: any[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  questionsCount, responses, activeIndex, onNavigate
}) => {
  const answered = responses.filter(r => r.status === 'answered' || r.status === 'answered_review').length;
  const review = responses.filter(r => r.status === 'review' || r.status === 'answered_review').length;
  const notVisited = responses.filter(r => r.status === 'not_visited').length;


  const metrics = [
    { label: 'ANSWERED', value: answered },
    { label: 'REVIEW', value: review },
    { label: 'NOT VISITED', value: notVisited },
    { label: 'TOTAL', value: questionsCount }
  ];

  return (
    <div className="flex-[1] min-w-[300px] flex flex-col gap-4">
      {/* Test Progress Panel */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">TEST PROGRESS</div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-slate-800 border border-slate-700 rounded-md p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">{metric.label}</span>
              <span className="text-lg font-bold text-white">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Question Palette Panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-md p-4 flex-1 flex flex-col">
        <div className="text-xs font-bold text-slate-400 uppercase mb-4">QUESTION PALETTE</div>
        
        <div className="grid grid-cols-5 gap-2 overflow-y-auto pr-2 flex-[1] min-h-[100px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          {responses.map((r, i) => {
            let stateClass = "bg-slate-300 text-slate-700 hover:bg-slate-400"; // not_visited
            
            const isActive = i === activeIndex;

            if (r.status === 'not_answered') stateClass = "bg-red-500 text-white border-none hover:bg-red-600";
            else if (r.status === 'answered') stateClass = "bg-green-500 text-white border-none hover:bg-green-600";
            else if (r.status === 'review') stateClass = "bg-purple-500 text-white border-none hover:bg-purple-600";
            else if (r.status === 'answered_review') stateClass = "bg-purple-600 text-white border-none hover:bg-purple-700 relative";
            
            // If active and not visited, we temporarily show it as not answered (red) for the user's focus
            if (isActive && r.status === 'not_visited') {
              stateClass = "bg-red-500 text-white border-none hover:bg-red-600";
            }
            
            const activeClass = isActive ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800 shadow-[0_0_12px_rgba(255,255,255,0.7)] z-10 scale-105" : "";

            return (
              <button 
                key={i} 
                onClick={() => onNavigate(i)}
                className={`relative aspect-square rounded-md flex items-center justify-center text-sm font-semibold transition-all duration-200 ${stateClass} ${activeClass}`}
              >
                {i + 1}
                {r.status === 'answered_review' && (
                  <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border-[1px] border-purple-800" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-800 border border-slate-700 rounded-md p-4 text-xs">
        <div className="font-bold text-slate-400 uppercase mb-3">INSTRUCTIONS LEGEND</div>
        <div className="grid grid-cols-1 gap-2.5">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-300 text-slate-700 font-bold shrink-0 text-[10px]">1</div>
            <span className="text-slate-300 leading-tight">You have NOT visited the question yet.</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-red-500 text-white font-bold shrink-0 text-[10px]">2</div>
            <span className="text-slate-300 leading-tight">You have NOT answered the question.</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-green-500 text-white font-bold shrink-0 text-[10px]">3</div>
            <span className="text-slate-300 leading-tight">You have answered the question. <strong className="text-white">This will be evaluated.</strong></span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-500 text-white font-bold shrink-0 text-[10px]">4</div>
            <span className="text-slate-300 leading-tight">You have NOT answered the question but marked it for review.</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-600 text-white font-bold shrink-0 text-[10px] relative">
              5
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green-400 border border-purple-800" />
            </div>
            <span className="text-slate-300 leading-tight">You have answered the question and marked it for review. <strong className="text-white">This will also be evaluated.</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
