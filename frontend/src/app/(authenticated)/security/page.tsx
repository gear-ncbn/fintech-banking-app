'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Smartphone,
  Key,
  Fingerprint,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Monitor,
  Globe,
  Clock,
  MapPin,
  Settings,
  Download,
  LogOut,
  ShieldCheck,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import TwoFactorInput from '@/components/ui/TwoFactorInput';
import BiometricAuth from '@/components/ui/BiometricAuth';
import SlideToConfirm from '@/components/ui/SlideToConfirm';
import { useAuth } from '@/contexts/AuthContext';
import { securityApi } from '@/lib/api';
import { checkPasswordStrength } from '@/utils/security';
import { notificationService } from '@/services/notificationService';

interface SecurityEvent {
  id: string;
  type: 'login' | 'password_change' | 'settings_change' | 'suspicious_activity';
  description: string;
  timestamp: string;
  location: string;
  device: string;
  ip: string;
  status: 'success' | 'failed' | 'warning';
}

interface LoginSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const [securityScore, setSecurityScore] = useState(75);
  const [showEnableTwoFactorModal, setShowEnableTwoFactorModal] = useState(false);
  const [showDisableTwoFactorModal, setShowDisableTwoFactorModal] = useState(false);
  const [showSessionDetailsModal, setShowSessionDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LoginSession | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTwoFactorMethod, setSelectedTwoFactorMethod] = useState<'authenticator' | 'sms' | 'email' | null>(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret?: string; qrCode?: string } | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [_setupStartTime, setSetupStartTime] = useState<number>(0);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [securityEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'login',
      description: 'Successful login',
      timestamp: '2025-06-16 14:32:00',
      location: 'New York, NY',
      device: 'Chrome on MacOS',
      ip: '192.168.1.1',
      status: 'success',
    },
    {
      id: '2',
      type: 'suspicious_activity',
      description: 'Login attempt from new location',
      timestamp: '2025-06-15 22:15:00',
      location: 'London, UK',
      device: 'Safari on iOS',
      ip: '86.129.35.78',
      status: 'warning',
    },
    {
      id: '3',
      type: 'password_change',
      description: 'Password successfully changed',
      timestamp: '2025-06-10 09:45:00',
      location: 'New York, NY',
      device: 'Chrome on MacOS',
      ip: '192.168.1.1',
      status: 'success',
    },
  ]);

  const [loginSessions] = useState<LoginSession[]>([
    {
      id: '1',
      device: 'Chrome on MacOS',
      browser: 'Chrome 126.0',
      location: 'New York, NY',
      ip: '192.168.1.1',
      lastActive: 'Active now',
      current: true,
    },
    {
      id: '2',
      device: 'Mobile App on iOS',
      browser: 'FinanceApp iOS',
      location: 'New York, NY',
      ip: '192.168.1.10',
      lastActive: '2 hours ago',
      current: false,
    },
    {
      id: '3',
      device: 'Safari on MacOS',
      browser: 'Safari 17.5',
      location: 'Brooklyn, NY',
      ip: '192.168.1.15',
      lastActive: 'Yesterday',
      current: false,
    },
  ]);

  useEffect(() => {
    // Load the real 2FA status so the toggle and security score reflect
    // the backend state instead of a hardcoded default.
    let cancelled = false;
    const loadTwoFactorStatus = async () => {
      try {
        const methods = await securityApi.getTwoFactorMethods();
        if (!cancelled) {
          setTwoFactorEnabled(methods.some((m) => m.is_enabled));
        }
      } catch {
        // Leave default (disabled) if the status can't be loaded.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadTwoFactorStatus();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const calculateSecurityScore = useCallback(() => {
    let score = 40; // Base score
    if (twoFactorEnabled) score += 30;
    if (biometricEnabled) score += 20;
    if (securityEvents.filter(e => e.status === 'warning').length === 0) score += 10;
    return Math.min(score, 100);
  }, [twoFactorEnabled, biometricEnabled, securityEvents]);

  useEffect(() => {
    setSecurityScore(calculateSecurityScore());
  }, [calculateSecurityScore]);

  const getSecurityScoreColor = () => {
    if (securityScore >= 80) return 'text-[var(--primary-emerald)]';
    if (securityScore >= 60) return 'text-[var(--primary-amber)]';
    return 'text-[var(--primary-red)]';
  };

  const getSecurityScoreLabel = () => {
    if (securityScore >= 80) return 'Excellent';
    if (securityScore >= 60) return 'Good';
    return 'Needs Improvement';
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login': return <Monitor className="w-4 h-4" />;
      case 'password_change': return <Key className="w-4 h-4" />;
      case 'settings_change': return <Settings className="w-4 h-4" />;
      case 'suspicious_activity': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getEventColor = (status: SecurityEvent['status']) => {
    switch (status) {
      case 'success': return 'text-[var(--primary-emerald)]';
      case 'failed': return 'text-[var(--primary-red)]';
      case 'warning': return 'text-[var(--primary-amber)]';
    }
  };

  const handleSetupTwoFactor = async (method: 'authenticator' | 'sms' | 'email') => {
    try {
      setSetupStartTime(Date.now());
      setTwoFactorError(null);

      const phoneOrEmail = method === 'sms' ? phoneNumber : method === 'email' ? email : undefined;
      const data = await securityApi.setupTwoFactor(method, phoneOrEmail);

      // The backend returns the QR as raw base64; render it as a PNG data URI.
      const rawQr = data.qrCode ?? data.qr_code;
      const qrCode = rawQr && !rawQr.startsWith('data:')
        ? `data:image/png;base64,${rawQr}`
        : rawQr;

      // Advance the modal to the verification step for the chosen method.
      setSelectedTwoFactorMethod(method);
      setTwoFactorSetup({
        secret: data.secret,
        qrCode,
      });

      if (method !== 'authenticator') {
        notificationService.info('Verification code sent. Enter it below to finish setup.');
      }
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Failed to start 2FA setup. Please try again.');
    }
  };

  const handleEnableTwoFactor = async (code: string) => {
    try {
      if (!selectedTwoFactorMethod) return;
      setTwoFactorError(null);

      await securityApi.verifyTwoFactorSetup(selectedTwoFactorMethod, code);

      setTwoFactorEnabled(true);
      setShowEnableTwoFactorModal(false);
      setSelectedTwoFactorMethod(null);
      setTwoFactorSetup(null);
      notificationService.success('Two-factor authentication enabled');
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.');
    }
  };

  const handleDisableTwoFactor = () => {
    setTwoFactorEnabled(false);
    setShowDisableTwoFactorModal(false);
  };

  const handleEndSession = (sessionId: string) => {
    const _session = loginSessions.find(s => s.id === sessionId);
    // Handle end session logic here
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading security settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-1)]">Security Center</h1>
            <p className="text-[var(--text-2)] mt-2">
              Protect your account and monitor security activity
            </p>
          </div>

          {/* Security Score */}
          <Card variant="default" className="mb-8">
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="36"
                        stroke="var(--border-1)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <motion.circle
                        cx="48"
                        cy="48"
                        r="36"
                        stroke="url(#security-gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - securityScore / 100) }}
                        transition={{ duration: 1, ease: 'easeInOut' }}
                      />
                      <defs>
                        <linearGradient id="security-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--primary-blue)" />
                          <stop offset="100%" stopColor="var(--primary-emerald)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getSecurityScoreColor()}`}>
                          {securityScore}
                        </p>
                        <p className="text-xs text-[var(--text-2)]">Score</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-1)]">
                      Security Score: {getSecurityScoreLabel()}
                    </h2>
                    <p className="text-[var(--text-2)] mt-1">
                      {securityScore < 80 && 'Enable more security features to improve your score'}
                      {securityScore >= 80 && 'Your account is well protected'}
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="secondary" 
                  icon={<Download size={18} />}
                  onClick={async () => {
                    
                    // Download security report PDF from backend
                    try {
                      const response = await securityApi.downloadSecurityReport();
                      const url = window.URL.createObjectURL(response);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `security_report_${new Date().toISOString().split('T')[0]}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch {
                      // Failed to download security report
                      notificationService.error('Failed to generate security report. Please try again.');
                    }
                  }}
                >
                  Security Report
                </Button>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Authentication Methods */}
            <Card variant="default">
              <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--text-1)]">
                  Authentication Methods
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {/* Password */}
                  <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--text-1)]">Password</h4>
                          <p className="text-sm text-[var(--text-2)]">Last changed 3 months ago</p>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-[var(--primary-emerald)]" />
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      fullWidth
                      onClick={() => {
                        setShowChangePasswordModal(true);
                      }}
                    >
                      Change Password
                    </Button>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-violet)]">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--text-1)]">Two-Factor Authentication</h4>
                          <p className="text-sm text-[var(--text-2)]">
                            {twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}
                          </p>
                        </div>
                      </div>
                      {twoFactorEnabled ? (
                        <CheckCircle className="w-5 h-5 text-[var(--primary-emerald)]" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-[var(--primary-amber)]" />
                      )}
                    </div>
                    <Button
                      variant={twoFactorEnabled ? "secondary" : "primary"}
                      size="sm"
                      fullWidth
                      onClick={() => {
                        if (twoFactorEnabled) {
                          setShowDisableTwoFactorModal(true);
                        } else {
                          setShowEnableTwoFactorModal(true);
                        }
                      }}
                    >
                      {twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                    </Button>
                  </div>

                  {/* Biometric Authentication */}
                  <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-violet)] to-[var(--primary-purple)]">
                          <Fingerprint className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--text-1)]">Biometric Login</h4>
                          <p className="text-sm text-[var(--text-2)]">
                            {biometricEnabled ? 'Face ID enabled' : 'Use fingerprint or face recognition'}
                          </p>
                        </div>
                      </div>
                      {biometricEnabled ? (
                        <CheckCircle className="w-5 h-5 text-[var(--primary-emerald)]" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[var(--text-2)]" />
                      )}
                    </div>
                    <BiometricAuth
                      onSuccess={() => {
                        const newState = !biometricEnabled;
                        setBiometricEnabled(newState);
                      }}
                      onCancel={() => {
                        // Biometric auth cancelled
                      }}
                      requireSlideConfirm={!biometricEnabled}
                      autoStart={false}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Recent Security Events */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--text-1)]">
                    Recent Activity
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      // Navigate to activity history
                    }}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {securityEvents.slice(0, 4).map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.05)] transition-colors"
                    >
                      <div className={`p-1.5 rounded-lg ${
                        event.status === 'warning' 
                          ? 'bg-[var(--primary-amber)]/10' 
                          : 'bg-[rgba(var(--glass-rgb),0.1)]'
                      }`}>
                        <div className={getEventColor(event.status)}>
                          {getEventIcon(event.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-2)]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.timestamp}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Active Sessions */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-1)]">
                  Active Sessions
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<LogOut size={16} />}
                  onClick={() => {
                    // Sign out all other sessions
                  }}
                >
                  Sign Out All Other Sessions
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {loginSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.02)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        session.current 
                          ? 'bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-teal)]' 
                          : 'bg-[rgba(var(--glass-rgb),0.1)]'
                      }`}>
                        <Monitor className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[var(--text-1)]">{session.device}</h4>
                          {session.current && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary-emerald)]/10 text-[var(--primary-emerald)]">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-2)]">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {session.location}
                          </span>
                          <span>•</span>
                          <span>{session.ip}</span>
                          <span>•</span>
                          <span>{session.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setShowSessionDetailsModal(true);
                        }}
                      >
                        Details
                      </Button>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEndSession(session.id)}
                        >
                          End Session
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Trusted Devices */}
          <Card variant="default" className="mt-8">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">
                Trusted Devices
              </h3>
              <p className="text-sm text-[var(--text-2)] mt-1">
                Devices that don&apos;t require two-factor authentication
              </p>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-1)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">iPhone 14 Pro</h4>
                      <p className="text-sm text-[var(--text-2)]">Added on Oct 15, 2025</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                    }}
                  >
                    Remove
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-1)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-violet)]">
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">MacBook Pro</h4>
                      <p className="text-sm text-[var(--text-2)]">Added on Sep 20, 2025</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                    }}
                  >
                    Remove
                  </Button>
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                  <p className="text-sm text-[var(--text-2)]">
                    <AlertCircle className="inline w-4 h-4 mr-1" />
                    Trusted devices won&apos;t need to enter a verification code when signing in. Only trust devices you own and use regularly.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Privacy Settings */}
          <Card variant="default" className="mt-8">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">
                Privacy Settings
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Login Notifications</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      Get notified when someone logs into your account
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      defaultChecked 
                      onChange={() => {
                      }}
                    />
                    <div className="w-11 h-6 bg-[var(--border-1)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-blue)]"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Transaction Alerts</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      Receive alerts for transactions above $100
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      defaultChecked 
                      onChange={() => {
                      }}
                    />
                    <div className="w-11 h-6 bg-[var(--border-1)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-blue)]"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Data Sharing</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      Share anonymized data to improve our services
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      onChange={() => {
                      }}
                    />
                    <div className="w-11 h-6 bg-[var(--border-1)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-blue)]"></div>
                  </label>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      notificationService.info('Your data export will be ready in 24 hours', {
                        duration: 5000
                      });
                    }}
                  >
                    Download My Data
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      notificationService.warning('Account deletion requires additional verification', {
                        duration: 5000,
                        action: {
                          label: 'Contact Support',
                          onClick: () => {}
                        }
                      });
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Security Activity Log */}
          <Card variant="default" className="mt-8">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">
                Security Activity
              </h3>
              <p className="text-sm text-[var(--text-2)] mt-1">
                Recent security events on your account
              </p>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {securityEvents.slice(0, 5).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.02)] border border-[var(--border-1)]"
                  >
                    <div className={`p-2 rounded-lg ${
                      event.status === 'success' 
                        ? 'bg-[var(--primary-emerald)]/10' 
                        : event.status === 'warning' 
                        ? 'bg-[var(--primary-amber)]/10'
                        : 'bg-[var(--primary-red)]/10'
                    }`}>
                      {event.type === 'login' && <LogOut className={`w-4 h-4 ${
                        event.status === 'success' ? 'text-[var(--primary-emerald)]' : 
                        event.status === 'warning' ? 'text-[var(--primary-amber)]' : 
                        'text-[var(--primary-red)]'
                      }`} />}
                      {event.type === 'password_change' && <Key className="w-4 h-4 text-[var(--primary-blue)]" />}
                      {event.type === 'settings_change' && <Settings className="w-4 h-4 text-[var(--primary-indigo)]" />}
                      {event.type === 'suspicious_activity' && <AlertTriangle className="w-4 h-4 text-[var(--primary-amber)]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[var(--text-1)]">{event.description}</h4>
                        <span className="text-xs text-[var(--text-2)]">{event.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-2)]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                        <span>•</span>
                        <span>{event.device}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                  }}
                >
                  View All Activity
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Security Recommendations */}
          <Card variant="subtle" className="mt-8">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">
                Security Recommendations
              </h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!twoFactorEnabled && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--primary-amber)]/10 border border-[var(--primary-amber)]/20">
                    <AlertTriangle className="w-5 h-5 text-[var(--primary-amber)] mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-1)]">Enable Two-Factor Authentication</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Add an extra layer of security to your account
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setShowEnableTwoFactorModal(true);
                        }}
                      >
                        Enable Now
                      </Button>
                    </div>
                  </div>
                )}
                
                {!biometricEnabled && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--primary-blue)]/10 border border-[var(--primary-blue)]/20">
                    <Fingerprint className="w-5 h-5 text-[var(--primary-blue)] mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-1)]">Set Up Biometric Login</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Use your fingerprint or face for quick access
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                      >
                        Set Up
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--primary-emerald)]/10 border border-[var(--primary-emerald)]/20">
                  <ShieldCheck className="w-5 h-5 text-[var(--primary-emerald)] mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--text-1)]">Regular Security Checkup</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      Review your security settings monthly
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      {/* Enable Two-Factor Modal */}
      <Modal
        isOpen={showEnableTwoFactorModal}
        onClose={() => {
          setShowEnableTwoFactorModal(false);
          setSelectedTwoFactorMethod(null);
          setTwoFactorSetup(null);
          setTwoFactorError(null);
        }}
        title="Enable Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          {twoFactorError && (
            <div className="p-3 rounded-lg bg-[var(--primary-red)]/10 border border-[var(--primary-red)]/20">
              <p className="text-sm text-[var(--primary-red)]">{twoFactorError}</p>
            </div>
          )}
          {!selectedTwoFactorMethod ? (
            <>
              <p className="text-[var(--text-2)]">
                Choose your preferred two-factor authentication method:
              </p>
              
              <div className="space-y-3">
                {/* Authenticator App */}
                <button
                  onClick={() => {
                    handleSetupTwoFactor('authenticator');
                  }}
                  className="w-full p-4 text-left rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.05)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-1)]">Authenticator App</h4>
                      <p className="text-sm text-[var(--text-2)]">Use Google Authenticator, Authy, or similar</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--text-2)]" />
                  </div>
                </button>
                
                {/* SMS */}
                <button
                  onClick={() => {
                    setSelectedTwoFactorMethod('sms');
                  }}
                  className="w-full p-4 text-left rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.05)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-violet)]">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-1)]">SMS Text Message</h4>
                      <p className="text-sm text-[var(--text-2)]">Receive codes via text message</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--text-2)]" />
                  </div>
                </button>
                
                {/* Email */}
                <button
                  onClick={() => {
                    setSelectedTwoFactorMethod('email');
                  }}
                  className="w-full p-4 text-left rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.05)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--primary-violet)] to-[var(--primary-purple)]">
                      <Key className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-1)]">Email</h4>
                      <p className="text-sm text-[var(--text-2)]">Receive codes via email</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--text-2)]" />
                  </div>
                </button>
              </div>
            </>
          ) : selectedTwoFactorMethod === 'sms' ? (
            <>
              <p className="text-[var(--text-2)]">
                Enter your phone number to receive verification codes:
              </p>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleSetupTwoFactor('sms')}
                disabled={!phoneNumber}
              >
                Send Verification Code
              </Button>
              {phoneNumber && (
                <TwoFactorInput
                  onComplete={handleEnableTwoFactor}
                  onResend={() => handleSetupTwoFactor('sms')}
                />
              )}
            </>
          ) : selectedTwoFactorMethod === 'email' ? (
            <>
              <p className="text-[var(--text-2)]">
                Enter your email address to receive verification codes:
              </p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleSetupTwoFactor('email')}
                disabled={!email}
              >
                Send Verification Code
              </Button>
              {email && (
                <TwoFactorInput
                  onComplete={handleEnableTwoFactor}
                  onResend={() => handleSetupTwoFactor('email')}
                />
              )}
            </>
          ) : (
            <>
              <p className="text-[var(--text-2)]">
                Scan this QR code with your authenticator app, then enter the verification code below.
              </p>
              
              <div className="p-4 glass-card rounded-lg mx-auto w-48 h-48">
                {twoFactorSetup?.qrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={twoFactorSetup.qrCode}
                    alt="2FA QR code"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-alt rounded flex items-center justify-center">
                    <span className="text-secondary">QR Code</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-sm text-[var(--text-2)] mb-2">Or enter this key manually:</p>
                <code className="text-xs bg-[rgba(var(--glass-rgb),0.1)] px-2 py-1 rounded break-all">
                  {twoFactorSetup?.secret ?? '----'}
                </code>
              </div>
              
              <TwoFactorInput
                onComplete={handleEnableTwoFactor}
                onResend={() => {}}
              />
            </>
          )}
        </div>
      </Modal>

      {/* Disable Two-Factor Modal */}
      <Modal
        isOpen={showDisableTwoFactorModal}
        onClose={() => setShowDisableTwoFactorModal(false)}
        title="Disable Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--primary-amber)]/10 border border-[var(--primary-amber)]/20">
            <p className="text-sm text-[var(--primary-amber)]">
              Warning: Disabling 2FA will make your account less secure.
            </p>
          </div>
          
          <p className="text-[var(--text-2)]">
            Are you sure you want to disable two-factor authentication?
          </p>
          
          <SlideToConfirm
            text="Slide to disable 2FA"
            onConfirm={handleDisableTwoFactor}
          />
        </div>
      </Modal>

      {/* Session Details Modal */}
      <Modal
        isOpen={showSessionDetailsModal}
        onClose={() => {
          setShowSessionDetailsModal(false);
          setSelectedSession(null);
        }}
        title="Session Details"
        size="md"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-[var(--border-1)]">
                <span className="text-sm text-[var(--text-2)]">Device</span>
                <span className="text-sm font-medium text-[var(--text-1)]">{selectedSession.device}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-1)]">
                <span className="text-sm text-[var(--text-2)]">Browser</span>
                <span className="text-sm font-medium text-[var(--text-1)]">{selectedSession.browser}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-1)]">
                <span className="text-sm text-[var(--text-2)]">Location</span>
                <span className="text-sm font-medium text-[var(--text-1)]">{selectedSession.location}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-1)]">
                <span className="text-sm text-[var(--text-2)]">IP Address</span>
                <span className="text-sm font-medium text-[var(--text-1)]">{selectedSession.ip}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-1)]">
                <span className="text-sm text-[var(--text-2)]">Last Active</span>
                <span className="text-sm font-medium text-[var(--text-1)]">{selectedSession.lastActive}</span>
              </div>
            </div>
            
            {!selectedSession.current && (
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  handleEndSession(selectedSession.id);
                  setShowSessionDetailsModal(false);
                }}
              >
                End This Session
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        title="Change Password"
        size="md"
      >
        <form 
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
              notificationService.error('Passwords do not match');
              return;
            }
            
            const passwordStrength = checkPasswordStrength(passwordForm.newPassword);
            if (!passwordStrength.isStrong) {
              notificationService.warning('Please choose a stronger password', {
                duration: 6000
              });
              if (passwordStrength.feedback.length > 0) {
                passwordStrength.feedback.forEach(tip => {
                  notificationService.info(tip, { duration: 6000 });
                });
              }
              return;
            }
            
            try {
              await notificationService.promise(
                securityApi.changePassword({
                  currentPassword: passwordForm.currentPassword,
                  newPassword: passwordForm.newPassword
                }),
                {
                  loading: 'Changing password...',
                  success: 'Password changed successfully!',
                  error: (err) => {
                    if (err.message?.includes('401') || err.message?.includes('Incorrect')) {
                      return 'Current password is incorrect';
                    }
                    return 'Failed to change password. Please try again.';
                  }
                }
              );
              
              
              setShowChangePasswordModal(false);
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } catch {
              // Password change error
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-2)] hover:text-[var(--text-1)]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              New Password
            </label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              placeholder="Enter new password"
              minLength={8}
            />
            
            {/* Password Strength Indicator */}
            {passwordForm.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        checkPasswordStrength(passwordForm.newPassword).score <= 2 
                          ? 'bg-[var(--primary-red)]' 
                          : checkPasswordStrength(passwordForm.newPassword).score <= 3 
                          ? 'bg-[var(--primary-amber)]' 
                          : 'bg-[var(--primary-emerald)]'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(checkPasswordStrength(passwordForm.newPassword).score / 5) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    checkPasswordStrength(passwordForm.newPassword).score <= 2 
                      ? 'text-[var(--primary-red)]' 
                      : checkPasswordStrength(passwordForm.newPassword).score <= 3 
                      ? 'text-[var(--primary-amber)]' 
                      : 'text-[var(--primary-emerald)]'
                  }`}>
                    {checkPasswordStrength(passwordForm.newPassword).score <= 2 ? 'Weak' : 
                     checkPasswordStrength(passwordForm.newPassword).score <= 3 ? 'Medium' : 'Strong'}
                  </span>
                </div>
                {checkPasswordStrength(passwordForm.newPassword).feedback.length > 0 && (
                  <ul className="text-xs text-[var(--text-2)] space-y-1">
                    {checkPasswordStrength(passwordForm.newPassword).feedback.map((tip, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-[var(--primary-amber)]">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
              placeholder="Confirm new password"
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowChangePasswordModal(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
