import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import { BusinessAccount, BusinessExpense, ExpenseCategory, TeamMember } from '@/app/business/page';

interface BusinessOverviewProps {
  accounts: BusinessAccount[];
  expenses: BusinessExpense[];
  categories: ExpenseCategory[];
  teamMembers: TeamMember[];
}

export const BusinessOverview: React.FC<BusinessOverviewProps> = ({
  accounts,
  expenses,
  categories,
  teamMembers,
}) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalApprovedExpenses = expenses
    .filter(e => e.status === 'approved' || e.status === 'reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = accounts.reduce((sum, account) => {
    return sum + Math.max(account.balance, 0);
  }, 0);

  const cashFlowValue = totalIncome - totalApprovedExpenses;

  const getCategorySpending = () => {
    return categories.map(category => ({
      ...category,
      percentage: (category.spent / category.budget) * 100,
    }));
  };

  const getRecentTransactions = () => {
    // Mock recent transactions
    return [
      { id: '1', description: 'Wire Transfer Received', amount: 25000, type: 'credit', date: '2025-06-15' },
      { id: '2', description: 'Payroll Processing', amount: -45678.90, type: 'debit', date: '2025-06-15' },
      { id: '3', description: 'Client Payment', amount: 12345.67, type: 'credit', date: '2025-06-14' },
      { id: '4', description: 'Vendor Payment', amount: -3456.78, type: 'debit', date: '2025-06-14' },
    ];
  };

  const cashFlow = cashFlowValue;
  const categorySpending = getCategorySpending();
  const recentTransactions = getRecentTransactions();

  return (
    <div className="space-y-6">
      {/* Accounts Overview */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-1)] mb-4">
          Business Accounts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="default" className="h-full">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2.5 rounded-lg flex items-center justify-center
                        ${account.type === 'checking' 
                          ? 'bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]' 
                          : account.type === 'savings'
                          ? 'bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-teal)]'
                          : 'bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-navy)]'
                        }
                      `}>
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-1)]">{account.name}</h3>
                        <p className="text-xs text-[var(--text-2)]">{account.accountNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-[var(--text-2)]">
                        {account.type === 'credit' ? 'Current Balance' : 'Available Balance'}
                      </p>
                      <p className={`text-2xl font-bold ${
                        account.type === 'credit' ? 'text-[var(--primary-red)]' : 'text-[var(--text-1)]'
                      }`}>
                        {account.type === 'credit' && '-'}{formatCurrency(account.balance)}
                      </p>
                    </div>

                    {account.type === 'credit' && (
                      <div className="pt-3 border-t border-[var(--border-1)]">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-2)]">Credit Limit</span>
                          <span className="text-[var(--text-1)]">{formatCurrency(account.creditLimit || 50000)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-[var(--text-2)]">Available</span>
                          <span className="text-[var(--primary-emerald)]">
                            {formatCurrency((account.creditLimit || 50000) - account.balance)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--border-1)] flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      account.status === 'active' ? 'text-[var(--primary-emerald)]' : 'text-[var(--text-2)]'
                    }`}>
                      {account.status.toUpperCase()}
                    </span>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cash Flow and Category Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow */}
        <Card variant="default">
          <CardHeader>
            <h3 className="text-lg font-semibold text-[var(--text-1)]">
              Cash Flow Analysis
            </h3>
          </CardHeader>
          <CardBody>
            <div className="text-center mb-6">
              <p className="text-sm text-[var(--text-2)] mb-2">Net Cash Flow (This Month)</p>
              <p className={`text-3xl font-bold ${
                cashFlow >= 0 ? 'text-[var(--primary-emerald)]' : 'text-[var(--primary-red)]'
              }`}>
                {cashFlow >= 0 ? '+' : ''}{formatCurrency(Math.abs(cashFlow))}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-[var(--primary-emerald)]" />
                  <span className="text-sm text-[var(--text-2)]">Total Income</span>
                </div>
                <span className="text-sm font-medium text-[var(--primary-emerald)]">
                  +{formatCurrency(totalIncome)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-[var(--primary-red)]" />
                  <span className="text-sm text-[var(--text-2)]">Total Expenses</span>
                </div>
                <span className="text-sm font-medium text-[var(--primary-red)]">
                  -{formatCurrency(totalApprovedExpenses)}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-1)]">
              <h4 className="text-sm font-medium text-[var(--text-1)] mb-3">Recent Transactions</h4>
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {transaction.type === 'credit' ? (
                        <ArrowDownLeft className="w-4 h-4 text-[var(--primary-emerald)]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-[var(--primary-red)]" />
                      )}
                      <span className="text-[var(--text-2)]">{transaction.description}</span>
                    </div>
                    <span className={`font-medium ${
                      transaction.type === 'credit' ? 'text-[var(--primary-emerald)]' : 'text-[var(--text-1)]'
                    }`}>
                      {transaction.type === 'credit' ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Category Spending */}
        <Card variant="default">
          <CardHeader>
            <h3 className="text-lg font-semibold text-[var(--text-1)]">
              Category Spending
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {categorySpending.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded bg-gradient-to-r ${category.color}`}>
                        {category.icon}
                      </div>
                      <span className="text-sm font-medium text-[var(--text-1)]">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-1)]">
                        {formatCurrency(category.spent)}
                      </p>
                      <p className="text-xs text-[var(--text-2)]">
                        of {formatCurrency(category.budget)}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${category.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, category.percentage)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    {category.percentage > 90 && (
                      <p className="text-xs text-[var(--primary-amber)] mt-1">
                        {category.percentage.toFixed(0)}% of budget used
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-1)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--text-1)]">Total Budget</span>
                <span className="text-sm font-medium text-[var(--text-1)]">
                  {formatCurrency(categories.reduce((sum, c) => sum + c.budget, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-1)]">Total Spent</span>
                <span className="text-sm font-medium text-[var(--text-1)]">
                  {formatCurrency(categories.reduce((sum, c) => sum + c.spent, 0))}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Team Spending Overview */}
      <Card variant="subtle">
        <CardHeader>
          <h3 className="text-lg font-semibold text-[var(--text-1)]">
            Team Spending Overview
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamMembers.filter(m => m.cardStatus === 'active').map((member, index) => {
              const spendingPercentage = (member.currentSpending / member.monthlyLimit) * 100;
              
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-1)]">{member.name}</p>
                      <p className="text-xs text-[var(--text-2)]">{member.department}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-2)]">Spent</span>
                      <span className="font-medium text-[var(--text-1)]">
                        {formatCurrency(member.currentSpending)}
                      </span>
                    </div>
                    <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${
                          spendingPercentage > 80 
                            ? 'bg-gradient-to-r from-[var(--primary-amber)] to-[var(--primary-amber)]/80'
                            : 'bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, spendingPercentage)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-2)]">
                      {spendingPercentage.toFixed(0)}% of {formatCurrency(member.monthlyLimit)} limit
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default BusinessOverview;