import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  XCircle
} from 'lucide-react';
import Button from './Button';
import Portal from './Portal';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = false,
}) => {
  const icons = {
    info: <Info size={24} />,
    success: <CheckCircle size={24} />,
    warning: <AlertCircle size={24} />,
    error: <XCircle size={24} />,
  };

  const colors = {
    info: 'var(--primary-blue)',
    success: 'var(--primary-emerald)',
    warning: 'var(--primary-amber)',
    error: 'var(--primary-red)',
  };

  const bgColors = {
    info: 'rgba(var(--primary-blue), 0.1)',
    success: 'rgba(var(--primary-emerald), 0.1)', 
    warning: 'rgba(var(--primary-amber), 0.1)',
    error: 'rgba(var(--primary-red), 0.1)',
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.15,
        ease: 'easeIn',
      },
    },
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm z-modal-backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => !showCancel && handleCancel()}
            />

            {/* Alert Dialog */}
            <motion.div
              className="fixed inset-0 flex items-center justify-center p-4 z-modal"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <motion.div
                className="w-full max-w-sm bg-[rgba(var(--glass-rgb),var(--glass-alpha-high))] backdrop-blur-2xl rounded-xl shadow-2xl border border-[var(--glass-border-prominent)] overflow-hidden"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header with Icon */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: bgColors[type],
                      color: colors[type]
                    }}
                  >
                    {icons[type]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--text-1)] mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-[var(--text-2)]">
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-2 flex gap-3 justify-end">
                {showCancel && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancel}
                  >
                    {cancelText}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  className={type === 'error' ? 'bg-[var(--primary-red)]' : ''}
                >
                  {confirmText}
                </Button>
              </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default AlertDialog;