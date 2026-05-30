import DOMPurify from 'isomorphic-dompurify';

export class InputSanitizer {
  // XSS Protection patterns
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /eval\(/gi,
    /expression\(/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
  ];

  // SQL Injection patterns
  private static readonly SQL_PATTERNS = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(-{2}|\/\*|\*\/)/g,
    /(;|'|"|`|\\)/g,
  ];

  // Path traversal patterns
  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\./g,
    /\.{2,}/g,
    /[\/\\]{2,}/g,
  ];

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    if (!input) return '';
    
    // Use DOMPurify for comprehensive HTML sanitization
    const clean = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });

    return clean;
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove any HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Remove dangerous patterns
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number | null | undefined): number | null {
    if (input === null || input === undefined || input === '') return null;

    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) return null;

    return num;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Basic email sanitization
    const sanitized = input.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) return '';
    
    return sanitized;
  }

  /**
   * Sanitize URL input
   */
  static sanitizeURL(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    try {
      const url = new URL(input);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      
      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize filename input
   */
  static sanitizeFilename(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove path traversal attempts
    let sanitized = input;
    this.PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }
    
    return sanitized;
  }

  /**
   * Sanitize SQL query parameters
   */
  static sanitizeSQL(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input;
    
    // Remove SQL injection patterns
    this.SQL_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  /**
   * Sanitize phone number input
   */
  static sanitizePhone(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove all non-numeric characters except + for international
    const sanitized = input.replace(/[^\d+]/g, '');
    
    // Validate length (reasonable phone number length)
    if (sanitized.length < 7 || sanitized.length > 15) {
      return '';
    }
    
    return sanitized;
  }

  /**
   * Sanitize currency/money input
   */
  static sanitizeCurrency(input: string | number): number {
    if (input === null || input === undefined || input === '') return 0;
    
    // Convert to string if number
    const str = input.toString();
    
    // Remove currency symbols and non-numeric characters except decimal
    const sanitized = str.replace(/[^\d.-]/g, '');
    
    // Parse as float
    const amount = parseFloat(sanitized);
    
    // Validate
    if (isNaN(amount) || !isFinite(amount)) return 0;
    
    // Round to 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  /**
   * Sanitize date input
   */
  static sanitizeDate(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    try {
      const date = new Date(input);
      if (isNaN(date.getTime())) return '';
      
      // Return ISO string
      return date.toISOString();
    } catch {
      return '';
    }
  }

  /**
   * Generic sanitization for form data
   */
  static sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
    const sanitized = {} as T;

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key as keyof T] = value as T[keyof T];
        continue;
      }

      switch (typeof value) {
        case 'string':
          sanitized[key as keyof T] = this.sanitizeText(value) as T[keyof T];
          break;
        case 'number':
          sanitized[key as keyof T] = this.sanitizeNumber(value) as T[keyof T];
          break;
        case 'object':
          if (Array.isArray(value)) {
            sanitized[key as keyof T] = value.map(item =>
              typeof item === 'string' ? this.sanitizeText(item) : item
            ) as T[keyof T];
          } else {
            sanitized[key as keyof T] = this.sanitizeFormData(value as Record<string, unknown>) as T[keyof T];
          }
          break;
        default:
          sanitized[key as keyof T] = value as T[keyof T];
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize credit card number
   */
  static sanitizeCreditCard(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove all non-numeric characters
    const sanitized = input.replace(/\D/g, '');
    
    // Validate length (common credit card lengths)
    if (sanitized.length < 13 || sanitized.length > 19) {
      return '';
    }
    
    // Basic Luhn algorithm validation
    if (!this.validateLuhn(sanitized)) {
      return '';
    }
    
    return sanitized;
  }

  /**
   * Luhn algorithm for credit card validation
   */
  private static validateLuhn(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Create a sanitized error message (remove sensitive data)
   */
  static sanitizeErrorMessage(error: unknown): string {
    if (!error) return 'An unknown error occurred';

    let message = '';

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      message = String((error as { message: unknown }).message);
    } else {
      message = 'An error occurred';
    }

    // Remove potentially sensitive patterns
    message = message.replace(/\b\d{4,}\b/g, '****'); // Credit cards, SSNs
    message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***'); // Emails
    message = message.replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer ***'); // Auth tokens

    return message;
  }

  /**
   * Mask sensitive data for display (account numbers, cards, SSNs, phones)
   */
  static maskData(value: string, type: 'account' | 'card' | 'ssn' | 'phone'): string {
    if (!value) return value;
    const digits = value.replace(/\D/g, '');

    switch (type) {
      case 'card': {
        const last4 = digits.slice(-4);
        return last4 ? `•••• •••• •••• ${last4}` : value;
      }
      case 'account': {
        const last4 = digits.slice(-4);
        return last4 ? `••••${last4}` : value;
      }
      case 'ssn': {
        const last4 = digits.slice(-4);
        return last4 ? `•••-••-${last4}` : value;
      }
      case 'phone': {
        const last4 = digits.slice(-4);
        return last4 ? `(•••) •••-${last4}` : value;
      }
      default:
        return value;
    }
  }
}