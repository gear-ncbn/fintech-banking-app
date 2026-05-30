'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Smartphone,
  Mail,
  Key,
  Eye,
  HelpCircle,
  LogOut,
  Trash2,
  Download
} from 'lucide-react';
import Card, { CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import { TabGroup, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import Dropdown from '@/components/ui/Dropdown';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { usersService } from '@/lib/api/users';
import { securityApi } from '@/lib/api';
import { getPasswordLastChangedDate, formatLastChangedLabel } from '@/lib/utils';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user: _user, logout, refreshUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const router = useRouter();

  // Real two-factor / biometric status (kept in sync with the Security Center)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    timezone: 'UTC',
    currency: 'USD',
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'transactions',
      label: 'Transaction Alerts',
      description: 'Get notified about incoming and outgoing transactions',
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'security',
      label: 'Security Alerts',
      description: 'Important security notifications about your account',
      email: true,
      push: true,
      sms: true,
    },
    {
      id: 'marketing',
      label: 'Product Updates',
      description: 'New features and product announcements',
      email: true,
      push: false,
      sms: false,
    },
    {
      id: 'budget',
      label: 'Budget Alerts',
      description: 'Notifications when approaching budget limits',
      email: false,
      push: true,
      sms: false,
    },
  ]);
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'friends',
    transactionPrivacy: true,
    dataSharing: false,
    analyticsTracking: true,
  });
  
  // Theme settings
  const [_theme, _setTheme] = useState('dark');
  const [_autoTheme, _setAutoTheme] = useState(false);

  const loadUserProfile = useCallback(async () => {
    try {
      const userProfile = await usersService.getCurrentUser();
      setProfileData({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        timezone: userProfile.timezone || 'UTC',
        currency: userProfile.currency || 'USD',
      });
      setIsLoading(false);

    } catch {
      showError('Error', 'Failed to load profile data');
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    let cancelled = false;
    securityApi.getTwoFactorMethods()
      .then((methods) => {
        if (!cancelled) {
          setTwoFactorEnabled(methods.some((m) => m.is_enabled));
          setBiometricEnabled(methods.some((m) => m.method === 'biometric' && m.is_enabled));
        }
      })
      .catch(() => {/* leave defaults if status can't be loaded */});
    return () => { cancelled = true; };
  }, []);

  const settingSections: SettingSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information',
      icon: <User className="w-5 h-5" />,
      color: 'from-[var(--primary-blue)] to-[var(--primary-indigo)]',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Control how you receive alerts',
      icon: <Bell className="w-5 h-5" />,
      color: 'from-[var(--primary-indigo)] to-[var(--primary-violet)]',
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Protect your account',
      icon: <Shield className="w-5 h-5" />,
      color: 'from-[var(--primary-violet)] to-[var(--primary-purple)]',
    },
    {
      id: 'privacy',
      title: 'Privacy',
      description: 'Control your data and visibility',
      icon: <Eye className="w-5 h-5" />,
      color: 'from-[var(--primary-emerald)] to-[var(--primary-teal)]',
    },
  ];

  const handleNotificationToggle = (id: string, type: 'email' | 'push' | 'sms') => {
    const notification = notifications.find(n => n.id === id);
    const newState = notification ? !notification[type] : false;
    
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, [type]: newState } : notif
    ));
    
  };

  const handleProfileUpdate = async () => {
    
    try {
      // Prepare update data
      const updateData = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        timezone: profileData.timezone,
        currency: profileData.currency,
      };
      
      // Call API to update profile
      await usersService.updateProfile(updateData);
      
      // Refresh user data in the auth context to update UI components
      await refreshUser();
      
      // Also reload the profile data to ensure the form shows updated values
      await loadUserProfile();
      
      showSuccess('Profile Updated', 'Your profile information has been saved successfully.');
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      showError('Update Failed', message);
    }
  };

  const renderSectionContent = (section?: string) => {
    const activeSection = section || 'profile';
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  First Name
                </label>
                <Input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => {
                    setProfileData({ ...profileData, firstName: e.target.value });
                  }}
                  placeholder="Enter your first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  Last Name
                </label>
                <Input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => {
                    setProfileData({ ...profileData, lastName: e.target.value });
                  }}
                  placeholder="Enter your last name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => {
                    setProfileData({ ...profileData, email: e.target.value });
                  }}
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => {
                    setProfileData({ ...profileData, phone: e.target.value });
                  }}
                  placeholder="Enter your phone"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  Timezone
                </label>
                <Dropdown
                  value={profileData.timezone}
                  onChange={(value) => {
                    setProfileData({ ...profileData, timezone: value });
                  }}
                  items={[
                    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
                    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
                    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
                    { value: 'Europe/London', label: 'London' },
                    { value: 'Europe/Paris', label: 'Paris' },
                    { value: 'Europe/Berlin', label: 'Berlin' },
                    { value: 'Asia/Tokyo', label: 'Tokyo' },
                    { value: 'Asia/Shanghai', label: 'Shanghai' },
                    { value: 'Asia/Singapore', label: 'Singapore' },
                    { value: 'Australia/Sydney', label: 'Sydney' },
                  ]}
                  placeholder="Select timezone"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  Preferred Currency
                </label>
                <Dropdown
                  value={profileData.currency}
                  onChange={(value) => {
                    setProfileData({ ...profileData, currency: value });
                  }}
                  items={[
                    { value: 'USD', label: 'USD - US Dollar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                    { value: 'GBP', label: 'GBP - British Pound' },
                    { value: 'JPY', label: 'JPY - Japanese Yen' },
                    { value: 'AUD', label: 'AUD - Australian Dollar' },
                    { value: 'CAD', label: 'CAD - Canadian Dollar' },
                    { value: 'CHF', label: 'CHF - Swiss Franc' },
                    { value: 'CNY', label: 'CNY - Chinese Yuan' },
                    { value: 'SEK', label: 'SEK - Swedish Krona' },
                    { value: 'NZD', label: 'NZD - New Zealand Dollar' },
                  ]}
                  placeholder="Select currency"
                />
              </div>
              
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="primary" 
                onClick={() => {
                  handleProfileUpdate();
                }}
              >
                Save Changes
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  loadUserProfile(); // Reset to original values
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-4">
            {notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="subtle">
                  <CardBody>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-[var(--text-1)]">{notif.label}</h4>
                        <p className="text-sm text-[var(--text-2)] mt-1">{notif.description}</p>
                      </div>
                      
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[var(--text-2)]" />
                          <span className="text-sm text-[var(--text-2)]">Email</span>
                          <Switch
                            checked={notif.email}
                            onCheckedChange={() => handleNotificationToggle(notif.id, 'email')}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[var(--text-2)]" />
                          <span className="text-sm text-[var(--text-2)]">Push</span>
                          <Switch
                            checked={notif.push}
                            onCheckedChange={() => handleNotificationToggle(notif.id, 'push')}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[var(--text-2)]" />
                          <span className="text-sm text-[var(--text-2)]">SMS</span>
                          <Switch
                            checked={notif.sms}
                            onCheckedChange={() => handleNotificationToggle(notif.id, 'sms')}
                          />
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-6">
            <Card variant="subtle">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Password</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      {formatLastChangedLabel(getPasswordLastChangedDate())}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowPasswordModal(true);
                    }}
                  >
                    Change Password
                  </Button>
                </div>
              </CardBody>
            </Card>
            
            <Card variant="subtle">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Two-Factor Authentication</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch 
                    checked={twoFactorEnabled} 
                    onCheckedChange={() => router.push('/security')}
                  />
                </div>
              </CardBody>
            </Card>
            
            <Card variant="subtle">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Biometric Login</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      Use fingerprint or face recognition
                    </p>
                  </div>
                  <Switch 
                    checked={biometricEnabled} 
                    onCheckedChange={() => router.push('/security')}
                  />
                </div>
              </CardBody>
            </Card>
            
            <Card variant="subtle">
              <CardBody>
                <div className="space-y-3">
                  <h4 className="font-medium text-[var(--text-1)]">Login Activity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-2)]">Chrome on MacOS</span>
                      <span className="text-[var(--text-2)]">Active now</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-2)]">Mobile App on iOS</span>
                      <span className="text-[var(--text-2)]">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-2)]">Safari on MacOS</span>
                      <span className="text-[var(--text-2)]">Yesterday</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    fullWidth
                    onClick={() => {
                    }}
                  >
                    View All Sessions
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        );
        
      case 'privacy':
        return (
          <div className="space-y-6">
            <Card variant="subtle">
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">Profile Visibility</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Control who can see your profile information
                      </p>
                    </div>
                    <Dropdown
                      value={privacySettings.profileVisibility}
                      onChange={(value) => {
                        const _oldValue = privacySettings.profileVisibility;
                        setPrivacySettings({ ...privacySettings, profileVisibility: value });
                      }}
                      items={[
                        { value: 'public', label: 'Public' },
                        { value: 'friends', label: 'Friends Only' },
                        { value: 'private', label: 'Private' },
                      ]}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">Transaction Privacy</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Hide transaction details from social features
                      </p>
                    </div>
                    <Switch 
                      checked={privacySettings.transactionPrivacy}
                      onCheckedChange={(checked) => {
                        setPrivacySettings({ ...privacySettings, transactionPrivacy: checked });
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">Data Sharing</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Share anonymized data for product improvement
                      </p>
                    </div>
                    <Switch 
                      checked={privacySettings.dataSharing}
                      onCheckedChange={(checked) => {
                        setPrivacySettings({ ...privacySettings, dataSharing: checked });
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">Analytics Tracking</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Help us improve by sharing usage analytics
                      </p>
                    </div>
                    <Switch 
                      checked={privacySettings.analyticsTracking}
                      onCheckedChange={(checked) => {
                        setPrivacySettings({ ...privacySettings, analyticsTracking: checked });
                      }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card variant="subtle">
              <CardBody>
                <div className="space-y-4">
                  <h4 className="font-medium text-[var(--text-1)]">Data Management</h4>
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      icon={<Download size={16} />}
                      onClick={() => {
                        setShowExportModal(true);
                      }}
                    >
                      Export My Data
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      icon={<Trash2 size={16} />}
                      onClick={() => {
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-1)]">Settings</h1>
            <p className="text-[var(--text-2)] mt-2">
              Manage your account preferences and settings
            </p>
          </div>

          <Card variant="default">
            <CardBody>
              <TabGroup defaultTab="profile" analyticsId="settings-tabs">
                <div className="overflow-x-auto -mx-4 px-4 mb-6">
                  <TabList variant="default" className="min-w-max">
                    {settingSections.map((section) => (
                      <Tab 
                        key={section.id} 
                        value={section.id}
                        icon={section.icon}
                      >
                        <span className="hidden sm:inline">{section.title}</span>
                        <span className="sm:hidden">{section.title.substring(0, 3)}</span>
                      </Tab>
                    ))}
                  </TabList>
                </div>

                <TabPanel value="profile">
                  {renderSectionContent('profile')}
                </TabPanel>

                <TabPanel value="notifications">
                  {renderSectionContent('notifications')}
                </TabPanel>

                <TabPanel value="security">
                  {renderSectionContent('security')}
                </TabPanel>

                <TabPanel value="privacy">
                  {renderSectionContent('privacy')}
                </TabPanel>
              </TabGroup>
              
              <div className="mt-8 pt-8 border-t border-[var(--border-1)] flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={<HelpCircle size={16} />}
                  onClick={() => {
                  }}
                >
                  Help & Support
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={<LogOut size={16} />}
                  onClick={async () => {
                    await logout();
                  }}
                  className="text-[var(--primary-red)] hover:bg-[var(--primary-red)]/10"
                >
                  Sign Out
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
              Current Password
            </label>
            <Input
              type="password"
              placeholder="Enter current password"
              icon={<Key size={18} />}
              onChange={() => {
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter new password"
              icon={<Key size={18} />}
              onChange={() => {
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Confirm new password"
              icon={<Key size={18} />}
              onChange={() => {
              }}
            />
          </div>
          <div className="flex gap-3">
            <Button 
              variant="primary" 
              fullWidth
              onClick={() => {
              }}
            >
              Update Password
            </Button>
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={() => {
                setShowPasswordModal(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--primary-red)]/10 border border-[var(--primary-red)]/20">
            <p className="text-sm text-[var(--primary-red)]">
              Warning: This action is permanent and cannot be undone. All your data will be deleted.
            </p>
          </div>
          <p className="text-[var(--text-2)]">
            Are you sure you want to delete your account? Type &quot;DELETE&quot; to confirm.
          </p>
          <Input
            type="text"
            placeholder="Type DELETE to confirm"
            onChange={() => {
            }}
          />
          <div className="flex gap-3">
            <Button 
              variant="danger" 
              fullWidth
              onClick={() => {
              }}
            >
              Delete My Account
            </Button>
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={() => {
                setShowDeleteModal(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Data Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Your Data"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            We&apos;ll prepare a download of all your data. This may take a few minutes.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded" 
                onChange={() => {
                }}
              />
              <span className="text-sm text-[var(--text-1)]">Account Information</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded" 
                onChange={() => {
                }}
              />
              <span className="text-sm text-[var(--text-1)]">Transaction History</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded" 
                onChange={() => {
                }}
              />
              <span className="text-sm text-[var(--text-1)]">Messages</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                defaultChecked 
                className="rounded" 
                onChange={() => {
                }}
              />
              <span className="text-sm text-[var(--text-1)]">Settings & Preferences</span>
            </label>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="primary" 
              fullWidth 
              icon={<Download size={16} />}
              onClick={() => {
              }}
            >
              Start Export
            </Button>
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={() => {
                setShowExportModal(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
