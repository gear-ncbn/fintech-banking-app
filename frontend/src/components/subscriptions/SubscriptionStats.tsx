import React from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  AlertCircle,
  Activity,
  Pause,
  X,
  CheckCircle
} from 'lucide-react';
import Card from '../ui/Card';
import {
  Subscription,
  getSubscriptionMonthlyCost,
  getSubscriptionYearlyCost,
} from '@/app/(authenticated)/subscriptions/page';

interface SubscriptionStatsProps {
  subscriptions: Subscription[];
}

export const SubscriptionStats: React.FC<SubscriptionStatsProps> = ({ subscriptions }) => {
  const calculateMonthlyTotal = () => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, sub) => total + getSubscriptionMonthlyCost(sub), 0);
  };

  const calculateYearlyTotal = () => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((total, sub) => total + getSubscriptionYearlyCost(sub), 0);
  };

  const calculateSavings = () => {
    return subscriptions
      .filter(s => s.savings && s.status === 'active')
      .reduce((total, sub) => total + (sub.savings?.amount || 0), 0);
  };

  const getUpcomingRenewals = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return subscriptions.filter(sub => {
      if (sub.status !== 'active') return false;
      const nextBilling = new Date(sub.nextBilling);
      return nextBilling >= today && nextBilling <= nextWeek;
    }).length;
  };

  const monthlyTotal = calculateMonthlyTotal();
  const yearlyTotal = calculateYearlyTotal();
  const totalSavings = calculateSavings();
  const upcomingRenewals = getUpcomingRenewals();

  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const pausedCount = subscriptions.filter(s => s.status === 'paused').length;
  const cancelledCount = subscriptions.filter(s => s.status === 'cancelled').length;

  const hasTrialsActive = subscriptions.some(
    s => s.trialEnd && new Date(s.trialEnd) > new Date()
  );
  const hasAlerts = upcomingRenewals > 0 || pausedCount > 0 || hasTrialsActive;

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="mb-8">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-2)]">Monthly Total</p>
              <p className="text-2xl font-bold text-[var(--text-1)]">
                {formatCurrency(monthlyTotal)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
          </div>
        </Card>

        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-2)]">Yearly Total</p>
              <p className="text-2xl font-bold text-[var(--text-1)]">
                {formatCurrency(yearlyTotal)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-[var(--primary-indigo)] opacity-20" />
          </div>
        </Card>

        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-2)]">Total Savings</p>
              <p className="text-2xl font-bold text-[var(--primary-emerald)]">
                {formatCurrency(totalSavings)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
          </div>
        </Card>

        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-2)]">Active Subscriptions</p>
              <p className="text-2xl font-bold text-[var(--text-1)]">
                {activeCount}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-[var(--primary-violet)] opacity-20" />
          </div>
        </Card>
      </div>

      {/* Status Breakdown and Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <Card variant="subtle" className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-1)] mb-4">
            Subscription Status
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--primary-emerald)]" />
                <span className="text-sm text-[var(--text-2)]">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-1)]">{activeCount}</span>
                <div className="w-24 h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-teal)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeCount / subscriptions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-[var(--primary-amber)]" />
                <span className="text-sm text-[var(--text-2)]">Paused</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-1)]">{pausedCount}</span>
                <div className="w-24 h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--primary-amber)] to-[var(--primary-amber)]/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${(pausedCount / subscriptions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-[var(--text-2)]" />
                <span className="text-sm text-[var(--text-2)]">Cancelled</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-1)]">{cancelledCount}</span>
                <div className="w-24 h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--text-2)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(cancelledCount / subscriptions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card variant="subtle" className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-1)] mb-4">
            Alerts & Notifications
          </h3>
          
          <div className="space-y-3">
            {upcomingRenewals > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(var(--primary-amber),0.1)] border border-[var(--primary-amber)]/20">
                <AlertCircle className="w-4 h-4 text-[var(--primary-amber)] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    {upcomingRenewals} upcoming renewal{upcomingRenewals > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-[var(--text-2)] mt-1">
                    In the next 7 days
                  </p>
                </div>
              </div>
            )}

            {pausedCount > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                <Pause className="w-4 h-4 text-[var(--primary-amber)] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    {pausedCount} paused subscription{pausedCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-[var(--text-2)] mt-1">
                    Consider resuming or cancelling
                  </p>
                </div>
              </div>
            )}

            {hasTrialsActive && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                <Calendar className="w-4 h-4 text-[var(--primary-blue)] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    Trial periods active
                  </p>
                  <p className="text-xs text-[var(--text-2)] mt-1">
                    Review before they convert
                  </p>
                </div>
              </div>
            )}

            {!hasAlerts && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(var(--primary-emerald),0.08)] border border-[var(--primary-emerald)]/20">
                <CheckCircle className="w-4 h-4 text-[var(--primary-emerald)] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    You&apos;re all caught up
                  </p>
                  <p className="text-xs text-[var(--text-2)] mt-1">
                    No alerts or notifications right now
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionStats;