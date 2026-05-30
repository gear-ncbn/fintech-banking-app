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
import { getStatsDateRange, StatsPeriod } from '@/lib/utils';
import { useScrollTracking } from '@/hooks/useScrollTracking';
import { useHoverTracking } from '@/hooks/useHoverTracking';
import { eventBus, EVENTS } from '@/services/eventBus';
import { 
  accountsService, 
  transactionsService, 
  budgetsService,
  goalsService,
  categoriesService,
  analyticsService,
  Account, 
  Transaction,
  AccountSummary,
  TransactionStats,
  BudgetSummary,
  Goal,
  Category,
  NetWorthHistory
} from '@/lib/api';

type AccountWithChange = Account & {
  balanceChange: number;
  changePercent: number | null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithChange[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistory[]>([]);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalOverallProgress, setGoalOverallProgress] = useState(0);
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

      // Canonical "last N days" window shared with the Transactions and
      // Analytics pages so the same period yields the same figures everywhere.
      const { start: statsStart, end: statsEnd } = getStatsDateRange(timeRange as StatsPeriod);

      // Load all data in parallel
      const [
        accountsData,
        accountSummaryData,
        transactionsData,
        transactionStatsData,
        budgetSummaryData,
        goalsData,
        goalSummaryData,
        categoriesData,
        netWorthHistoryData
      ] = await Promise.all([
        accountsService.getAccounts(),
        accountsService.getAccountSummary(),
        transactionsService.getTransactions({ limit: 10 }),
        transactionsService.getTransactionStats({
          start_date: statsStart,
          end_date: statsEnd
        }),
        budgetsService.getBudgetSummary(),
        goalsService.getGoals(),
        goalsService.getGoalSummary(),
        categoriesService.getCategories(),
        // Used to derive a real month-over-month Net Worth delta, matching the
        // Analytics Net Worth tracker (current vs previous month-end).
        analyticsService.getNetWorthHistory(2).catch(() => null)
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
              if (transaction.transaction_type === 'CREDIT') {
                balanceChange += transaction.amount;
              } else if (transaction.transaction_type === 'DEBIT') {
                balanceChange -= transaction.amount;
              }
            });

            // A percentage change is only meaningful when the balance stayed on
            // the same side of zero (an asset stayed an asset, debt stayed
            // debt). When the sign flips (e.g. a credit card that was paid off
            // and is now in debt) or the previous balance was ~0, the
            // percentage either explodes or becomes semantically meaningless
            // (e.g. -165%), so we omit it and show only the dollar change.
            const previousBalance = account.balance - balanceChange;
            const sameSide =
              previousBalance !== 0 &&
              Math.sign(previousBalance) === Math.sign(account.balance);
            const changePercent = sameSide
              ? (balanceChange / Math.abs(previousBalance)) * 100
              : null;

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
      setNetWorthHistory(netWorthHistoryData?.history ?? []);
      setTransactions(transactionsData);
      setTransactionStats(transactionStatsData);
      setBudgetSummary(budgetSummaryData);
      setGoals(goalsData.filter(g => !g.is_achieved));
      setGoalOverallProgress(goalSummaryData.overall_progress);
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
  // Use the canonical amount-weighted progress from the goals summary endpoint
  // (total saved / total target) so this matches the Goals page exactly.
  const savingsGoalProgress = Math.round(goalOverallProgress);
  
  // Real month-over-month Net Worth change, derived from the net-worth history
  // (current month-end vs the previous one) using the same formula as the
  // Analytics Net Worth tracker so the two pages agree. When we don't have at
  // least two months of history we omit the delta rather than show a fake 0%.
  const netWorthChange = (() => {
    if (netWorthHistory.length < 2) return null;
    const current = netWorthHistory[netWorthHistory.length - 1].net_worth;
    const previous = netWorthHistory[netWorthHistory.length - 2].net_worth;
    if (previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  })();
  const balanceTrend = netWorthChange === null
    ? undefined
    : netWorthChange >= 0
      ? `+${netWorthChange.toFixed(1)}%`
      : `${netWorthChange.toFixed(1)}%`;

  // Budgets whose spending has exceeded 100% of their limit.
  const overBudgetCount = budgetSummary
    ? budgetSummary.budgets.filter((b) => (b.percentage_used ?? 0) > 100).length
    : 0;
  
  // For spending, we'd need previous month data - for now, calculate based on budget
  const spendingVsBudget = budgetSummary?.total_budget 
    ? ((monthlySpending / budgetSummary.total_budget - 1) * 100).toFixed(1)
    : 0;
  const spendingTrend = Number(spendingVsBudget) <= 0 
    ? `${spendingVsBudget}%`
    : `+${spendingVsBudget}%`;
  
  // Treat a 0% / missing change as neutral so we don't render a misleading
  // colored arrow.
  const trendFromChange = (change: string | undefined): 'up' | 'down' | 'neutral' => {
    if (!change) return 'neutral';
    const numeric = parseFloat(change.replace(/[^0-9.+-]/g, ''));
    if (!numeric) return 'neutral';
    return numeric > 0 ? 'up' : 'down';
  };

  const quickStats = [
    {
      label: 'Net Worth',
      value: `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: balanceTrend,
      trend: trendFromChange(balanceTrend),
      icon: TrendingUp,
    },
    {
      label: 'Monthly Spending',
      value: `$${monthlySpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: spendingTrend,
      trend: trendFromChange(spendingTrend),
      icon: ArrowDownLeft,
    },
    {
      // We don't track prior-period goal progress anywhere in the app, so there
      // is no real month-over-month figure to show. Omit the delta entirely
      // rather than render a misleading "0% vs last month" placeholder.
      label: 'Savings Goals',
      value: `${savingsGoalProgress}%`,
      change: undefined,
      trend: 'neutral' as const,
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
        <Card variant="prominent" className="p-8 text-center">
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
                {accounts.slice(0, 4).map((account) => (
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
                      changePercent: account.changePercent ?? null,
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
                      amount: t.transaction_type === 'CREDIT' ? t.amount : -t.amount,
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
                  {overBudgetCount > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                        <AlertCircle className="w-4 h-4 text-[var(--primary-amber)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          Budget Alert
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          {overBudgetCount} budget{overBudgetCount > 1 ? 's are' : ' is'} exceeded this month
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

                  {accounts.some(a => a.account_type.toLowerCase().includes('credit') && a.credit_limit && Math.abs(a.balance) > a.credit_limit * 0.8) && (
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
