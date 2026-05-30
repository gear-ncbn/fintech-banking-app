'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Coins, Target, DollarSign, Link2 } from 'lucide-react';
import { CryptoAsset } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface AssetListProps {
  assets: CryptoAsset[];
  onAssetClick?: (asset: CryptoAsset) => void;
  showWalletInfo?: boolean;
  className?: string;
}

export const AssetList: React.FC<AssetListProps> = ({ 
  assets, 
  onAssetClick, 
  showWalletInfo = false,
  className = '' 
}) => {
  const handleAssetClick = (asset: CryptoAsset) => {
    onAssetClick?.(asset);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'var(--primary-emerald)';
    if (change < 0) return 'var(--primary-red)';
    return 'var(--text-2)';
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'native':
        return <Coins className="w-5 h-5" />;
      case 'token':
        return <Target className="w-5 h-5" />;
      case 'stablecoin':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <Link2 className="w-5 h-5" />;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {assets.map((asset, index) => (
        <motion.div
          key={asset.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 5 }}
          onClick={() => handleAssetClick(asset)}
          className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-sm border border-[var(--glass-border)] cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.5)] transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {asset.icon ? (
                  <Image
                    src={asset.icon}
                    alt={asset.symbol}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--primary-blue)]20 flex items-center justify-center text-lg">
                    {getAssetTypeIcon(asset.assetType)}
                  </div>
                )}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-xs">
                  {asset.assetType === 'stablecoin' ? '$' : (asset.assetType ?? 'T').charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-1)]">{asset.symbol}</h4>
                <p className="text-sm text-[var(--text-2)]">{asset.name}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold text-[var(--text-1)]">
                {formatCurrency(asset.balanceUSD)}
              </p>
              <p className="text-sm text-[var(--text-3)]">
                {asset.balance.toFixed(6)} {asset.symbol}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[var(--text-2)]">
                Price: {formatCurrency(asset.price)}
              </span>
              <span 
                className="font-medium"
                style={{ color: getChangeColor(asset.change24h) }}
              >
                {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </span>
            </div>
            
            {showWalletInfo && asset.contractAddress && (
              <span className="text-xs text-[var(--text-3)] truncate max-w-[150px]">
                {asset.contractAddress}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
