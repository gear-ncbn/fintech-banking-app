'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  TrendingUp,
  Eye,
  EyeOff,
  MoreVertical,
  Banknote,
  AlertCircle,
  Settings,
  Trash2
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AccountDetailCard from '@/components/accounts/AccountDetailCard';
import AccountActivityChart from '@/components/accounts/AccountActivityChart';
import AddAccountModal from '@/components/modals/AddAccountModal';
import EditAccountModal from '@/components/modals/EditAccountModal';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import ActionDropdown from '@/components/ui/ActionDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { eventBus, EVENTS } from '@/services/eventBus';
import {
  accountsService,
  transactionsService,
  AccountSummary
} from '@/lib/api';

interface UIAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  accountNumber: string;
  balance: number;
  availableBalance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  interestRate?: number;
  creditLimit?: number;
  minimumPayment?: number;
  dueDate?: string;
  lastTransaction: {
    date: string;
    amount: number;
    description: string;
  };
  monthlyActivity: {
    deposits: number;
    withdrawals: number;
    fees: number;
  };
}

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<UIAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<UIAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<UIAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UIAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<UIAccount | null>(null);

  useEffect(() => {
    loadAccountsData();
  }, [user]);

  // Subscribe to account update events
  useEffect(() => {
    const unsubscribe = eventBus.on(EVENTS.ACCOUNT_UPDATE, () => {
      loadAccountsData();
    });

    return unsubscribe;
  }, []);

  const loadAccountsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load accounts and summary
      const [accountsData, summaryData] = await Promise.all([
        accountsService.getAccounts(true), // Include inactive accounts
        accountsService.getAccountSummary()
      ]);

      setAccountSummary(summaryData);

      // Transform API accounts to UI format with monthly activity
      const transformedAccounts = await Promise.all(
        accountsData.map(async (account) => {
          try {
            // Get last 30 days of transactions for monthly activity
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            const [transactions, stats] = await Promise.all([
              accountsService.getAccountTransactions(account.id, {
                limit: 10,
                start_date: startDate.toISOString(),
                end_date: new Date().toISOString()
              }),
              transactionsService.getTransactionStats({
                account_id: account.id,
                start_date: startDate.toISOString(),
                end_date: new Date().toISOString()
              })
            ]);

            // Find last transaction
            const lastTransaction = transactions.length > 0 ? transactions[0] : null;

            // Normalize backend account type (e.g. "credit_card") to UI type.
            const normalizedType = account.account_type.toLowerCase().includes('credit')
              ? 'credit'
              : account.account_type.toLowerCase() as UIAccount['type'];
            const isCredit = normalizedType === 'credit';

            // Calculate available balance based on account type
            let availableBalance = account.balance;
            if (isCredit && account.credit_limit) {
              availableBalance = account.credit_limit + account.balance; // balance is negative for credit
            }

            // Calculate minimum payment for credit accounts (mock calculation)
            let minimumPayment: number | undefined;
            let dueDate: string | undefined;
            if (isCredit || normalizedType === 'loan') {
              minimumPayment = Math.abs(account.balance) * 0.1; // 10% of balance
              const due = new Date();
              due.setDate(due.getDate() + 15); // Due in 15 days
              dueDate = due.toISOString();
            }

            return {
              id: account.id.toString(),
              name: account.name,
              type: normalizedType,
              accountNumber: account.account_number || `****${account.id.toString().padStart(4, '0').slice(-4)}`,
              balance: account.balance,
              availableBalance,
              currency: 'USD',
              status: account.is_active ? 'active' : 'closed' as UIAccount['status'],
              interestRate: account.interest_rate,
              creditLimit: account.credit_limit,
              minimumPayment,
              dueDate,
              lastTransaction: lastTransaction ? {
                date: lastTransaction.transaction_date,
                amount: lastTransaction.transaction_type === 'CREDIT' ? lastTransaction.amount : -lastTransaction.amount,
                description: lastTransaction.description
              } : {
                date: new Date().toISOString(),
                amount: 0,
                description: 'No recent transactions'
              },
              monthlyActivity: {
                deposits: stats.total_income,
                withdrawals: stats.total_expenses,
                fees: 0 // Backend doesn't track fees separately yet
              }
            };
          } catch {
            // Return account with minimal data if stats fail
            const normalizedType = account.account_type.toLowerCase().includes('credit')
              ? 'credit'
              : account.account_type.toLowerCase() as UIAccount['type'];
            const availableBalance = normalizedType === 'credit' && account.credit_limit
              ? account.credit_limit + account.balance
              : account.balance;
            return {
              id: account.id.toString(),
              name: account.name,
              type: normalizedType,
              accountNumber: account.account_number || `****${account.id.toString().padStart(4, '0').slice(-4)}`,
              balance: account.balance,
              availableBalance,
              currency: 'USD',
              status: account.is_active ? 'active' : 'closed' as UIAccount['status'],
              interestRate: account.interest_rate,
              creditLimit: account.credit_limit,
              lastTransaction: {
                date: new Date().toISOString(),
                amount: 0,
                description: 'Unable to load transactions'
              },
              monthlyActivity: {
                deposits: 0,
                withdrawals: 0,
                fees: 0
              }
            };
          }
        })
      );

      setAccounts(transformedAccounts);
      setFilteredAccounts(transformedAccounts);
      if (transformedAccounts.length > 0) {
        setSelectedAccount(transformedAccounts[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter accounts based on search and type
  useEffect(() => {
    let filtered = accounts;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(account => account.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.accountNumber.includes(searchQuery)
      );
    }

    setFilteredAccounts(filtered);
  }, [accounts, searchQuery, filterType]);

  const getTotalBalance = () => {
    return accountSummary?.total_assets || 0;
  };

  const getTotalDebt = () => {
    return accountSummary?.total_liabilities || 0;
  };

  const getNetWorth = () => {
    return accountSummary?.net_worth || 0;
  };

  const accountTypes = [
    { value: 'all', label: 'All Accounts' },
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'credit', label: 'Credit Cards' },
    { value: 'investment', label: 'Investments' },
    { value: 'loan', label: 'Loans' },
  ];

  const handleRefresh = () => {
    loadAccountsData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-2)]">Loading your accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="default" className="p-8 text-center border-[var(--primary-red)]">
          <AlertCircle className="w-12 h-12 text-[var(--primary-red)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-1)] mb-2">
            Unable to Load Accounts
          </h2>
          <p className="text-[var(--text-2)] mb-6">{error}</p>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-[var(--text-1)]">
              Your Accounts
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Manage and monitor all your financial accounts
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              analyticsId="refresh-accounts"
              analyticsLabel="Refresh Accounts"
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={showBalances ? <Eye size={18} /> : <EyeOff size={18} />}
              onClick={() => {
                const newShowBalances = !showBalances;
                setShowBalances(newShowBalances);
              }}
              analyticsId="toggle-balances"
              analyticsLabel="Toggle Balances"
            >
              {showBalances ? 'Hide' : 'Show'} Balances
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={18} />}
              onClick={() => {
                setShowAddAccountModal(true);
              }}
              analyticsId="add-account"
              analyticsLabel="Add Account"
            >
              Add Account
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card 
            variant="stats" 
            className="p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Assets</p>
                <p className="text-2xl font-bold text-[var(--text-1)] mt-1">
                  {showBalances 
                    ? `$${getTotalBalance().toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '••••••'
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                <TrendingUp className="w-6 h-6 text-[var(--primary-emerald)]" />
              </div>
            </div>
          </Card>

          <Card variant="stats" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Debt</p>
                <p className="text-2xl font-bold text-[var(--text-1)] mt-1">
                  {showBalances 
                    ? `$${getTotalDebt().toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '••••••'
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                <Banknote className="w-6 h-6 text-[var(--primary-red)]" />
              </div>
            </div>
          </Card>

          <Card variant="stats" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Net Worth</p>
                <p className="text-2xl font-bold gradient-text mt-1">
                  {showBalances 
                    ? `$${getNetWorth().toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : '••••••'
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)]">
                <TrendingUp className="w-6 h-6 text-[var(--primary-blue)]" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="w-full lg:w-auto lg:flex-1 lg:max-w-md">
            <Input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              icon={<Search size={18} />}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto py-2 w-full lg:w-auto">
            {accountTypes.map((type) => (
              <Button
                key={type.value}
                variant={filterType === type.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setFilterType(type.value);
                }}
                analyticsId={`filter-${type.value}`}
                analyticsLabel={`Filter ${type.label}`}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Accounts List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-1)] mb-4">
              Accounts ({filteredAccounts.length})
            </h2>
            
            {filteredAccounts.length === 0 ? (
              <Card variant="subtle" className="p-6 text-center">
                <p className="text-[var(--text-2)]">
                  {searchQuery || filterType !== 'all' 
                    ? 'No accounts match your filters' 
                    : 'No accounts found'}
                </p>
              </Card>
            ) : (
              filteredAccounts.map((account) => (
                <motion.div
                  key={account.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    variant={selectedAccount?.id === account.id ? 'prominent' : 'default'}
                    className={`p-4 cursor-pointer ${
                      selectedAccount?.id === account.id 
                        ? 'ring-2 ring-[var(--primary-blue)]' 
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedAccount(account);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--text-1)]">
                          {account.name}
                        </h3>
                        <p className="text-sm text-[var(--text-2)]">
                          {account.accountNumber}
                        </p>
                        <p className="text-lg font-semibold text-[var(--text-1)] mt-2">
                          {showBalances 
                            ? `${account.balance < 0 ? '-' : ''}$${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : '••••••'
                          }
                        </p>
                      </div>
                      <ActionDropdown
                        trigger={
                          <Button variant="ghost" size="sm" className="p-1">
                            <MoreVertical size={16} />
                          </Button>
                        }
                        items={[
                          {
                            label: 'Edit',
                            icon: <Settings size={14} />,
                            onClick: () => {
                              setEditingAccount(account);
                            }
                          },
                          {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => {
                              setDeletingAccount(account);
                            },
                            variant: 'danger' as const
                          }
                        ]}
                      />
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Account Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAccount ? (
              <>
                <AccountDetailCard 
                  account={selectedAccount} 
                  showBalances={showBalances}
                  onAccountUpdated={loadAccountsData}
                  onAccountDeleted={() => {
                    setSelectedAccount(null);
                    loadAccountsData();
                  }}
                />
                <AccountActivityChart 
                  account={selectedAccount}
                  showBalances={showBalances}
                />
              </>
            ) : (
              <Card variant="subtle" className="p-12 text-center">
                <p className="text-[var(--text-2)]">
                  Select an account to view details
                </p>
              </Card>
            )}
          </div>
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAccountCreated={() => {
          loadAccountsData();
        }}
      />

      {/* Edit Account Modal */}
      {editingAccount && (
        <EditAccountModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          account={{
            id: editingAccount.id,
            name: editingAccount.name,
            type: editingAccount.type,
            accountNumber: editingAccount.accountNumber,
            interestRate: editingAccount.interestRate,
            creditLimit: editingAccount.creditLimit
          }}
          onAccountUpdated={() => {
            setEditingAccount(null);
            loadAccountsData();
          }}
          onAccountDeleted={() => {
            setEditingAccount(null);
            if (selectedAccount?.id === editingAccount.id) {
              setSelectedAccount(null);
            }
            loadAccountsData();
          }}
        />
      )}

      {/* Delete Account Modal */}
      {deletingAccount && (
        <DeleteAccountModal
          isOpen={!!deletingAccount}
          onClose={() => setDeletingAccount(null)}
          account={{
            id: deletingAccount.id,
            name: deletingAccount.name,
            balance: deletingAccount.balance
          }}
          onAccountDeleted={() => {
            setDeletingAccount(null);
            if (selectedAccount?.id === deletingAccount.id) {
              setSelectedAccount(null);
            }
            loadAccountsData();
          }}
        />
      )}
    </div>
  );
}
