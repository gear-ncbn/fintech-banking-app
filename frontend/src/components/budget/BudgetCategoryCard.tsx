import React from 'react';
import { motion } from 'framer-motion';
import { 
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { BudgetCategory } from '@/app/(authenticated)/budget/page';

interface BudgetCategoryCardProps {
  category: BudgetCategory;
  onEdit: () => void;
  onDelete: () => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({
  category,
  onEdit,
  onDelete,
  analyticsId: _analyticsId = 'budget-category-card',
  analyticsLabel: _analyticsLabel = 'Budget Category Card',
}) => {
  const isOverBudget = category.remaining < 0;
  const warningThreshold = 90;
  const isNearLimit = category.percentage >= warningThreshold && !isOverBudget;

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getProgressColor = () => {
    if (isOverBudget) return 'from-[var(--primary-red)] to-[var(--primary-red)]/80';
    if (isNearLimit) return 'from-[var(--primary-amber)] to-[var(--primary-amber)]/80';
    return category.color;
  };

  return (
    <Card 
      variant="default" 
      className="h-full"
      onClick={() => {
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`
              p-2.5 rounded-lg bg-gradient-to-r ${category.color}
              flex items-center justify-center
            `}>
              {category.icon}
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-1)]">{category.name}</h3>
              <p className="text-xs text-[var(--text-2)]">
                {category.transactions} transactions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="!p-1.5 hover:bg-[rgba(var(--glass-rgb),0.3)]"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit Budget"
            >
              <Edit2 size={16} className="text-[var(--text-2)]" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="!p-1.5 hover:bg-[rgba(var(--glass-rgb),0.3)] hover:text-[var(--primary-red)]"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Budget"
            >
              <Trash2 size={16} className="text-[var(--text-2)]" />
            </Button>
          </div>
        </div>

        {/* Budget Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-2)]">Allocated</span>
            <span className="text-sm font-medium text-[var(--text-1)]">
              {formatCurrency(category.allocated)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-2)]">Spent</span>
            <span className="text-sm font-medium text-[var(--text-1)]">
              {formatCurrency(category.spent)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-2)]">Remaining</span>
            <span className={`text-sm font-medium flex items-center gap-1 ${
              isOverBudget 
                ? 'text-[var(--primary-red)]' 
                : isNearLimit
                ? 'text-[var(--primary-amber)]'
                : 'text-[var(--primary-emerald)]'
            }`}>
              {isOverBudget && <AlertCircle size={14} />}
              {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(category.remaining))}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-2)]">Usage</span>
            <span className={`text-xs font-medium ${
              isOverBudget 
                ? 'text-[var(--primary-red)]' 
                : isNearLimit
                ? 'text-[var(--primary-amber)]'
                : 'text-[var(--text-1)]'
            }`}>
              {category.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getProgressColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, Math.min(100, category.percentage))}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Status Message */}
        {(isOverBudget || isNearLimit) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              p-2 rounded-lg text-xs flex items-center gap-2
              ${isOverBudget 
                ? 'bg-[rgba(var(--primary-red),0.1)] text-[var(--primary-red)]'
                : 'bg-[rgba(var(--primary-amber),0.1)] text-[var(--primary-amber)]'
              }
            `}
          >
            <AlertCircle size={12} />
            <span>
              {isOverBudget 
                ? `Over budget by ${formatCurrency(Math.abs(category.remaining))}`
                : `${(100 - category.percentage).toFixed(1)}% remaining`
              }
            </span>
          </motion.div>
        )}

        {/* Trend Indicator */}
        {!isOverBudget && !isNearLimit && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
            {category.percentage < 70 ? (
              <>
                <TrendingDown className="w-3 h-3 text-[var(--primary-emerald)]" />
                <span>Under control</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3 text-[var(--primary-blue)]" />
                <span>Normal spending</span>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default BudgetCategoryCard;
