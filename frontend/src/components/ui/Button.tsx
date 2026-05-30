import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  analyticsId,
  analyticsLabel,
  onClick,
  ...restProps
}) => {
  const isBusy = loading || isLoading;
  const dataTestId = (restProps as { 'data-testid'?: string })['data-testid'];
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    interactive-scale
    touch-manipulation
    tap-highlight-transparent
    ${fullWidth ? 'w-full' : ''}
    ${disabled || isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[44px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[52px]',
  };

  const variantClasses = {
    primary: `
      btn-primary text-white
      border border-[rgba(255,255,255,0.1)]
      focus:ring-offset-2 focus:ring-[var(--primary-blue)]
    `,
    secondary: `
      bg-[rgba(var(--glass-rgb),0.3)] 
      backdrop-blur-sm
      border border-[var(--glass-border)]
      text-[var(--text-1)]
      hover:bg-[rgba(var(--glass-rgb),0.5)]
      hover:border-[var(--glass-border-prominent)]
      focus:ring-[var(--primary-blue)]
    `,
    success: `
      gradient-success text-white
      border border-transparent
      focus:ring-[var(--primary-emerald)]
    `,
    danger: `
      gradient-danger text-white
      border border-transparent
      focus:ring-[var(--primary-red)]
    `,
    ghost: `
      bg-transparent
      text-[var(--text-1)]
      hover:bg-[rgba(var(--glass-rgb),0.2)]
      focus:ring-[var(--primary-blue)]
    `,
    outline: `
      bg-transparent
      border border-[var(--glass-border-prominent)]
      text-[var(--text-1)]
      hover:bg-[rgba(var(--glass-rgb),0.2)]
      focus:ring-[var(--primary-blue)]
    `,
  };

  const combinedClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  // Generate stable ID based on text content or analytics ID
  const buttonText = typeof children === 'string' ? children : analyticsLabel || 'button';
  const stableId = restProps.id || analyticsId || dataTestId || 
    `button-${buttonText.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isBusy) {
      // Log analytics event
      
      // Call original onClick handler
      if (onClick) {
        onClick(e);
      }
    }
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={combinedClasses}
      disabled={disabled || isBusy}
      onClick={handleClick}
      data-testid={stableId}
      {...(restProps as HTMLMotionProps<'button'>)}
    >
      {isBusy && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {icon && !isBusy && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};

export default Button;
