import React from 'react';

export interface ActionFooterProps {
  onPrevious: () => void;
  onClear: () => void;
  onReview: () => void;
  onSaveNext: () => void;
  disablePrevious: boolean;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
  onPrevious, onClear, onReview, onSaveNext, disablePrevious
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-700">
      {/* Left Group */}
      <div className="flex gap-3">
        <button 
          onClick={onPrevious}
          disabled={disablePrevious}
          className="border border-slate-600 hover:bg-slate-800 text-slate-300 px-6 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button 
          onClick={onClear}
          className="border border-slate-600 hover:bg-slate-800 text-slate-300 px-6 py-2 rounded-md transition-colors text-sm font-medium"
        >
          Clear Response
        </button>
        <button 
          onClick={onReview}
          className="border border-slate-600 hover:bg-slate-800 text-slate-300 px-6 py-2 rounded-md transition-colors text-sm font-medium"
        >
          Mark for Review
        </button>
      </div>

      {/* Right Group */}
      <div>
        <button 
          onClick={onSaveNext}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-md font-semibold transition-colors"
        >
          Save & Next
        </button>
      </div>
    </div>
  );
};
