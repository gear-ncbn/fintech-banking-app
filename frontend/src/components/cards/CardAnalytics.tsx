'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Activity,
  PieChart,
  AlertCircle
} from 'lucide-react';
import Card from '@/components/ui/Card';
import { cardsApi } from '@/lib/api';
import type { CardAnalytics as CardAnalyticsType } from '@/lib/api';

interface CardAnalyticsProps {
  refreshTrigger?: unknown[];
}

export default function CardAnalytics({ refreshTrigger }: CardAnalyticsProps) {
  const [analytics, setAnalytics] = useState<CardAnalyticsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await cardsApi.getAnalytics();
      setAnalytics(data);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'var(--primary-red)';
    if (rate >= 60) return 'var(--primary-yellow)';
    return 'var(--primary-emerald)';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="default" className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-[rgba(var(--glass-rgb),0.1)] rounded w-1/2"></div>
              <div className="h-8 bg-[rgba(var(--glass-rgb),0.1)] rounded w-3/4"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card variant="default" className="p-8 mb-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--error-text)]" />
          <p className="text-[var(--error-text)]">{error || 'No analytics data available'}</p>
        </div>
      </Card>
    );
  }

  const categoryColors = [
    'var(--primary-blue)',
    'var(--primary-indigo)',
    'var(--primary-violet)',
    'var(--primary-pink)',
    'var(--primary-orange)',
    'var(--primary-emerald)',
  ];

  const topCategories = Object.entries(analytics.spending_by_category)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            variant="default"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Credit Utilization</p>
                <p className="text-2xl font-bold" style={{ color: getUtilizationColor(analytics.utilization_rate) }}>
                  {analytics.utilization_rate}%
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  ${analytics.total_balance.toLocaleString()} / ${analytics.total_credit_limit.toLocaleString()}
                </p>
              </div>
              <div className="relative">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="rgba(var(--glass-rgb),0.2)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke={getUtilizationColor(analytics.utilization_rate)}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${analytics.utilization_rate * 1.26} 126`}
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            variant="default"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Active Cards</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {analytics.active_cards}
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  of {analytics.total_cards} total
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card
            variant="default"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Avg Transaction</p>
                <p className="text-2xl font-bold text-[var(--primary-indigo)]">
                  {formatCurrency(analytics.average_transaction_size)}
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  per purchase
                </p>
              </div>
              <Activity className="w-8 h-8 text-[var(--primary-indigo)] opacity-20" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card
            variant="default"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Virtual Cards</p>
                <p className="text-2xl font-bold text-[var(--primary-violet)]">
                  {analytics.cards_by_type.virtual}
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  secure shopping
                </p>
              </div>
              <ShoppingBag className="w-8 h-8 text-[var(--primary-violet)] opacity-20" />
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cards by Type */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card variant="default" className="p-6 h-full">
            <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[var(--primary-blue)]" />
              Card Distribution
            </h3>
            
            <div className="space-y-4">
              {Object.entries(analytics.cards_by_type).map(([type, count], index) => {
                const total = Object.values(analytics.cards_by_type).reduce((sum, n) => sum + n, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const colors = {
                  credit: 'var(--primary-indigo)',
                  debit: 'var(--primary-blue)',
                  virtual: 'var(--primary-violet)'
                };
                
                return (
                  <div
                    key={type}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--text-1)] capitalize">{type} Cards</span>
                      <span className="text-sm font-medium text-[var(--text-1)]">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="relative h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ backgroundColor: colors[type as keyof typeof colors] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Spending by Category */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card variant="default" className="p-6 h-full">
            <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--primary-emerald)]" />
              Top Spending Categories
            </h3>
            
            {topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.map(([category, amount], index) => (
                  <div
                    key={`category-${category}-${index}`}
                    className="flex items-center justify-between cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.05)] p-2 -mx-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                      />
                      <span className="text-sm text-[var(--text-1)] capitalize">{category}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-1)]">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[var(--text-2)] opacity-50" />
                <p className="text-sm text-[var(--text-2)]">No spending data yet</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </>
  );
}
