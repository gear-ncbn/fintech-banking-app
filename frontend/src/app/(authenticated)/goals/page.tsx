'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target,
  Plus,
  Trophy,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  Home,
  Car,
  GraduationCap,
  Plane,
  Heart,
  Gift,
  PiggyBank,
  Briefcase
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Dropdown from '@/components/ui/Dropdown';
import DatePicker from '@/components/ui/DatePicker';
import GoalCard from '@/components/goals/GoalCard';
import GoalProgress from '@/components/goals/GoalProgress';
import GoalMilestones from '@/components/goals/GoalMilestones';
import { goalsService, GoalCreate, GoalUpdate } from '@/lib/api/goals';
import { getMonthlyContribution } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  category: 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'PURCHASE' | 'OTHER';
  icon?: React.ReactNode;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  progress: number;
  monthlyContribution: number;
  automatedSaving: boolean;
  milestones: {
    amount: number;
    description: string;
    reached: boolean;
    reachedDate?: string;
  }[];
  projectedCompletion?: string;
  riskLevel: 'on-track' | 'at-risk' | 'off-track';
}

export default function GoalsPage() {
  const { user: _user } = useAuth();
  const { showError, _showSuccess, _showInfo } = useAlert();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'progress' | 'amount'>('deadline');
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [goalForm, setGoalForm] = useState<{
    name: string;
    description: string;
    targetAmount: string;
    initialAmount: string;
    targetDate: string;
    category: GoalCreate['category'];
    priority: GoalCreate['priority'];
  }>({
    name: '',
    description: '',
    targetAmount: '',
    initialAmount: '0',
    targetDate: '',
    category: 'SAVINGS',
    priority: 'MEDIUM'
  });

  const categoryIcons = useMemo<{ [key: string]: React.ReactNode }>(() => ({
    'SAVINGS': <PiggyBank className="w-5 h-5" />,
    'DEBT': <DollarSign className="w-5 h-5" />,
    'INVESTMENT': <TrendingUp className="w-5 h-5" />,
    'PURCHASE': <Gift className="w-5 h-5" />,
    'OTHER': <Target className="w-5 h-5" />,
    'Emergency Fund': <PiggyBank className="w-5 h-5" />,
    'Home': <Home className="w-5 h-5" />,
    'Vehicle': <Car className="w-5 h-5" />,
    'Education': <GraduationCap className="w-5 h-5" />,
    'Travel': <Plane className="w-5 h-5" />,
    'Health': <Heart className="w-5 h-5" />,
    'Gift': <Gift className="w-5 h-5" />,
    'Retirement': <Briefcase className="w-5 h-5" />,
    'Other': <Target className="w-5 h-5" />,
  }), []);

  const loadGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const apiGoals = await goalsService.getGoals();
      
      // Transform API goals to UI format
      const transformedGoals: Goal[] = apiGoals.map(goal => {
        // Calculate monthly contribution (shared helper keeps this consistent
        // with the Budget page's Financial Goals widget).
        const targetDate = new Date(goal.target_date);
        const monthlyContribution = getMonthlyContribution(
          goal.target_amount,
          goal.current_amount,
          goal.target_date
        );
        
        // Determine risk level
        let riskLevel: Goal['riskLevel'] = 'on-track';
        if (goal.progress_percentage >= 100) {
          riskLevel = 'on-track';
        } else if (goal.days_remaining < 60 && goal.progress_percentage < 50) {
          riskLevel = 'at-risk';
        } else if (monthlyContribution > goal.monthly_target * 1.5) {
          riskLevel = 'at-risk';
        }
        
        // Create milestones
        const milestones = [
          { amount: goal.target_amount * 0.25, description: '25% Complete', reached: goal.progress_percentage >= 25, reachedDate: undefined },
          { amount: goal.target_amount * 0.50, description: '50% Complete', reached: goal.progress_percentage >= 50, reachedDate: undefined },
          { amount: goal.target_amount * 0.75, description: '75% Complete', reached: goal.progress_percentage >= 75, reachedDate: undefined },
          { amount: goal.target_amount, description: 'Goal Achieved!', reached: goal.progress_percentage >= 100, reachedDate: goal.achieved_date },
        ];
        
        return {
          id: goal.id.toString(),
          name: goal.name,
          description: goal.description,
          category: goal.category,
          icon: categoryIcons[goal.category] || categoryIcons['OTHER'],
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          deadline: goal.target_date,
          createdAt: goal.created_at,
          status: goal.is_achieved ? 'completed' : 'active',
          priority: goal.priority,
          progress: goal.progress_percentage,
          monthlyContribution: monthlyContribution,
          automatedSaving: false,
          milestones,
          projectedCompletion: targetDate.toISOString().split('T')[0],
          riskLevel
        };
      });
      
      setGoals(transformedGoals);
      
      // Calculate summary statistics
      const _totalTargetAmount = transformedGoals.reduce((sum, g) => sum + g.targetAmount, 0);
      const _totalCurrentAmount = transformedGoals.reduce((sum, g) => sum + g.currentAmount, 0);
      const _activeGoals = transformedGoals.filter(g => g.status === 'active');
      const _completedGoals = transformedGoals.filter(g => g.status === 'completed');
      const _goalsAtRisk = transformedGoals.filter(g => g.riskLevel === 'at-risk');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, [categoryIcons]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleCreateGoal = async () => {
    try {
      if (!goalForm.name || !goalForm.targetAmount || !goalForm.targetDate) {
        showError('Form Incomplete', 'Please fill in all required fields: name, target amount, and target date.');
        return;
      }
      
      const newGoal: GoalCreate = {
        name: goalForm.name,
        description: goalForm.description || undefined,
        target_amount: parseFloat(goalForm.targetAmount),
        target_date: goalForm.targetDate,
        category: goalForm.category,
        priority: goalForm.priority,
        initial_amount: parseFloat(goalForm.initialAmount) || 0
      };
      
      await goalsService.createGoal(newGoal);
      
      
      setShowCreateGoal(false);
      setGoalForm({
        name: '',
        description: '',
        targetAmount: '',
        initialAmount: '0',
        targetDate: '',
        category: 'SAVINGS',
        priority: 'MEDIUM'
      });
      await loadGoals();
    } catch {
      showError('Goal Creation Failed', 'Unable to create the goal. Please try again.');
    }
  };
  
  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;
    
    try {
      const updates: GoalUpdate = {
        name: goalForm.name || undefined,
        description: goalForm.description || undefined,
        target_amount: goalForm.targetAmount ? parseFloat(goalForm.targetAmount) : undefined,
        target_date: goalForm.targetDate || undefined,
        category: goalForm.category,
        priority: goalForm.priority
      };
      
      await goalsService.updateGoal(parseInt(selectedGoal.id), updates);
      
      
      setIsEditMode(false);
      setShowGoalDetails(false);
      setSelectedGoal(null);
      await loadGoals();
    } catch {
      showError('Goal Update Failed', 'Unable to update the goal. Please try again.');
    }
  };
  
  const handleEditClick = () => {
    if (selectedGoal) {
      setGoalForm({
        name: selectedGoal.name,
        description: selectedGoal.description || '',
        targetAmount: selectedGoal.targetAmount.toString(),
        initialAmount: selectedGoal.currentAmount.toString(),
        targetDate: selectedGoal.deadline,
        category: selectedGoal.category,
        priority: selectedGoal.priority
      });
      setIsEditMode(true);
    }
  };

  const categories = ['all', 'SAVINGS', 'DEBT', 'INVESTMENT', 'PURCHASE', 'OTHER'];
  const statuses = ['all', 'active', 'completed', 'paused'];

  const filteredGoals = goals.filter(goal => {
    const categoryMatch = filterCategory === 'all' || goal.category === filterCategory;
    const statusMatch = filterStatus === 'all' || goal.status === filterStatus;
    return categoryMatch && statusMatch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'progress':
        return b.progress - a.progress;
      case 'amount':
        return b.targetAmount - a.targetAmount;
      default:
        return 0;
    }
  });

  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalDetails(true);
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading goals...</div>
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
            Unable to Load Goals
          </h2>
          <p className="text-[var(--text-2)] mb-6">{error}</p>
          <Button onClick={loadGoals} variant="primary">
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
              Financial Goals
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Set and track your savings goals to achieve financial milestones
            </p>
          </div>
          
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              setShowCreateGoal(true);
            }}
            className="mt-4 md:mt-0"
          >
            Create Goal
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Saved</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  ${totalSaved.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Target Amount</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  ${totalTarget.toLocaleString()}
                </p>
              </div>
              <Target className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Active Goals</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {activeGoals}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[var(--primary-amber)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Completed</p>
                <p className="text-2xl font-bold text-[var(--primary-emerald)]">
                  {completedGoals}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Dropdown
            items={categories.map(cat => ({ 
              value: cat, 
              label: cat === 'all' ? 'All Categories' : 
                     cat === 'SAVINGS' ? 'Savings' :
                     cat === 'DEBT' ? 'Debt Payoff' :
                     cat === 'INVESTMENT' ? 'Investment' :
                     cat === 'PURCHASE' ? 'Purchase' :
                     cat === 'OTHER' ? 'Other' : cat
            }))}
            value={filterCategory}
            onChange={(value) => {
              const _oldCategory = filterCategory;
              setFilterCategory(value);
            }}
            placeholder="Category"
          />
          
          <Dropdown
            items={statuses.map(status => ({ 
              value: status, 
              label: status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1) 
            }))}
            value={filterStatus}
            onChange={(value) => {
              const _oldStatus = filterStatus;
              setFilterStatus(value);
            }}
            placeholder="Status"
          />
          
          <Dropdown
            items={[
              { value: 'deadline', label: 'Sort by Deadline' },
              { value: 'progress', label: 'Sort by Progress' },
              { value: 'amount', label: 'Sort by Amount' },
            ]}
            value={sortBy}
            onChange={(value) => {
              const _oldSort = sortBy;
              setSortBy(value as 'deadline' | 'progress' | 'amount');
            }}
            placeholder="Sort by"
          />
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GoalCard
                goal={goal}
                onClick={() => handleGoalClick(goal)}
              />
            </motion.div>
          ))}

          {filteredGoals.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Target className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
              <p className="text-[var(--text-2)]">No goals found</p>
              <p className="text-sm text-[var(--text-2)] mt-2">
                Try adjusting your filters or create a new goal
              </p>
            </div>
          )}
        </div>
      {/* Create Goal Modal */}
      <Modal
        isOpen={showCreateGoal}
        onClose={() => {
          setShowCreateGoal(false);
          setGoalForm({
            name: '',
            description: '',
            targetAmount: '',
            initialAmount: '0',
            targetDate: '',
            category: 'SAVINGS',
            priority: 'MEDIUM'
          });
        }}
        title="Create Financial Goal"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Goal Name"
            type="text"
            placeholder="e.g., Emergency Fund"
            value={goalForm.name}
            onChange={(e) => {
              setGoalForm({ ...goalForm, name: e.target.value });
            }}
            required
          />
          
          <Input
            label="Description (Optional)"
            type="text"
            placeholder="e.g., Save for 6 months of expenses"
            value={goalForm.description}
            onChange={(e) => {
              setGoalForm({ ...goalForm, description: e.target.value });
            }}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Amount"
              type="number"
              placeholder="0.00"
              value={goalForm.targetAmount}
              onChange={(e) => {
                setGoalForm({ ...goalForm, targetAmount: e.target.value });
              }}
              icon={<DollarSign size={18} />}
              required
            />
            
            <Input
              label="Initial Amount"
              type="number"
              placeholder="0.00"
              value={goalForm.initialAmount}
              onChange={(e) => {
                setGoalForm({ ...goalForm, initialAmount: e.target.value });
              }}
              icon={<DollarSign size={18} />}
            />
          </div>
          
          <DatePicker
            label="Target Date"
            value={goalForm.targetDate}
            onChange={(value) => {
              setGoalForm({ ...goalForm, targetDate: value });
              const _daysToTarget = Math.floor((new Date(value).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            }}
            minDate={new Date().toISOString().split('T')[0]}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
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
              onChange={(value) => {
                setGoalForm({ ...goalForm, category: value as GoalCreate['category'] });
              }}
              placeholder="Select category"
            />
            
            <Dropdown
              label="Priority"
              items={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
              ]}
              value={goalForm.priority || 'MEDIUM'}
              onChange={(value) => {
                setGoalForm({ ...goalForm, priority: value as GoalCreate['priority'] });
              }}
              placeholder="Select priority"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setShowCreateGoal(false);
                setGoalForm({
                  name: '',
                  description: '',
                  targetAmount: '',
                  initialAmount: '0',
                  targetDate: '',
                  category: 'SAVINGS',
                  priority: 'MEDIUM'
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              fullWidth
              onClick={() => {
                handleCreateGoal();
              }}
            >
              Create Goal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Goal Details Modal */}
      {selectedGoal && (
        <Modal
          isOpen={showGoalDetails}
          onClose={() => {
            setShowGoalDetails(false);
            setSelectedGoal(null);
            setIsEditMode(false);
          }}
          title={isEditMode ? 'Edit Goal' : selectedGoal.name}
          size="xl"
        >
          <div className="space-y-6">
            {isEditMode ? (
              // Edit Mode Form
              <div className="space-y-4">
                <Input
                  label="Goal Name"
                  type="text"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  required
                />
                
                <Input
                  label="Description"
                  type="text"
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                />
                
                <Input
                  label="Target Amount"
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  icon={<DollarSign size={18} />}
                  required
                />
                
                <DatePicker
                  label="Target Date"
                  value={goalForm.targetDate}
                  onChange={(value) => setGoalForm({ ...goalForm, targetDate: value })}
                  minDate={new Date().toISOString().split('T')[0]}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
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
                    onChange={(value) => setGoalForm({ ...goalForm, category: value as GoalCreate['category'] })}
                  />
                  
                  <Dropdown
                    label="Priority"
                    items={[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' },
                    ]}
                    value={goalForm.priority}
                    onChange={(value) => setGoalForm({ ...goalForm, priority: value as GoalCreate['priority'] })}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setIsEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    fullWidth
                    onClick={() => {
                      handleUpdateGoal();
                    }}
                  >
                    Update Goal
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <GoalProgress goal={selectedGoal} />
                <GoalMilestones goal={selectedGoal} />
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="primary" 
                    fullWidth
                    onClick={handleEditClick}
                  >
                    Edit Goal
                  </Button>
                  <Button 
                    variant="secondary" 
                    fullWidth
                    onClick={() => {
                      const _newState = !selectedGoal.automatedSaving;
                      // Note: Actual implementation would update the goal here
                    }}
                  >
                    {selectedGoal.automatedSaving ? 'Pause Auto-Save' : 'Enable Auto-Save'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
