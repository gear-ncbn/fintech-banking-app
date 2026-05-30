import React from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Zap,
  AlertCircle
} from 'lucide-react';
import Card from '../ui/Card';
import { Goal } from '@/app/goals/page';

interface GoalProgressProps {
  goal: Goal;
}

export const GoalProgress: React.FC<GoalProgressProps> = ({ goal }) => {
  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const calculateMonthlyRequired = () => {
    if (goal.status === 'completed') return 0;
    
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const monthsRemaining = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const amountRemaining = goal.targetAmount - goal.currentAmount;
    
    return Math.ceil(amountRemaining / monthsRemaining);
  };

  const calculateProjectedDate = () => {
    if (goal.monthlyContribution === 0) return null;
    
    const amountRemaining = goal.targetAmount - goal.currentAmount;
    const monthsNeeded = Math.ceil(amountRemaining / goal.monthlyContribution);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);
    
    return projectedDate;
  };

  const monthlyRequired = calculateMonthlyRequired();
  const projectedDate = calculateProjectedDate();
  const isAheadOfSchedule = monthlyRequired < goal.monthlyContribution;
  const percentageOfTarget = (goal.currentAmount / goal.targetAmount) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Visualization */}
      <Card variant="subtle" className="p-6">
        <div className="relative">
          {/* Circular Progress */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="rgba(var(--glass-rgb),0.1)"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - goal.progress / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary-blue)" />
                  <stop offset="100%" stopColor="var(--primary-indigo)" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-[var(--text-1)]">
                {goal.progress.toFixed(0)}%
              </p>
              <p className="text-sm text-[var(--text-2)]">Complete</p>
            </div>
          </div>

          {/* Amount Details */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[var(--text-2)] mb-1">Saved</p>
              <p className="text-lg font-semibold text-[var(--primary-emerald)]">
                {formatCurrency(goal.currentAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-2)] mb-1">Remaining</p>
              <p className="text-lg font-semibold text-[var(--text-1)]">
                {formatCurrency(goal.targetAmount - goal.currentAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-2)] mb-1">Target</p>
              <p className="text-lg font-semibold text-[var(--primary-blue)]">
                {formatCurrency(goal.targetAmount)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Savings Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="default" className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
              <DollarSign className="w-5 h-5 text-[var(--primary-blue)]" />
            </div>
            <h4 className="font-medium text-[var(--text-1)]">Monthly Savings</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">Current</span>
              <span className="text-sm font-medium text-[var(--text-1)] flex items-center gap-1">
                {formatCurrency(goal.monthlyContribution)}
                {goal.automatedSaving && <Zap className="w-3 h-3 text-[var(--primary-amber)]" />}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">Required</span>
              <span className={`text-sm font-medium ${
                isAheadOfSchedule ? 'text-[var(--primary-emerald)]' : 'text-[var(--primary-amber)]'
              }`}>
                {formatCurrency(monthlyRequired)}
              </span>
            </div>
            {isAheadOfSchedule && (
              <p className="text-xs text-[var(--primary-emerald)] mt-2">
                You&apos;re saving more than required!
              </p>
            )}
          </div>
        </Card>

        <Card variant="default" className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
              <Calendar className="w-5 h-5 text-[var(--primary-indigo)]" />
            </div>
            <h4 className="font-medium text-[var(--text-1)]">Timeline</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">Deadline</span>
              <span className="text-sm font-medium text-[var(--text-1)]">
                {new Date(goal.deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {projectedDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-2)]">Projected</span>
                <span className={`text-sm font-medium ${
                  projectedDate <= new Date(goal.deadline) 
                    ? 'text-[var(--primary-emerald)]' 
                    : 'text-[var(--primary-amber)]'
                }`}>
                  {projectedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Risk Assessment */}
      {goal.riskLevel !== 'on-track' && goal.status === 'active' && (
        <Card 
          variant="subtle" 
          className={`p-4 border ${
            goal.riskLevel === 'at-risk' 
              ? 'border-[var(--primary-amber)]' 
              : 'border-[var(--primary-red)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${
              goal.riskLevel === 'at-risk' 
                ? 'text-[var(--primary-amber)]' 
                : 'text-[var(--primary-red)]'
            }`} />
            <div className="flex-1">
              <h4 className={`font-medium mb-1 ${
                goal.riskLevel === 'at-risk' 
                  ? 'text-[var(--primary-amber)]' 
                  : 'text-[var(--primary-red)]'
              }`}>
                Goal {goal.riskLevel.replace('-', ' ')}
              </h4>
              <p className="text-sm text-[var(--text-2)]">
                {goal.riskLevel === 'at-risk' 
                  ? `You need to increase your monthly savings to ${formatCurrency(monthlyRequired)} to meet your deadline.`
                  : `At the current rate, you won't reach your goal by the deadline. Consider extending the deadline or increasing contributions.`
                }
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[var(--primary-blue)]" />
          <p className="text-xs text-[var(--text-2)] mb-1">Average Monthly</p>
          <p className="text-sm font-semibold text-[var(--text-1)]">
            {formatCurrency(goal.currentAmount / 12)}
          </p>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
          <Target className="w-6 h-6 mx-auto mb-2 text-[var(--primary-indigo)]" />
          <p className="text-xs text-[var(--text-2)] mb-1">% of Target</p>
          <p className="text-sm font-semibold text-[var(--text-1)]">
            {percentageOfTarget.toFixed(1)}%
          </p>
        </div>
        
        <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
          <Clock className="w-6 h-6 mx-auto mb-2 text-[var(--primary-emerald)]" />
          <p className="text-xs text-[var(--text-2)] mb-1">Days Active</p>
          <p className="text-sm font-semibold text-[var(--text-1)]">
            {Math.ceil((new Date().getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalProgress;