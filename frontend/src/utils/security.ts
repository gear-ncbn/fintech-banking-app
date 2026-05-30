// Use Web Crypto API for browser compatibility
interface CryptoInterface {
  randomBytes: (size: number) => Buffer;
  pbkdf2Sync: (password: string, salt: string, iterations: number, keylen: number, digest: string) => Buffer;
  createCipheriv: (algorithm: string, key: Buffer, iv: Buffer) => { update: (data: string) => Buffer; final: () => Buffer };
  createDecipheriv: (algorithm: string, key: Buffer, iv: Buffer) => { update: (data: Buffer) => Buffer; final: () => Buffer };
  createHash: (algorithm: string) => { update: (data: string) => { digest: (encoding: string) => string } };
  createHmac: (algorithm: string, key: Buffer) => { update: (data: Buffer) => void; digest: () => Buffer };
}

let crypto: CryptoInterface | null;
if (typeof window !== 'undefined' && window.crypto) {
  crypto = window.crypto as unknown as CryptoInterface;
} else {
  // Dynamic import for Node.js environment
  crypto = typeof global !== 'undefined' ? (global.crypto as unknown as CryptoInterface) : null;
}

// Narrow the optional crypto implementation to a non-null value, throwing a
// clear error when no implementation is available.
function requireCrypto(): CryptoInterface {
  if (!crypto) {
    throw new Error('No crypto implementation available');
  }
  return crypto;
}

/**
 * Security utilities for the application
 */

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Browser environment
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  } else if (crypto && crypto.randomBytes) {
    // Node.js environment
    return crypto.randomBytes(length).toString('hex');
  }
  // Fallback (not cryptographically secure)
  throw new Error('No secure random number generator available');
}

// Hash sensitive data
export function hashData(data: string, salt?: string): string {
  const c = requireCrypto();
  const actualSalt = salt || c.randomBytes(16).toString('hex');
  const hash = c.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
  return `${actualSalt}:${hash}`;
}

// Verify hashed data
export function verifyHash(data: string, hashedData: string): boolean {
  const c = requireCrypto();
  const [salt, hash] = hashedData.split(':');
  const verifyHash = c.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Encrypt sensitive data
export function encrypt(text: string, key: string): string {
  const c = requireCrypto();
  const algorithm = 'aes-256-cbc';
  const iv = c.randomBytes(16);
  const cipher = c.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt sensitive data
export function decrypt(text: string, key: string): string {
  const algorithm = 'aes-256-cbc';
  const [ivHex, encryptedHex] = text.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const c = requireCrypto();
  const decipher = c.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

// Generate CSRF tokens
export function generateCSRFToken(): string {
  return requireCrypto().randomBytes(32).toString('base64');
}

// Validate CSRF tokens
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length > 0;
}

// Rate limiting helper
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 10
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry || entry.resetTime < now) {
      this.limits.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (entry.count >= this.maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || entry.resetTime < Date.now()) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }
  
  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    return entry?.resetTime || Date.now() + this.windowMs;
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetTime < now) {
        this.limits.delete(key);
      }
    }
  }
}

// Export rate limiter instances
export const apiRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
export const authRateLimiter = new RateLimiter(300000, 5); // 5 attempts per 5 minutes
export const transferRateLimiter = new RateLimiter(3600000, 10); // 10 transfers per hour

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 12) {
    score += 2;
  } else if (password.length >= 8) {
    score += 1;
    feedback.push('Use at least 12 characters for a stronger password');
  } else {
    feedback.push('Password must be at least 8 characters long');
  }
  
  // Complexity checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');
  
  // Common patterns check
  const commonPatterns = [
    /123/, /abc/, /password/i, /qwerty/i, /admin/i,
    /111/, /000/, /aaa/i
  ];
  
  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    score -= 1;
    feedback.push('Avoid common patterns');
  }
  
  // Repeated characters check
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters');
  }
  
  return {
    score: Math.max(0, Math.min(5, score)),
    feedback,
    isStrong: score >= 4
  };
}

// Session fingerprinting
export function generateSessionFingerprint(req: Request): string {
  const components = [
    req.headers.get('user-agent') || '',
    req.headers.get('accept-language') || '',
    req.headers.get('accept-encoding') || '',
    // Add more stable headers as needed
  ];
  
  const fingerprint = components.join('|');
  return requireCrypto().createHash('sha256').update(fingerprint).digest('hex');
}

// Time-based OTP generator (for 2FA)
export function generateTOTP(secret: string, window: number = 0): string {
  const time = Math.floor(Date.now() / 30000) + window;
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(time, 4);
  
  const hmac = requireCrypto().createHmac('sha1', Buffer.from(secret, 'base32' as BufferEncoding));
  hmac.update(buffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Verify TOTP
export function verifyTOTP(token: string, secret: string, window: number = 1): boolean {
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, i) === token) {
      return true;
    }
  }
  return false;
}

// Security headers helper
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
    ].join('; '),
  };
}