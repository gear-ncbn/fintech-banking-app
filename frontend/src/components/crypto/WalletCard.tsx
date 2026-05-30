'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CryptoWallet } from '@/types';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface WalletCardProps {
  wallet: CryptoWallet;
  onClick?: () => void;
  className?: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({ wallet, onClick, className = '' }) => {
  const handleClick = () => {
    onClick?.();
  };

  const getWalletIcon = () => {
    switch ((wallet.network ?? '').toLowerCase()) {
      case 'ethereum':
        return '⟠';
      case 'bitcoin':
        return '₿';
      case 'polygon':
        return '⬡';
      case 'binance':
        return '🟡';
      default:
        return '🔗';
    }
  };

  const getWalletTypeColor = () => {
    switch (wallet.type) {
      case 'hot':
        return 'var(--primary-orange)';
      case 'cold':
        return 'var(--primary-blue)';
      case 'exchange':
        return 'var(--primary-emerald)';
      default:
        return 'var(--text-2)';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={className}
    >
      <Card className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="text-3xl"
              style={{ filter: `drop-shadow(0 0 10px ${getWalletTypeColor()})` }}
            >
              {getWalletIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">{wallet.name}</h3>
              <p className="text-sm text-[var(--text-2)]">{wallet.network}</p>
            </div>
          </div>
          <div 
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${getWalletTypeColor()}20`,
              color: getWalletTypeColor()
            }}
          >
            {(wallet.type ?? 'hot').toUpperCase()}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-sm text-[var(--text-2)]">Balance</span>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--text-1)]">
                {formatCurrency(wallet.balanceUSD)}
              </p>
              <p className="text-sm text-[var(--text-3)]">
                ≈ {(wallet.balance ?? 0).toFixed(6)} BTC
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--glass-border)]">
            <p className="text-xs text-[var(--text-3)] truncate">
              {wallet.address}
            </p>
          </div>
        </div>

        {!wallet.isActive && (
          <div className="mt-3 p-2 bg-[var(--primary-red)]20 rounded-lg">
            <p className="text-xs text-[var(--primary-red)] text-center">Inactive</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
