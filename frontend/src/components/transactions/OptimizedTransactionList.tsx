'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Coffee, 
  Car, 
  Home,
  Zap,
  Music,
  DollarSign,
  ArrowUpRight,
  Clock,
  Paperclip,
  Hash,
  Gift,
  Briefcase,
  Heart,
  Plane
} from 'lucide-react';
import Card from '../ui/Card';
import { UITransaction as Transaction } from '@/app/(authenticated)/transactions/page';
import { VirtualList } from '../performance/OptimizedComponents';
import { performanceMonitor } from '@/utils/PerformanceMonitor';

interface TransactionListProps {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  onSelectTransaction: (transaction: Transaction) => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

// Memoized transaction item component
const TransactionItem = memo(function TransactionItem({
  transaction,
  isSelected,
  onSelect
}: {
  transaction: Transaction;
  isSelected: boolean;
  onSelect: (transaction: Transaction) => void;
}) {
  const getCategoryIcon = useCallback((category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Shopping': <ShoppingBag className="w-4 h-4" />,
      'Groceries': <ShoppingBag className="w-4 h-4" />,
      'Dining': <Coffee className="w-4 h-4" />,
      'Transportation': <Car className="w-4 h-4" />,
      'Housing': <Home className="w-4 h-4" />,
      'Utilities': <Zap className="w-4 h-4" />,
      'Entertainment': <Music className="w-4 h-4" />,
      'Subscriptions': <Music className="w-4 h-4" />,
      'Income': <DollarSign className="w-4 h-4" />,
      'Transfer': <ArrowUpRight className="w-4 h-4" />,
      'Healthcare': <Heart className="w-4 h-4" />,
      'Travel': <Plane className="w-4 h-4" />,
      'Business': <Briefcase className="w-4 h-4" />,
      'Gifts': <Gift className="w-4 h-4" />,
    };
    return iconMap[category] || <DollarSign className="w-4 h-4" />;
  }, []);

  const getCategoryColor = useCallback((category: string) => {
    const colorMap: { [key: string]: string } = {
      'Shopping': 'bg-[var(--cat-indigo)]',
      'Groceries': 'bg-[var(--cat-emerald)]',
      'Dining': 'bg-[var(--cat-amber)]',
      'Transportation': 'bg-[var(--cat-blue)]',
      'Housing': 'bg-[var(--cat-emerald)]',
      'Utilities': 'bg-[var(--cat-teal)]',
      'Entertainment': 'bg-[var(--cat-pink)]',
      'Subscriptions': 'bg-[var(--cat-pink)]',
      'Income': 'bg-[var(--cat-emerald)]',
      'Transfer': 'bg-[var(--cat-blue)]',
      'Healthcare': 'bg-[var(--cat-pink)]',
      'Travel': 'bg-[var(--cat-blue)]',
      'Business': 'bg-[var(--cat-indigo)]',
      'Gifts': 'bg-[var(--cat-amber)]',
    };
    return colorMap[category] || 'bg-[rgba(var(--glass-rgb),0.3)]';
  }, []);

  const formatAmount = useCallback((amount: number, type: 'credit' | 'debit') => {
    const sign = type === 'credit' ? '+' : '';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const handleClick = useCallback(() => {
    onSelect(transaction);
  }, [transaction, onSelect]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={`
        p-4 rounded-lg cursor-pointer transition-all mx-4 mb-2
        ${isSelected 
          ? 'bg-[rgba(var(--glass-rgb),0.3)] ring-2 ring-[var(--primary-blue)]' 
          : 'hover:bg-[rgba(var(--glass-rgb),0.1)]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          p-2.5 rounded-lg ${getCategoryColor(transaction.category)}
          flex items-center justify-center
        `}>
          {getCategoryIcon(transaction.category)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-medium text-[var(--text-1)] truncate">
                {transaction.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-[var(--text-2)]">
                  {transaction.merchant}
                </p>
                {transaction.location && (
                  <>
                    <span className="text-[var(--text-2)]">•</span>
                    <p className="text-xs text-[var(--text-2)] truncate">
                      {transaction.location}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className={`font-semibold ${
                transaction.type === 'credit'
                  ? 'text-[var(--primary-emerald)]'
                  : 'text-[var(--text-1)]'
              }`}>
                {formatAmount(transaction.amount, transaction.type)}
              </p>
              <p className="text-xs text-[var(--text-2)] mt-1">
                {transaction.accountType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[var(--text-2)]">
              {transaction.category}
              {transaction.subcategory && ` • ${transaction.subcategory}`}
            </span>
            
            {transaction.status === 'pending' && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--primary-amber)]" />
                <span className="text-xs text-[var(--primary-amber)]">
                  Pending
                </span>
              </div>
            )}
            
            {transaction.attachments && transaction.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-[var(--text-2)]" />
                <span className="text-xs text-[var(--text-2)]">
                  {transaction.attachments}
                </span>
              </div>
            )}
            
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-[var(--text-2)]" />
                <span className="text-xs text-[var(--text-2)]">
                  {transaction.tags.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export const OptimizedTransactionList: React.FC<TransactionListProps> = memo(({
  transactions,
  selectedTransaction,
  onSelectTransaction,
}) => {
  // Track component performance
  React.useEffect(() => {
    performanceMonitor.mark('transaction-list-render-start');
    return () => {
      performanceMonitor.measure('transaction-list-render', 'transaction-list-render-start');
    };
  }, []);

  // Prepare flat list with date headers
  const flattenedItems = useMemo(() => {
    performanceMonitor.mark('transaction-processing-start');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: Array<{ type: 'header' | 'transaction'; data: any }> = [];
    const groupedTransactions = transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {} as { [date: string]: Transaction[] });

    Object.entries(groupedTransactions).forEach(([date, dayTransactions]) => {
      items.push({
        type: 'header',
        data: {
          date,
          count: dayTransactions.length,
          formattedDate: new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
          })
        }
      });
      
      dayTransactions.forEach(transaction => {
        items.push({
          type: 'transaction',
          data: transaction
        });
      });
    });

    performanceMonitor.measure('transaction-processing', 'transaction-processing-start');
    return items;
  }, [transactions]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderItem = useCallback((item: { type: 'header' | 'transaction'; data: any }, _index: number) => {
    if (item.type === 'header') {
      return (
        <div className="px-6 py-3 bg-[var(--bg-1)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--text-2)]">
              {item.data.formattedDate}
            </h3>
            <span className="text-sm text-[var(--text-2)]">
              {item.data.count} transaction{item.data.count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      );
    }

    return (
      <TransactionItem
        transaction={item.data}
        isSelected={selectedTransaction?.id === item.data.id}
        onSelect={onSelectTransaction}
      />
    );
  }, [selectedTransaction, onSelectTransaction]);

  return (
    <Card variant="default" className="h-full">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-semibold text-[var(--text-1)] mb-4">
          Transaction History
        </h2>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
          <p className="text-[var(--text-2)]">No transactions found</p>
          <p className="text-sm text-[var(--text-2)] mt-2">
            Try adjusting your filters or search criteria
          </p>
        </div>
      ) : (
        <VirtualList
          items={flattenedItems}
          height={600}
          itemHeight={item => item.type === 'header' ? 48 : 96}
          renderItem={renderItem}
          overscan={5}
          className="pb-4"
        />
      )}
    </Card>
  );
});

OptimizedTransactionList.displayName = 'OptimizedTransactionList';

export default OptimizedTransactionList;
