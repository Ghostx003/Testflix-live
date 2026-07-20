import React, { type ComponentProps } from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

export interface ButtonProps extends ComponentProps<typeof motion.button> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary-600 text-white hover:bg-primary-500 focus-visible:ring-primary-600 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]': variant === 'primary',
            'bg-surface-800 text-surface-100 hover:bg-surface-700': variant === 'secondary',
            'border border-white/10 bg-transparent hover:bg-white/5 text-surface-200 hover:text-white': variant === 'outline',
            'hover:bg-white/5 text-surface-200 hover:text-white': variant === 'ghost',
            'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/30': variant === 'danger',
            'glass-button text-surface-100 hover:text-white shadow-lg shadow-black/20': variant === 'glass',
            'h-9 px-4 text-sm': size === 'sm',
            'h-11 px-6 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
