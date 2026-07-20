import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export interface QuestionViewProps {
  question: any;
  response: any;
  onResponseChange: (val: string[]) => void;
  onNumericalChange: (val: number | undefined) => void;
  questionNumber: number;
}

const renderWithMath = (text?: string) => {
  if (!text) return null;
  const parts = text.split(/(\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={i} math={part.slice(1, -1)} />;
    }
    return <span key={i}>{part}</span>;
  });
};

export const QuestionView: React.FC<QuestionViewProps> = ({
  question,
  response,
  onResponseChange,
  onNumericalChange,
  questionNumber
}) => {
  const [showSolution, setShowSolution] = useState(false);
  const options = ['A', 'B', 'C', 'D'];
  
  const isMSQ = question?.optionsType === 'MSQ' || (question?.selectedOptions && question.selectedOptions.length > 1);
  const displayType = question?.optionsType === 'NAT' ? 'NAT' : (isMSQ ? 'MSQ' : 'MCQ');
  const selectedOptions = response?.selectedOptions || [];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg flex-1 flex flex-col">
      {/* Question Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-700">
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="text-lg font-bold text-white">Q{questionNumber}</span>
            <span className="bg-slate-700 text-blue-300 text-[10px] px-2 py-0.5 rounded-full ml-2 font-medium">
              {displayType}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="border border-slate-600 text-slate-300 rounded-full px-3 py-1 text-xs font-medium uppercase">
            {String(response?.status || 'Not Visited').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6 text-slate-200 text-base leading-relaxed overflow-y-auto">
        {question?.questionText && (
          <div className="mb-4">{renderWithMath(question.questionText)}</div>
        )}
        
        {question?.questionImage && (
          <div className="mb-4">
            <img 
              src={URL.createObjectURL(question.questionImage)} 
              alt="Question" 
              className="max-w-full rounded-md border border-slate-700" 
            />
          </div>
        )}

        {/* Options List for MCQ / MSQ */}
        {displayType !== 'NAT' && (
          <div className="flex flex-col gap-3 mt-6">
            {options.map((opt) => {
              const isSelected = selectedOptions.includes(opt);
              return (
              <label 
                key={opt} 
                className={`bg-slate-900 border ${isSelected ? 'border-blue-500' : 'border-slate-700'} rounded-md p-4 flex items-center gap-3 hover:border-slate-500 cursor-pointer transition-colors`}
              >
                <input 
                  type={isMSQ ? "checkbox" : "radio"} 
                  name={`q${question?.id}`} 
                  value={opt} 
                  checked={isSelected}
                  onChange={() => {
                    if (isMSQ) {
                      if (isSelected) {
                        onResponseChange(selectedOptions.filter((o: string) => o !== opt));
                      } else {
                        onResponseChange([...selectedOptions, opt]);
                      }
                    } else {
                      onResponseChange([opt]);
                    }
                  }}
                  className="hidden" 
                />
                <div className={`w-4 h-4 ${isMSQ ? 'rounded-sm' : 'rounded-full'} border flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-500'}`}>
                  {isSelected && (
                    isMSQ ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )
                  )}
                </div>
                <span className="text-white font-bold w-4">{opt}.</span>
                <div className="text-slate-300">
                  Select Option {opt}
                </div>
              </label>
              );
            })}
          </div>
        )}

        {/* NAT Input */}
        {displayType === 'NAT' && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">Your Answer:</label>
            <input 
              type="number"
              value={response?.numericalAnswer !== undefined && response?.numericalAnswer !== null && !isNaN(response.numericalAnswer) ? response.numericalAnswer : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onNumericalChange(undefined);
                } else {
                  const parsed = parseFloat(val);
                  onNumericalChange(isNaN(parsed) ? undefined : parsed);
                }
              }}
              onKeyDown={(e) => {
                if (['e', 'E', '+'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter numerical value..."
            />
          </div>
        )}
      </div>

      {/* Solution Accordion */}
      {(question?.answerImage || question?.notes) && (
        <div 
          className="mx-6 mb-6 bg-slate-900/50 border border-slate-700 rounded-md p-3 flex flex-col gap-2 cursor-pointer hover:bg-slate-900 transition-colors"
          onClick={() => setShowSolution(!showSolution)}
        >
          <div className="flex items-center gap-2">
            <ChevronRight className={`w-4 h-4 text-blue-400 transition-transform ${showSolution ? 'rotate-90' : ''}`} />
            <span className="text-sm font-medium text-blue-400">Solution / Notes</span>
          </div>
          
          {showSolution && (
            <div className="mt-2 pt-2 border-t border-slate-700 text-sm text-slate-300">
              {question.notes && <p className="mb-2">{question.notes}</p>}
              {question.answerImage && (
                <img 
                  src={URL.createObjectURL(question.answerImage)} 
                  alt="Solution" 
                  className="max-w-full rounded-md mt-2"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
