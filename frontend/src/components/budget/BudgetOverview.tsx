import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertCircle,
  Calendar
} from 'lucide-react';
import Card from '../ui/Card';

interface BudgetOverviewProps {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  period: 'month' | 'quarter' | 'year';
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  totalAllocated,
  totalSpent,
  totalRemaining,
  period,
}) => {
  // Add null/zero checks to prevent NaN
  const safeAllocated = totalAllocated || 0;
  const safeSpent = totalSpent || 0;
  const safeRemaining = totalRemaining || 0;
  
  const spentPercentage = safeAllocated > 0 ? (safeSpent / safeAllocated) * 100 : 0;
  const isOverBudget = safeRemaining < 0;
  
  // Calculate actual days based on period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (period === 'month') {
    periodStart = new Date(currentYear, currentMonth, 1);
    periodEnd = new Date(currentYear, currentMonth + 1, 0);
  } else if (period === 'quarter') {
    periodStart = new Date(currentYear, currentQuarter * 3, 1);
    periodEnd = new Date(currentYear, (currentQuarter + 1) * 3, 0);
  } else { // year
    periodStart = new Date(currentYear, 0, 1);
    periodEnd = new Date(currentYear, 11, 31);
  }
  
  const daysInPeriod = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = Math.min(daysInPeriod, Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const timePercentage = Math.min(100, (daysElapsed / daysInPeriod) * 100);

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Total Allocated */}
      <Card variant="default" className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
            <PiggyBank className="w-6 h-6 text-[var(--primary-blue)]" />
          </div>
          <span className="text-xs text-[var(--text-2)]">{getPeriodLabel()}</span>
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm text-[var(--text-2)] mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {formatCurrency(safeAllocated)}
          </p>
        </div>
      </Card>

      {/* Total Spent */}
      <Card variant="default" className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
            <TrendingDown className="w-6 h-6 text-[var(--primary-indigo)]" />
          </div>
          <span className={`text-xs font-medium ${
            spentPercentage > 90 ? 'text-[var(--primary-red)]' : 'text-[var(--text-2)]'
          }`}>
            {spentPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm text-[var(--text-2)] mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {formatCurrency(safeSpent)}
          </p>
        </div>
      </Card>

      {/* Remaining */}
      <Card variant="default" className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
            {isOverBudget ? (
              <AlertCircle className="w-6 h-6 text-[var(--primary-red)]" />
            ) : (
              <TrendingUp className="w-6 h-6 text-[var(--primary-emerald)]" />
            )}
          </div>
          {isOverBudget && (
            <span className="text-xs font-medium text-[var(--primary-red)]">
              Over Budget
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm text-[var(--text-2)] mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${
            isOverBudget ? 'text-[var(--primary-red)]' : 'text-[var(--primary-emerald)]'
          }`}>
            {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(safeRemaining))}
          </p>
        </div>
      </Card>

      {/* Daily Average */}
      <Card variant="default" className="p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
            <Calendar className="w-6 h-6 text-[var(--primary-teal)]" />
          </div>
          <span className="text-xs text-[var(--text-2)]">
            {daysInPeriod - daysElapsed} {daysInPeriod - daysElapsed === 1 ? 'day' : 'days'} left
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm text-[var(--text-2)] mb-1">Daily Average</p>
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {formatCurrency(daysElapsed > 0 ? safeSpent / daysElapsed : 0)}
          </p>
        </div>
      </Card>

      {/* Budget Progress Bar */}
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Card variant="subtle" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--text-1)]">
              Budget Progress
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--primary-blue)]" />
                <span className="text-[var(--text-2)]">Time Elapsed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--primary-indigo)]" />
                <span className="text-[var(--text-2)]">Budget Used</span>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            {/* Time Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-2)]">Time Progress</span>
                <span className="text-xs font-medium text-[var(--text-1)]">
                  {timePercentage.toFixed(0)}% ({daysElapsed}/{daysInPeriod} days)
                </span>
              </div>
              <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${timePercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Budget Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-2)]">Budget Used</span>
                <span className={`text-xs font-medium ${
                  spentPercentage > 100 
                    ? 'text-[var(--primary-red)]' 
                    : spentPercentage > timePercentage 
                    ? 'text-[var(--primary-amber)]' 
                    : 'text-[var(--primary-emerald)]'
                }`}>
                  {spentPercentage.toFixed(0)}% ({formatCurrency(safeSpent)})
                </span>
              </div>
              <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    spentPercentage > 100 
                      ? 'bg-gradient-to-r from-[var(--primary-red)] to-[var(--primary-red)]/80'
                      : spentPercentage > timePercentage
                      ? 'bg-gradient-to-r from-[var(--primary-amber)] to-[var(--primary-amber)]/80'
                      : 'bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-teal)]'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, spentPercentage)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Budget Status Message */}
          <div className={`mt-4 p-3 rounded-lg flex items-start gap-3 ${
            spentPercentage > 100 
              ? 'bg-[rgba(var(--primary-red),0.1)] border border-[var(--primary-red)]'
              : spentPercentage > timePercentage
              ? 'bg-[rgba(var(--primary-amber),0.1)] border border-[var(--primary-amber)]'
              : 'bg-[rgba(var(--primary-emerald),0.1)] border border-[var(--primary-emerald)]'
          }`}>
            {spentPercentage > 100 ? (
              <AlertCircle className="w-5 h-5 text-[var(--primary-red)] mt-0.5" />
            ) : spentPercentage > timePercentage ? (
              <AlertCircle className="w-5 h-5 text-[var(--primary-amber)] mt-0.5" />
            ) : (
              <TrendingUp className="w-5 h-5 text-[var(--primary-emerald)] mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                spentPercentage > 100 
                  ? 'text-[var(--primary-red)]'
                  : spentPercentage > timePercentage
                  ? 'text-[var(--primary-amber)]'
                  : 'text-[var(--primary-emerald)]'
              }`}>
                {spentPercentage > 100 
                  ? 'You have exceeded your budget!'
                  : spentPercentage > timePercentage
                  ? 'You are spending faster than planned'
                  : 'Your spending is on track'
                }
              </p>
              <p className="text-xs text-[var(--text-2)] mt-1">
                {spentPercentage > 100 
                  ? `You are ${formatCurrency(Math.abs(safeRemaining))} over budget`
                  : spentPercentage > timePercentage
                  ? `Consider slowing down to stay within budget`
                  : `You have ${formatCurrency(safeRemaining)} remaining for ${daysInPeriod - daysElapsed} ${daysInPeriod - daysElapsed === 1 ? 'day' : 'days'}`
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BudgetOverview;