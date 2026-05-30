import React from 'react';
import { motion } from 'framer-motion';
import { 
  Target,
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  Edit2,
  DollarSign,
  Check,
  Trash2
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { BudgetGoal } from '@/app/(authenticated)/budget/page';

interface BudgetGoalsProps {
  goals: BudgetGoal[];
  onAddGoal: () => void;
  onEditGoal?: (goal: BudgetGoal) => void;
  onDeleteGoal?: (goal: BudgetGoal) => void;
}

export const BudgetGoals: React.FC<BudgetGoalsProps> = ({
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
}) => {
  const formatCurrency = (amount: number) => {
    // Add NaN protection
    const safeAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
    return `$${Math.abs(safeAmount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const calculateTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = Math.abs(deadlineDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
  };

  const getStatusColor = (status: BudgetGoal['status']) => {
    switch (status) {
      case 'on-track': return 'text-[var(--primary-emerald)]';
      case 'at-risk': return 'text-[var(--primary-amber)]';
      case 'completed': return 'text-[var(--primary-blue)]';
    }
  };

  const getStatusIcon = (status: BudgetGoal['status']) => {
    switch (status) {
      case 'on-track': return <TrendingUp className="w-4 h-4" />;
      case 'at-risk': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <Check className="w-4 h-4" />;
    }
  };

  const getProgressColor = (status: BudgetGoal['status']) => {
    switch (status) {
      case 'on-track': return 'from-[var(--primary-emerald)] to-[var(--primary-teal)]';
      case 'at-risk': return 'from-[var(--primary-amber)] to-[var(--primary-amber)]/80';
      case 'completed': return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-1)]">
          Financial Goals
        </h2>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={18} />}
          onClick={onAddGoal}
        >
          Add Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {goals.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="prominent" className="h-full min-h-[420px] flex flex-col">
              <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between mb-4 gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-[var(--primary-blue)] flex-shrink-0" />
                      <h3 className="font-semibold text-[var(--text-1)]">
                        {goal.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`flex items-center gap-1 ${getStatusColor(goal.status)}`}>
                        {getStatusIcon(goal.status)}
                        <span className="capitalize">{goal.status.replace('-', ' ')}</span>
                      </span>
                      <span className="text-[var(--text-2)]">•</span>
                      <span className="text-[var(--text-2)]">{goal.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={<Edit2 size={16} />}
                      onClick={() => {
                        if (onEditGoal) {
                          onEditGoal(goal);
                        }
                      }}
                      title="Edit Goal"
                    />
                    {onDeleteGoal && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        icon={<Trash2 size={16} />}
                        onClick={() => {
                          onDeleteGoal(goal);
                        }}
                        title="Delete Goal"
                        className="text-[var(--primary-red)] hover:text-[var(--primary-red)]"
                      />
                    )}
                  </div>
                </div>

                {/* Progress Info */}
                <div className="space-y-4 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--text-2)]">Progress</span>
                      <span className="text-sm font-medium text-[var(--text-1)]">
                        {goal.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${getProgressColor(goal.status)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-2)] mb-1">Current Amount</p>
                      <p className="text-lg font-semibold text-[var(--text-1)]">
                        {formatCurrency(goal.currentAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-2)] mb-1">Target Amount</p>
                      <p className="text-lg font-semibold text-[var(--text-1)]">
                        {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-2)] mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Deadline
                      </p>
                      <p className="text-sm font-medium text-[var(--text-1)]">
                        {new Date(goal.deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-2)] mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Time Remaining
                      </p>
                      <p className="text-sm font-medium text-[var(--text-1)]">
                        {calculateTimeRemaining(goal.deadline)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monthly Contribution */}
                <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <DollarSign className="w-4 h-4 text-[var(--primary-blue)] flex-shrink-0" />
                      <span className="text-sm text-[var(--text-2)] truncate">
                        Monthly Contribution
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-1)] flex-shrink-0">
                      {formatCurrency(goal.monthlyContribution)}
                    </span>
                  </div>
                  {goal.status === 'at-risk' && (
                    <p className="text-xs text-[var(--primary-amber)] mt-2">
                      Consider increasing to {formatCurrency(goal.monthlyContribution * 1.5)} to meet your goal
                    </p>
                  )}
                </div>

                {/* Insights */}
                <div className="mt-4 text-sm">
                  {goal.status === 'on-track' && (
                    <p className="text-[var(--primary-emerald)]">
                      You&apos;re on track! Keep up the good work.
                    </p>
                  )}
                  {goal.status === 'at-risk' && (
                    <p className="text-[var(--primary-amber)]">
                      You need to save {formatCurrency(
                        (() => {
                          const remaining = goal.targetAmount - goal.currentAmount;
                          const deadlineDate = new Date(goal.deadline);
                          const now = new Date();
                          const monthsRemaining = Math.max(1, 
                            (deadlineDate.getFullYear() - now.getFullYear()) * 12 + 
                            (deadlineDate.getMonth() - now.getMonth())
                          );
                          return remaining / monthsRemaining;
                        })()
                      )} per month to reach your goal.
                    </p>
                  )}
                  {goal.status === 'completed' && (
                    <p className="text-[var(--primary-blue)]">
                      Congratulations! You&apos;ve achieved your goal!
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        {/* Add Goal Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: goals.length * 0.1 }}
        >
          <Card
            variant="subtle"
            className="h-full min-h-[300px] flex items-center justify-center cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.2)] transition-all"
            onClick={onAddGoal}
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-medium text-[var(--text-1)] mb-2">
                Add New Goal
              </h3>
              <p className="text-sm text-[var(--text-2)] max-w-xs mx-auto">
                Set a financial goal and track your progress towards achieving it
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BudgetGoals;
