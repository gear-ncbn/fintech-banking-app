'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  TrendingUp,
  Bell,
  AlertCircle,
  RefreshCw,
  ArrowDownLeft,
  Target
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AccountCard from '@/components/dashboard/AccountCard';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SpendingOverview from '@/components/dashboard/SpendingOverview';
import QuickActions from '@/components/dashboard/QuickActions';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import StatCard from '@/components/dashboard/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollTracking } from '@/hooks/useScrollTracking';
import { useHoverTracking } from '@/hooks/useHoverTracking';
import { eventBus, EVENTS } from '@/services/eventBus';
import { 
  accountsService, 
  transactionsService, 
  budgetsService,
  goalsService,
  categoriesService,
  Account, 
  Transaction,
  AccountSummary,
  TransactionStats,
  BudgetSummary,
  Goal,
  Category
} from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTimeRange, setCurrentTimeRange] = useState('month');
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // Hooks must be called at the top level
  const scrollContainerRef = useScrollTracking({
    elementId: 'dashboard-scroll',
    elementName: 'Dashboard Page',
    thresholds: [25, 50, 75, 100]
  });

  const refreshButtonHoverProps = useHoverTracking({
    elementId: 'dashboard-refresh-button',
    elementName: 'Dashboard Refresh Button'
  });

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Subscribe to account update events
  useEffect(() => {
    const unsubscribe = eventBus.on(EVENTS.ACCOUNT_UPDATE, () => {
      loadDashboardData(currentTimeRange, false);
    });

    return unsubscribe;
  }, [currentTimeRange]);

  const loadDashboardData = async (timeRange: string = 'month', isInitialLoad: boolean = true) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setError(null);
      setCurrentTimeRange(timeRange);

      // Calculate date range based on timeRange parameter
      const endDate = new Date();
      // Don't set hours to avoid timezone issues - just use the date
      
      let startDate = new Date();
      
      
      
      switch (timeRange) {
        case 'week':
          // Last 7 days including today
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 6); // 6 days ago + today = 7 days
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          // Last 30 days including today
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 29); // 29 days ago + today = 30 days
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'quarter':
          // Last 90 days including today
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 89); // 89 days ago + today = 90 days
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'year':
          // Last 365 days including today
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 364); // 364 days ago + today = 365 days
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
      }

      // Load all data in parallel
      const [
        accountsData,
        accountSummaryData,
        transactionsData,
        transactionStatsData,
        budgetSummaryData,
        goalsData,
        categoriesData
      ] = await Promise.all([
        accountsService.getAccounts(),
        accountsService.getAccountSummary(),
        transactionsService.getTransactions({ limit: 10 }),
        transactionsService.getTransactionStats({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }),
        budgetsService.getBudgetSummary(),
        goalsService.getGoals(),
        categoriesService.getCategories()
      ]);

      // Calculate balance changes for each account
      const accountsWithChanges = await Promise.all(
        accountsData.map(async (account) => {
          try {
            // Get transactions for the last 30 days for this account
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const accountTransactions = await transactionsService.getTransactions({
              account_id: account.id,
              start_date: thirtyDaysAgo.toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
              limit: 100
            });

            // Calculate net change
            let balanceChange = 0;
            accountTransactions.forEach(transaction => {
              if (transaction.transaction_type === 'credit' || transaction.transaction_type === 'CREDIT') {
                balanceChange += transaction.amount;
              } else if (transaction.transaction_type === 'debit' || transaction.transaction_type === 'DEBIT') {
                balanceChange -= transaction.amount;
              }
            });

            // Calculate percentage change (assume previous balance was current - change)
            const previousBalance = account.balance - balanceChange;
            const changePercent = previousBalance !== 0 
              ? (balanceChange / Math.abs(previousBalance)) * 100 
              : 0;

            return {
              ...account,
              balanceChange,
              changePercent
            };
          } catch {
            // If we can't get transaction history, return account without changes
            return {
              ...account,
              balanceChange: 0,
              changePercent: 0
            };
          }
        })
      );

      setAccounts(accountsWithChanges);
      setAccountSummary(accountSummaryData);
      setTransactions(transactionsData);
      setTransactionStats(transactionStatsData);
      setBudgetSummary(budgetSummaryData);
      setGoals(goalsData.filter(g => !g.is_achieved));
      setCategories(categoriesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadDashboardData('month', true);
  };

  const handleTimeRangeChange = async (timeRange: string) => {
    setIsLoadingStats(true);
    
    // Clear the old stats to prevent showing stale data
    setTransactionStats(null);
    
    await loadDashboardData(timeRange, false);
    setIsLoadingStats(false);
  };

  // Calculate stats
  const totalBalance = accountSummary?.net_worth || 0;
  const monthlySpending = transactionStats?.total_expenses || 0;
  const _monthlyIncome = transactionStats?.total_income || 0;
  const savingsGoalProgress = goals.length > 0 
    ? Math.round(goals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / goals.length)
    : 0;
  
  // Calculate trends from actual data
  const netWorthChange = accountSummary?.net_worth_change_percent || 0;
  const balanceTrend = netWorthChange >= 0 
    ? `+${netWorthChange.toFixed(1)}%` 
    : `${netWorthChange.toFixed(1)}%`;
  
  // For spending, we'd need previous month data - for now, calculate based on budget
  const spendingVsBudget = budgetSummary?.total_budget 
    ? ((monthlySpending / budgetSummary.total_budget - 1) * 100).toFixed(1)
    : 0;
  const spendingTrend = Number(spendingVsBudget) <= 0 
    ? `${spendingVsBudget}%`
    : `+${spendingVsBudget}%`;
  
  // For savings, calculate based on goal progress
  const savingsTrend = savingsGoalProgress > 0 ? `+${savingsGoalProgress}%` : '0%';

  const quickStats = [
    {
      label: 'Net Worth',
      value: `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: balanceTrend,
      trend: balanceTrend.startsWith('+') ? 'up' : 'down' as const,
      icon: TrendingUp,
    },
    {
      label: 'Monthly Spending',
      value: `$${monthlySpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: spendingTrend,
      trend: spendingTrend.startsWith('-') ? 'down' : 'up' as const,
      icon: ArrowDownLeft,
    },
    {
      label: 'Savings Goals',
      value: `${savingsGoalProgress}%`,
      change: savingsTrend,
      trend: 'up' as const,
      icon: Target,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-2)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="error" className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[var(--primary-red)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-1)] mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            {Array.isArray(error) ? error.join(', ') : String(error)}
          </p>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => loadDashboardData('month', true)} disabled={isLoading}>
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 overflow-y-auto" ref={scrollContainerRef}>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 md:space-y-8"
          >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-1)]">
                Welcome back, {user?.first_name || user?.username || 'User'}!
              </h1>
              <p className="text-sm md:text-base text-[var(--text-2)] mt-2">
                Here&apos;s your financial overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="hidden md:flex"
              icon={<RefreshCw size={16} />}
              data-testid="dashboard-refresh-button"
              {...refreshButtonHoverProps}
            >
              Refresh
            </Button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {quickStats.map((stat, index) => (
              <StatCard 
                key={index}
                label={stat.label}
                value={stat.value}
                trend={stat.trend}
                change={stat.change}
                icon={stat.icon}
              />
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="quick-actions">
            <QuickActions onActionComplete={() => loadDashboardData(currentTimeRange, false)} />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Accounts Section */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-1)]">
                  Your Accounts
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={() => {
                    router.push('/accounts');
                  }}
                >
                  Add Account
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 account-cards">
                {accounts.slice(0, 4).map((account: unknown) => (
                  <AccountCard 
                    key={account.id} 
                    account={{
                      id: account.id.toString(),
                      name: account.name,
                      type: account.account_type.toLowerCase().includes('credit') ? 'credit' : account.account_type.toLowerCase() as 'checking' | 'savings' | 'credit',
                      balance: account.balance,
                      currency: 'USD',
                      lastActivity: new Date(account.updated_at || account.created_at).toLocaleDateString(),
                      balanceChange: account.balanceChange || 0,
                      changePercent: account.changePercent || 0,
                      creditLimit: account.credit_limit ?? undefined
                    }} 
                  />
                ))}
              </div>

              {/* Spending Overview */}
              <div className="spending-overview">
                <SpendingOverview 
                  stats={transactionStats}
                  budgetSummary={budgetSummary}
                  timeRange={currentTimeRange}
                  onTimeRangeChange={handleTimeRangeChange}
                  isLoading={isLoadingStats}
                />
              </div>
            </motion.div>

            {/* Recent Transactions & Insights */}
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="recent-transactions">
                <RecentTransactions 
                  transactions={transactions.map(t => {
                    const category = categories.find(c => c.id === t.category_id);
                    return {
                      id: t.id.toString(),
                      description: t.description,
                      amount: (t.transaction_type === 'credit' || t.transaction_type === 'CREDIT') ? t.amount : -t.amount,
                      type: t.transaction_type.toLowerCase() as 'credit' | 'debit',
                      category: category?.name || 'Uncategorized',
                      date: t.transaction_date,
                      status: t.status.toLowerCase() as 'completed' | 'pending'
                    };
                  })} 
                />
              </div>
              
              {/* Quick Insights */}
              <Card variant="subtle" className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">
                  Quick Insights
                </h3>
                <div className="space-y-3">
                  {budgetSummary && budgetSummary.over_budget_count > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                        <AlertCircle className="w-4 h-4 text-[var(--primary-amber)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          Budget Alert
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          {budgetSummary.over_budget_count} budget{budgetSummary.over_budget_count > 1 ? 's are' : ' is'} exceeded this month
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {goals.map((goal) => (
                    <div key={goal.id} className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                        <TrendingUp className="w-4 h-4 text-[var(--primary-emerald)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {goal.name} Progress
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          ${(goal.target_amount - goal.current_amount).toFixed(2)} away from your goal!
                        </p>
                      </div>
                    </div>
                  ))}

                  {accounts.some(a => a.account_type === 'CREDIT' && a.balance > a.credit_limit! * 0.8) && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                        <Bell className="w-4 h-4 text-[var(--primary-red)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          Credit Limit Warning
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          You&apos;re approaching your credit limit on one or more cards
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </PullToRefresh>
  );
}
