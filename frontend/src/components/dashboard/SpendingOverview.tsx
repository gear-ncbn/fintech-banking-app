import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import { TransactionStats, BudgetSummary } from '@/lib/api';

interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface SpendingOverviewProps {
  stats?: TransactionStats | null;
  budgetSummary?: BudgetSummary | null;
  timeRange?: string;
  onTimeRangeChange?: (timeRange: string) => void;
  isLoading?: boolean;
}

export const SpendingOverview: React.FC<SpendingOverviewProps> = ({ stats, budgetSummary, timeRange: controlledTimeRange, onTimeRangeChange, isLoading }) => {
  // Use controlled timeRange from parent if provided, otherwise maintain local state
  const [localTimeRange, setLocalTimeRange] = useState('month');
  const timeRange = controlledTimeRange ?? localTimeRange;
  
  const handleTimeRangeChange = (newTimeRange: string) => {
    if (!controlledTimeRange) {
      setLocalTimeRange(newTimeRange);
    }
    if (onTimeRangeChange) {
      onTimeRangeChange(newTimeRange);
    }
  };

  // Convert transaction stats to spending categories
  const spendingCategories: SpendingCategory[] = stats?.categories_breakdown
    ? stats.categories_breakdown.map((cat, index) => {
        const colors = [
          'var(--cat-amber)',
          'var(--cat-indigo)',
          'var(--cat-blue)',
          'var(--cat-pink)',
          'var(--cat-teal)',
          'var(--cat-emerald)',
          'var(--cat-purple)',
          'var(--cat-red)',
        ];
        
        const totalSpending = stats.total_expenses || 1; // Avoid division by zero
        const percentage = (cat.total_amount / totalSpending) * 100;
        
        return {
          name: cat.category_name,
          amount: cat.total_amount,
          percentage: Math.round(percentage),
          color: colors[index % colors.length],
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
    : [];

  const totalSpending = stats?.total_expenses || 0;
  const budgetUtilization = budgetSummary && budgetSummary.total_budget > 0 ?
    Math.round((budgetSummary.total_spent / budgetSummary.total_budget) * 100) : 0;
  // Percentage of budget represented by the spending total shown above, so the
  // label stays consistent with the figure it annotates (the Budget Status bar
  // below tracks total_spent separately).
  const totalSpendingBudgetPct = budgetSummary && budgetSummary.total_budget > 0 ?
    Math.round((totalSpending / budgetSummary.total_budget) * 100) : 0;
  

  const timeRangeOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <Card variant="default" className="mt-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-1)]">
              Spending Overview
            </h3>
            <p className="text-sm text-[var(--text-2)] mt-1">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <>
                  Total: ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {budgetSummary && timeRange === 'month' && (
                    <span className="ml-2">
                      ({totalSpendingBudgetPct}% of budget)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dropdown
              items={timeRangeOptions}
              value={timeRange}
              onChange={handleTimeRangeChange}
              placeholder="Select period"
            />
          </div>
        </div>

        {/* Budget Status Bar */}
        {budgetSummary && (
          <div className="mb-6 p-4 bg-[rgba(var(--glass-rgb),0.1)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--text-1)]">Budget Status</p>
              <p className="text-sm text-[var(--text-2)]">
                ${budgetSummary.total_spent.toFixed(2)} / ${budgetSummary.total_budget.toFixed(2)}
              </p>
            </div>
            <div className="w-full h-2 bg-[rgba(var(--glass-rgb),0.2)] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  budgetUtilization > 90 
                    ? 'bg-[var(--primary-red)]' 
                    : budgetUtilization > 75 
                    ? 'bg-[var(--primary-amber)]' 
                    : 'bg-[var(--primary-emerald)]'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            {budgetSummary.over_budget_count > 0 && (
              <p className="text-xs text-[var(--primary-red)] mt-2">
                ⚠️ {budgetSummary.over_budget_count} budget{budgetSummary.over_budget_count > 1 ? 's' : ''} exceeded
              </p>
            )}
          </div>
        )}

        {/* Chart Visualization - Only show if we have actual spending data */}
        {!isLoading && totalSpending > 0 && (
          <div className="h-48 mb-6 relative">
            <div className="absolute bottom-0 left-0 right-0 h-full flex items-end gap-2">
              {spendingCategories.map((category, index) => {
                // Find the maximum amount to scale bars relative to it
                const maxAmount = Math.max(...spendingCategories.map(c => c.amount), 1);
                const heightPercent = (category.amount / maxAmount) * 90; // Use 90% to leave some space at top
                
                // Note: Hover tracking is handled at component level
                
                return (
                  <motion.div
                    key={`chart-${category.name}-${index}`}
                    className="flex-1 relative group"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(heightPercent, 5)}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    data-testid={`spending-chart-bar-${index}`}
                  >
                    <div
                      className="w-full h-full rounded-t-lg opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ backgroundColor: category.color }}
                      onMouseEnter={() => {
                      }}
                    />
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-[var(--text-2)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-color)] px-2 py-1 rounded shadow-lg z-10">
                      {category.name}: {category.percentage.toFixed(1)}%
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-[var(--glass-rgb)] rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-[var(--glass-rgb)] rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : spendingCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--text-2)]">No spending data for the selected period</p>
            </div>
          ) : (
            spendingCategories.map((category, index) => {
              // Note: Hover tracking is handled inline
              
              return (
              <motion.div
                key={`list-${category.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-[rgba(var(--glass-rgb),0.1)]"
                data-testid={`spending-category-${index}`}
                onMouseEnter={() => {
                }}
              >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    {category.name}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      ${category.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2 w-full h-1.5 bg-[rgba(var(--glass-rgb),0.2)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: category.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percentage}%` }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
            );
          })
          )}
        </div>

        {/* View Details Button */}
        <div className="mt-6 pt-4 border-t border-[var(--border-1)]">
          <Button 
            variant="secondary" 
            fullWidth 
            icon={<Filter size={16} />}
            onClick={() => {
              // Navigate to analytics page
              window.location.href = '/analytics';
            }}
            data-testid="view-analytics-button"
            onMouseEnter={() => {
            }}
          >
            View Detailed Analytics
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SpendingOverview;
