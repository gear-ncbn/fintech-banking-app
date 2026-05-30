import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Portal from './Portal';
import useFloatingPosition from '@/hooks/useFloatingPosition';

interface DropdownItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  position?: 'bottom' | 'top';
  analyticsId?: string;
  analyticsLabel?: string;
  icon?: React.ReactNode;
  trigger?: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  items = [],
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  fullWidth = false,
  position = 'bottom',
  analyticsId,
  analyticsLabel,
  icon,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const customTriggerRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  const selectedItem = items?.find(item => item.value === value);
  
  const floatingPosition = useFloatingPosition({
    triggerRef: trigger ? customTriggerRef : triggerRef,
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

  const handleSelect = (item: DropdownItem) => {
    if (!item.disabled) {
      // Log analytics event
      const dropdownLabel = label || analyticsLabel || placeholder;
      const _dropdownId = analyticsId || `dropdown-${dropdownLabel}`;
      
      onChange?.(item.value);
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

  const wrapperClasses = `relative ${fullWidth ? 'w-full' : ''}`;

  return (
    <div className={wrapperClasses} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-1)] mb-1.5">
          {label}
        </label>
      )}
      
      {trigger ? (
        <div
          ref={customTriggerRef}
          onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
          className={`inline-flex ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {trigger}
        </div>
      ) : (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            
            // Log analytics event
            const dropdownLabel = label || analyticsLabel || placeholder;
            const _dropdownId = analyticsId || `dropdown-${dropdownLabel}`;
          }
        }}
        disabled={disabled}
        className={`
          w-full
          px-4 py-2.5
          rounded-lg
          bg-[var(--input-bg)]
          border border-[var(--border-1)]
          text-left
          transition-all duration-200
          focus:outline-none
          focus:ring-2
          focus:ring-[var(--primary-blue)]
          focus:ring-opacity-50
          focus:border-[var(--primary-blue)]
          hover:border-[var(--border-2)]
          ${error ? 'field-error' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          flex items-center justify-between
        `}
      >
        <div className="flex items-center gap-2">
          {(selectedItem?.icon || icon) && (
            <span className="text-[var(--text-2)]">{selectedItem?.icon || icon}</span>
          )}
          <span className={selectedItem ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]'}>
            {selectedItem?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`
            text-[var(--text-2)]
            transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <motion.div
              ref={floatingRef}
              style={{
                position: 'fixed',
                top: floatingPosition.top,
                left: floatingPosition.left,
                width: fullWidth ? floatingPosition.width : 'auto',
                minWidth: fullWidth ? floatingPosition.width : '200px',
                zIndex: 9999,
              }}
              className={`
                bg-[rgb(var(--glass-rgb)/0.97)]
                backdrop-blur-xl
                border border-[var(--glass-border-prominent)]
                rounded-lg
                shadow-xl
                overflow-hidden
                max-h-60
                overflow-y-auto
              `}
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {items && items.length > 0 ? items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={`
                    w-full
                    px-4 py-2.5
                    text-left
                    flex items-center gap-2
                    transition-all duration-150
                    ${item.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-[rgba(var(--glass-rgb),0.3)] cursor-pointer'
                    }
                    ${item.value === value ? 'bg-[rgba(var(--glass-rgb),0.2)]' : ''}
                  `}
                >
                  {item.icon && (
                    <span className="text-[var(--text-2)]">{item.icon}</span>
                  )}
                  <span className="text-[var(--text-1)]">{item.label}</span>
                </button>
              )) : (
                <div className="px-4 py-2.5 text-[var(--text-2)] text-center">
                  No options available
                </div>
              )}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-1 text-sm text-[var(--primary-red)]">{error}</p>
      )}
    </div>
  );
};

export default Dropdown;
