import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

export interface MultiSelectProps {
  values: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  values,
  onChange,
  options,
  placeholder = 'Select options',
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (value: string | number) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const displayText = values.length === 0 
    ? placeholder 
    : values.length === 1 
      ? options.find(o => o.value === values[0])?.label 
      : `${values.length} selected`;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border bg-surface-900/40 backdrop-blur-sm px-3 py-2 text-sm transition-all duration-300 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          disabled ? "opacity-50 cursor-not-allowed border-white/5" : "border-white/10 hover:border-white/20 cursor-pointer text-surface-50",
          isOpen && "border-primary-500/50 ring-2 ring-primary-500/20",
          values.length > 0 && "bg-primary-500/10 border-primary-500/30 text-primary-300 font-medium"
        )}
      >
        <span className={cn("block truncate", values.length === 0 && "text-surface-400")}>
          {displayText}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 origin-top rounded-xl border border-white/10 bg-surface-800/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="max-h-60 overflow-auto py-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
              {options.length === 0 ? (
                <div className="px-4 py-3 text-sm text-surface-400 text-center">No options available</div>
              ) : (
                options.map((option) => {
                  const isSelected = values.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2 text-sm transition-colors",
                        isSelected ? "bg-primary-500/20 text-primary-300 font-medium" : "text-surface-200 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", isSelected ? "bg-primary-500 border-primary-400 text-white" : "border-surface-500")}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
