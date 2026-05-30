import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle,
  Circle,
  Flag,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import Card from '../ui/Card';
import { Goal } from '@/app/goals/page';

interface GoalMilestonesProps {
  goal: Goal;
}

export const GoalMilestones: React.FC<GoalMilestonesProps> = ({ goal }) => {
  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const calculateDaysToMilestone = (milestoneAmount: number) => {
    if (goal.monthlyContribution === 0) return null;
    
    const amountNeeded = milestoneAmount - goal.currentAmount;
    if (amountNeeded <= 0) return 0;
    
    const monthsNeeded = amountNeeded / goal.monthlyContribution;
    return Math.ceil(monthsNeeded * 30);
  };

  const getNextMilestone = () => {
    return goal.milestones.find(m => !m.reached);
  };

  const nextMilestone = getNextMilestone();
  const completedMilestones = goal.milestones.filter(m => m.reached).length;
  const totalMilestones = goal.milestones.length;
  const milestonesProgress = (completedMilestones / totalMilestones) * 100;

  return (
    <div className="space-y-6">
      {/* Milestones Overview */}
      <Card variant="subtle" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
            <Flag className="w-5 h-5 text-[var(--primary-blue)]" />
            Milestones
          </h3>
          <span className="text-sm text-[var(--text-2)]">
            {completedMilestones} of {totalMilestones} completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]"
              initial={{ width: 0 }}
              animate={{ width: `${milestonesProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Next Milestone Highlight */}
        {nextMilestone && goal.status === 'active' && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-[var(--primary-blue)]/10 to-[var(--primary-indigo)]/10 border border-[var(--primary-blue)]/20 mb-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">Next Milestone</p>
                <p className="text-xs text-[var(--text-2)] mt-1">{nextMilestone.description}</p>
              </div>
              <p className="text-lg font-bold text-[var(--primary-blue)]">
                {formatCurrency(nextMilestone.amount)}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-xs text-[var(--text-2)]">Need</p>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {formatCurrency(nextMilestone.amount - goal.currentAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-2)]">Progress</p>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {((goal.currentAmount / nextMilestone.amount) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-2)]">Est. Time</p>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {calculateDaysToMilestone(nextMilestone.amount) || 0} days
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Milestones List */}
        <div className="space-y-3">
          {goal.milestones.map((milestone, index) => {
            const isReached = milestone.reached;
            const isNext = !isReached && goal.milestones.slice(0, index).every(m => m.reached);
            const progress = Math.min(100, (goal.currentAmount / milestone.amount) * 100);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  relative p-4 rounded-lg border transition-all
                  ${isReached 
                    ? 'bg-[rgba(var(--primary-emerald),0.05)] border-[var(--primary-emerald)]/20' 
                    : isNext
                    ? 'bg-[rgba(var(--glass-rgb),0.05)] border-[var(--primary-blue)]/30'
                    : 'bg-transparent border-[var(--border-1)]'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {isReached ? (
                      <CheckCircle className="w-5 h-5 text-[var(--primary-emerald)]" />
                    ) : (
                      <Circle className={`w-5 h-5 ${
                        isNext ? 'text-[var(--primary-blue)]' : 'text-[var(--text-2)]'
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`font-medium ${
                          isReached 
                            ? 'text-[var(--primary-emerald)]' 
                            : isNext
                            ? 'text-[var(--text-1)]'
                            : 'text-[var(--text-2)]'
                        }`}>
                          {milestone.description}
                        </p>
                        {milestone.reachedDate && (
                          <p className="text-xs text-[var(--text-2)] mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Reached on {new Date(milestone.reachedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className={`font-semibold ${
                        isReached ? 'text-[var(--primary-emerald)]' : 'text-[var(--text-1)]'
                      }`}>
                        {formatCurrency(milestone.amount)}
                      </p>
                    </div>

                    {/* Progress Bar for unreached milestones */}
                    {!isReached && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[var(--text-2)]">Progress</span>
                          <span className="text-xs font-medium text-[var(--text-1)]">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${
                              isNext 
                                ? 'bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]'
                                : 'bg-[var(--text-2)]'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Milestone Insights */}
      {goal.status === 'active' && nextMilestone && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="default" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--primary-blue)]" />
              <h4 className="text-sm font-medium text-[var(--text-1)]">
                Milestone Velocity
              </h4>
            </div>
            <p className="text-xs text-[var(--text-2)]">
              At your current savings rate, you&apos;ll reach the next milestone in approximately{' '}
              <span className="font-medium text-[var(--text-1)]">
                {calculateDaysToMilestone(nextMilestone.amount) || 0} days
              </span>
            </p>
          </Card>

          <Card variant="default" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[var(--primary-emerald)]" />
              <h4 className="text-sm font-medium text-[var(--text-1)]">
                Achievement Rate
              </h4>
            </div>
            <p className="text-xs text-[var(--text-2)]">
              You&apos;ve achieved{' '}
              <span className="font-medium text-[var(--primary-emerald)]">
                {completedMilestones} milestones
              </span>{' '}
              saving an average of{' '}
              <span className="font-medium text-[var(--text-1)]">
                {formatCurrency(goal.currentAmount / Math.max(1, completedMilestones))}
              </span>{' '}
              per milestone
            </p>
          </Card>
        </div>
      )}

      {/* Completion Message */}
      {goal.status === 'completed' && (
        <Card variant="prominent" className="p-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--primary-emerald)]" />
          <h3 className="text-lg font-semibold text-[var(--text-1)] mb-2">
            All Milestones Completed! 🎉
          </h3>
          <p className="text-sm text-[var(--text-2)]">
            You&apos;ve successfully achieved all {totalMilestones} milestones and reached your goal of{' '}
            {formatCurrency(goal.targetAmount)}
          </p>
        </Card>
      )}
    </div>
  );
};

export default GoalMilestones;