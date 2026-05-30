import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt,
  
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Tag,
  FileText,
  TrendingUp,
  Plus,
  Search
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import { BusinessExpense, ExpenseCategory } from '@/app/business/page';

interface ExpenseAnalyticsProps {
  expenses: BusinessExpense[];
  categories: ExpenseCategory[];
  onAddExpense: () => void;
}

export const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({
  expenses,
  categories,
  onAddExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: BusinessExpense['status']) => {
    const statusConfig = {
      pending: { color: 'text-[var(--primary-amber)]', bg: 'bg-[var(--primary-amber)]/10', icon: Clock },
      approved: { color: 'text-[var(--primary-emerald)]', bg: 'bg-[var(--primary-emerald)]/10', icon: CheckCircle },
      rejected: { color: 'text-[var(--primary-red)]', bg: 'bg-[var(--primary-red)]/10', icon: XCircle },
      reimbursed: { color: 'text-[var(--primary-blue)]', bg: 'bg-[var(--primary-blue)]/10', icon: DollarSign },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.icon || <Tag className="w-4 h-4" />;
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.paidBy.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      return b.amount - a.amount;
    }
  });

  // Calculate statistics
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = expenses
    .filter(e => e.status === 'approved' || e.status === 'reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);

  const statuses = ['all', 'pending', 'approved', 'rejected', 'reimbursed'];
  const categoryNames = ['all', ...categories.map(c => c.name)];

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="subtle" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[var(--primary-blue)]/10">
              <Receipt className="w-5 h-5 text-[var(--primary-blue)]" />
            </div>
            <h3 className="font-medium text-[var(--text-1)]">Total Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--text-1)]">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-[var(--text-2)] mt-1">{expenses.length} transactions</p>
        </Card>

        <Card variant="subtle" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[var(--primary-emerald)]/10">
              <CheckCircle className="w-5 h-5 text-[var(--primary-emerald)]" />
            </div>
            <h3 className="font-medium text-[var(--text-1)]">Approved</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--primary-emerald)]">{formatCurrency(approvedExpenses)}</p>
          <p className="text-xs text-[var(--text-2)] mt-1">
            {expenses.filter(e => e.status === 'approved' || e.status === 'reimbursed').length} transactions
          </p>
        </Card>

        <Card variant="subtle" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[var(--primary-amber)]/10">
              <Clock className="w-5 h-5 text-[var(--primary-amber)]" />
            </div>
            <h3 className="font-medium text-[var(--text-1)]">Pending</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--primary-amber)]">{formatCurrency(pendingExpenses)}</p>
          <p className="text-xs text-[var(--text-2)] mt-1">
            {expenses.filter(e => e.status === 'pending').length} transactions
          </p>
        </Card>

        <Card variant="subtle" className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[var(--primary-indigo)]/10">
              <TrendingUp className="w-5 h-5 text-[var(--primary-indigo)]" />
            </div>
            <h3 className="font-medium text-[var(--text-1)]">Average</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {formatCurrency(totalExpenses / (expenses.length || 1))}
          </p>
          <p className="text-xs text-[var(--text-2)] mt-1">per transaction</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">
              Expense History
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload size={16} />}
              >
                Import
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={16} />}
              >
                Export
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={onAddExpense}
              >
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
            
            <div className="flex gap-2">
              <Dropdown
                items={statuses.map(status => ({ 
                  value: status, 
                  label: status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1) 
                }))}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Status"
              />
              
              <Dropdown
                items={categoryNames.map(cat => ({ 
                  value: cat, 
                  label: cat === 'all' ? 'All Categories' : cat 
                }))}
                value={filterCategory}
                onChange={setFilterCategory}
                placeholder="Category"
              />
              
              <Dropdown
                items={[
                  { value: 'date', label: 'Sort by Date' },
                  { value: 'amount', label: 'Sort by Amount' },
                ]}
                value={sortBy}
                onChange={(value) => setSortBy(value as 'date' | 'amount')}
                placeholder="Sort by"
              />
            </div>
          </div>

          {/* Expenses List */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
              <p className="text-[var(--text-2)]">No expenses found</p>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={onAddExpense}
                className="mt-4"
              >
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.02)] transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Category Icon */}
                    <div className={`p-2.5 rounded-lg bg-gradient-to-r ${getCategoryColor(expense.category)} flex items-center justify-center`}>
                      {getCategoryIcon(expense.category)}
                    </div>

                    {/* Expense Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-[var(--text-1)]">{expense.description}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-[var(--text-2)]">
                              Paid by {expense.paidBy.name}
                            </p>
                            <span className="text-[var(--text-2)]">•</span>
                            <p className="text-sm text-[var(--text-2)]">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[var(--text-1)]">
                            {formatCurrency(expense.amount)}
                          </p>
                          <div className="mt-1">
                            {getStatusBadge(expense.status)}
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-[var(--text-2)]">
                          <Tag className="w-3 h-3" />
                          <span>{expense.category}</span>
                        </div>
                        
                        {expense.receipt && (
                          <div className="flex items-center gap-1 text-[var(--text-2)]">
                            <FileText className="w-3 h-3" />
                            <span>Receipt attached</span>
                          </div>
                        )}
                        
                        {expense.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {expense.tags.map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(var(--glass-rgb),0.1)] text-[var(--text-2)]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {expense.notes && (
                        <p className="text-sm text-[var(--text-2)] mt-2 italic">
                          &quot;{expense.notes}&quot;
                        </p>
                      )}

                      {/* Approval Info */}
                      {expense.approvedBy && (
                        <p className="text-xs text-[var(--text-2)] mt-2">
                          Approved by {expense.approvedBy.name}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ExpenseAnalytics;