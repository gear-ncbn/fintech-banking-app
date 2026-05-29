'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Wallet,
  Settings,
  User,
  LogOut,
  DollarSign,
  Receipt,
  Target,
  CreditCard as CardIcon,
  TrendingUp,
  Menu,
  HelpCircle,
  Building2,
  Shield,
  MoreHorizontal,
  RefreshCcw,
  RefreshCw,
  Send,
  CalendarDays,
  LineChart,
  FileText,
  MessageSquare,
  UserPlus,
  Coins
} from 'lucide-react';
import Button from '../ui/Button';
import AnimatedLogo from '../ui/AnimatedLogo';
import ThemeToggle from '../ui/ThemeToggle';
import MobileNavigation from './MobileNavigation';
import HeaderDropdown from '../ui/HeaderDropdown';
import { notificationsService, type Notification } from '@/lib/notifications';
import { accountsService, cardsApi, messagesService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { eventBus, EVENTS } from '@/services/eventBus';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ _onMenuToggle }) => {
  const { user, logout } = useAuth();
  const _pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalanceDropdown, setShowBalanceDropdown] = useState(false);
  const [accountsData, setAccountsData] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accounts: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessAccounts: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cards: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessCards: any[];
  }>({
    accounts: [],
    businessAccounts: [],
    cards: [],
    businessCards: []
  });
  const [loadingAccountsData, setLoadingAccountsData] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousCountRef = useRef<number>(0);

  // Function to load notifications
  const loadNotifications = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      
      const notifs = await notificationsService.getNotifications();
      setNotifications(notifs);
      
      // Calculate unread count
      const unread = notifs.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      
      // Check if we have new notifications (count increased)
      if (unread > previousCountRef.current) {
        setHasNewNotifications(true);
        // Reset the animation after 3 seconds
        setTimeout(() => setHasNewNotifications(false), 3000);
      }
      previousCountRef.current = unread;
    } catch {
    } finally {
      if (showRefreshIndicator) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Function to reload balance
  const reloadBalance = async () => {
    try {
      const summary = await accountsService.getAccountSummary();
      // Use total_assets as the balance to display in header
      setTotalBalance(summary.total_assets);
    } catch {
    }
  };

  // Load notifications and balance on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load notifications from API
        await loadNotifications();
        
        // Load unread messages count
        await loadUnreadMessagesCount();
        
        // Load account balance
        await reloadBalance();
      } catch {
      } finally {
        setLoadingBalance(false);
      }
    };
    
    if (user) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Subscribe to balance update events
  useEffect(() => {
    const unsubscribe = eventBus.on(EVENTS.BALANCE_UPDATE, () => {
      reloadBalance();
    });

    return unsubscribe;
  }, []);

  // Load accounts data when dropdown is opened
  const loadAccountsData = async () => {
    setLoadingAccountsData(true);
    try {
      const [allAccounts, allCards] = await Promise.all([
        accountsService.getAccounts(),
        cardsApi.getCards()
      ]);

      // Separate regular and business accounts
      const regularAccounts = allAccounts.filter(acc => 
        !acc.name.toLowerCase().includes('business') && 
        acc.account_type !== 'LOAN'
      );
      const businessAccounts = allAccounts.filter(acc => 
        acc.name.toLowerCase().includes('business') && 
        acc.account_type !== 'LOAN'
      );

      // Separate regular and business cards
      const regularCards = allCards.filter(card => 
        !card.card_name.toLowerCase().includes('business')
      );
      const businessCards = allCards.filter(card => 
        card.card_name.toLowerCase().includes('business')
      );

      setAccountsData({
        accounts: regularAccounts,
        businessAccounts: businessAccounts,
        cards: regularCards,
        businessCards: businessCards
      });
    } catch {
    } finally {
      setLoadingAccountsData(false);
    }
  };

  // Function to load unread messages count
  const loadUnreadMessagesCount = async () => {
    if (!user) return;
    
    try {
      const conversations = await messagesService.getConversations();
      const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadMessagesCount(totalUnread);
    } catch {
    }
  };

  // Set up automatic notification refresh every 5 seconds
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval for automatic refresh
    intervalRef.current = setInterval(() => {
      loadNotifications(showNotifications); // Show refresh indicator only if dropdown is open
      loadUnreadMessagesCount(); // Also refresh unread messages count
    }, 5000); // Refresh every 5 seconds
    
    // Listen for refresh notifications event
    const handleRefreshNotifications = () => {
      loadNotifications(true);
    };
    
    window.addEventListener('refreshNotifications', handleRefreshNotifications);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications]); // Re-create interval when dropdown state changes

  // Handle click outside for notifications and balance dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (balanceRef.current && !balanceRef.current.contains(event.target as Node)) {
        setShowBalanceDropdown(false);
      }
    };

    if (showNotifications || showBalanceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications, showBalanceDropdown]);

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
    { href: '/dashboard', label: 'Dashboard', icon: <Wallet size={18} /> },
    { href: '/accounts', label: 'Accounts', icon: <DollarSign size={18} /> },
    { href: '/crypto', label: 'Crypto', icon: <Coins size={18} /> },
    { href: '/loans', label: 'Loans', icon: <FileText size={18} /> },
    { href: '/insurance', label: 'Insurance', icon: <Shield size={18} /> },
    { href: '/transactions', label: 'Transactions', icon: <Receipt size={18} /> },
    { href: '/messages', label: 'Messages', icon: <MessageSquare size={18} /> },
    { href: '/budget', label: 'Budget', icon: <Target size={18} /> },
    { href: '/cards', label: 'Cards', icon: <CardIcon size={18} /> },
    { href: '/goals', label: 'Goals', icon: <TrendingUp size={18} /> },
  ];

  const moreMenuItems = [
    ...navigationItems.map(item => ({
      value: item.href.slice(1),
      label: item.label,
      icon: item.icon,
      href: item.href,
    })),
    { value: 'investments', label: 'Investments', icon: <TrendingUp size={16} />, href: '/investments' },
    { value: 'credit-cards', label: 'Credit Cards', icon: <CardIcon size={16} />, href: '/credit-cards' },
    { value: 'currency-converter', label: 'Currency Exchange', icon: <RefreshCw size={16} />, href: '/currency-converter' },
    { value: 'contacts', label: 'Contacts', icon: <UserPlus size={16} />, href: '/contacts' },
    { value: 'transfer', label: 'Transfer Money', icon: <RefreshCcw size={16} />, href: '/transfer' },
    { value: 'p2p', label: 'Send to Friend', icon: <Send size={16} />, href: '/p2p' },
    { value: 'analytics', label: 'Analytics', icon: <LineChart size={16} />, href: '/analytics' },
    { value: 'business', label: 'Business', icon: <Building2 size={16} />, href: '/business' },
    { value: 'invoices', label: 'Invoices', icon: <FileText size={16} />, href: '/invoices' },
    { value: 'subscriptions', label: 'Subscriptions', icon: <CalendarDays size={16} />, href: '/subscriptions' },
    { value: 'notifications', label: 'Notifications', icon: <Bell size={16} />, href: '/notifications' },
    { value: 'security', label: 'Security', icon: <Shield size={16} />, href: '/security' },
  ];

  const userMenuItems = [
    { value: 'profile', label: 'My Profile', icon: <User size={16} />, href: '/settings' },
    { value: 'settings', label: 'Settings', icon: <Settings size={16} />, href: '/settings' },
    { value: 'help', label: 'Help & Support', icon: <HelpCircle size={16} /> },
    { value: 'logout', label: 'Log Out', icon: <LogOut size={16} /> },
  ];

  const handleUserMenuSelect = async (value: string) => {
    
    if (value === 'logout') {
      await logout();
    } else {
      const item = userMenuItems.find(i => i.value === value);
      if (item?.href) {
        router.push(item.href);
      }
    }
  };

  const handleMoreMenuSelect = (value: string) => {
    
    const item = moreMenuItems.find(i => i.value === value);
    if (item?.href) {
      router.push(item.href);
    }
  };

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-[var(--border-1)] relative">
      {/* Animated gradient background for header */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-[var(--primary-blue)] via-[var(--primary-teal)] to-[var(--primary-emerald)] opacity-10"
          style={{
            backgroundSize: '200% 100%',
            animation: 'gradient-animation 15s ease infinite',
          }}
        />
      </div>
      <div className="container mx-auto px-3 sm:px-4 max-w-full">
        <div className="flex items-center justify-between h-20 gap-2 sm:gap-3 lg:gap-4">
          {/* Left section with logo and nav */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowMobileNav(true);
              }}
              className="lg:hidden flex flex-shrink-0"
              aria-label="Toggle menu"
              analyticsId="mobile-menu-toggle"
              analyticsLabel="Mobile Menu Toggle"
            >
              <Menu size={20} />
            </Button>
            
            {/* Logo */}
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 flex-shrink-0"
            >
              <AnimatedLogo size="md" showText={false} />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm sm:text-lg font-bold gradient-text">FinanceHub</span>
                <span className="text-xs text-[var(--text-2)] -mt-1 hidden sm:block">Smart Banking</span>
              </div>
            </Link>
            
            {/* Dynamic Priority Navigation */}
            <nav className="hidden lg:flex items-center gap-1 flex-1">
              {/* Always visible items (Dashboard, Accounts) */}
              {navigationItems.slice(0, 2).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 group whitespace-nowrap flex-shrink-0"
                >
                  <span className="group-hover:text-[var(--primary-blue)] transition-colors flex-shrink-0 relative">
                    {item.icon}
                    {item.href === '/messages' && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary-red)] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
              
              {/* Progressively hidden items based on available space */}
              {navigationItems.slice(2).map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item items-center gap-2 px-3 py-2 rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 group whitespace-nowrap
                    hidden
                    ${index === 0 ? 'min-[1100px]:flex' : ''}
                    ${index === 1 ? 'min-[1280px]:flex' : ''}
                    ${index === 2 ? 'min-[1400px]:flex' : ''}
                    ${index === 3 ? 'min-[1500px]:flex' : ''}
                  `}
                >
                  <span className="group-hover:text-[var(--primary-blue)] transition-colors flex-shrink-0 relative">
                    {item.icon}
                    {item.href === '/messages' && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary-red)] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
              
              {/* Dynamic More dropdown - at same level as nav items */}
              <HeaderDropdown
                items={[
                  // Transactions - visible in More when < 1050px
                  ...(navigationItems[2] ? [{
                    value: navigationItems[2].href.slice(1),
                    label: navigationItems[2].label,
                    icon: navigationItems[2].icon,
                    href: navigationItems[2].href,
                    className: 'min-[1100px]:hidden',
                  }] : []),
                  // Budget - visible in More when < 1280px
                  ...(navigationItems[3] ? [{
                    value: navigationItems[3].href.slice(1),
                    label: navigationItems[3].label,
                    icon: navigationItems[3].icon,
                    href: navigationItems[3].href,
                    className: 'min-[1280px]:hidden',
                  }] : []),
                  // Cards - visible in More when < 1400px
                  ...(navigationItems[4] ? [{
                    value: navigationItems[4].href.slice(1),
                    label: navigationItems[4].label,
                    icon: navigationItems[4].icon,
                    href: navigationItems[4].href,
                    className: 'min-[1400px]:hidden',
                  }] : []),
                  // Goals - visible in More when < 1500px
                  ...(navigationItems[5] ? [{
                    value: navigationItems[5].href.slice(1),
                    label: navigationItems[5].label,
                    icon: navigationItems[5].icon,
                    href: navigationItems[5].href,
                    className: 'min-[1500px]:hidden',
                  }] : []),
                  // Always include additional menu items (starting after the main navigation items)
                  ...moreMenuItems.slice(navigationItems.length),
                ]}
                onChange={handleMoreMenuSelect}
                align="left"
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(var(--glass-rgb),0.3)] transition-all duration-200 flex-shrink-0"
                    analyticsId="more-menu-toggle"
                    analyticsLabel="More Menu Toggle"
                  >
                    <MoreHorizontal size={18} />
                    <span className="text-sm font-medium">More</span>
                  </Button>
                }
              />
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle size="sm" />
            </div>
            
            {/* Quick balance with dropdown - Hidden on mobile */}
            <div className="relative" ref={balanceRef}>
              <button
                className="hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-sm border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.4)] transition-colors cursor-pointer"
                onClick={() => {
                  setShowBalanceDropdown(!showBalanceDropdown);
                  if (!showBalanceDropdown) {
                    loadAccountsData();
                  }
                }}
              >
                <Wallet size={18} className="text-[var(--primary-emerald)]" />
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-2)]">Balance</span>
                  <span className="text-sm font-semibold text-[var(--text-1)] -mt-0.5">
                    {loadingBalance ? '...' : `$${(totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              </button>

              {/* Balance Dropdown */}
              <AnimatePresence>
                {showBalanceDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-y-auto bg-[rgba(var(--glass-rgb),0.95)] backdrop-blur-xl border border-[var(--glass-border-prominent)] rounded-xl shadow-xl z-50"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-1)]">
                      <h3 className="font-semibold text-[var(--text-1)]">All Accounts & Cards</h3>
                      <p className="text-xs text-[var(--text-2)] mt-1">Total Balance: ${(totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    {loadingAccountsData ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 text-[var(--text-2)] animate-spin mx-auto mb-2" />
                        <p className="text-sm text-[var(--text-2)]">Loading accounts...</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {/* Personal Accounts */}
                        {accountsData.accounts.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-[var(--text-2)] uppercase font-medium px-3 py-2">Personal Accounts</p>
                            {accountsData.accounts.map(account => (
                              <Link
                                key={account.id}
                                href={`/accounts/${account.id}`}
                                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors"
                                onClick={() => {
                                  setShowBalanceDropdown(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[rgba(var(--primary-blue),0.1)] flex items-center justify-center">
                                    <DollarSign size={16} className="text-[var(--primary-blue)]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-1)]">{account.name}</p>
                                    <p className="text-xs text-[var(--text-2)]">{account.account_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-[var(--text-1)]">
                                  ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Business Accounts */}
                        {accountsData.businessAccounts.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-[var(--text-2)] uppercase font-medium px-3 py-2">Business Accounts</p>
                            {accountsData.businessAccounts.map(account => (
                              <Link
                                key={account.id}
                                href={`/business`}
                                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors"
                                onClick={() => {
                                  setShowBalanceDropdown(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[rgba(var(--primary-emerald),0.1)] flex items-center justify-center">
                                    <Building2 size={16} className="text-[var(--primary-emerald)]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-1)]">{account.name}</p>
                                    <p className="text-xs text-[var(--text-2)]">{account.account_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-[var(--text-1)]">
                                  ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Personal Cards */}
                        {accountsData.cards.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-[var(--text-2)] uppercase font-medium px-3 py-2">Personal Cards</p>
                            {accountsData.cards.map(card => (
                              <Link
                                key={card.id}
                                href="/cards"
                                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors"
                                onClick={() => {
                                  setShowBalanceDropdown(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[rgba(var(--primary-indigo),0.1)] flex items-center justify-center">
                                    <CardIcon size={16} className="text-[var(--primary-indigo)]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-1)]">{card.card_name}</p>
                                    <p className="text-xs text-[var(--text-2)]">•••• {card.last_four} • {card.card_type}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-[var(--text-1)]">
                                  ${(card.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Business Cards */}
                        {accountsData.businessCards.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-[var(--text-2)] uppercase font-medium px-3 py-2">Business Cards</p>
                            {accountsData.businessCards.map(card => (
                              <Link
                                key={card.id}
                                href="/business"
                                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors"
                                onClick={() => {
                                  setShowBalanceDropdown(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[rgba(var(--primary-teal),0.1)] flex items-center justify-center">
                                    <CardIcon size={16} className="text-[var(--primary-teal)]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-1)]">{card.card_name}</p>
                                    <p className="text-xs text-[var(--text-2)]">•••• {card.last_four} • {card.card_type}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-[var(--text-1)]">
                                  ${(card.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* No accounts message */}
                        {accountsData.accounts.length === 0 && 
                         accountsData.businessAccounts.length === 0 && 
                         accountsData.cards.length === 0 && 
                         accountsData.businessCards.length === 0 && (
                          <div className="p-8 text-center">
                            <Wallet className="w-12 h-12 text-[var(--text-2)] opacity-30 mx-auto mb-3" />
                            <p className="text-[var(--text-2)]">No accounts or cards found</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer actions */}
                    <div className="p-3 border-t border-[var(--border-1)]">
                      <Link href="/accounts">
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setShowBalanceDropdown(false);
                          }}
                        >
                          Manage All Accounts
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  // Refresh notifications when opening dropdown
                  if (!showNotifications) {
                    loadNotifications();
                  }
                }}
                className="relative"
                aria-label="Notifications"
                analyticsId="notifications-bell"
                analyticsLabel="Notifications"
              >
                <Bell size={20} className={hasNewNotifications ? 'animate-bounce' : ''} />
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: hasNewNotifications ? [1, 1.2, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary-red)] text-white text-xs font-medium rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-80 bg-[rgba(var(--glass-rgb),0.95)] backdrop-blur-xl border border-[var(--glass-border-prominent)] rounded-xl shadow-xl overflow-hidden z-50"
                  >
                  <div className="p-4 border-b border-[var(--border-1)] flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--text-1)]">Notifications</h3>
                    {isRefreshing && (
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-[var(--primary-blue)] rounded-full animate-pulse"></div>
                        <span className="text-xs text-[var(--text-2)]">Refreshing...</span>
                      </div>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-[var(--text-2)] opacity-30 mx-auto mb-3" />
                        <p className="text-[var(--text-2)]">No new notifications</p>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors cursor-pointer border-b border-[var(--border-1)] last:border-b-0 ${
                            !notification.is_read ? 'bg-[rgba(var(--primary-blue-rgb),0.05)]' : ''
                          }`}
                          onClick={async () => {
                            if (!notification.is_read) {
                              await notificationsService.markAsRead(notification.id);
                              loadNotifications();
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              notification.type === 'success' ? 'bg-[rgba(var(--primary-emerald),0.1)]' :
                              notification.type === 'warning' ? 'bg-[rgba(var(--primary-amber),0.1)]' :
                              notification.type === 'error' ? 'bg-[rgba(var(--primary-red),0.1)]' :
                              'bg-[rgba(var(--primary-blue),0.1)]'
                            }`}>
                              {getNotificationIcon(notification)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
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
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-[var(--primary-blue)] rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-[var(--border-1)]">
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setShowNotifications(false);
                        router.push('/notifications');
                      }}
                    >
                      View All Notifications
                    </Button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
            
            {/* User Menu */}
            <HeaderDropdown
              items={userMenuItems}
              onChange={handleUserMenuSelect}
              align="right"
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                  }}
                  className="flex items-center gap-2"
                  analyticsId="user-profile-button"
                  analyticsLabel="User Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium">
                    {user?.first_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline text-[var(--text-1)] text-sm md:text-base">
                    {user?.first_name || user?.username || 'User'}
                  </span>
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        notifications={notifications}
        unreadCount={unreadCount}
      />
    </header>
  );
};

export default Header;
