import React from 'react';
import { motion } from 'framer-motion';
import { useScrollTracking } from '@/hooks/useScrollTracking';
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

interface TransactionListProps {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  onSelectTransaction: (transaction: Transaction) => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  selectedTransaction,
  onSelectTransaction,
  analyticsId: _analyticsId = 'transaction-list',
  analyticsLabel: _analyticsLabel = 'Transaction List',
}) => {
  const getCategoryIcon = (category: string) => {
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
  };

  const getCategoryColor = (category: string) => {
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
  };

  const formatAmount = (amount: number, type: 'credit' | 'debit') => {
    const sign = type === 'credit' ? '+' : '';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const _formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as { [date: string]: Transaction[] });

  const dateGroups = Object.entries(groupedTransactions);

  const scrollContainerRef = useScrollTracking({
    elementId: 'transaction-list-scroll',
    elementName: 'Transaction List',
    thresholds: [25, 50, 75, 100]
  });

  return (
    <Card variant="default" data-testid="transaction-list-card">
      <div className="p-6 max-h-[600px] overflow-y-auto" ref={scrollContainerRef}>
        <h2 className="text-lg font-semibold text-[var(--text-1)] mb-4">
          Transaction History
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
            <p className="text-[var(--text-2)]">No transactions found</p>
            <p className="text-sm text-[var(--text-2)] mt-2">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateGroups.map(([date, dayTransactions], groupIndex) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[var(--text-2)]">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                    })}
                  </h3>
                  <span className="text-sm text-[var(--text-2)]">
                    {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Transactions for this date */}
                <div className="space-y-2">
                  {dayTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.05 + index * 0.02 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        onSelectTransaction(transaction);
                      }}
                      data-testid={`transaction-item-${transaction.id}`}
                      className={`
                        p-4 rounded-lg cursor-pointer transition-all
                        ${selectedTransaction?.id === transaction.id 
                          ? 'bg-[rgba(var(--glass-rgb),0.3)] ring-2 ring-[var(--primary-blue)]' 
                          : 'hover:bg-[rgba(var(--glass-rgb),0.1)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Category Icon */}
                        <div className={`
                          p-2.5 rounded-lg ${getCategoryColor(transaction.category)}
                          flex items-center justify-center
                        `}>
                          {getCategoryIcon(transaction.category)}
                        </div>

                        {/* Transaction Details */}
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

                            {/* Amount and Status */}
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

                          {/* Additional Info */}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-[var(--text-2)]">
                              {transaction.category}
                            </span>
                            
                            {transaction.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[var(--primary-amber)]" />
                                <span className="text-xs text-[var(--primary-amber)]">
                                  Pending
                                </span>
                              </div>
                            )}
                            
                            {(transaction.attachments ?? 0) > 0 && (
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TransactionList;
