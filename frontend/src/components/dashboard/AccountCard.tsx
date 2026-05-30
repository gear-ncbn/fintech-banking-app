import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  Wallet, 
  PiggyBank, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TransferModal from '../modals/TransferModal';

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit';
    balance: number;
    currency: string;
    lastActivity: string;
    balanceChange?: number;
    changePercent?: number | null;
    creditLimit?: number;
  };
  analyticsId?: string;
  analyticsLabel?: string;
}

export const AccountCard: React.FC<AccountCardProps> = ({ 
  account,
  analyticsId = 'account-card',
  analyticsLabel: _analyticsLabel = 'Account Card',
}) => {
  const router = useRouter();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const getAccountIcon = () => {
    switch (account.type) {
      case 'checking':
        return <Wallet className="w-5 h-5" />;
      case 'savings':
        return <PiggyBank className="w-5 h-5" />;
      case 'credit':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  const getAccountColor = () => {
    switch (account.type) {
      case 'checking':
        return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
      case 'savings':
        return 'from-[var(--primary-emerald)] to-[var(--primary-teal)]';
      case 'credit':
        return 'from-[var(--primary-indigo)] to-[var(--primary-navy)]';
      default:
        return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
    }
  };

  const formatBalance = (balance: number) => {
    const isNegative = balance < 0;
    const absBalance = Math.abs(balance);
    return `${isNegative ? '-' : ''}$${absBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const balanceChange = account.balanceChange ?? 0;
  // null means a percentage isn't meaningful (e.g. previous balance was zero or
  // negative); in that case we render only the dollar change.
  const changePercent = account.changePercent ?? null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={() => {
        router.push(`/accounts/${account.id}`);
      }}
    >
      <Card 
        variant="default" 
        className="overflow-hidden cursor-pointer h-full flex flex-col"
        onClick={() => {
          router.push(`/accounts/${account.id}`);
        }}
      >
        <div
          className={`h-2 bg-gradient-to-r ${getAccountColor()}`}
        />
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`
                p-3 rounded-xl
                bg-gradient-to-br ${getAccountColor()}
                text-white shadow-lg
              `}>
                {getAccountIcon()}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-1)]">
                  {account.name}
                </h3>
                <p className="text-sm text-[var(--text-2)]">
                  {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <div>
              <p className="text-sm text-[var(--text-2)] mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-[var(--text-1)]">
                {formatBalance(account.balance)}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {balanceChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-[var(--primary-emerald)]" />
                ) : balanceChange < 0 ? (
                  <TrendingDown className="w-4 h-4 text-[var(--primary-red)]" />
                ) : (
                  <Minus className="w-4 h-4 text-[var(--text-2)]" />
                )}
                <span className={`text-sm font-medium ${
                  balanceChange > 0 
                    ? 'text-[var(--primary-emerald)]' 
                    : balanceChange < 0
                    ? 'text-[var(--primary-red)]'
                    : 'text-[var(--text-2)]'
                }`}>
                  {balanceChange > 0 ? '+' : ''}{formatBalance(balanceChange)}
                </span>
                {changePercent !== null && (
                  <span className="text-xs text-[var(--text-2)]">
                    ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-2)]">
                {account.lastActivity}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          {account.type !== 'credit' && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button 
                variant="secondary" 
                size="sm" 
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTransferModal(true);
                }}
                analyticsId={`${analyticsId}-${account.id}-transfer`}
                analyticsLabel={`${account.name} Transfer`}
              >
                Transfer
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/accounts/${account.id}`);
                }}
                analyticsId={`${analyticsId}-${account.id}-details`}
                analyticsLabel={`${account.name} Details`}
              >
                Details
              </Button>
            </div>
          )}
          
          {account.type === 'credit' && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--text-2)]">Credit Used</span>
                <span className="font-medium text-[var(--text-1)]">
                  {Math.abs(account.balance).toLocaleString('en-US')} / {(account.creditLimit ?? 0).toLocaleString('en-US')}
                </span>
              </div>
              <div className="w-full h-2 bg-[rgba(var(--glass-rgb),0.3)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-navy)]"
                  style={{ width: `${account.creditLimit ? Math.min((Math.abs(account.balance) / account.creditLimit) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {showTransferModal && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          preselectedSourceAccount={parseInt(account.id)}
        />
      )}
    </motion.div>
  );
};

export default AccountCard;
