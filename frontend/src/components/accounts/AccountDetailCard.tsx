import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard,
  Download,
  Settings,
  Shield,
  Activity,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import EditAccountModal from '../modals/EditAccountModal';
import { useAlert } from '@/contexts/AlertContext';

interface AccountDetailCardProps {
  account: {
    id: string;
    name: string;
    type: string;
    accountNumber: string;
    balance: number;
    availableBalance: number;
    currency: string;
    status: string;
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
  };
  showBalances: boolean;
  onAccountUpdated?: () => void;
  onAccountDeleted?: () => void;
}

export const AccountDetailCard: React.FC<AccountDetailCardProps> = ({ 
  account, 
  showBalances,
  onAccountUpdated,
  onAccountDeleted 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const { showSuccess, showError } = useAlert();

  const handleCopyAccountNumber = () => {
    // In a real app, this would copy the full account number
    navigator.clipboard.writeText(account.accountNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleExportStatement = async () => {
    try {
      // Get current date and 30 days ago
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get auth token from sessionStorage or localStorage
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      
      // Call the export API
      const response = await fetch(`/api/analytics/export/transactions/csv?start_date=${startDate}&end_date=${endDate}&account_id=${account.id}`, {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'Accept': 'text/csv',
        }
      });
      
      if (response.ok) {
        // Get the blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${account.name.replace(/\s+/g, '_')}_statement_${startDate}_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        showSuccess('Export Successful', 'Your account statement has been downloaded.');
      } else {
        const errorText = await response.text();
        showError('Export Failed', errorText || 'Failed to export statement. Please try again.');
      }
    } catch (error) {
      showError('Export Failed', error instanceof Error ? error.message : 'An error occurred while exporting the statement.');
    }
  };

  const getAccountTypeColor = () => {
    switch (account.type) {
      case 'checking': return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
      case 'savings': return 'from-[var(--primary-emerald)] to-[var(--primary-teal)]';
      case 'credit': return 'from-[var(--primary-indigo)] to-[var(--primary-navy)]';
      case 'investment': return 'from-[var(--primary-teal)] to-[var(--primary-blue)]';
      case 'loan': return 'from-[var(--primary-red)] to-[var(--primary-navy)]';
      default: return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <>
      <Card variant="prominent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-1)]">
              Account Details
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<Download size={16} />}
                onClick={handleExportStatement}
                analyticsId="account-statement-button"
                analyticsLabel="Export Statement"
              >
                Statement
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Settings size={16} />}
                onClick={() => setShowSettings(true)}
                analyticsId="account-settings-button"
                analyticsLabel="Account Settings"
              >
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Virtual Card */}
          <motion.div
            className={`
              relative h-48 rounded-xl overflow-hidden
              bg-gradient-to-br ${getAccountTypeColor()}
              p-6 text-white shadow-xl
            `}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[rgba(var(--glass-rgb),0.2)] blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[rgba(var(--glass-rgb),0.1)] blur-3xl" />
            </div>

            <div className="relative h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-90">{account.type.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="text-xl font-semibold mt-1">{account.name}</p>
                </div>
                <CreditCard className="w-8 h-8 opacity-80" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-lg tracking-wider">{account.accountNumber}</p>
                  <button
                    onClick={handleCopyAccountNumber}
                    className="p-1 rounded hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors"
                  >
                    {copiedNumber ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-2xl font-bold">
                  {showBalances ? formatCurrency(account.balance) : '••••••'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                <p className="text-sm text-[var(--text-2)] mb-1">Available Balance</p>
                <p className="text-lg font-semibold text-[var(--text-1)]">
                  {showBalances ? formatCurrency(account.availableBalance) : '••••••'}
                </p>
              </div>

              {account.interestRate && (
                <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                  <p className="text-sm text-[var(--text-2)] mb-1">Interest Rate</p>
                  <p className="text-lg font-semibold text-[var(--text-1)]">
                    {account.interestRate}% APY
                  </p>
                </div>
              )}

              {account.creditLimit && (
                <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                  <p className="text-sm text-[var(--text-2)] mb-1">Credit Limit</p>
                  <p className="text-lg font-semibold text-[var(--text-1)]">
                    {showBalances ? formatCurrency(account.creditLimit) : '••••••'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                <p className="text-sm text-[var(--text-2)] mb-1">Account Status</p>
                <div className="flex items-center gap-2">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${account.status === 'active' ? 'bg-[var(--primary-emerald)]' : 'bg-[var(--primary-red)]'}
                  `} />
                  <p className="text-lg font-semibold text-[var(--text-1)] capitalize">
                    {account.status}
                  </p>
                </div>
              </div>

              {account.minimumPayment && (
                <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                  <p className="text-sm text-[var(--text-2)] mb-1">Minimum Payment</p>
                  <p className="text-lg font-semibold text-[var(--text-1)]">
                    {showBalances ? formatCurrency(account.minimumPayment) : '••••••'}
                  </p>
                  {account.dueDate && (
                    <p className="text-xs text-[var(--text-2)] mt-1">
                      Due: {new Date(account.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
                <p className="text-sm text-[var(--text-2)] mb-1">Last Transaction</p>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {account.lastTransaction.description}
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  {new Date(account.lastTransaction.date).toLocaleDateString()} • 
                  {showBalances 
                    ? ` ${account.lastTransaction.amount > 0 ? '+' : ''}${formatCurrency(account.lastTransaction.amount)}`
                    : ' ••••••'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Activity Summary */}
          <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <h3 className="font-medium text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Monthly Activity
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[var(--text-2)]">Deposits</p>
                <p className="text-lg font-semibold text-[var(--primary-emerald)]">
                  {showBalances ? `+${formatCurrency(account.monthlyActivity.deposits)}` : '••••••'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-2)]">Withdrawals</p>
                <p className="text-lg font-semibold text-[var(--text-1)]">
                  {showBalances ? `-${formatCurrency(account.monthlyActivity.withdrawals)}` : '••••••'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-2)]">Fees</p>
                <p className="text-lg font-semibold text-[var(--primary-red)]">
                  {showBalances ? `-${formatCurrency(account.monthlyActivity.fees)}` : '••••••'}
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <Shield className="w-5 h-5 text-[var(--primary-blue)] mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-1)]">
                Account Protected
              </p>
              <p className="text-xs text-[var(--text-2)] mt-1">
                Your account is protected by bank-level encryption and fraud monitoring
              </p>
            </div>
          </div>

          {/* Due Date Alert */}
          {account.dueDate && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(var(--primary-amber),0.1)] border border-[var(--primary-amber)]">
              <AlertCircle className="w-5 h-5 text-[var(--primary-amber)] mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-1)]">
                  Payment Due Soon
                </p>
                <p className="text-xs text-[var(--text-2)] mt-1">
                  Your payment of {showBalances ? formatCurrency(account.minimumPayment || 0) : '••••••'} is due on {new Date(account.dueDate).toLocaleDateString()}
                </p>
                <Button variant="primary" size="sm" className="mt-2">
                  Make Payment
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Settings Modal */}
      <EditAccountModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        account={{
          id: account.id,
          name: account.name,
          type: account.type,
          accountNumber: account.accountNumber,
          interestRate: account.interestRate,
          creditLimit: account.creditLimit,
          isActive: account.status === 'active'
        }}
        onAccountUpdated={onAccountUpdated}
        onAccountDeleted={onAccountDeleted}
      />
    </>
  );
};

export default AccountDetailCard;
