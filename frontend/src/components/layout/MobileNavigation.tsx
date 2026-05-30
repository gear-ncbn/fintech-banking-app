'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Wallet, 
  DollarSign, 
  Receipt, 
  Target, 
  CreditCard as CardIcon,
  TrendingUp,
  Building2,
  Shield,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Moon,
  Sun,
  RefreshCcw,
  Send,
  CalendarDays,
  LineChart,
  FileText,
  MessageSquare,
  UserPlus,
  Coins
} from 'lucide-react';
import AnimatedLogo from '../ui/AnimatedLogo';
import Button from '../ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { type Notification } from '@/lib/notifications';
import { accountsService, messagesService } from '@/lib/api';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount?: number;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onClose,
  notifications,
}) => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showNotifications, setShowNotifications] = useState(false);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme as 'light' | 'dark');
  }, []);

  useEffect(() => {
    // Load total balance when mobile nav is opened
    if (isOpen) {
      const loadBalance = async () => {
        try {
          const summary = await accountsService.getAccountSummary();
          // Match the desktop header, which shows total assets as the balance.
          setTotalBalance(summary.total_balance ?? summary.total_assets ?? 0);
          
          // Load unread messages count
          const messageCount = await messagesService.getTotalUnreadCount();
          setUnreadMessagesCount(messageCount.unread_count);
        } catch {
        } finally {
          setLoadingBalance(false);
        }
      };
      loadBalance();
    }
  }, [isOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'success':
        return <DollarSign size={16} />;
      case 'warning':
        return <Bell size={16} />;
      case 'error':
        return <Shield size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <Wallet size={20} /> },
    { href: '/accounts', label: 'Accounts', icon: <DollarSign size={20} /> },
    { href: '/crypto', label: 'Crypto', icon: <Coins size={20} /> },
    { href: '/loans', label: 'Loans', icon: <FileText size={20} /> },
    { href: '/insurance', label: 'Insurance', icon: <Shield size={20} /> },
    { href: '/transactions', label: 'Transactions', icon: <Receipt size={20} /> },
    { href: '/messages', label: 'Messages', icon: <MessageSquare size={20} /> },
    { href: '/contacts', label: 'Contacts', icon: <UserPlus size={20} /> },
    { href: '/budget', label: 'Budget', icon: <Target size={20} /> },
    { href: '/cards', label: 'Cards', icon: <CardIcon size={20} /> },
    { href: '/goals', label: 'Goals', icon: <TrendingUp size={20} /> },
    { href: '/transfer', label: 'Transfer Money', icon: <RefreshCcw size={20} /> },
    { href: '/p2p', label: 'Send to Friend', icon: <Send size={20} /> },
    { href: '/analytics', label: 'Analytics', icon: <LineChart size={20} /> },
    { href: '/business', label: 'Business', icon: <Building2 size={20} /> },
    { href: '/invoices', label: 'Invoices', icon: <FileText size={20} /> },
    { href: '/subscriptions', label: 'Subscriptions', icon: <CalendarDays size={20} /> },
    { href: '/notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { href: '/security', label: 'Security', icon: <Shield size={20} /> },
  ];

  const handleNavClick = (_href: string, _label: string) => {
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: { x: '-100%' },
    visible: { 
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }
    },
    exit: { 
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }
    },
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm z-40 lg:hidden"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
              className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-[rgba(var(--glass-rgb),0.95)] backdrop-blur-xl border-r border-[var(--glass-border-prominent)] z-50 lg:hidden overflow-y-auto"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-1)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AnimatedLogo size="sm" showText={false} />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold gradient-text">FinanceHub</span>
                    <span className="text-xs text-[var(--text-2)] -mt-1">Smart Banking</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="!p-2"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-[var(--border-1)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium text-lg">
                  {user?.first_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-1)]">
                    {user?.first_name || user?.username || 'User'}
                  </p>
                  <p className="text-sm text-[var(--text-2)]">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Balance */}
            <div className="p-4 border-b border-[var(--border-1)]">
              <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-sm border border-[var(--border-1)]">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-[var(--primary-emerald)]" />
                  <div className="flex-1">
                    <p className="text-xs text-[var(--text-2)]">Total Balance</p>
                    <p className="text-lg font-semibold text-[var(--text-1)]">
                      {loadingBalance ? '...' : `$${(totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-2">
              <ul className="space-y-1">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => handleNavClick(item.href, item.label)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 text-[var(--text-2)] hover:text-[var(--text-1)]"
                    >
                      <span className="text-[var(--text-2)] relative">
                        {item.icon}
                        {item.href === '/messages' && unreadMessagesCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary-red)] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Divider */}
            <div className="mx-4 my-2 h-px bg-[var(--border-1)]" />

            {/* Bottom Actions */}
            <div className="p-2">
              <Link
                href="/settings"
                onClick={() => handleNavClick('/settings', 'Settings')}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                <Settings size={20} />
                <span className="font-medium">Settings</span>
              </Link>

              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                <HelpCircle size={20} />
                <span className="font-medium">Help & Support</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 text-[var(--primary-red)] hover:bg-[rgba(var(--primary-red),0.1)]"
              >
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </button>
            </div>

            {/* Notifications Count */}
            <div className="p-4 border-t border-[var(--border-1)]">
              <button
                onClick={() => {
                  setShowNotifications(true);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] hover:bg-[rgba(var(--glass-rgb),0.5)] transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-[var(--primary-blue)]" />
                  <span className="text-sm font-medium text-[var(--text-1)]">Notifications</span>
                </div>
                {notifications.length > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-[var(--primary-red)] text-white rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Modal Overlay */}
            <motion.div
              className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
            />

            {/* Modal Content */}
            <motion.div
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md glass-card rounded-2xl p-6 z-50"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-1)]">Notifications</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                  className="!p-2"
                >
                  <X size={20} />
                </Button>
              </div>

              {/* Notifications List */}
              <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-12 h-12 text-[var(--text-2)] opacity-30 mx-auto mb-3" />
                    <p className="text-[var(--text-2)]">No new notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] hover:bg-[rgba(var(--glass-rgb),0.3)] transition-colors cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full flex-shrink-0 ${
                            notification.type === 'success' ? 'bg-[rgba(var(--primary-emerald),0.1)]' :
                            notification.type === 'warning' ? 'bg-[rgba(var(--primary-amber),0.1)]' :
                            notification.type === 'error' ? 'bg-[rgba(var(--primary-red),0.1)]' :
                            'bg-[rgba(var(--primary-blue),0.1)]'
                          }`}>
                            {getNotificationIcon(notification)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-1)]">
                              {notification.title}
                            </p>
                            <p className="text-xs text-[var(--text-2)] mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-[var(--text-2)] mt-1">
                              {formatTimeAgo(new Date(notification.created_at))}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-[var(--border-1)] space-y-2">
                {notifications.length > 0 && (
                  <Link href="/notifications" onClick={() => setShowNotifications(false)}>
                    <Button
                      variant="primary"
                      fullWidth
                    >
                      View All Notifications
                    </Button>
                  </Link>
                )}
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowNotifications(false)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNavigation;
