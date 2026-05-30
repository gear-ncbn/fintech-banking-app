'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  PiggyBank,
  Target,
  DollarSign,
  TrendingDown,
  AlertCircle,
  Plus,
  ShoppingBag,
  Coffee,
  Car,
  Home,
  Zap,
  Music,
  Heart,
  Plane,
  Gift,
  Briefcase,
  RefreshCw
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import DatePicker from '@/components/ui/DatePicker';
import Dropdown from '@/components/ui/Dropdown';
import BudgetCategoryCard from '@/components/budget/BudgetCategoryCard';
import BudgetOverview from '@/components/budget/BudgetOverview';
import BudgetGoals from '@/components/budget/BudgetGoals';
import BudgetErrorBoundary from '@/components/budget/BudgetErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { 
  budgetsService,
  goalsService,
  categoriesService,
  transactionsService,
  Goal,
  BudgetSummary,
  GoalSummary,
  Category
} from '@/lib/api';
import { getMonthlyContribution, getStatsDateRange } from '@/lib/utils';

export interface BudgetCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  transactions: number;
}

export interface BudgetGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  progress: number;
  monthlyContribution: number;
  status: 'on-track' | 'at-risk' | 'completed';
}

export default function BudgetPage() {
  const { user: _user } = useAuth();
  const { showError, showSuccess } = useAlert();
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingGoal, setEditingGoal] = useState<BudgetGoal | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<BudgetCategory | null>(null);
  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<BudgetGoal | null>(null);
  
  // Form state for budget modal
  const [budgetForm, setBudgetForm] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly'
  });

  // Form state for goal modal
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: ''
  });

  const categoryIcons = useMemo<{ [key: string]: React.ReactNode }>(() => ({
    'Shopping': <ShoppingBag className="w-5 h-5" />,
    'Groceries': <ShoppingBag className="w-5 h-5" />,
    'Dining': <Coffee className="w-5 h-5" />,
    'Transportation': <Car className="w-5 h-5" />,
    'Housing': <Home className="w-5 h-5" />,
    'Utilities': <Zap className="w-5 h-5" />,
    'Entertainment': <Music className="w-5 h-5" />,
    'Healthcare': <Heart className="w-5 h-5" />,
    'Travel': <Plane className="w-5 h-5" />,
    'Business': <Briefcase className="w-5 h-5" />,
    'Gifts': <Gift className="w-5 h-5" />,
  }), []);

  const categoryColors = useMemo<{ [key: string]: string }>(() => ({
    'Shopping': 'from-[var(--cat-indigo)] to-[var(--cat-indigo)]/80',
    'Groceries': 'from-[var(--cat-emerald)] to-[var(--cat-emerald)]/80',
    'Dining': 'from-[var(--cat-amber)] to-[var(--cat-amber)]/80',
    'Transportation': 'from-[var(--cat-blue)] to-[var(--cat-blue)]/80',
    'Housing': 'from-[var(--cat-emerald)] to-[var(--cat-teal)]/80',
    'Utilities': 'from-[var(--cat-teal)] to-[var(--cat-teal)]/80',
    'Entertainment': 'from-[var(--cat-pink)] to-[var(--cat-pink)]/80',
    'Healthcare': 'from-[var(--cat-pink)] to-[var(--cat-red)]/80',
    'Travel': 'from-[var(--cat-blue)] to-[var(--cat-indigo)]/80',
    'Business': 'from-[var(--cat-indigo)] to-[var(--cat-navy)]/80',
    'Gifts': 'from-[var(--cat-amber)] to-[var(--cat-yellow)]/80',
  }), []);

  const loadBudgetData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all necessary data.
      // Budgets are seeded as monthly, so the summary always reflects monthly
      // (calendar-month) budgets. Passing undefined returns every active
      // budget, which keeps "Total Spent" aligned with the current month
      // regardless of the UI period selector.
      const apiPeriod = undefined;

      const [budgetsData, goalsData, budgetSummaryData, goalSummaryData, categoriesData] = await Promise.all([
        budgetsService.getBudgets(),
        goalsService.getGoals(),
        budgetsService.getBudgetSummary(apiPeriod),
        goalsService.getGoalSummary(),
        categoriesService.getCategories()
      ]);

      setBudgetSummary(budgetSummaryData);
      setGoalSummary(goalSummaryData);
      setCategories(categoriesData);

      // Per-category transaction counts use the SAME canonical window as the
      // budget's spend calculation (the current calendar month) so the counts,
      // the per-category "spent" figures and "Total Spent" all reconcile.
      const { start: countStart, end: countEnd } = getStatsDateRange('month');

      // Transform budgets to UI format
      const transformedBudgets: BudgetCategory[] = await Promise.all(
        budgetsData
          .filter(budget => budget.is_active)
          .map(async (budget) => {
            const category = categoriesData.find(c => c.id === budget.category_id);
            const categoryName = category?.name || 'Uncategorized';

            // Get transaction count for this category
            let transactionCount = 0;
            try {
              const stats = await transactionsService.getTransactionStats({
                category_id: budget.category_id,
                start_date: countStart,
                end_date: countEnd
              });
              transactionCount = stats.transaction_count;
            } catch {
              transactionCount = 0;
            }

            return {
              id: budget.id.toString(),
              name: categoryName,
              icon: categoryIcons[categoryName] || <DollarSign className="w-5 h-5" />,
              color: categoryColors[categoryName] || 'from-[var(--cat-gray)] to-[var(--cat-gray)]/80',
              allocated: Number(budget.amount) || 0,
              spent: Number(budget.spent_amount) || 0,
              remaining: Number(budget.remaining_amount) || 0,
              percentage: Number(budget.percentage_used) || 0,
              transactions: transactionCount
            };
          })
      );

      setBudgetCategories(transformedBudgets);

      // Transform goals to UI format
      const transformedGoals: BudgetGoal[] = goalsData
        .filter(goal => !goal.is_achieved)
        .map(goal => {
          // Calculate monthly contribution needed (shared helper keeps this
          // consistent with the Goals page).
          const targetAmount = Number(goal.target_amount) || 0;
          const currentAmount = Number(goal.current_amount) || 0;
          const monthlyContribution = getMonthlyContribution(
            targetAmount,
            currentAmount,
            goal.target_date
          );

          // Determine status
          let status: BudgetGoal['status'] = 'on-track';
          if (goal.progress_percentage >= 100) {
            status = 'completed';
          } else if (goal.days_remaining < 30 && goal.progress_percentage < 80) {
            status = 'at-risk';
          } else if (monthlyContribution > goal.monthly_target * 1.2) {
            status = 'at-risk';
          }

          return {
            id: goal.id.toString(),
            name: goal.name,
            targetAmount: targetAmount,
            currentAmount: currentAmount,
            deadline: goal.target_date,
            category: goal.category,
            progress: Number(goal.progress_percentage) || 0,
            monthlyContribution,
            status
          };
        });

      setBudgetGoals(transformedGoals);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load budget data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [categoryIcons, categoryColors]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const handleRefresh = () => {
    loadBudgetData();
  };

  const handleEditBudget = (category: BudgetCategory) => {
    setEditingCategory(category);
    // Find the budget data to get the category_id
    const budget = budgetCategories.find(b => b.id === category.id);
    if (budget) {
      // Find the original budget from the API data to get category_id
      const originalBudget = budgetSummary?.budgets.find(b => b.id.toString() === category.id);
      if (originalBudget) {
        setBudgetForm({
          categoryId: originalBudget.category_id.toString(),
          amount: originalBudget.amount.toString(),
          period: originalBudget.period === 'weekly' ? 'weekly' : 
                  originalBudget.period === 'yearly' ? 'yearly' : 'monthly'
        });
      }
    }
    setShowAddCategory(true);
  };

  const handleDeleteBudget = (category: BudgetCategory) => {
    setDeletingBudget(category);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBudget = async () => {
    if (!deletingBudget) return;
    
    try {
      await budgetsService.deleteBudget(parseInt(deletingBudget.id));
      showSuccess('Budget Deleted', `Budget for ${deletingBudget.name} has been deleted successfully.`);
      setShowDeleteConfirm(false);
      setDeletingBudget(null);
      loadBudgetData();
    } catch {
      showError('Delete Failed', 'Unable to delete the budget. Please try again.');
    }
  };

  const handleAddGoal = async () => {
    try {
      if (!goalForm.name || !goalForm.targetAmount || !goalForm.targetDate || !goalForm.category) {
        showError('Form Incomplete', 'Please fill in all required fields.');
        return;
      }

      if (editingGoal) {
        // Update existing goal
        await goalsService.updateGoal(parseInt(editingGoal.id), {
          name: goalForm.name,
          target_amount: parseFloat(goalForm.targetAmount),
          target_date: goalForm.targetDate,
          category: goalForm.category as Goal['category']
        });
        
        // If current amount changed, add contribution or withdrawal
        const newAmount = parseFloat(goalForm.currentAmount || '0');
        const difference = newAmount - editingGoal.currentAmount;
        if (Math.abs(difference) > 0.01) {
          if (difference > 0) {
            await goalsService.addContribution(parseInt(editingGoal.id), {
              amount: difference,
              note: 'Updated via goal edit'
            });
          } else {
            await goalsService.withdrawFromGoal(parseInt(editingGoal.id), Math.abs(difference), 'Updated via goal edit');
          }
        }
        
        showSuccess('Goal Updated', 'Your financial goal has been updated successfully.');
      } else {
        // Create new goal
        await goalsService.createGoal({
          name: goalForm.name,
          target_amount: parseFloat(goalForm.targetAmount),
          target_date: goalForm.targetDate,
          category: goalForm.category as Goal['category'],
          priority: 'MEDIUM',
          initial_amount: goalForm.currentAmount ? parseFloat(goalForm.currentAmount) : 0
        });
        
        showSuccess('Goal Created', 'Your financial goal has been created successfully.');
      }
      
      setShowAddGoal(false);
      setEditingGoal(null);
      setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', category: '' });
      loadBudgetData();
    } catch {
      showError(
        editingGoal ? 'Goal Update Failed' : 'Goal Creation Failed', 
        'Unable to save the goal. Please try again.'
      );
    }
  };

  const handleDeleteGoal = (goal: BudgetGoal) => {
    setDeletingGoal(goal);
    setShowDeleteGoalConfirm(true);
  };

  const confirmDeleteGoal = async () => {
    if (!deletingGoal) return;
    
    try {
      await goalsService.deleteGoal(parseInt(deletingGoal.id));
      showSuccess('Goal Deleted', `Goal "${deletingGoal.name}" has been deleted successfully.`);
      setShowDeleteGoalConfirm(false);
      setDeletingGoal(null);
      loadBudgetData();
    } catch {
      showError('Delete Failed', 'Unable to delete the goal. Please try again.');
    }
  };

  const handleCreateBudget = async () => {
    try {
      if (!budgetForm.categoryId || !budgetForm.amount || !budgetForm.period) {
        showError('Form Incomplete', 'Please fill in all fields before creating a budget.');
        return;
      }

      const periodMap = {
        'monthly': 'monthly' as const,
        'weekly': 'weekly' as const,
        'yearly': 'yearly' as const
      };

      if (editingCategory) {
        // Update existing budget
        await budgetsService.updateBudget(parseInt(editingCategory.id), {
          amount: parseFloat(budgetForm.amount),
          alert_threshold: 0.8,
          is_active: true
        });
        showSuccess('Budget Updated', 'Your budget has been updated successfully.');
      } else {
        // Calculate start_date based on current date
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        await budgetsService.createBudget({
          category_id: parseInt(budgetForm.categoryId),
          amount: parseFloat(budgetForm.amount),
          period: periodMap[budgetForm.period],
          start_date: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          alert_threshold: 0.8 // Default to 80% threshold
        });
        showSuccess('Budget Created', 'Your budget has been created successfully.');
      }

      setShowAddCategory(false);
      setEditingCategory(null);
      setBudgetForm({ categoryId: '', amount: '', period: 'monthly' });
      loadBudgetData();
    } catch {
      showError(
        editingCategory ? 'Budget Update Failed' : 'Budget Creation Failed', 
        'Unable to save the budget. Please try again.'
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // Ensure numeric values to prevent NaN
  const totalBudget = Number(budgetSummary?.total_budget) || 0;
  const totalSpent = Number(budgetSummary?.total_spent) || 0;
  const totalRemaining = Number(budgetSummary?.total_remaining) || 0;
  // Count budgets with overspending (spent > allocated)
  const overBudgetCount = budgetCategories.filter(b => b.spent > b.allocated).length || 0;

  const periodOptions = [
    { value: 'quarter', label: 'All Budgets' },
    { value: 'month', label: 'Monthly Budgets' },
    { value: 'year', label: 'Yearly Budgets' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-2)]">Loading your budget...</p>
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
            Unable to Load Budget
          </h2>
          <p className="text-[var(--text-2)] mb-6">{error}</p>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-[var(--text-1)]">
              Budget Management
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Track your spending and reach your financial goals
            </p>
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={18} />}
              onClick={handleRefresh}
              className="w-auto"
            >
              Refresh
            </Button>
            <div className="flex flex-1 lg:flex-none gap-3 w-full lg:w-auto">
              <div 
                className="relative group flex-1 lg:flex-none"
              >
                <Dropdown
                  items={periodOptions}
                  value={selectedPeriod}
                  onChange={(value) => {
                    const _oldPeriod = selectedPeriod;
                    setSelectedPeriod(value as typeof selectedPeriod);
                  }}
                  placeholder="Select period"
                  analyticsId="budget-period"
                  analyticsLabel="Budget Period"
                />
                <div className="absolute top-full mt-2 right-0 w-64 p-2 bg-[rgb(var(--glass-rgb))] border border-[var(--glass-border)] shadow-lg rounded-lg text-xs text-[var(--text-2)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-tooltip">
                  Filters which budgets to display. Each budget&apos;s spending is calculated based on its own period (current month for monthly, current year for yearly).
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={18} />}
                onClick={() => {
                  setEditingCategory(null);
                  setShowAddCategory(true);
                }}
                className="flex-1 lg:flex-none"
              >
                Add Budget
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Budget</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <PiggyBank className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Spent</p>
                <p className="text-2xl font-bold text-[var(--primary-amber)]">
                  ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-[var(--primary-amber)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Remaining</p>
                <p className="text-2xl font-bold text-[var(--primary-emerald)]">
                  ${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Goals Progress</p>
                <p className="text-2xl font-bold gradient-text">
                  {Number(goalSummary?.overall_progress || 0).toFixed(0)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>
        </div>

        {/* Budget Alerts */}
        {overBudgetCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card variant="prominent" className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--primary-amber)]" />
                <p className="text-[var(--text-1)] font-medium">
                  {overBudgetCount} budget{overBudgetCount > 1 ? 's are' : ' is'} over the limit
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    // Scroll to budget categories
                    document.getElementById('budget-categories')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View Details
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Budget Categories */}
          <div className="lg:col-span-2 space-y-6">
            <BudgetErrorBoundary onReset={handleRefresh}>
              <BudgetOverview 
                totalAllocated={totalBudget}
                totalSpent={totalSpent}
                totalRemaining={totalRemaining}
                period={selectedPeriod}
              />
            </BudgetErrorBoundary>
            
            <div id="budget-categories">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-1)]">
                  Budget Categories
                </h2>
                <p className="text-sm text-[var(--text-2)]">
                  {budgetCategories.length} active
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {budgetCategories.length === 0 ? (
                  <Card variant="subtle" className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-3 p-8 text-center">
                    <PiggyBank className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
                    <p className="text-[var(--text-2)]">No budgets set up yet</p>
                    <p className="text-sm text-[var(--text-2)] mt-2">
                      Click &quot;Add Budget&quot; to create your first budget category
                    </p>
                  </Card>
                ) : (
                  budgetCategories.map((category) => (
                    <BudgetErrorBoundary key={category.id} onReset={handleRefresh}>
                      <BudgetCategoryCard
                        category={category}
                        onEdit={() => handleEditBudget(category)}
                        onDelete={() => handleDeleteBudget(category)}
                      />
                    </BudgetErrorBoundary>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Goals Section */}
          <div className="lg:col-span-1">
            <BudgetErrorBoundary onReset={handleRefresh}>
              <BudgetGoals
                goals={budgetGoals}
                onAddGoal={() => {
                  setShowAddGoal(true);
                }}
                onEditGoal={(goal) => {
                  setEditingGoal(goal);
                  setGoalForm({
                    name: goal.name,
                    targetAmount: goal.targetAmount.toString(),
                    currentAmount: goal.currentAmount.toString(),
                    targetDate: goal.deadline,
                    category: goal.category
                  });
                  setShowAddGoal(true);
                }}
                onDeleteGoal={handleDeleteGoal}
              />
            </BudgetErrorBoundary>
          </div>
        </div>

        {/* Add/Edit Budget Modal */}
        <Modal
          isOpen={showAddCategory}
          onClose={() => {
            setShowAddCategory(false);
            setEditingCategory(null);
            setBudgetForm({ categoryId: '', amount: '', period: 'monthly' });
          }}
          title={editingCategory ? 'Edit Budget' : 'Add Budget Category'}
          size="md"
        >
          <div className="space-y-4">
            <Dropdown
              label="Category"
              items={categories
                .filter(cat => cat.type === 'EXPENSE') // Only show expense categories for budgets
                .map(cat => ({ value: cat.id.toString(), label: cat.name }))}
              value={budgetForm.categoryId}
              onChange={(value) => setBudgetForm({ ...budgetForm, categoryId: value })}
              placeholder="Select expense category"
              disabled={!!editingCategory}
            />
            <Input
              label="Budget Amount"
              type="number"
              placeholder="0.00"
              value={budgetForm.amount}
              onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
              icon={<DollarSign size={18} />}
            />
            {!editingCategory && (
              <Dropdown
                label="Period"
                items={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
                value={budgetForm.period}
                onChange={(value) => setBudgetForm({ ...budgetForm, period: value as 'monthly' | 'weekly' | 'yearly' })}
                placeholder="Select period"
              />
            )}
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowAddCategory(false);
                  setEditingCategory(null);
                  setBudgetForm({ categoryId: '', amount: '', period: 'monthly' });
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                fullWidth
                onClick={handleCreateBudget}
              >
                {editingCategory ? 'Update' : 'Create'} Budget
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Goal Modal */}
        <Modal
          isOpen={showAddGoal}
          onClose={() => {
            setShowAddGoal(false);
            setEditingGoal(null);
            setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', category: '' });
          }}
          title={editingGoal ? 'Edit Financial Goal' : 'Add Financial Goal'}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Goal Name"
              type="text"
              placeholder="e.g., Emergency Fund"
              value={goalForm.name}
              onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
              required
            />
            <Input
              label="Target Amount"
              type="number"
              placeholder="0.00"
              icon={<DollarSign size={18} />}
              value={goalForm.targetAmount}
              onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
              required
            />
            <Input
              label="Current Amount"
              type="number"
              placeholder="0.00"
              icon={<DollarSign size={18} />}
              value={goalForm.currentAmount}
              onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
            />
            <DatePicker
              label="Target Date"
              minDate={new Date().toISOString().split('T')[0]}
              value={goalForm.targetDate}
              onChange={(date) => setGoalForm({ ...goalForm, targetDate: date })}
              required
            />
            <Dropdown
              label="Category"
              items={[
                { value: 'SAVINGS', label: 'Savings' },
                { value: 'DEBT', label: 'Debt Payoff' },
                { value: 'INVESTMENT', label: 'Investment' },
                { value: 'PURCHASE', label: 'Purchase' },
                { value: 'OTHER', label: 'Other' },
              ]}
              value={goalForm.category}
              onChange={(value) => setGoalForm({ ...goalForm, category: value })}
              placeholder="Select category"
            />
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowAddGoal(false);
                  setEditingGoal(null);
                  setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', category: '' });
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                fullWidth
                onClick={handleAddGoal}
              >
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeletingBudget(null);
          }}
          title="Delete Budget"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--primary-amber)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[var(--text-1)] font-medium">
                  Are you sure you want to delete this budget?
                </p>
                {deletingBudget && (
                  <p className="text-sm text-[var(--text-2)] mt-2">
                    This will remove the budget for <span className="font-medium">{deletingBudget.name}</span> 
                    {deletingBudget.allocated > 0 && ` with an allocation of $${deletingBudget.allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}.
                  </p>
                )}
                <p className="text-sm text-[var(--text-2)] mt-2">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingBudget(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                fullWidth
                onClick={confirmDeleteBudget}
              >
                Delete Budget
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Goal Confirmation Modal */}
        <Modal
          isOpen={showDeleteGoalConfirm}
          onClose={() => {
            setShowDeleteGoalConfirm(false);
            setDeletingGoal(null);
          }}
          title="Delete Goal"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--primary-amber)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[var(--text-1)] font-medium">
                  Are you sure you want to delete this goal?
                </p>
                {deletingGoal && (
                  <p className="text-sm text-[var(--text-2)] mt-2">
                    This will permanently delete the goal <span className="font-medium">&quot;{deletingGoal.name}&quot;</span> 
                    {deletingGoal.currentAmount > 0 && ` with ${formatCurrency(deletingGoal.currentAmount)} already saved`}.
                  </p>
                )}
                <p className="text-sm text-[var(--text-2)] mt-2">
                  This action cannot be undone and all associated progress will be lost.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowDeleteGoalConfirm(false);
                  setDeletingGoal(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                fullWidth
                onClick={confirmDeleteGoal}
              >
                Delete Goal
              </Button>
            </div>
          </div>
        </Modal>
    </div>
  );
}
