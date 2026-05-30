'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollTracking } from '@/hooks/useScrollTracking';
import {
  Bell,
  DollarSign,
  Shield,
  Target,
  Repeat,
  Check,
  CheckCircle,

  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { notificationsService, type Notification } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationsPage() {
  const { user: _user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Scroll tracking must be at top level to avoid hooks order issues
  const scrollContainerRef = useScrollTracking({
    elementId: 'notifications-list-scroll',
    elementName: 'Notifications List',
    thresholds: [25, 50, 75, 100]
  });

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      // Pass the correct parameter based on filter
      let isReadParam: boolean | undefined = undefined;
      if (filter === 'unread') {
        isReadParam = false;
      } else if (filter === 'read') {
        isReadParam = true;
      }

      const notifs = await notificationsService.getNotifications(isReadParam);
      setNotifications(notifs);

      // Get unread count - we need to fetch all notifications to get accurate count
      if (filter !== 'all') {
        const allNotifs = await notificationsService.getNotifications();
        const unread = allNotifs.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } else {
        const unread = notifs.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch {
      // Error handled
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const _notification = notifications.find(n => n.id === notificationId);
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      // Notify the header so its unread badge updates immediately.
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch {
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const _unreadBefore = notifications.filter(n => !n.is_read).length;
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      // Notify the header so its unread badge clears immediately.
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch {
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <DollarSign size={20} className="text-[var(--primary-emerald)]" />;
      case 'warning':
        return <AlertCircle size={20} className="text-[var(--primary-amber)]" />;
      case 'error':
        return <Shield size={20} className="text-[var(--primary-red)]" />;
      default:
        return <Bell size={20} className="text-[var(--primary-blue)]" />;
    }
  };

  const getRelatedEntityIcon = (entityType?: Notification['related_entity_type']) => {
    switch (entityType) {
      case 'transaction':
        return <Repeat size={16} />;
      case 'budget':
        return <Target size={16} />;
      case 'goal':
        return <TrendingUp size={16} />;
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (selectedType === 'all') return true;
    return n.type === selectedType;
  });

  const filterOptions = [
    { value: 'all', label: 'All Notifications', icon: <Bell size={16} /> },
    { value: 'unread', label: 'Unread Only', icon: <Clock size={16} /> },
    { value: 'read', label: 'Read', icon: <CheckCircle size={16} /> },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warnings' },
    { value: 'info', label: 'Information' },
    { value: 'error', label: 'Errors' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-1)] mb-2">Notifications</h1>
        <p className="text-[var(--text-2)]">Stay updated with your account activity</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex flex-1 gap-3">
          <Dropdown
            items={filterOptions}
            value={filter}
            onChange={(value) => {
              const _oldFilter = filter;
              setFilter(value as 'all' | 'unread' | 'read');
            }}
            placeholder="Filter"
          />
          
          <Dropdown
            items={typeOptions}
            value={selectedType}
            onChange={(value) => {
              const _oldType = selectedType;
              setSelectedType(value);
            }}
            placeholder="Type"
          />
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              handleMarkAllAsRead();
            }}
            className="flex items-center gap-2"
            data-testid="mark-all-read-button"
            onMouseEnter={() => {
            }}
          >
            <CheckCircle size={16} />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-blue)]"></div>
          </div>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="w-16 h-16 text-[var(--text-2)] opacity-30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-1)] mb-2">No notifications</h3>
          <p className="text-[var(--text-2)]">
            {filter === 'unread' ? "You're all caught up!" : "No notifications to display"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto" ref={scrollContainerRef}>
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
                    !notification.is_read ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue-rgb),0.05)]' : ''
                  }`}
                  data-testid={`notification-${notification.id}`}
                  onMouseEnter={() => {
                  }}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-full flex-shrink-0 ${
                      notification.type === 'success' ? 'bg-[rgba(var(--primary-emerald-rgb),0.1)]' :
                      notification.type === 'warning' ? 'bg-[rgba(var(--primary-amber-rgb),0.1)]' :
                      notification.type === 'error' ? 'bg-[rgba(var(--primary-red-rgb),0.1)]' :
                      'bg-[rgba(var(--primary-blue-rgb),0.1)]'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-[var(--text-1)] mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-[var(--text-2)] mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-2)]">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {notification.related_entity_type && (
                              <span className="flex items-center gap-1">
                                {getRelatedEntityIcon(notification.related_entity_type)}
                                {notification.related_entity_type}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--primary-blue)] text-white">
                              New
                            </span>
                          ) : (
                            <Check size={16} className="text-[var(--text-2)]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
