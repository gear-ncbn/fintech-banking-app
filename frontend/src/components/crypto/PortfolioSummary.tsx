'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface PortfolioSummaryProps {
  totalValueUSD: number;
  totalValueBTC: number;
  change24h: number;
  change7d: number;
  topAssets: Array<{
    asset: {
      symbol: string;
      name: string;
      icon?: string;
    };
    valueUSD: number;
    percentage: number;
  }>;
  assetAllocation: Array<{
    assetType: string;
    valueUSD: number;
    percentage: number;
  }>;
  className?: string;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValueUSD,
  totalValueBTC,
  change24h,
  change7d,
  topAssets,
  assetAllocation,
  className = ''
}) => {

  const getChangeColor = (change: number) => {
    if (change > 0) return 'var(--primary-emerald)';
    if (change < 0) return 'var(--primary-red)';
    return 'var(--text-2)';
  };

  const getAllocationColor = (type: string) => {
    const colors: Record<string, string> = {
      native: 'var(--primary-blue)',
      token: 'var(--primary-purple)',
      stablecoin: 'var(--primary-emerald)',
      nft: 'var(--primary-orange)',
      defi: 'var(--primary-yellow)'
    };
    return colors[type] || 'var(--text-2)';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Total Portfolio Value */}
      <Card className="p-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-2)] mb-2">Total Portfolio Value</p>
          <motion.h1 
            className="text-4xl font-bold text-[var(--text-1)] mb-2"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {formatCurrency(totalValueUSD)}
          </motion.h1>
          <p className="text-sm text-[var(--text-3)]">
            {totalValueBTC.toFixed(6)} BTC
          </p>
        </div>

        <div className="mt-6 flex justify-center gap-6">
          <div className="text-center">
            <p className="text-xs text-[var(--text-3)] mb-1">24h Change</p>
            <p 
              className="text-lg font-semibold"
              style={{ color: getChangeColor(change24h) }}
            >
              {change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--text-3)] mb-1">7d Change</p>
            <p 
              className="text-lg font-semibold"
              style={{ color: getChangeColor(change7d) }}
            >
              {change7d > 0 ? '+' : ''}{change7d.toFixed(2)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Asset Allocation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Asset Allocation</h3>
        
        <div className="space-y-3">
          {assetAllocation.map((allocation, index) => (
            <motion.div
              key={allocation.assetType}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-[var(--text-2)] capitalize">
                  {allocation.assetType}
                </span>
                <span className="text-sm font-medium text-[var(--text-1)]">
                  {allocation.percentage.toFixed(1)}% • {formatCurrency(allocation.valueUSD)}
                </span>
              </div>
              <div className="w-full bg-[var(--glass-bg)] rounded-full h-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: getAllocationColor(allocation.assetType) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${allocation.percentage}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Top Assets */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Top Assets</h3>
        
        <div className="space-y-3">
          {topAssets.map((item, index) => (
            <motion.div
              key={`${item.asset.symbol}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)]"
            >
              <div className="flex items-center gap-3">
                {item.asset.icon ? (
                  <Image
                    src={item.asset.icon}
                    alt={item.asset.symbol}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--primary-blue)]20 flex items-center justify-center text-sm font-bold">
                    {item.asset.symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-1)]">{item.asset.symbol}</p>
                  <p className="text-xs text-[var(--text-3)]">{item.asset.name}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-medium text-[var(--text-1)]">
                  {formatCurrency(item.valueUSD)}
                </p>
                <p className="text-sm text-[var(--text-2)]">
                  {item.percentage.toFixed(1)}%
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};
