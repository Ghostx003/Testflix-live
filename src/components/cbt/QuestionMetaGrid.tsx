import React from 'react';


export interface QuestionMetaGridProps {
  subjectName: string;
  questionNumberText: string;
  typeText: string;
  statusText: string;
}

export const QuestionMetaGrid: React.FC<QuestionMetaGridProps> = ({
  subjectName, questionNumberText, typeText, statusText
}) => {
  const meta = [
    { label: 'SECTION', value: subjectName || 'General' },
    { label: 'QUESTION', value: questionNumberText },
    { label: 'TYPE', value: typeText },
    { label: 'STATUS', value: statusText }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {meta.map((item, idx) => (
        <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</span>
          <span className="text-sm font-semibold text-white truncate">{item.value}</span>
        </div>
      ))}
    </div>
  );
};
