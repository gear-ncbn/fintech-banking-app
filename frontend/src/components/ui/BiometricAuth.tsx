import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Scan, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import Button from './Button';

interface BiometricAuthProps {
  onSuccess: () => void;
  onCancel?: () => void;
  onFallback?: () => void;
  type?: 'fingerprint' | 'face' | 'auto';
  title?: string;
  subtitle?: string;
  mockDelay?: number;
  analyticsId?: string;
  analyticsLabel?: string;
  requireSlideConfirm?: boolean;
  autoStart?: boolean;
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  onSuccess,
  onCancel,
  onFallback,
  type = 'auto',
  title = 'Authenticate to continue',
  subtitle = 'Use your biometric authentication',
  mockDelay = 2000,
  analyticsId = 'biometric-auth',
  analyticsLabel = 'Biometric Authentication',
  autoStart = false,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Detect biometric type (mock implementation)
  const detectBiometricType = () => {
    if (type !== 'auto') return type;
    // In a real implementation, this would check device capabilities
    return 'fingerprint'; // Default to fingerprint for demo
  };

  const biometricType = detectBiometricType();

  const startAuthentication = () => {
    setIsScanning(true);
    setStatus('scanning');
    setScanProgress(0);
    setErrorMessage('');
    
    // Log analytics event for authentication start

    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, mockDelay / 10);

    // Simulate authentication result
    setTimeout(() => {
      clearInterval(progressInterval);
      // Always succeed for demo purposes
      const isSuccess = true; // Math.random() > 0.1;
      
      if (isSuccess) {
        setStatus('success');
        setScanProgress(100);
        // Log analytics event for successful authentication
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setStatus('error');
        setErrorMessage('Authentication failed. Please try again.');
        setIsScanning(false);
        setScanProgress(0);
        // Log analytics event for failed authentication
      }
    }, mockDelay);
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
    // Log analytics event for retry
    startAuthentication();
  };

  useEffect(() => {
    // Only auto-start if explicitly requested
    if (autoStart) {
      const timer = setTimeout(() => {
        startAuthentication();
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const BiometricIcon = biometricType === 'face' ? Scan : Fingerprint;

  const iconVariants = {
    idle: { scale: 1, opacity: 0.7 },
    scanning: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    success: { scale: 1, opacity: 1 },
    error: { scale: 0.9, opacity: 0.5 },
  };

  const scannerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2 }
    },
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-[var(--text-1)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--text-2)]">{subtitle}</p>
      </motion.div>

      {/* Biometric Scanner */}
      <div className="relative mb-8">
        <motion.div
          className="relative w-32 h-32 mx-auto"
          initial="idle"
          animate={status}
          variants={iconVariants}
        >
          {/* Background Circle */}
          <div className="absolute inset-0 rounded-full bg-[rgba(var(--glass-rgb),0.2)] backdrop-blur-sm border border-[var(--glass-border)]" />
          
          {/* Progress Ring */}
          {isScanning && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                stroke="var(--primary-blue)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - scanProgress / 100)}`}
                className="transition-all duration-300"
              />
            </svg>
          )}
          
          {/* Scanning Animation */}
          <AnimatePresence>
            {isScanning && status === 'scanning' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                variants={scannerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-[var(--primary-blue)] to-transparent opacity-30"
                  animate={{
                    y: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <CheckCircle className="w-16 h-16 text-[var(--primary-emerald)]" />
                </motion.div>
              ) : status === 'error' ? (
                <motion.div
                  key="error"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <XCircle className="w-16 h-16 text-[var(--primary-red)]" />
                </motion.div>
              ) : (
                <motion.div
                  key="biometric"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-[var(--primary-blue)]"
                >
                  <BiometricIcon className="w-16 h-16" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {status === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center mb-6"
          >
            <p className="text-[var(--text-1)] font-medium">
              {biometricType === 'face' ? 'Scanning your face...' : 'Place your finger on the sensor'}
            </p>
            <p className="text-sm text-[var(--text-2)] mt-1">
              Hold still for authentication
            </p>
          </motion.div>
        )}
        
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <p className="text-[var(--primary-emerald)] font-medium">
              Authentication successful!
            </p>
          </motion.div>
        )}
        
        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <p className="text-[var(--primary-red)] font-medium">
              {errorMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="space-y-3">
        {status === 'idle' && !isScanning && (
          <Button
            variant="primary"
            fullWidth
            onClick={startAuthentication}
            icon={<BiometricIcon size={18} />}
            analyticsId={`${analyticsId}-start-button`}
            analyticsLabel={`${analyticsLabel} Start Button`}
          >
            {biometricType === 'face' ? 'Start Face Recognition' : 'Start Fingerprint Scan'}
          </Button>
        )}
        
        {status === 'error' && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleRetry}
            icon={<BiometricIcon size={18} />}
            analyticsId={`${analyticsId}-retry-button`}
            analyticsLabel={`${analyticsLabel} Retry Button`}
          >
            Try Again
          </Button>
        )}
        
        {onFallback && status !== 'success' && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              // Log analytics event for fallback
              onFallback();
            }}
            icon={<Smartphone size={18} />}
            analyticsId={`${analyticsId}-fallback-button`}
            analyticsLabel={`${analyticsLabel} Fallback Button`}
          >
            Use PIN Instead
          </Button>
        )}
        
        {onCancel && status !== 'success' && (
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              // Log analytics event for cancel
              onCancel();
            }}
            analyticsId={`${analyticsId}-cancel-button`}
            analyticsLabel={`${analyticsLabel} Cancel Button`}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Device Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-xs text-[var(--text-2)]">
          {biometricType === 'face' 
            ? 'Using Face ID for secure authentication' 
            : 'Using Touch ID for secure authentication'}
        </p>
      </motion.div>
    </div>
  );
};

export default BiometricAuth;
