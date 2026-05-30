import { useCallback } from 'react';
import { notificationService } from '@/services/notificationService';

interface ErrorHandlerOptions {
  showNotification?: boolean;
  customMessage?: string;
  logToAnalytics?: boolean;
  context?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, options: ErrorHandlerOptions = {}) => {
    const {
      showNotification = true,
      customMessage,
      logToAnalytics = true,
    } = options;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
    }

    // Log to analytics
    if (logToAnalytics) {
      // Analytics logging removed
    }

    // Show user-friendly notification
    const message = getErrorMessage(error, customMessage);
    if (showNotification) {
      notificationService.error(message);
    }

    return message;
  }, []);

  return { handleError };
};

// Helper function to extract user-friendly error messages
function getErrorMessage(error: unknown, customMessage?: string): string {
  if (customMessage) return customMessage;

  // Handle Axios errors
  const errorObj = error as { response?: { status: number; data?: { detail?: string; message?: string; error?: string } }; code?: string; message?: string; name?: string };

  if (errorObj?.response) {
    const status = errorObj.response.status;
    const data = errorObj.response.data;

    // Check for specific error messages from backend
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    // Handle common HTTP status codes
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'The provided data is invalid. Please check and try again.';
      case 429:
        return 'Too many requests. Please slow down and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `An error occurred (${status}). Please try again.`;
    }
  }

  // Handle network errors
  if (errorObj?.code === 'ECONNABORTED') {
    return 'Request timeout. Please check your connection and try again.';
  }

  if (errorObj?.message === 'Network Error' || !window.navigator.onLine) {
    return 'Network error. Please check your internet connection.';
  }

  // Handle validation errors
  if (errorObj?.name === 'ValidationError') {
    return 'Please check your input and try again.';
  }

  // Default error message
  return errorObj?.message || 'An unexpected error occurred. Please try again.';
}

export default useErrorHandler;
