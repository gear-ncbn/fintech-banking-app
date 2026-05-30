import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderDropdownItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  divider?: boolean;
  disabled?: boolean;
  className?: string;
}

interface HeaderDropdownProps {
  items: HeaderDropdownItem[];
  onChange?: (value: string) => void;
  trigger: React.ReactNode;
  align?: 'left' | 'right';
  width?: string;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  items,
  onChange,
  trigger,
  align = 'right',
  width = 'w-56',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: HeaderDropdownItem) => {
    if (!item.disabled && !item.divider) {
      onChange?.(item.value);
      setIsOpen(false);
    }
  };

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.15,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.1,
        ease: 'easeIn',
      },
    },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`
              absolute
              ${align === 'right' ? 'right-0' : 'left-0'}
              mt-2
              ${width}
              bg-[rgba(var(--glass-rgb),0.95)]
              backdrop-blur-xl
              border border-[var(--glass-border-prominent)]
              rounded-lg
              shadow-xl
              overflow-hidden
              z-[100]
              py-1
            `}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {items.map((item, index) => {
              if (item.divider) {
                return (
                  <div
                    key={`divider-${index}`}
                    className="h-px bg-[var(--border-1)] my-1"
                  />
                );
              }

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={`
                    w-full
                    px-4 py-2
                    text-left
                    flex items-center gap-3
                    transition-all duration-150
                    text-sm
                    ${item.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-[rgba(var(--glass-rgb),0.3)] cursor-pointer'
                    }
                    ${item.className || ''}
                  `}
                >
                  {item.icon && (
                    <span className="text-[var(--text-2)] flex-shrink-0">{item.icon}</span>
                  )}
                  <span className="text-[var(--text-1)]">{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeaderDropdown;