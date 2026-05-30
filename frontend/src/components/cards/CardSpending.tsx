import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp,
  ShoppingBag,
  Coffee,
  Plane,
  DollarSign,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import { CreditCard } from '@/app/cards/page';

interface CardSpendingProps {
  card: CreditCard;
}

export const CardSpending: React.FC<CardSpendingProps> = ({ card }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'Shopping': <ShoppingBag className="w-4 h-4" />,
      'Dining': <Coffee className="w-4 h-4" />,
      'Travel': <Plane className="w-4 h-4" />,
      'Groceries': <ShoppingBag className="w-4 h-4" />,
      'Transportation': <Plane className="w-4 h-4" />,
      'Utilities': <Activity className="w-4 h-4" />,
      'Entertainment': <Activity className="w-4 h-4" />,
      'Business': <DollarSign className="w-4 h-4" />,
      'Online Shopping': <ShoppingBag className="w-4 h-4" />,
      'Other': <DollarSign className="w-4 h-4" />,
    };
    return icons[category] || <DollarSign className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Shopping': 'from-[var(--cat-indigo)] to-[var(--cat-indigo)]/80',
      'Dining': 'from-[var(--cat-amber)] to-[var(--cat-amber)]/80',
      'Travel': 'from-[var(--cat-blue)] to-[var(--cat-blue)]/80',
      'Groceries': 'from-[var(--cat-emerald)] to-[var(--cat-emerald)]/80',
      'Transportation': 'from-[var(--cat-teal)] to-[var(--cat-teal)]/80',
      'Utilities': 'from-[var(--cat-pink)] to-[var(--cat-pink)]/80',
      'Entertainment': 'from-[var(--cat-violet)] to-[var(--cat-violet)]/80',
      'Business': 'from-[var(--cat-indigo)] to-[var(--cat-navy)]/80',
      'Online Shopping': 'from-[var(--cat-indigo)] to-[var(--cat-blue)]/80',
      'Other': 'from-[var(--primary-blue)] to-[var(--primary-indigo)]/80',
    };
    return colors[category] || 'from-[var(--primary-blue)] to-[var(--primary-indigo)]/80';
  };

  // Calculate spending limit based on time range
  const getSpendingLimitForTimeRange = () => {
    const monthlyLimit = card.spending.limit;
    
    if (timeRange === 'week') {
      // Weekly limit is approximately monthly / 4
      return monthlyLimit / 4;
    } else if (timeRange === 'month') {
      return monthlyLimit;
    } else { // year
      return monthlyLimit * 12;
    }
  };
  
  // Calculate current spending based on time range
  const getCurrentSpendingForTimeRange = () => {
    const monthlySpending = card.spending.current;
    
    if (timeRange === 'week') {
      // Weekly spending is approximately monthly / 4
      return monthlySpending / 4;
    } else if (timeRange === 'month') {
      return monthlySpending;
    } else { // year
      // Assume current month's spending extrapolated to year
      return monthlySpending * 12;
    }
  };
  
  const currentSpending = getCurrentSpendingForTimeRange();
  const currentLimit = getSpendingLimitForTimeRange();
  
  const spendingPercentage = currentLimit > 0 
    ? (currentSpending / currentLimit) * 100 
    : 0;
  const isNearLimit = spendingPercentage >= 80;

  // Calculate daily spending from transactions
  const [weeklySpending, setWeeklySpending] = useState<{day: string; amount: number}[]>([]);
  
  useEffect(() => {
    // In a real app, this would fetch transactions for the card based on timeRange
    // For now, we'll generate data based on the card's spending categories
    
    let data: {day: string; amount: number}[] = [];
    
    if (timeRange === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const today = new Date();
      const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sunday (0) to 6
      
      // Generate spending data based on categories and current spending
      const avgDailySpending = card.spending.current / 30; // Average over 30 days
      const variance = 0.5; // 50% variance
      
      data = days.map((day, index) => {
        // Generate realistic spending patterns (weekends typically higher)
        const isWeekend = day === 'Sat' || day === 'Sun';
        const multiplier = isWeekend ? 1.5 : 1;
        const randomVariance = (Math.random() - 0.5) * 2 * variance;
        const amount = avgDailySpending * multiplier * (1 + randomVariance);
        
        // Future days should have 0 spending
        const isFuture = index > currentDayIndex;
        
        return {
          day,
          amount: isFuture ? 0 : Math.max(0, amount)
        };
      });
    } else if (timeRange === 'month') {
      // Generate weekly data for the month
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const currentWeek = Math.floor(new Date().getDate() / 7);
      const avgWeeklySpending = card.spending.current / 4;
      const variance = 0.3;
      
      data = weeks.map((week, index) => {
        const randomVariance = (Math.random() - 0.5) * 2 * variance;
        const amount = avgWeeklySpending * (1 + randomVariance);
        const isFuture = index > currentWeek;
        
        return {
          day: week,
          amount: isFuture ? 0 : Math.max(0, amount)
        };
      });
    } else { // year
      // Generate monthly data for the year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const avgMonthlySpending = card.spending.current;
      const variance = 0.2;
      
      data = months.map((month, index) => {
        const randomVariance = (Math.random() - 0.5) * 2 * variance;
        const seasonalMultiplier = index === 11 ? 1.3 : 1; // December typically higher
        const amount = (avgMonthlySpending / 12) * seasonalMultiplier * (1 + randomVariance);
        const isFuture = index > currentMonth;
        
        return {
          day: month,
          amount: isFuture ? 0 : Math.max(0, amount)
        };
      });
    }
    
    setWeeklySpending(data);
  }, [card, timeRange]);

  const maxDailySpending = Math.max(...weeklySpending.map(d => d.amount)) || 100;

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-1)]">
            Spending Analysis
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-[rgba(var(--glass-rgb),0.1)] rounded-lg">
              <Button
                variant={viewMode === 'chart' ? 'primary' : 'ghost'}
                size="sm"
                icon={<BarChart3 size={16} />}
                onClick={() => {
                  setViewMode('chart');
                }}
                className="!px-2 !py-1"
              />
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                icon={<PieChart size={16} />}
                onClick={() => {
                  setViewMode('list');
                }}
                className="!px-2 !py-1"
              />
            </div>
            <Dropdown
              value={timeRange}
              onChange={(value) => {
                setTimeRange(value as 'week' | 'month' | 'year');
              }}
              items={[
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'year', label: 'This Year' },
              ]}
            />
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {/* Spending Limit Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-2)]">
              Spending Limit ({timeRange})
            </span>
            <span className={`text-sm font-medium ${
              isNearLimit ? 'text-[var(--primary-amber)]' : 'text-[var(--text-1)]'
            }`}>
              {formatCurrency(currentSpending)} / {formatCurrency(currentLimit)}
            </span>
          </div>
          <div className="h-3 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${
                isNearLimit 
                  ? 'from-[var(--primary-amber)] to-[var(--primary-amber)]/80'
                  : 'from-[var(--primary-blue)] to-[var(--primary-indigo)]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, spendingPercentage)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {isNearLimit && (
            <p className="text-xs text-[var(--primary-amber)] mt-2">
              You&apos;ve used {spendingPercentage.toFixed(0)}% of your spending limit
            </p>
          )}
        </div>

        {viewMode === 'chart' ? (
          <>
            {/* Spending Chart */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[var(--text-1)] mb-4">
                {timeRange === 'week' ? 'Daily' : timeRange === 'month' ? 'Weekly' : 'Monthly'} Spending
              </h4>
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklySpending.map((day, index) => {
                  const height = (day.amount / maxDailySpending) * 100;
                  return (
                    <motion.div
                      key={day.day}
                      className="flex-1 flex flex-col items-center gap-2"
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="relative w-full flex-1 flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-[var(--primary-blue)] to-[var(--primary-indigo)] rounded-t hover:opacity-80 transition-opacity cursor-pointer relative group"
                          style={{ height: `${height}%` }}
                          onMouseEnter={() => {
                          }}
                          onClick={() => {
                          }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-color)] border border-[var(--border-1)] rounded px-2 py-1 text-xs whitespace-nowrap">
                            {formatCurrency(day.amount)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--text-2)]">{day.day}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-[var(--text-1)] mb-4">
                Category Breakdown
              </h4>
              <div className="space-y-3">
                {(card.spending.categories || []).map((category, index) => (
                  <motion.div
                    key={`category-${category.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                    }}
                    onClick={() => {
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded bg-gradient-to-r ${getCategoryColor(category.name)}`}>
                          {getCategoryIcon(category.name)}
                        </div>
                        <span className="text-sm text-[var(--text-1)]">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {formatCurrency(category.amount)}
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          {category.percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${getCategoryColor(category.name)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${category.percentage || 0}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Pie Chart View */}
            <div className="relative h-64 mb-6">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="rgba(var(--glass-rgb),0.1)"
                  strokeWidth="40"
                />
                
                {/* Category segments */}
                {(() => {
                  let cumulativePercentage = 0;
                  return (card.spending.categories || []).map((category, index) => {
                    const startAngle = (cumulativePercentage * 360) / 100;
                    const endAngle = ((cumulativePercentage + category.percentage) * 360) / 100;
                    cumulativePercentage += category.percentage;
                    
                    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
                    const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                    const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                    const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
                    const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
                    
                    const pathData = [
                      `M 100 100`,
                      `L ${startX} ${startY}`,
                      `A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                      'Z'
                    ].join(' ');

                    return (
                      <motion.path
                        key={`pie-${category.name}-${index}`}
                        d={pathData}
                        fill={`url(#gradient-${index})`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        onMouseEnter={() => {
                        }}
                        onClick={() => {
                        }}
                      />
                    );
                  });
                })()}
                
                {/* Gradients */}
                <defs>
                  {(card.spending.categories || []).map((category, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`}>
                      <stop offset="0%" stopColor="var(--primary-blue)" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="var(--primary-indigo)" stopOpacity="0.6" />
                    </linearGradient>
                  ))}
                </defs>
                
                {/* Center text */}
                <text
                  x="100"
                  y="100"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[var(--text-1)] font-bold text-xl"
                >
                  {formatCurrency(card.spending.current)}
                </text>
              </svg>
            </div>

            {/* Category List */}
            <div className="grid grid-cols-2 gap-3">
              {(card.spending.categories || []).map((category, index) => (
                <motion.div
                  key={`legend-${category.name}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.1)] transition-colors"
                  onMouseEnter={() => {
                  }}
                  onClick={() => {
                  }}
                >
                  <div className={`p-2 rounded bg-gradient-to-r ${getCategoryColor(category.name)}`}>
                    {getCategoryIcon(category.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-1)] truncate">
                      {category.name}
                    </p>
                    <p className="text-xs text-[var(--text-2)]">
                      {category.percentage.toFixed(2)}% • {formatCurrency(category.amount)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Insights */}
        <div className="mt-6 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
          <h4 className="font-medium text-[var(--text-1)] mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--primary-blue)]" />
            Spending Insights
          </h4>
          <ul className="space-y-2 text-sm text-[var(--text-2)]">
            {card.spending.categories && card.spending.categories.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--primary-blue)]">•</span>
                <span>
                  Your highest spending category is{' '}
                  <span className="font-medium text-[var(--text-1)]">
                    {card.spending.categories[0].name}
                  </span>{' '}
                  at {card.spending.categories[0].percentage.toFixed(2)}% of total spending
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary-emerald)]">•</span>
              <span>
                Average daily spending:{' '}
                <span className="font-medium text-[var(--text-1)]">
                  {formatCurrency(
                    timeRange === 'week' 
                      ? currentSpending / 7 
                      : timeRange === 'month' 
                        ? currentSpending / 30 
                        : currentSpending / 365
                  )}
                </span>
              </span>
            </li>
            {isNearLimit && (
              <li className="flex items-start gap-2">
                <span className="text-[var(--primary-amber)]">•</span>
                <span className="text-[var(--primary-amber)]">
                  Consider reducing spending to stay within your limit
                </span>
              </li>
            )}
          </ul>
        </div>
      </CardBody>
    </Card>
  );
};

export default CardSpending;
