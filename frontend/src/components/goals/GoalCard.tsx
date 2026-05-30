import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import Card from '../ui/Card';
import { Goal } from '@/app/(authenticated)/goals/page';

interface GoalCardProps {
  goal: Goal;
  onClick: () => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  onClick,
  analyticsId: _analyticsId = 'goal-card',
  analyticsLabel: _analyticsLabel = 'Goal Card',
}) => {
  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRiskLevelColor = () => {
    switch (goal.riskLevel) {
      case 'on-track': return 'text-[var(--primary-emerald)]';
      case 'at-risk': return 'text-[var(--primary-amber)]';
      case 'off-track': return 'text-[var(--primary-red)]';
    }
  };

  const getRiskLevelIcon = () => {
    switch (goal.riskLevel) {
      case 'on-track': return <TrendingUp className="w-4 h-4" />;
      case 'at-risk': return <AlertCircle className="w-4 h-4" />;
      case 'off-track': return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = () => {
    switch (goal.status) {
      case 'active':
        return (
          <div className="flex items-center gap-1 text-xs text-[var(--primary-blue)]">
            <Clock className="w-3 h-3" />
            <span>Active</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-xs text-[var(--primary-emerald)]">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </div>
        );
      case 'paused':
        return (
          <div className="flex items-center gap-1 text-xs text-[var(--text-2)]">
            <Clock className="w-3 h-3" />
            <span>Paused</span>
          </div>
        );
    }
  };

  const getProgressColor = () => {
    if (goal.status === 'completed') return 'from-[var(--primary-emerald)] to-[var(--primary-teal)]';
    if (goal.riskLevel === 'at-risk') return 'from-[var(--primary-amber)] to-[var(--primary-amber)]/80';
    if (goal.riskLevel === 'off-track') return 'from-[var(--primary-red)] to-[var(--primary-red)]/80';
    return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
  };

  const daysRemaining = getDaysRemaining();
  const amountRemaining = goal.targetAmount - goal.currentAmount;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        onClick();
      }}
      className="cursor-pointer h-full"
    >
      <Card variant={goal.status === 'completed' ? 'prominent' : 'default'} className="h-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`
                p-2.5 rounded-lg flex items-center justify-center
                ${goal.status === 'completed' 
                  ? 'bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-teal)]' 
                  : 'bg-[rgba(var(--glass-rgb),0.1)]'
                }
              `}>
                <div className={goal.status === 'completed' ? 'text-white' : 'text-[var(--primary-blue)]'}>
                  {goal.icon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--text-1)] line-clamp-1">
                  {goal.name}
                </h3>
                <p className="text-xs text-[var(--text-2)] mt-1 line-clamp-2">
                  {goal.description}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-2)]">Progress</span>
              <span className="text-xs font-medium text-[var(--text-1)]">
                {goal.progress.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Amount Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[var(--text-2)]">Current</p>
              <p className="text-lg font-semibold text-[var(--text-1)]">
                {formatCurrency(goal.currentAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-2)]">Target</p>
              <p className="text-lg font-semibold text-[var(--text-1)]">
                {formatCurrency(goal.targetAmount)}
              </p>
            </div>
          </div>

          {/* Status Info */}
          {goal.status === 'active' && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Time remaining
                </span>
                <span className={`font-medium ${daysRemaining < 30 ? 'text-[var(--primary-amber)]' : 'text-[var(--text-1)]'}`}>
                  {daysRemaining} days
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)] flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Monthly saving
                </span>
                <span className="font-medium text-[var(--text-1)]">
                  {formatCurrency(goal.monthlyContribution)}
                  {goal.automatedSaving && (
                    <Zap className="w-3 h-3 inline-block ml-1 text-[var(--primary-amber)]" />
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Status</span>
                <span className={`font-medium flex items-center gap-1 ${getRiskLevelColor()}`}>
                  {getRiskLevelIcon()}
                  {goal.riskLevel.replace('-', ' ')}
                </span>
              </div>
            </div>
          )}

          {goal.status === 'completed' && (
            <div className="text-center py-2">
              <p className="text-sm font-medium text-[var(--primary-emerald)]">
                Goal achieved! 🎉
              </p>
              <p className="text-xs text-[var(--text-2)] mt-1">
                Completed on {new Date(goal.milestones[goal.milestones.length - 1].reachedDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          {goal.status === 'paused' && (
            <div className="text-center py-2">
              <p className="text-sm text-[var(--text-2)]">
                Goal paused • {formatCurrency(amountRemaining)} remaining
              </p>
            </div>
          )}

          {/* Priority Indicator */}
          <div className="mt-4 pt-4 border-t border-[var(--border-1)] flex items-center justify-between">
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={`w-1.5 h-4 rounded-full ${
                    (goal.priority === 'HIGH' && level <= 3) ||
                    (goal.priority === 'MEDIUM' && level <= 2) ||
                    (goal.priority === 'LOW' && level <= 1)
                      ? 'bg-[var(--primary-blue)]'
                      : 'bg-[rgba(var(--glass-rgb),0.1)]'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-[var(--text-2)]">
              {goal.category}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default GoalCard;
