import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from './Portal';
import useFloatingPosition from '@/hooks/useFloatingPosition';

export interface ActionDropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionDropdownProps {
  trigger: React.ReactNode;
  items: ActionDropdownItem[];
  align?: 'left' | 'right';
  position?: 'bottom' | 'top';
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  trigger,
  items,
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  const floatingPosition = useFloatingPosition({
    triggerRef,
    floatingRef,
    isOpen,
    placement: position === 'bottom' ? 'bottom' : 'top',
    offset: 8,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          floatingRef.current && !floatingRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item: ActionDropdownItem, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: position === 'bottom' ? -10 : 10,
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
      y: position === 'bottom' ? -10 : 10,
      scale: 0.95,
      transition: {
        duration: 0.1,
        ease: 'easeIn',
      },
    },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <motion.div
              ref={floatingRef}
              style={{
                position: 'fixed',
                top: floatingPosition.top,
                left: floatingPosition.left,
                zIndex: 9999,
              }}
              className={`
                min-w-[180px]
                bg-[rgba(var(--glass-rgb),0.95)]
                backdrop-blur-xl
                border border-[var(--glass-border-prominent)]
                rounded-lg
                shadow-xl
                overflow-hidden
                py-1
              `}
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {items.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => handleItemClick(item, e)}
                  disabled={item.disabled}
                  className={`
                    w-full
                    px-4 py-2.5
                    text-left
                    flex items-center gap-3
                    transition-all duration-150
                    text-sm
                    ${item.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-[rgba(var(--glass-rgb),0.3)] cursor-pointer'
                    }
                    ${item.variant === 'danger' ? 'text-[var(--primary-red)] hover:bg-[rgba(var(--primary-red-rgb),0.1)]' : ''}
                  `}
                >
                  {item.icon && (
                    <span className={`flex-shrink-0 ${item.variant === 'danger' ? '' : 'text-[var(--text-2)]'}`}>
                      {item.icon}
                    </span>
                  )}
                  <span className={item.variant === 'danger' ? '' : 'text-[var(--text-1)]'}>
                    {item.label}
                  </span>
                </button>
              ))}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActionDropdown;