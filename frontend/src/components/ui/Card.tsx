import React from 'react';
import { motion } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'prominent' | 'subtle' | 'stats' | 'error';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  padding = 'md',
  hoverable = false,
  onClick,
  analyticsId,
  analyticsLabel,
  ...restProps
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  const variantClasses = {
    default: 'glass-card',
    error: `
      glass-card
      border border-[var(--primary-red)]
    `,
    prominent: `
      bg-[rgba(var(--glass-rgb),var(--glass-alpha-high))]
      backdrop-blur-xl
      border border-[var(--glass-border-prominent)]
      shadow-lg
    `,
    subtle: `
      bg-[rgba(var(--glass-rgb),0.2)]
      backdrop-blur-sm
      border border-[var(--glass-border)]
    `,
    stats: `
      glass-card
      relative
      overflow-hidden
      before:content-['']
      before:absolute
      before:top-0
      before:left-0
      before:right-0
      before:h-1
      before:bg-gradient-to-r
      before:from-[var(--primary-blue)]
      before:to-[var(--primary-indigo)]
    `,
  };

  const hoverClasses = hoverable
    ? `
      transition-all duration-300
      hover:shadow-xl
      hover:scale-[1.02]
      hover:border-[var(--glass-border-prominent)]
      cursor-pointer
    `
    : '';

  const combinedClasses = `
    rounded-xl
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${hoverClasses}
    ${className}
  `;

  const Component: React.ElementType = onClick ? motion.div : 'div';
  const componentProps = onClick
    ? {
        whileHover: hoverable ? { scale: 1.02 } : {},
        whileTap: { scale: 0.98 },
        onClick: () => {
          const _cardLabel = analyticsLabel || 'card';
          const _cardId = analyticsId || `${variant}-card`;
          onClick();
        },
        role: 'button',
        tabIndex: 0,
      }
    : {};

  return (
    <Component className={combinedClasses} {...componentProps} {...restProps}>
      {children}
    </Component>
  );
};

// Card Header component
export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

// Card Body component
export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`flex-1 ${className}`}>{children}</div>
);

// Card Footer component
export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-[var(--border-1)] ${className}`}>
    {children}
  </div>
);

export default Card;
