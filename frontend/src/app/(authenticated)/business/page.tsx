'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase,
  Users,
  TrendingUp,
  FileText,
  BarChart3,
  DollarSign,
  Building2,
  Receipt,
  PieChart,
  Download,
  Plus,
  Settings,
  Shield,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import BusinessOverview from '@/components/business/BusinessOverview';
import TeamManagement from '@/components/business/TeamManagement';
import ExpenseAnalytics from '@/components/business/ExpenseAnalytics';
import ExpenseForm from '@/components/business/ExpenseForm';
import { businessApi, CreateBusinessExpenseRequest } from '@/lib/api/business';
import { accountsService, transactionsService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit';
  accountNumber: string;
  balance: number;
  currency: string;
  status: 'active' | 'frozen';
  creditLimit?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'employee';
  department: string;
  cardStatus: 'active' | 'pending' | 'none';
  monthlyLimit: number;
  currentSpending: number;
  joinedDate: string;
}

export interface BusinessExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paidBy: TeamMember;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  receipt?: string;
  notes?: string;
  approvedBy?: TeamMember;
  tags: string[];
}

export interface ExpenseCategory {
  name: string;
  budget: number;
  spent: number;
  icon: React.ReactNode;
  color: string;
}

export interface BusinessTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
}

export default function BusinessPage() {
  const router = useRouter();
  const { user: _user } = useAuth();
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<BusinessTransaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'team' | 'expenses' | 'reports'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Category icons and colors for expense categorization
  const categoryIcons = useMemo<{ [key: string]: React.ReactNode }>(() => ({
    'Office Supplies': <Briefcase className="w-5 h-5" />,
    'Travel': <Building2 className="w-5 h-5" />,
    'Marketing': <TrendingUp className="w-5 h-5" />,
    'Technology': <Shield className="w-5 h-5" />,
    'Food & Dining': <Receipt className="w-5 h-5" />,
    'Transport': <Building2 className="w-5 h-5" />,
    'Utilities': <Zap className="w-5 h-5" />,
    'Other': <DollarSign className="w-5 h-5" />
  }), []);

  const categoryColors = useMemo<{ [key: string]: string }>(() => ({
    'Office Supplies': 'from-[var(--cat-blue)] to-[var(--cat-blue)]/80',
    'Travel': 'from-[var(--cat-indigo)] to-[var(--cat-indigo)]/80',
    'Marketing': 'from-[var(--cat-violet)] to-[var(--cat-violet)]/80',
    'Technology': 'from-[var(--cat-emerald)] to-[var(--cat-emerald)]/80',
    'Food & Dining': 'from-[var(--cat-pink)] to-[var(--cat-pink)]/80',
    'Transport': 'from-[var(--cat-amber)] to-[var(--cat-amber)]/80',
    'Utilities': 'from-[var(--cat-teal)] to-[var(--cat-teal)]/80',
    'Other': 'from-[var(--primary-blue)] to-[var(--primary-indigo)]/80'
  }), []);

  const loadMockData = useCallback(() => {

    // Mock accounts for fallback
    const mockAccounts: BusinessAccount[] = [
      {
        id: '1',
        name: 'Business Checking',
        type: 'checking',
        accountNumber: '****8901',
        balance: 125670.45,
        currency: 'USD',
        status: 'active',
      },
      {
        id: '2',
        name: 'Business Savings',
        type: 'savings',
        accountNumber: '****8902',
        balance: 250000.00,
        currency: 'USD',
        status: 'active',
      },
      {
        id: '3',
        name: 'Business Credit',
        type: 'credit',
        accountNumber: '****8903',
        balance: 15234.78,
        currency: 'USD',
        status: 'active',
      },
    ];

    const mockTeamMembers: TeamMember[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@company.com',
        role: 'owner',
        department: 'Executive',
        cardStatus: 'active',
        monthlyLimit: 10000,
        currentSpending: 3456.78,
        joinedDate: '2023-01-15',
      },
      {
        id: '2',
        name: 'Sarah Smith',
        email: 'sarah@company.com',
        role: 'admin',
        department: 'Finance',
        cardStatus: 'active',
        monthlyLimit: 5000,
        currentSpending: 1234.56,
        joinedDate: '2023-03-20',
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@company.com',
        role: 'manager',
        department: 'Operations',
        cardStatus: 'active',
        monthlyLimit: 3000,
        currentSpending: 2100.00,
        joinedDate: '2023-06-01',
      },
      {
        id: '4',
        name: 'Emily Chen',
        email: 'emily@company.com',
        role: 'employee',
        department: 'Marketing',
        cardStatus: 'pending',
        monthlyLimit: 1000,
        currentSpending: 0,
        joinedDate: '2024-01-10',
      },
    ];

    const mockExpenses: BusinessExpense[] = [
      {
        id: '1',
        description: 'Office Supplies - Q2',
        amount: 456.78,
        category: 'Office Supplies',
        date: '2025-06-15',
        paidBy: mockTeamMembers[1],
        status: 'approved',
        approvedBy: mockTeamMembers[0],
        tags: ['recurring', 'office'],
      },
      {
        id: '2',
        description: 'Client Meeting - NYC',
        amount: 1234.56,
        category: 'Travel',
        date: '2025-06-14',
        paidBy: mockTeamMembers[2],
        status: 'pending',
        receipt: 'receipt_001.pdf',
        notes: 'Q2 client acquisition meeting',
        tags: ['client', 'travel'],
      },
      {
        id: '3',
        description: 'Digital Marketing Campaign',
        amount: 5000.00,
        category: 'Marketing',
        date: '2025-06-12',
        paidBy: mockTeamMembers[0],
        status: 'approved',
        approvedBy: mockTeamMembers[0],
        tags: ['marketing', 'campaign'],
      },
      {
        id: '4',
        description: 'Software Licenses',
        amount: 2345.67,
        category: 'Technology',
        date: '2025-06-10',
        paidBy: mockTeamMembers[1],
        status: 'reimbursed',
        approvedBy: mockTeamMembers[0],
        tags: ['software', 'monthly'],
      },
    ];

    // Single source of truth for the demo business dataset: every spending
    // view (Monthly Expenses header, Cash Flow Analysis, Category Spending) is
    // derived from this one expense list so the numbers always reconcile.
    const mockRevenue: BusinessTransaction[] = [
      { id: 'rev-1', description: 'Client Payment - Acme Corp', amount: 12000, type: 'credit', date: '2025-06-16' },
      { id: 'rev-2', description: 'Client Payment - Globex Inc', amount: 8500, type: 'credit', date: '2025-06-13' },
    ];
    const mockRecentTransactions: BusinessTransaction[] = [
      ...mockRevenue,
      ...mockExpenses.map(e => ({
        id: `exp-${e.id}`,
        description: e.description,
        amount: e.amount,
        type: 'debit' as const,
        date: e.date,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const categoryTotals = new Map<string, number>();
    mockExpenses.forEach(e => {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
    });
    const mockCategories: ExpenseCategory[] = Array.from(categoryTotals.entries()).map(
      ([name, spent]) => ({
        name,
        budget: Math.ceil((spent * 1.5) / 100) * 100,
        spent,
        icon: categoryIcons[name] || <Briefcase className="w-5 h-5" />,
        color: categoryColors[name] || 'from-[var(--primary-blue)] to-[var(--primary-indigo)]/80',
      })
    );

    setBusinessAccounts(mockAccounts);
    setTeamMembers(mockTeamMembers);
    setExpenses(mockExpenses);
    setRecentTransactions(mockRecentTransactions);
    setCategories(mockCategories);
    setIsLoading(false);
  }, [categoryIcons, categoryColors]);

  const loadBusinessData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load accounts and filter for business accounts
      const allAccounts = await accountsService.getAccounts();

      // Identify business accounts (those with "Business" in the name or specific patterns)
      const businessAccountsData = allAccounts.filter(account =>
        account.name.toLowerCase().includes('business') ||
        account.name.toLowerCase().includes('corporate') ||
        account.name.toLowerCase().includes('company')
      );

      // No dedicated business accounts exist for this user. Show the standalone
      // business demo dataset rather than relabeling the personal accounts,
      // which previously made the business view duplicate the personal accounts.
      if (businessAccountsData.length === 0) {
        loadMockData();
        return;
      }

      const accountsToUse = businessAccountsData;

      // Convert to business account format
      const formattedAccounts: BusinessAccount[] = accountsToUse.map(acc => ({
        id: acc.id.toString(),
        name: acc.name,
        type: acc.account_type.toLowerCase() as 'checking' | 'savings' | 'credit',
        accountNumber: acc.account_number || `****${(1000 + acc.id).toString().slice(-4)}`,
        balance: acc.balance,
        currency: 'USD',
        status: acc.is_active ? 'active' : 'frozen'
      }));

      setBusinessAccounts(formattedAccounts);

      // Load transactions for expense tracking
      if (formattedAccounts.length > 0) {
        const accountIds = formattedAccounts.map(acc => parseInt(acc.id));
        const allTransactions = await Promise.all(
          accountIds.map(id => transactionsService.getTransactions({ account_id: id }))
        );

        // Flatten and format as expenses
        const expenseTransactions = allTransactions
          .flat()
          .filter(tx => tx.transaction_type?.toUpperCase() === 'DEBIT' && tx.amount > 0)
          .slice(0, 20) // Limit to recent 20 expenses
          .map((tx, _index) => ({
            id: tx.id.toString(),
            description: tx.description,
            amount: tx.amount,
            category: tx.category?.name || 'Other',
            date: tx.transaction_date,
            paidBy: {
              id: '0',
              name: 'Unknown',
              email: '',
              role: 'employee',
              department: '',
              cardStatus: 'none',
              monthlyLimit: 0,
              currentSpending: 0,
              joinedDate: '',
            } as TeamMember,
            status: tx.status?.toUpperCase() === 'COMPLETED' ? 'approved' : 'pending' as 'pending' | 'approved' | 'rejected' | 'reimbursed',
            notes: tx.notes,
            tags: tx.tags || []
          }));

        setExpenses(expenseTransactions);

        // Build recent transactions (both inflows and outflows) from the same
        // real data so the cash-flow summary and the listed transactions reconcile.
        const recent: BusinessTransaction[] = allTransactions
          .flat()
          .map(tx => ({
            id: tx.id.toString(),
            description: tx.description,
            amount: tx.amount,
            type: (tx.transaction_type?.toUpperCase() === 'CREDIT' ? 'credit' : 'debit') as 'credit' | 'debit',
            date: tx.transaction_date,
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 6);

        setRecentTransactions(recent);

        // Calculate categories from actual expenses
        const categoryMap = new Map<string, number>();
        expenseTransactions.forEach(exp => {
          categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + exp.amount);
        });

        const calculatedCategories: ExpenseCategory[] = Array.from(categoryMap.entries())
          .slice(0, 4) // Top 4 categories
          .map(([name, spent]) => ({
            name,
            budget: Math.ceil(spent * 1.5 / 100) * 100, // Budget is 150% of spent, rounded up
            spent,
            icon: categoryIcons[name] || <Briefcase className="w-5 h-5" />,
            color: categoryColors[name] || 'from-[var(--primary-blue)] to-[var(--primary-indigo)]/80'
          }));

        setCategories(calculatedCategories);
      }

      setIsLoading(false);
    } catch {
      // Fall back to mock data on error
      loadMockData();
    }
  }, [categoryIcons, categoryColors, loadMockData]);

  useEffect(() => {
    // Enhanced page view logging

    // Load real data from backend
    loadBusinessData();
  }, [loadBusinessData]);

  const totalBalance = businessAccounts.reduce((sum, account) => 
    account.type === 'credit' ? sum - account.balance : sum + account.balance, 0
  );

  // Total business expenses: the single definition shared with the Cash Flow
  // Analysis and Category Spending views (which derive from the same expense
  // list). Counts every recorded expense regardless of approval status; the
  // separate "Pending Approvals" card tracks the workflow state.
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const activeCards = teamMembers.filter(m => m.cardStatus === 'active').length;

  const handleAddExpense = async (expenseData: CreateBusinessExpenseRequest, receiptFile?: File) => {
    try {
      // If there's a receipt file, upload it first
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('merchant_name', expenseData.vendor);
        formData.append('amount', expenseData.amount.toString());
        formData.append('date', new Date().toISOString().split('T')[0]);
        formData.append('tax_category', expenseData.category);
        
        const receipt = await businessApi.uploadReceipt(formData);
        expenseData.receipt_url = receipt.receipt_url;
      }

      await businessApi.createExpense(expenseData);
      
      // Add to local state
      const mockExpense: BusinessExpense = {
        id: Date.now().toString(),
        description: expenseData.description,
        amount: expenseData.amount,
        category: expenseData.category,
        date: new Date().toISOString().split('T')[0],
        paidBy: teamMembers[0] || { id: '1', name: 'You', email: '', role: 'owner', department: '', cardStatus: 'active', monthlyLimit: 0, currentSpending: 0, joinedDate: '' },
        status: 'approved',
        tags: [expenseData.category],
      };
      
      setExpenses([mockExpense, ...expenses]);
      setShowAddExpense(false);
      
    } catch {
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading business dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-1)]">
              Business Dashboard
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Manage your business finances and team expenses
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<Settings size={18} />}
              onClick={() => {
                setShowSettings(true);
              }}
            >
              Settings
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => {
                setShowAddExpense(true);
              }}
            >
              Add Expense
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card 
            variant="default" 
            className="p-6 cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.05)] transition-all"
            onClick={() => {
              router.push('/invoices');
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-[var(--text-2)]" />
            </div>
            <h3 className="font-semibold text-[var(--text-1)] mb-1">Invoices</h3>
            <p className="text-sm text-[var(--text-2)]">Create and manage invoices</p>
          </Card>

          <Card 
            variant="default" 
            className="p-6 cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.05)] transition-all"
            onClick={() => {
              setShowAddExpense(true);
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--primary-amber)] to-[var(--primary-orange)]">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <Plus className="w-5 h-5 text-[var(--text-2)]" />
            </div>
            <h3 className="font-semibold text-[var(--text-1)] mb-1">Add Expense</h3>
            <p className="text-sm text-[var(--text-2)]">Record business expenses</p>
          </Card>

          <Card 
            variant="default" 
            className="p-6 cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.05)] transition-all"
            onClick={() => {
              setSelectedTab('reports');
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-teal)]">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-[var(--text-2)]" />
            </div>
            <h3 className="font-semibold text-[var(--text-1)] mb-1">Reports</h3>
            <p className="text-sm text-[var(--text-2)]">Generate financial reports</p>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Balance</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Monthly Expenses</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Receipt className="w-8 h-8 text-[var(--primary-red)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Team Members</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {teamMembers.length}
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  {activeCards} active cards
                </p>
              </div>
              <Users className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Pending Approvals</p>
                <p className="text-2xl font-bold text-[var(--primary-amber)]">
                  {pendingExpenses}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[var(--primary-amber)] opacity-20" />
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-[rgba(var(--glass-rgb),0.1)] rounded-lg mb-8 overflow-x-auto">
          {(['overview', 'team', 'expenses', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                const _oldTab = selectedTab;
                setSelectedTab(tab);
              }}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex-1
                ${selectedTab === tab
                  ? 'bg-[var(--primary-blue)] text-white'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {selectedTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <BusinessOverview
                accounts={businessAccounts}
                expenses={expenses}
                recentTransactions={recentTransactions}
                categories={categories}
                teamMembers={teamMembers}
              />
            </motion.div>
          )}

          {selectedTab === 'team' && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TeamManagement
                teamMembers={teamMembers}
                onAddMember={() => {
                  setShowAddMember(true);
                }}
                onUpdateMember={(_member) => {
                  // Handle member update
                }}
              />
            </motion.div>
          )}

          {selectedTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ExpenseAnalytics
                expenses={expenses}
                categories={categories}
                onAddExpense={() => setShowAddExpense(true)}
              />
            </motion.div>
          )}

          {selectedTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="default" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-1)]">
                        Expense Reports
                      </h3>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Generate detailed expense reports by period
                      </p>
                    </div>
                    <Receipt className="w-8 h-8 text-[var(--primary-amber)] opacity-50" />
                  </div>
                  <Button 
                    variant="primary" 
                    icon={<Download size={18} />}
                    onClick={() => {
                      
                    }}
                  >
                    Generate Report
                  </Button>
                </Card>

                <Card variant="default" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-1)]">
                        Tax Summary
                      </h3>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        View quarterly tax estimates and deductions
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-[var(--primary-emerald)] opacity-50" />
                  </div>
                  <Button 
                    variant="primary" 
                    icon={<PieChart size={18} />}
                    onClick={async () => {
                      try {
                        const _estimate = await businessApi.getTaxEstimate();

                        // TODO: Show tax estimate in a modal
                      } catch {
                      }
                    }}
                  >
                    View Tax Summary
                  </Button>
                </Card>

                <Card variant="default" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-1)]">
                        Cash Flow Analysis
                      </h3>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        Analyze income and expense trends
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[var(--primary-blue)] opacity-50" />
                  </div>
                  <Button 
                    variant="primary" 
                    icon={<BarChart3 size={18} />}
                    onClick={() => {
                      
                    }}
                  >
                    View Analysis
                  </Button>
                </Card>

                <Card variant="default" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-1)]">
                        Invoice Summary
                      </h3>
                      <p className="text-sm text-[var(--text-2)] mt-1">
                        View invoice status and aging report
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-[var(--primary-indigo)] opacity-50" />
                  </div>
                  <Button 
                    variant="primary" 
                    icon={<FileText size={18} />}
                    onClick={() => {
                      router.push('/invoices');
                    }}
                  >
                    View Invoices
                  </Button>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Add Team Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add Team Member"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            Team member addition form will be implemented here.
          </p>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Add Business Expense"
        size="lg"
      >
        <ExpenseForm 
          onSubmit={handleAddExpense}
          onCancel={() => setShowAddExpense(false)}
        />
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Business Settings"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            Business settings and configuration will be implemented here.
          </p>
        </div>
      </Modal>
    </div>
  );
}
