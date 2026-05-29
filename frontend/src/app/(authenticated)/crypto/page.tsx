'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cryptoApi } from '@/lib/api';
import { CryptoWallet, CryptoAsset, CryptoTransaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { WalletCard } from '@/components/crypto/WalletCard';
import { AssetList } from '@/components/crypto/AssetList';
import { TransactionHistory } from '@/components/crypto/TransactionHistory';
import { PortfolioSummary } from '@/components/crypto/PortfolioSummary';

export default function CryptoPage() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<{
    total_usd_value?: number;
    totalValueUSD?: number;
    totalValueBTC?: number;
    total_24h_change_percent?: number;
    change24h?: number;
    change7d?: number;
    top_holdings?: Array<{ asset: { symbol: string; name: string; icon?: string }; valueUSD: number; percentage: number }>;
    topAssets?: Array<{ asset: { symbol: string; name: string; icon?: string }; valueUSD: number; percentage: number }>;
    assetAllocation?: Array<{ assetType: string; valueUSD: number; percentage: number }>;
  } | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'assets' | 'transactions'>('overview');
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletsResult, transactionsResult, summaryResult] = await Promise.allSettled([
        cryptoApi.getWallets(),
        cryptoApi.getTransactions(),
        cryptoApi.getPortfolioSummary()
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawWallets: any[] = walletsResult.status === 'fulfilled' ? walletsResult.value : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawTxs: any[] = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];

      // Fetch per-wallet assets (general /assets endpoint doesn't exist)
      const allAssets: CryptoAsset[] = [];
      const walletBalances: Record<string, number> = {};
      for (const w of rawWallets) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawAssets: any[] = await cryptoApi.getWalletAssets(String(w.id));
          for (const a of rawAssets) {
            allAssets.push({
              id: String(a.id),
              walletId: String(a.wallet_id ?? w.id),
              symbol: a.symbol,
              name: a.name,
              assetType: a.asset_type ?? 'token',
              contractAddress: a.contract_address,
              balance: parseFloat(a.balance) || 0,
              balanceUSD: a.usd_value ?? 0,
              price: a.price_usd ?? 0,
              change24h: a.change_24h ?? 0,
            });
            walletBalances[String(w.id)] = (walletBalances[String(w.id)] || 0) + (a.usd_value ?? 0);
          }
        } catch { /* wallet may have no assets */ }
      }
      setAssets(allAssets);

      // Map wallets to expected shape
      const mappedWallets: CryptoWallet[] = rawWallets.map(w => ({
        id: String(w.id),
        userId: w.user_id,
        name: w.name,
        address: w.address ?? '',
        network: w.network ?? 'unknown',
        type: (w.type ?? (w.is_primary ? 'hot' : 'cold')) as CryptoWallet['type'],
        balance: 0,
        balanceUSD: walletBalances[String(w.id)] ?? 0,
        isActive: w.is_active ?? true,
        createdAt: w.created_at ?? '',
        updatedAt: w.updated_at ?? w.created_at ?? '',
      }));
      setWallets(mappedWallets);

      // Map transactions
      const mappedTxs: CryptoTransaction[] = rawTxs.map(t => ({
        id: String(t.id),
        walletId: String(t.wallet_id),
        type: (t.direction ?? t.type ?? 'send') as CryptoTransaction['type'],
        assetId: t.asset_symbol ?? '',
        amount: parseFloat(t.amount) || 0,
        amountUSD: t.usd_value_at_time ?? 0,
        fromAddress: t.from_address ?? '',
        toAddress: t.to_address ?? '',
        txHash: t.transaction_hash ?? t.tx_hash ?? '',
        status: (t.status ?? 'pending') as CryptoTransaction['status'],
        network: t.network ?? '',
        gasFee: parseFloat(t.gas_fee) || 0,
        gasFeeUSD: t.gas_fee_usd ?? 0,
        timestamp: t.created_at ?? '',
        blockNumber: t.block_number,
        confirmations: t.confirmations,
      }));
      setTransactions(mappedTxs);

      if (summaryResult.status === 'fulfilled') setPortfolioSummary(summaryResult.value);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleWalletClick = (wallet: CryptoWallet) => {
    setSelectedWallet(wallet);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-1)] mb-2">Digital Assets</h1>
        <p className="text-[var(--text-2)]">Manage your cryptocurrency portfolio and NFT collections</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['overview', 'wallets', 'assets', 'transactions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-[var(--primary-blue)] text-white'
                : 'bg-[rgba(var(--glass-rgb),0.3)] text-[var(--text-2)] hover:bg-[rgba(var(--glass-rgb),0.5)]'
            }`}
            data-testid={`crypto-tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && portfolioSummary && (
          <PortfolioSummary
            totalValueUSD={portfolioSummary.total_usd_value ?? portfolioSummary.totalValueUSD ?? 0}
            totalValueBTC={portfolioSummary.totalValueBTC ?? 0}
            change24h={portfolioSummary.total_24h_change_percent ?? portfolioSummary.change24h ?? 0}
            change7d={portfolioSummary.change7d ?? 0}
            topAssets={(portfolioSummary.top_holdings ?? portfolioSummary.topAssets ?? []).map((h: Record<string, unknown>) => ({
              asset: { symbol: (h.asset as Record<string, string>)?.symbol ?? (h.symbol as string) ?? '', name: (h.asset as Record<string, string>)?.name ?? (h.name as string) ?? '', icon: (h.asset as Record<string, string>)?.icon },
              valueUSD: (h.valueUSD as number) ?? (h.usd_value as number) ?? 0,
              percentage: (h.percentage as number) ?? 0,
            }))}
            assetAllocation={portfolioSummary.assetAllocation ?? []}
          />
        )}

        {activeTab === 'wallets' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-1)]">My Wallets</h2>
              <Button
                onClick={() => setShowCreateWalletModal(true)}
                variant="primary"
                size="sm"
                data-testid="create-wallet-btn"
              >
                + Add Wallet
              </Button>
            </div>

            {selectedWallet && (
              <Card className="mb-6 p-4 bg-[var(--primary-blue)]10 border-[var(--primary-blue)]30">
                <p className="text-sm text-[var(--primary-blue)]">
                  Selected: {selectedWallet.name} ({selectedWallet.network})
                </p>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wallets.length > 0 ? wallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  onClick={() => handleWalletClick(wallet)}
                />
              )) : (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-[var(--text-2)]">No wallets yet. Create a wallet to get started.</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-1)] mb-4">All Assets</h2>
              {selectedWallet && (
                <p className="text-sm text-[var(--text-2)]">
                  Showing assets for: {selectedWallet.name}
                </p>
              )}
            </div>

            <AssetList
              assets={selectedWallet ? assets.filter(a => a.walletId === selectedWallet.id) : assets}
              showWalletInfo={!selectedWallet}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-1)]">Transaction History</h2>
            </div>

            <TransactionHistory
              transactions={selectedWallet ? transactions.filter(t => t.walletId === selectedWallet.id) : transactions}
            />
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <Card className="mt-8 p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="secondary"
            fullWidth
            data-testid="crypto-send-btn"
          >
            ↗️ Send
          </Button>
          <Button
            variant="secondary"
            fullWidth
            data-testid="crypto-receive-btn"
          >
            ↙️ Receive
          </Button>
          <Button
            variant="secondary"
            fullWidth
            data-testid="crypto-swap-btn"
          >
            🔄 Swap
          </Button>
          <Button
            variant="secondary"
            fullWidth
            data-testid="crypto-stake-btn"
          >
            🔒 Stake
          </Button>
        </div>
      </Card>

      {/* Create Wallet Modal */}
      <Modal
        isOpen={showCreateWalletModal}
        onClose={() => setShowCreateWalletModal(false)}
        title="Add New Wallet"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            Connect or create a new cryptocurrency wallet to manage your digital assets.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Button variant="secondary" fullWidth>
              Connect Hardware Wallet
            </Button>
            <Button variant="secondary" fullWidth>
              Import Wallet
            </Button>
            <Button variant="primary" fullWidth>
              Create New Wallet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
