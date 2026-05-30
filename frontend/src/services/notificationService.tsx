import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

class NotificationService {
  private defaultDuration = 4000;
  private defaultPosition: NotificationOptions['position'] = 'bottom-right';

  success(message: string, options?: NotificationOptions) {
    toast.success(message, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position || this.defaultPosition,
      dismissible: options?.dismissible !== false,
      icon: <CheckCircle className="w-5 h-5" />,
      action: options?.action,
      className: 'sonner-success',
    });
  }

  error(message: string, options?: NotificationOptions) {
    toast.error(message, {
      duration: options?.duration || this.defaultDuration * 2, // Errors stay longer
      position: options?.position || this.defaultPosition,
      dismissible: options?.dismissible !== false,
      icon: <XCircle className="w-5 h-5" />,
      action: options?.action,
      className: 'sonner-error',
    });
  }

  warning(message: string, options?: NotificationOptions) {
    toast.warning(message, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position || this.defaultPosition,
      dismissible: options?.dismissible !== false,
      icon: <AlertTriangle className="w-5 h-5" />,
      action: options?.action,
      className: 'sonner-warning',
    });
  }

  info(message: string, options?: NotificationOptions) {
    toast.info(message, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position || this.defaultPosition,
      dismissible: options?.dismissible !== false,
      icon: <Info className="w-5 h-5" />,
      action: options?.action,
      className: 'sonner-info',
    });
  }

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: NotificationOptions
  ) {
    return toast.promise(promise, {
      ...messages,
      position: options?.position || this.defaultPosition,
      dismissible: options?.dismissible !== false,
    });
  }

  custom(component: React.ReactNode, options?: NotificationOptions) {
    toast.custom(() => <>{component}</>, {
      duration: options?.duration || this.defaultDuration,
      position: options?.position || this.defaultPosition,
      dismissible: options?.dismissible !== false,
    });
  }

  dismiss(toastId?: string | number) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  // Helper methods for common scenarios
  networkError(customMessage?: string) {
    this.error(customMessage || 'Network error. Please check your connection and try again.');
  }

  serverError(customMessage?: string) {
    this.error(customMessage || 'Server error. Please try again later.');
  }

  validationError(field: string, message?: string) {
    this.error(message || `Please check the ${field} field and try again.`);
  }

  unauthorized() {
    this.error('You are not authorized to perform this action.', {
      action: {
        label: 'Login',
        onClick: () => window.location.href = '/login',
      },
    });
  }

  sessionExpired() {
    this.warning('Your session has expired. Please log in again.', {
      action: {
        label: 'Login',
        onClick: () => window.location.href = '/login',
      },
    });
  }

  comingSoon(feature: string) {
    this.info(`${feature} is coming soon!`);
  }

  copied(text: string = 'Text') {
    this.success(`${text} copied to clipboard`);
  }

  saved(item: string = 'Changes') {
    this.success(`${item} saved successfully`);
  }

  deleted(item: string = 'Item') {
    this.success(`${item} deleted successfully`);
  }

  created(item: string = 'Item') {
    this.success(`${item} created successfully`);
  }

  updated(item: string = 'Item') {
    this.success(`${item} updated successfully`);
  }
}

export const notificationService = new NotificationService();