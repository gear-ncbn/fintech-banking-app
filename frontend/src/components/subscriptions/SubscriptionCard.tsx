import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar,
  Bell,
  BellOff,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  AlertCircle,
  Clock,
  Activity
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import HeaderDropdown from '../ui/HeaderDropdown';
import { Subscription } from '@/app/(authenticated)/subscriptions/page';

interface SubscriptionCardProps {
  subscription: Subscription;
  onAction: (id: string, action: string) => void;
  onClick: () => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onAction,
  onClick,
  analyticsId = 'subscription-card',
  analyticsLabel: _analyticsLabel = 'Subscription Card',
}) => {
  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getMonthlyAmount = () => {
    switch (subscription.billing) {
      case 'yearly':
        return subscription.amount / 12;
      case 'weekly':
        return subscription.amount * 4;
      default:
        return subscription.amount;
    }
  };

  const getDaysUntilBilling = () => {
    const today = new Date();
    const nextBilling = new Date(subscription.nextBilling);
    const diffTime = nextBilling.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return (
          <div className="flex items-center gap-1 text-xs text-[var(--primary-emerald)]">
            <Activity className="w-3 h-3" />
            <span>Active</span>
          </div>
        );
      case 'paused':
        return (
          <div className="flex items-center gap-1 text-xs text-[var(--primary-amber)]">
            <Pause className="w-3 h-3" />
            <span>Paused</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-1 text-xs text-[var(--text-2)]">
            <AlertCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </div>
        );
    }
  };

  const menuOptions = [
    ...(subscription.status === 'active' ? [
      { value: 'pause', label: 'Pause Subscription', icon: <Pause size={16} /> }
    ] : []),
    ...(subscription.status === 'paused' ? [
      { value: 'resume', label: 'Resume Subscription', icon: <Play size={16} /> }
    ] : []),
    ...(subscription.status !== 'cancelled' ? [
      { value: 'cancel', label: 'Cancel Subscription', icon: <Trash2 size={16} /> }
    ] : []),
  ];

  const daysUntilBilling = getDaysUntilBilling();
  const monthlyAmount = getMonthlyAmount();

  return (
    <div className="h-full">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          onClick();
        }}
        className="cursor-pointer h-full"
      >
        <Card variant={subscription.status === 'cancelled' ? 'subtle' : 'default'} className="h-full">
          <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`
                p-2.5 rounded-lg bg-gradient-to-r ${subscription.color}
                flex items-center justify-center
              `}>
                {subscription.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--text-1)]">
                  {subscription.name}
                </h3>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  {subscription.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {menuOptions.length > 0 && (
                <HeaderDropdown
                  items={menuOptions}
                  onChange={(value) => {
                    onAction(subscription.id, value);
                  }}
                  trigger={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="!p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      analyticsId={`${analyticsId}-${subscription.id}-menu`}
                      analyticsLabel={`${subscription.name} Menu`}
                    >
                      <MoreVertical size={16} />
                    </Button>
                  }
                  analyticsId={`${analyticsId}-${subscription.id}-dropdown`}
                  analyticsLabel={`${subscription.name} Dropdown`}
                />
              )}
            </div>
          </div>

          {/* Pricing Info */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">
                {subscription.billing.charAt(0).toUpperCase() + subscription.billing.slice(1)} cost
              </span>
              <span className="text-lg font-semibold text-[var(--text-1)]">
                {formatCurrency(subscription.amount)}
              </span>
            </div>

            {subscription.billing !== 'monthly' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-2)]">Monthly cost</span>
                <span className="text-sm font-medium text-[var(--text-1)]">
                  {formatCurrency(monthlyAmount)}
                </span>
              </div>
            )}

            {subscription.savings && (
              <div className="p-2 rounded-lg bg-[rgba(var(--primary-emerald),0.1)] text-center">
                <p className="text-xs font-medium text-[var(--primary-emerald)]">
                  Saving {formatCurrency(subscription.savings.amount)} ({subscription.savings.percentage}%)
                </p>
              </div>
            )}
          </div>

          {/* Usage Progress */}
          {subscription.usage && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-2)]">Usage</span>
                <span className="text-xs font-medium text-[var(--text-1)]">
                  {subscription.usage.current} / {subscription.usage.limit} {subscription.usage.unit}
                </span>
              </div>
              <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(subscription.usage.current / subscription.usage.limit) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Next Billing Info */}
          {subscription.status === 'active' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--text-2)]" />
                <span className="text-sm text-[var(--text-2)]">Next billing</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {new Date(subscription.nextBilling).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  in {daysUntilBilling} {daysUntilBilling === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Date */}
          {subscription.status === 'cancelled' && subscription.cancellationDate && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--text-2)]" />
                <span className="text-sm text-[var(--text-2)]">Ends on</span>
              </div>
              <p className="text-sm font-medium text-[var(--text-1)]">
                {new Date(subscription.cancellationDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Trial Info */}
          {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
            <div className="mt-3 p-2 rounded-lg bg-[rgba(var(--primary-amber),0.1)] text-center">
              <p className="text-xs font-medium text-[var(--primary-amber)]">
                Trial ends on {new Date(subscription.trialEnd).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Bottom Info */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-1)]">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(subscription.id, 'toggle-notifications');
                }}
                className="text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              >
                {subscription.notifications ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
              <span className="text-xs text-[var(--text-2)]">
                {subscription.paymentMethod}
              </span>
            </div>
            
            {subscription.autoRenew && subscription.status === 'active' && (
              <div className="flex items-center gap-1 text-xs text-[var(--text-2)]">
                <Clock className="w-3 h-3" />
                <span>Auto-renew</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
    </div>
  );
};

export default SubscriptionCard;
