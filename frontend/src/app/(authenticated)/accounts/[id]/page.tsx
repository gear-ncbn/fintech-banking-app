'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Search,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { 
  accountsService, 
  transactionsService,
  Account, 
  Transaction
} from '@/lib/api';

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: _user } = useAuth();
  const { showError, showSuccess } = useAlert();
  
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, _setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  const loadAccountData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load account details and transactions in parallel
      const [accountData, transactionsData] = await Promise.all([
        accountsService.getAccount(Number(id)),
        transactionsService.getTransactions({
          account_id: Number(id),
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0],
          limit: 100
        })
      ]);

      setAccount(accountData);
      setTransactions(transactionsData);

    } catch {
      showError('Failed to load account details', 'Please try again later or contact support.');
    } finally {
      setIsLoading(false);
    }
  }, [id, dateRange, showError]);

  useEffect(() => {
    if (id) {
      loadAccountData();
    }
  }, [id, loadAccountData]);

  const handleExportStatement = async () => {
    try {
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Use the full URL with the base URL from the environment
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/analytics/export/transactions/csv?start_date=${startDate}&end_date=${endDate}&account_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${account?.name.replace(/\s+/g, '_')}_statement_${startDate}_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showSuccess('Statement exported successfully!', 'Your statement has been downloaded.');
      } else {
        showError('Failed to export statement', 'Please try again later.');
      }
    } catch (error) {
      showError('Failed to export statement', error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (t.merchant?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || 
                       (filterType === 'credit' && t.transaction_type === 'CREDIT') ||
                       (filterType === 'debit' && t.transaction_type === 'DEBIT');
    return matchesSearch && matchesType;
  });

  const formatBalance = (balance: number) => {
    const isNegative = balance < 0;
    const absBalance = Math.abs(balance);
    return `${isNegative ? '-' : ''}$${absBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getAccountIcon = () => {
    switch (account?.account_type) {
      case 'CHECKING':
        return <CreditCard className="w-5 h-5" />;
      case 'SAVINGS':
        return <DollarSign className="w-5 h-5" />;
      case 'CREDIT':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-2)]">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="default" className="p-8 text-center border-[var(--primary-red)]">
          <h2 className="text-xl font-semibold text-[var(--text-1)] mb-2">
            Account not found
          </h2>
          <p className="text-[var(--text-2)] mb-6">
            The account you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push('/dashboard')} variant="primary">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={16} />}
              onClick={() => router.back()}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className={`
                p-3 rounded-xl
                bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-indigo)]
                text-white shadow-lg
              `}>
                {getAccountIcon()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-1)]">
                  {account.name}
                </h1>
                <p className="text-sm text-[var(--text-2)]">
                  {account.account_type} • {account.account_number}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={16} />}
            onClick={handleExportStatement}
          >
            Export Statement
          </Button>
        </div>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="stats" className="p-6">
            <p className="text-sm text-[var(--text-2)] mb-2">Current Balance</p>
            <p className="text-2xl font-bold text-[var(--text-1)]">
              {formatBalance(account.balance)}
            </p>
          </Card>
          
          <Card variant="stats" className="p-6">
            <p className="text-sm text-[var(--text-2)] mb-2">This Month</p>
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-[var(--primary-emerald)]" />
                  <span className="text-sm font-medium text-[var(--primary-emerald)]">
                    ${transactions
                      .filter(t => {
                        const txDate = new Date(t.transaction_date);
                        const now = new Date();
                        return t.transaction_type === 'CREDIT' && 
                               txDate.getMonth() === now.getMonth() && 
                               txDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      .toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-2)]">Income</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <ArrowDownLeft className="w-4 h-4 text-[var(--primary-red)]" />
                  <span className="text-sm font-medium text-[var(--primary-red)]">
                    ${transactions
                      .filter(t => {
                        const txDate = new Date(t.transaction_date);
                        const now = new Date();
                        return t.transaction_type === 'DEBIT' && 
                               txDate.getMonth() === now.getMonth() && 
                               txDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      .toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-2)]">Expenses</p>
              </div>
            </div>
          </Card>
          
          {account.account_type === 'CREDIT' && (
            <Card variant="stats" className="p-6">
              <p className="text-sm text-[var(--text-2)] mb-2">Credit Utilization</p>
              <div>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {((Math.abs(account.balance) / (account.credit_limit || 1)) * 100).toFixed(1)}%
                </p>
                <div className="w-full h-2 bg-[rgba(var(--glass-rgb),0.3)] rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-navy)]"
                    style={{ width: `${(Math.abs(account.balance) / (account.credit_limit || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Transactions Section */}
        <Card variant="default">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-1)]">
                Transaction History
              </h2>
              
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} />}
                  className="w-full md:w-64"
                />
                
                <Dropdown
                  value={filterType}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(value) => setFilterType(value as any)}
                  items={[
                    { value: 'all', label: 'All Transactions' },
                    { value: 'credit', label: 'Income Only' },
                    { value: 'debit', label: 'Expenses Only' }
                  ]}
                />
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-[var(--text-2)] py-8">
                  No transactions found
                </p>
              ) : (
                filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] hover:bg-[rgba(var(--glass-rgb),0.1)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        p-2 rounded-lg
                        ${transaction.transaction_type === 'CREDIT'
                          ? 'bg-[rgba(var(--primary-emerald),0.1)]' 
                          : 'bg-[rgba(var(--primary-red),0.1)]'
                        }
                      `}>
                        {transaction.transaction_type === 'CREDIT' ? (
                          <ArrowUpRight className="w-4 h-4 text-[var(--primary-emerald)]" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-[var(--primary-red)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-1)]">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-[var(--text-2)]">
                          {new Date(transaction.transaction_date).toLocaleDateString()} • {transaction.transaction_type === 'CREDIT' ? 'Income' : 'Expense'}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${
                      transaction.transaction_type === 'CREDIT'
                        ? 'text-[var(--primary-emerald)]'
                        : 'text-[var(--primary-red)]'
                    }`}>
                      {transaction.transaction_type === 'CREDIT' ? '+' : '-'}
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
