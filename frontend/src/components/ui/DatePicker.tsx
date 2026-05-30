'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Portal from './Portal';
import useFloatingPosition from '@/hooks/useFloatingPosition';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  minDate,
  maxDate,
  className = '',
  required = false,
  disabled = false,
  error,
  analyticsId: _analyticsId,
  analyticsLabel: _analyticsLabel,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    selectedDate || new Date()
  );
  const _calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const floatingPosition = useFloatingPosition({
    triggerRef: containerRef,
    floatingRef,
    isOpen: showCalendar,
    placement: 'auto',
    offset: 8,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) &&
          floatingRef.current && !floatingRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    }
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    onChange(formatDate(newDate));
    setShowCalendar(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      const isDisabled = isDateDisabled(date);

      days.push(
        <motion.button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => handleDateSelect(day)}
          className={`
            p-2 rounded-lg text-sm font-medium transition-all duration-200
            ${isSelected 
              ? 'bg-[var(--primary-blue)] text-white' 
              : isToday
              ? 'bg-[rgba(var(--primary-blue),0.1)] text-[var(--primary-blue)]'
              : 'hover:bg-[rgba(var(--glass-rgb),0.3)] text-[var(--text-1)]'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
        >
          {day}
        </motion.button>
      );
    }

    return days;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
          {label}
          {required && <span className="text-[var(--primary-red)] ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={selectedDate ? formatDisplayDate(selectedDate) : ''}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          required={required}
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          className={`
            w-full px-4 py-2.5 pr-10 rounded-lg
            bg-[rgba(var(--glass-rgb),0.3)] 
            border border-[var(--border-1)]
            text-[var(--text-1)] placeholder-[var(--text-2)]
            focus:outline-none focus:border-[var(--primary-blue)]
            transition-all duration-200 cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Calendar size={18} className="text-[var(--text-2)]" />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-[var(--primary-red)]">{error}</p>
      )}

      <AnimatePresence>
        {showCalendar && !disabled && (
          <Portal>
            <motion.div
              ref={floatingRef}
              style={{
                position: 'fixed',
                top: floatingPosition.top,
                left: floatingPosition.left,
                minWidth: '280px',
                zIndex: 9999,
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.95)] 
                       backdrop-blur-xl border border-[var(--glass-border-prominent)] 
                       shadow-xl"
            >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1 rounded hover:bg-[rgba(var(--glass-rgb),0.3)] transition-colors"
              >
                <ChevronLeft size={18} className="text-[var(--text-2)]" />
              </button>
              
              <h3 className="font-medium text-[var(--text-1)]">
                {currentMonth.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h3>
              
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1 rounded hover:bg-[rgba(var(--glass-rgb),0.3)] transition-colors"
              >
                <ChevronRight size={18} className="text-[var(--text-2)]" />
              </button>
            </div>

            {/* Calendar Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-[var(--text-2)] p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>

            {/* Today Button */}
            <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setCurrentMonth(today);
                  onChange(formatDate(today));
                  setShowCalendar(false);
                }}
                className="w-full py-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] 
                         hover:bg-[rgba(var(--glass-rgb),0.5)] text-sm font-medium 
                         text-[var(--text-1)] transition-colors"
              >
                Today
              </button>
            </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatePicker;
