'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { _useScrollTracking } from '@/hooks/useScrollTracking';
import { 
  Search,
  Filter,
  Download,
  DollarSign,
  Tag,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import TransactionDetail from '@/components/transactions/TransactionDetail';
import AddTransactionModal from '@/components/modals/AddTransactionModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  transactionsService,
  accountsService,
  categoriesService,
  _Transaction,
  TransactionStats,
  Category,
  Account
} from '@/lib/api';

export interface UITransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  subcategory?: string;
  account: string;
  accountType: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  location?: string;
  notes?: string;
  tags?: string[];
  attachments?: number;
  attachmentData?: Array<{
    id: number;
    file_name: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
  }>;
}

interface FilterState {
  dateRange: { start: string; end: string };
  categories: string[];
  accounts: string[];
  minAmount: string;
  maxAmount: string;
  status: string[];
  type: string[];
}

export default function TransactionsPage() {
  const { _user } = useAuth();
  const [transactions, setTransactions] = useState<UITransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<UITransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<UITransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [_accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Get local date string for user interface
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filters, setFilters] = useState<FilterState>({
    dateRange: { 
      start: getLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      end: getLocalDateString(new Date()) // This should be today's date
    },
    categories: [],
    accounts: [],
    minAmount: '',
    maxAmount: '',
    status: [],
    type: [],
  });

  // Keep a ref to the current filters to avoid stale closures
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const loadTransactionsData = useCallback(async (currentFilters?: FilterState) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use provided filters or fall back to current filters from ref
      const filtersToUse = currentFilters || filtersRef.current;

      // Load accounts and categories for filters
      const [accountsData, categoriesData] = await Promise.all([
        accountsService.getAccounts(),
        categoriesService.getCategories()
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);

      // Load transactions and stats
      const [transactionsData, statsData] = await Promise.all([
        transactionsService.getTransactions({
          start_date: filtersToUse.dateRange.start,
          end_date: filtersToUse.dateRange.end,
          limit: 100 // Load more transactions
        }),
        transactionsService.getTransactionStats({
          start_date: filtersToUse.dateRange.start,
          end_date: filtersToUse.dateRange.end
        })
      ]);

      setStats(statsData);

      // Transform API transactions to UI format
      const transformedTransactions: UITransaction[] = transactionsData.map(transaction => {
        const account = accountsData.find(a => a.id === transaction.account_id);
        const category = categoriesData.find(c => c.id === transaction.category_id);
        
        // Extract merchant from description if not provided
        const merchant = transaction.merchant || transaction.description.split(' - ')[0] || 'Unknown Merchant';
        
        // Mock location based on merchant (in real app this would come from API)
        const locationMap: Record<string, string> = {
          'Whole Foods': 'San Francisco, CA',
          'Uber': 'San Francisco, CA',
          'The French Laundry': 'Yountville, CA',
          'Amazon': 'Online',
          'Netflix': 'Online',
        };
        
        // Mock payment method based on account type
        const paymentMethod = account?.account_type === 'CREDIT' 
          ? 'Credit Card' 
          : account?.account_type === 'CHECKING' 
          ? 'Debit Card' 
          : undefined;
        
        // Mock tags based on merchant and category
        const tags: string[] = [];
        if (merchant.toLowerCase().includes('subscription') || 
            category?.name === 'Subscriptions') tags.push('monthly');
        if (category?.name === 'Income') tags.push('income');
        if (category?.name === 'Dining' && transaction.amount > 100) tags.push('special-occasion');
        
        return {
          id: transaction.id.toString(),
          date: transaction.transaction_date,
          description: transaction.description,
          merchant,
          amount: transaction.transaction_type === 'CREDIT' ? transaction.amount : -transaction.amount,
          type: transaction.transaction_type.toLowerCase() as 'credit' | 'debit',
          category: category?.name || 'Uncategorized',
          subcategory: category?.type === 'EXPENSE' ? category?.name : undefined,
          account: `${account?.name || 'Unknown'} ****${account?.account_number?.slice(-4) || account?.id.toString().padStart(4, '0').slice(-4)}`,
          accountType: account?.account_type.toLowerCase() || 'unknown',
          status: transaction.status.toLowerCase() as UITransaction['status'],
          paymentMethod,
          location: locationMap[merchant],
          notes: transaction.notes,
          tags: transaction.tags && transaction.tags.length > 0 ? transaction.tags : tags.length > 0 ? tags : undefined,
          attachments: transaction.attachments ? transaction.attachments.length : 0,
        };
      });

      setTransactions(transformedTransactions);
      setFilteredTransactions(transformedTransactions);

      
      // Return the transformed transactions for immediate use
      return transformedTransactions;
    } catch {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTransactionsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    // Skip initial render
    if (!transactions.length && isLoading) return;
    
    
    loadTransactionsData(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange.start, filters.dateRange.end]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Date range filter (already applied in API call, but keeping for consistency)
    if (filters.dateRange.start && filters.dateRange.end) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(t => filters.categories.includes(t.category));
    }

    // Account filter
    if (filters.accounts.length > 0) {
      filtered = filtered.filter(t => filters.accounts.includes(t.account));
    }

    // Amount range filter
    if (filters.minAmount || filters.maxAmount) {
      filtered = filtered.filter(t => {
        const amount = Math.abs(t.amount);
        const min = filters.minAmount ? parseFloat(filters.minAmount) : 0;
        const max = filters.maxAmount ? parseFloat(filters.maxAmount) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(t => filters.status.includes(t.status));
    }

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(t => filters.type.includes(t.type));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const amountA = Math.abs(a.amount);
        const amountB = Math.abs(b.amount);
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      }
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, filters, sortBy, sortOrder]);
  const handleExport = async () => {
    
    // Create CSV content
    const headers = ['Date', 'Description', 'Merchant', 'Category', 'Account', 'Amount', 'Status'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description,
      t.merchant,
      t.category,
      t.account,
      t.amount.toFixed(2),
      t.status
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    loadTransactionsData();
  };

  const sortOptions = [
    { value: 'date-desc', label: 'Date (Newest First)' },
    { value: 'date-asc', label: 'Date (Oldest First)' },
    { value: 'amount-desc', label: 'Amount (High to Low)' },
    { value: 'amount-asc', label: 'Amount (Low to High)' },
  ];

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split('-') as ['date' | 'amount', 'asc' | 'desc'];
    setSortBy(sort);
    setSortOrder(order);
  };

  // Calculate summary statistics
  const totalIncome = stats?.total_income || 0;
  const totalExpenses = stats?.total_expenses || 0;
  const netCashFlow = stats?.net_flow || 0;

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-2)]">Loading your transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="error" className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[var(--primary-red)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-1)] mb-2">
            Unable to Load Transactions
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
              Transactions
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Track and manage all your financial activities
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={18} />}
              onClick={handleRefresh}
              data-testid="refresh-transactions"
              onMouseEnter={() => {
              }}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={18} />}
              onClick={() => {
                setShowAddModal(true);
              }}
              data-testid="add-transaction"
              onMouseEnter={() => {
              }}
            >
              Add Transaction
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={18} />}
              onClick={handleExport}
              data-testid="export-transactions"
              onMouseEnter={() => {
              }}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card 
            variant="default" 
            className="p-4 cursor-pointer transition-all hover:border-[var(--border-2)]"
            data-testid="transaction-summary-total"
            onMouseEnter={() => {
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-2)]">Total Transactions</p>
                <p className="text-xl lg:text-2xl font-bold text-[var(--text-1)]">
                  {filteredTransactions.length}
                </p>
              </div>
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-[var(--primary-blue)] opacity-20 flex-shrink-0" />
            </div>
          </Card>

          <Card 
            variant="default" 
            className="p-4 cursor-pointer transition-all hover:border-[var(--border-2)]"
            data-testid="transaction-summary-income"
            onMouseEnter={() => {
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-2)]">Income</p>
                <p className="text-xl lg:text-2xl font-bold text-[var(--primary-emerald)] truncate">
                  +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-[var(--primary-emerald)] opacity-20 flex-shrink-0" />
            </div>
          </Card>

          <Card 
            variant="default" 
            className="p-4 cursor-pointer transition-all hover:border-[var(--border-2)]"
            data-testid="transaction-summary-expenses"
            onMouseEnter={() => {
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-2)]">Expenses</p>
                <p className="text-xl lg:text-2xl font-bold text-[var(--primary-red)] truncate">
                  -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="w-6 h-6 lg:w-8 lg:h-8 text-[var(--primary-red)] opacity-20 flex-shrink-0" />
            </div>
          </Card>

          <Card 
            variant="default" 
            className="p-4 cursor-pointer transition-all hover:border-[var(--border-2)]"
            data-testid="transaction-summary-net-flow"
            onMouseEnter={() => {
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-2)]">Net Cash Flow</p>
                <p className={`text-xl lg:text-2xl font-bold truncate ${netCashFlow >= 0 ? 'text-[var(--primary-emerald)]' : 'text-[var(--primary-red)]'}`}>
                  {netCashFlow >= 0 ? '+' : ''} ${Math.abs(netCashFlow).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-[var(--primary-blue)] opacity-20 flex-shrink-0" />
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
              }}
              icon={<Search size={18} />}
            />
          </div>
          
          <div className="flex gap-2">
            <Dropdown
              items={sortOptions}
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              placeholder="Sort by"
            />
            
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              icon={<Filter size={18} />}
              onClick={() => {
                const newShowFilters = !showFilters;
                setShowFilters(newShowFilters);
              }}
            >
              Filters {filters.categories.length + filters.accounts.length + filters.status.length + filters.type.length > 0 && 
                `(${filters.categories.length + filters.accounts.length + filters.status.length + filters.type.length})`
              }
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <TransactionFilters
                filters={filters}
                onFiltersChange={setFilters}
                transactions={transactions}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions List and Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TransactionList
              transactions={filteredTransactions}
              selectedTransaction={selectedTransaction}
              onSelectTransaction={setSelectedTransaction}
            />
          </div>
          
          <div className="lg:col-span-1">
            {selectedTransaction ? (
              <TransactionDetail
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onEdit={async (transaction) => {
                  // Note: The edit functionality is already handled within TransactionDetail component
                  // We just need to reload the data to reflect changes
                  const freshTransactions = await loadTransactionsData();
                  
                  // Update the selected transaction with fresh data
                  // Find the updated transaction in the newly loaded data
                  const updatedTransaction = freshTransactions.find(t => t.id === transaction.id);
                  if (updatedTransaction) {
                    setSelectedTransaction(updatedTransaction);
                  }
                }}
                allTransactions={filteredTransactions}
                categories={categories}
              />
            ) : (
              <Card variant="subtle" className="p-6 text-center">
                <Tag className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
                <p className="text-[var(--text-2)]">
                  Select a transaction to view details
                </p>
              </Card>
            )}
          </div>
        </div>
      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          
          await loadTransactionsData();
          
        }}
      />
    </div>
  );
}
