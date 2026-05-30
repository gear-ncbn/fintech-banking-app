'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';

interface SecurityConfig {
  sessionTimeout: number; // in minutes
  enableBiometrics: boolean;
  enableTwoFactor: boolean;
  requireReauthForSensitive: boolean;
  maskSensitiveData: boolean;
  enableRateLimiting: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
}

interface SecurityContextType {
  config: SecurityConfig;
  updateConfig: (config: Partial<SecurityConfig>) => void;
  sessionTimeLeft: number;
  extendSession: () => void;
  lockAccount: () => void;
  unlockAccount: () => void;
  isAccountLocked: boolean;
  loginAttempts: number;
  incrementLoginAttempts: () => void;
  resetLoginAttempts: () => void;
  requireReauth: () => Promise<boolean>;
  maskData: (data: string, type?: 'account' | 'card' | 'ssn' | 'phone') => string;
}

const defaultConfig: SecurityConfig = {
  sessionTimeout: 15, // 15 minutes
  enableBiometrics: false,
  enableTwoFactor: true,
  requireReauthForSensitive: true,
  maskSensitiveData: true,
  enableRateLimiting: true,
  maxLoginAttempts: 3,
  lockoutDuration: 30, // 30 minutes
};

export const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { showConfirm } = useAlert();
  const [config, setConfig] = useState<SecurityConfig>(defaultConfig);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionTimeLeft, setSessionTimeLeft] = useState(config.sessionTimeout * 60);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  // Session timeout management
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastActivity) / 1000);
      const timeLeft = config.sessionTimeout * 60 - elapsed;

      if (timeLeft <= 0) {
        logout();
        router.push('/session-timeout');
      } else {
        setSessionTimeLeft(timeLeft);
      }
    };

    const interval = setInterval(checkSession, 1000);

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    // Track user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [config.sessionTimeout, lastActivity, logout, router, user]);

  // Account lockout management
  useEffect(() => {
    if (lockoutEndTime) {
      const now = Date.now();
      if (now >= lockoutEndTime) {
        setIsAccountLocked(false);
        setLockoutEndTime(null);
        setLoginAttempts(0);
      } else {
        const timeout = setTimeout(() => {
          setIsAccountLocked(false);
          setLockoutEndTime(null);
          setLoginAttempts(0);
        }, lockoutEndTime - now);

        return () => clearTimeout(timeout);
      }
    }
  }, [lockoutEndTime]);

  const updateConfig = useCallback((newConfig: Partial<SecurityConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    localStorage.setItem('security_config', JSON.stringify({ ...config, ...newConfig }));
  }, [config]);

  const extendSession = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  const lockAccount = useCallback(() => {
    const endTime = Date.now() + config.lockoutDuration * 60 * 1000;
    setIsAccountLocked(true);
    setLockoutEndTime(endTime);
    localStorage.setItem('lockout_end', endTime.toString());
  }, [config.lockoutDuration]);

  const unlockAccount = useCallback(() => {
    setIsAccountLocked(false);
    setLockoutEndTime(null);
    setLoginAttempts(0);
    localStorage.removeItem('lockout_end');
  }, []);

  const incrementLoginAttempts = useCallback(() => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= config.maxLoginAttempts) {
      lockAccount();
    }
  }, [loginAttempts, config.maxLoginAttempts, lockAccount]);

  const resetLoginAttempts = useCallback(() => {
    setLoginAttempts(0);
  }, []);

  const requireReauth = useCallback(async (): Promise<boolean> => {
    if (!config.requireReauthForSensitive) return true;
    
    // This would trigger a re-authentication modal
    // For now, we'll return true to allow the action
    // In a real implementation, this would show a modal for password/biometric confirmation
    return new Promise((resolve) => {
      // Use AlertDialog for confirmation
      showConfirm(
        'Authentication Required',
        'Please confirm your identity to continue with this action.',
        () => resolve(true),
        () => resolve(false)
      );
    });
  }, [config.requireReauthForSensitive, showConfirm]);

  const maskData = useCallback((data: string, type?: 'account' | 'card' | 'ssn' | 'phone'): string => {
    if (!config.maskSensitiveData) return data;
    
    switch (type) {
      case 'account':
        // Show last 4 digits
        return data.replace(/^(\d+)(\d{4})$/, (_, prefix, suffix) => 
          '*'.repeat(prefix.length) + suffix
        );
      
      case 'card':
        // Show first 4 and last 4 digits
        return data.replace(/^(\d{4})(\d+)(\d{4})$/, (_, first, middle, last) => 
          first + ' ' + '*'.repeat(middle.length).match(/.{1,4}/g)?.join(' ') + ' ' + last
        );
      
      case 'ssn':
        // Show last 4 digits
        return data.replace(/^(\d{3}-?\d{2}-?)(\d{4})$/, (_, prefix, suffix) => 
          '***-**-' + suffix
        );
      
      case 'phone':
        // Show last 4 digits
        return data.replace(/^([\d\s\-\(\)]+)(\d{4})$/, (_, prefix, suffix) => 
          prefix.replace(/\d/g, '*') + suffix
        );
      
      default:
        // Generic masking - show first and last 2 characters
        if (data.length <= 4) return '*'.repeat(data.length);
        return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
    }
  }, [config.maskSensitiveData]);

  // Load saved config and lockout state
  useEffect(() => {
    const savedConfig = localStorage.getItem('security_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }

    const savedLockout = localStorage.getItem('lockout_end');
    if (savedLockout) {
      const endTime = parseInt(savedLockout);
      if (Date.now() < endTime) {
        setLockoutEndTime(endTime);
        setIsAccountLocked(true);
      } else {
        localStorage.removeItem('lockout_end');
      }
    }
  }, []);

  return (
    <SecurityContext.Provider 
      value={{
        config,
        updateConfig,
        sessionTimeLeft,
        extendSession,
        lockAccount,
        unlockAccount,
        isAccountLocked,
        loginAttempts,
        incrementLoginAttempts,
        resetLoginAttempts,
        requireReauth,
        maskData,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}