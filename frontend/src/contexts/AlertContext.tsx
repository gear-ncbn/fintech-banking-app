'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import AlertDialog, { AlertType } from '@/components/ui/AlertDialog';

interface AlertOptions {
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showInfo: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState(options);
    setIsOpen(true);
  }, []);

  const showInfo = useCallback((title: string, message: string) => {
    showAlert({ type: 'info', title, message });
  }, [showAlert]);

  const showSuccess = useCallback((title: string, message: string) => {
    showAlert({ type: 'success', title, message });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string) => {
    showAlert({ type: 'warning', title, message });
  }, [showAlert]);

  const showError = useCallback((title: string, message: string) => {
    showAlert({ type: 'error', title, message });
  }, [showAlert]);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    showAlert({
      type: 'info',
      title,
      message,
      onConfirm,
      onCancel,
      showCancel: true,
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });
  }, [showAlert]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Clear state after animation completes
    setTimeout(() => {
      setAlertState(null);
    }, 200);
  }, []);

  return (
    <AlertContext.Provider value={{
      showAlert,
      showInfo,
      showSuccess,
      showWarning,
      showError,
      showConfirm,
      hideAlert: handleClose
    }}>
      {children}
      {alertState && (
        <AlertDialog
          isOpen={isOpen}
          onClose={handleClose}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          confirmText={alertState.confirmText}
          cancelText={alertState.cancelText}
          onConfirm={alertState.onConfirm}
          onCancel={alertState.onCancel}
          showCancel={alertState.showCancel}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};