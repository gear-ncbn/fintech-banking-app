import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';
import Portal from './Portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  footer,
  icon,
  className = '',
  analyticsId,
  analyticsLabel,
}) => {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        const modalLabel = title || analyticsLabel || 'modal';
        const _modalId = analyticsId || `modal-${modalLabel}`;
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, title, analyticsId, analyticsLabel]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Log modal open event
      const modalLabel = title || analyticsLabel || 'modal';
      const _modalId = analyticsId || `modal-${modalLabel}`;
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, title, analyticsId, analyticsLabel]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
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
              onClick={closeOnBackdrop ? () => {
                const modalLabel = title || analyticsLabel || 'modal';
                const _modalId = analyticsId || `modal-${modalLabel}`;
                onClose();
              } : undefined}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 flex items-center justify-center p-4 z-modal"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <motion.div
                className={`
                  w-full ${sizeClasses[size]}
                  bg-[rgba(var(--glass-rgb),var(--glass-alpha-high))]
                  backdrop-blur-2xl
                  rounded-xl
                  shadow-2xl
                  border border-[var(--glass-border-prominent)]
                  overflow-hidden
                  ${className}
                `}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-1)]">
                  {title && (
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-1)]">
                      {icon}
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="ml-auto rounded-full p-1"
                      aria-label="Close modal"
                      analyticsId={`${analyticsId || `modal-${title || 'modal'}`}-close`}
                      analyticsLabel={`Close ${title || 'modal'}`}
                    >
                      <X size={20} />
                    </Button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="p-6 border-t border-[var(--border-1)]">
                  {footer}
                </div>
              )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default Modal;
