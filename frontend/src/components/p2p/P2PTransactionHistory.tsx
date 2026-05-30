import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Calendar,
  Search,
  DollarSign
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import { P2PTransaction } from '@/app/p2p/page';

interface P2PTransactionHistoryProps {
  transactions: P2PTransaction[];
  onSelectTransaction: (transaction: P2PTransaction) => void;
}

export const P2PTransactionHistory: React.FC<P2PTransactionHistoryProps> = ({
  transactions,
  onSelectTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
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

  const getStatusIcon = (status: P2PTransaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[var(--primary-emerald)]" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-[var(--primary-amber)]" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-[var(--primary-red)]" />;
    }
  };

  const getTypeIcon = (type: P2PTransaction['type']) => {
    return type === 'sent' ? (
      <ArrowUpRight className="w-4 h-4 text-[var(--primary-red)]" />
    ) : (
      <ArrowDownLeft className="w-4 h-4 text-[var(--primary-emerald)]" />
    );
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as { [date: string]: P2PTransaction[] });

  const dateGroups = Object.entries(groupedTransactions);

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-1)]">
            Transaction History
          </h3>
          <div className="flex items-center gap-2">
            <Dropdown
              items={[
                { value: 'all', label: 'All' },
                { value: 'sent', label: 'Sent' },
                { value: 'received', label: 'Received' },
              ]}
              value={filterType}
              onChange={(value) => setFilterType(value as 'all' | 'sent' | 'received')}
              trigger={
                <button className="p-2 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.1)] transition-colors">
                  <Filter className="w-4 h-4 text-[var(--text-2)]" />
                </button>
              }
            />
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {/* Search Bar */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-4">
          {(['all', 'completed', 'pending', 'failed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all
                ${filterStatus === status
                  ? 'bg-[var(--primary-blue)] text-white'
                  : 'bg-[rgba(var(--glass-rgb),0.1)] text-[var(--text-2)] hover:bg-[rgba(var(--glass-rgb),0.2)]'
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {dateGroups.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
            <p className="text-[var(--text-2)]">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateGroups.map(([date, dayTransactions], groupIndex) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[var(--text-2)]" />
                  <h4 className="text-sm font-medium text-[var(--text-2)]">
                    {formatDate(dayTransactions[0].date)}
                  </h4>
                </div>

                {/* Transactions for this date */}
                <div className="space-y-2">
                  {dayTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.05 + index * 0.02 }}
                      onClick={() => onSelectTransaction(transaction)}
                      className="p-4 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.05)] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {/* Type Icon */}
                        <div className={`
                          p-2 rounded-lg 
                          ${transaction.type === 'sent' 
                            ? 'bg-[rgba(var(--primary-red),0.1)]' 
                            : 'bg-[rgba(var(--primary-emerald),0.1)]'
                          }
                        `}>
                          {getTypeIcon(transaction.type)}
                        </div>

                        {/* Transaction Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-[var(--text-1)]">
                                {transaction.contact.name}
                              </p>
                              <p className="text-sm text-[var(--text-2)] truncate">
                                {transaction.description}
                              </p>
                            </div>

                            {/* Amount */}
                            <div className="text-right">
                              <p className={`font-semibold ${
                                transaction.type === 'sent'
                                  ? 'text-[var(--text-1)]'
                                  : 'text-[var(--primary-emerald)]'
                              }`}>
                                {transaction.type === 'sent' ? '-' : '+'}{formatCurrency(transaction.amount)}
                              </p>
                              {transaction.fee && (
                                <p className="text-xs text-[var(--text-2)]">
                                  Fee: {formatCurrency(transaction.fee)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status and Method */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(transaction.status)}
                              <span className="text-xs text-[var(--text-2)] capitalize">
                                {transaction.status}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--text-2)]">•</span>
                            <span className="text-xs text-[var(--text-2)] capitalize">
                              {transaction.method}
                            </span>
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
      </CardBody>
    </Card>
  );
};

export default P2PTransactionHistory;