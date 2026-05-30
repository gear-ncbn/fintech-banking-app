import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, CheckCircle, XCircle, Lock } from 'lucide-react';
import Button from './Button';

interface TwoFactorInputProps {
  onComplete: (code: string) => void;
  onResend?: () => void;
  length?: number;
  error?: string;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  autoFocus?: boolean;
  type?: 'numeric' | 'alphanumeric';
  analyticsId?: string;
  analyticsLabel?: string;
}

export const TwoFactorInput: React.FC<TwoFactorInputProps> = ({
  onComplete,
  onResend,
  length = 6,
  error,
  loading = false,
  title = 'Enter verification code',
  subtitle = 'We sent a code to your registered device',
  autoFocus = true,
  type = 'numeric',
  analyticsId = 'two-factor-input',
  analyticsLabel = '2FA Input',
}) => {
  const [values, setValues] = useState<string[]>(new Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Check if code is complete
  useEffect(() => {
    const code = values.join('');
    if (code.length === length && !values.includes('')) {
      setIsComplete(true);
      // Log analytics event for code completion
      // For demo purposes, only accept the demo code
      if (code === '123456') {
        onComplete(code);
      } else {
        setIsComplete(false);
        setValues(new Array(length).fill(''));
        inputRefs.current[0]?.focus();
      }
    } else {
      setIsComplete(false);
    }
  }, [values, length, onComplete, analyticsId, analyticsLabel]);

  const handleChange = (index: number, value: string) => {
    // Validate input based on type
    if (type === 'numeric' && !/^\d*$/.test(value)) return;
    if (type === 'alphanumeric' && !/^[a-zA-Z0-9]*$/.test(value)) return;

    // Log analytics event for input change

    const newValues = [...values];
    
    // Handle paste
    if (value.length > 1) {
      const pastedValues = value.slice(0, length - index).split('');
      pastedValues.forEach((char, i) => {
        if (index + i < length) {
          newValues[index + i] = char;
        }
      });
      setValues(newValues);
      
      // Focus next empty input or last input
      const nextEmptyIndex = newValues.findIndex((v, i) => i >= index && v === '');
      const targetIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
      if (inputRefs.current[targetIndex]) {
        inputRefs.current[targetIndex]?.focus();
      }
    } else {
      // Handle single character
      newValues[index] = value.slice(-1);
      setValues(newValues);
      
      // Move to next input
      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer === 0 && onResend) {
      // Log analytics event for resend
      onResend();
      setResendTimer(30);
      setValues(new Array(length).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-1)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--text-2)]">{subtitle}</p>
      </motion.div>

      {/* Demo Code Display */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)] text-center"
      >
        <p className="text-sm text-[var(--text-2)] mb-1">Demo Code:</p>
        <p className="text-2xl font-bold text-[var(--text-1)] tracking-widest">123456</p>
      </motion.div>

      {/* Input Grid */}
      <motion.div
        className="flex justify-center gap-2 sm:gap-3 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {values.map((value, index) => (
          <motion.div key={index} variants={itemVariants}>
            <input
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode={type === 'numeric' ? 'numeric' : 'text'}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              disabled={loading || isComplete}
              className={`
                w-12 h-14 sm:w-14 sm:h-16
                text-center text-xl font-bold
                rounded-lg
                bg-[var(--input-bg)]
                border-2
                transition-all duration-200
                ${focusedIndex === index
                  ? 'border-[var(--primary-blue)] ring-2 ring-[var(--primary-blue)] ring-opacity-50'
                  : value
                  ? 'border-[var(--primary-emerald)]'
                  : 'border-[var(--border-1)]'
                }
                ${error ? 'border-[var(--primary-red)]' : ''}
                ${loading || isComplete ? 'opacity-50 cursor-not-allowed' : ''}
                hover:border-[var(--border-2)]
                focus:outline-none
              `}
              maxLength={1}
              autoComplete="off"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-2 mb-4 text-[var(--primary-red)]"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}
        
        {isComplete && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 mb-4 text-[var(--primary-emerald)]"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Verifying code...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resend Section */}
      {onResend && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-[var(--text-2)] mb-3">
            Didn&apos;t receive the code?
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResend}
            disabled={resendTimer > 0}
            icon={<RefreshCw size={16} />}
            analyticsId={`${analyticsId}-resend-button`}
            analyticsLabel={`${analyticsLabel} Resend Button`}
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
          </Button>
        </motion.div>
      )}

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]"
      >
        <p className="flex items-center justify-center gap-2 text-xs text-[var(--text-2)] text-center">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          This code helps protect your account. Never share it with anyone.
        </p>
      </motion.div>
    </div>
  );
};

export default TwoFactorInput;
