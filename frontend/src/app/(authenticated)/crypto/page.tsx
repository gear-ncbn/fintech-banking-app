'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Lock, Copy, Check } from 'lucide-react';
import { cryptoApi } from '@/lib/api';
import { CryptoWallet, CryptoAsset, CryptoTransaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
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
    total_btc_value?: number;
    totalValueUSD?: number;
    totalValueBTC?: number;
    total_24h_change_percent?: number;
    change24h?: number;
    change7d?: number;
    top_holdings?: Array<{ asset: { symbol: string; name: string; icon?: string }; valueUSD: number; percentage: number }>;
    topAssets?: Array<{ asset: { symbol: string; name: string; icon?: string }; valueUSD: number; percentage: number }>;
    asset_allocation?: Array<{ asset_type?: string; assetType?: string; usd_value?: number; valueUSD?: number; percentage?: number }>;
    assetAllocation?: Array<{ asset_type?: string; assetType?: string; usd_value?: number; valueUSD?: number; percentage?: number }>;
  } | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'assets' | 'transactions'>('overview');
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
  const [actionModal, setActionModal] = useState<null | 'send' | 'receive' | 'swap' | 'stake'>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState({ walletId: '', assetSymbol: '', toAddress: '', amount: '' });
  const [swapForm, setSwapForm] = useState({ walletId: '', fromAsset: '', toAsset: '', amount: '' });
  const [swapQuote, setSwapQuote] = useState<{ to_amount: string; price_impact: number; gas_estimate_usd: number; route: string[] } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stakePositions, setStakePositions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const networkToEnum = (network: string): string => {
    const n = (network || '').toLowerCase();
    const valid = ['ethereum', 'bitcoin', 'polygon', 'solana', 'arbitrum'];
    return valid.includes(n) ? n : 'ethereum';
  };

  const walletAssets = (walletId: string) => assets.filter(a => a.walletId === walletId);

  const openAction = async (type: 'send' | 'receive' | 'swap' | 'stake') => {
    setActionError(null);
    setActionSuccess(null);
    setSwapQuote(null);
    const firstWalletId = wallets[0]?.id ?? '';
    if (type === 'send') {
      const firstAsset = walletAssets(firstWalletId)[0]?.symbol ?? '';
      setSendForm({ walletId: firstWalletId, assetSymbol: firstAsset, toAddress: '', amount: '' });
    }
    if (type === 'swap') {
      const wa = walletAssets(firstWalletId);
      setSwapForm({ walletId: firstWalletId, fromAsset: wa[0]?.symbol ?? '', toAsset: wa[1]?.symbol ?? 'ETH', amount: '' });
    }
    setActionModal(type);
    if (type === 'stake') {
      try {
        setActionLoading(true);
        const positions = await cryptoApi.getDeFiPositions();
        setStakePositions(Array.isArray(positions) ? positions : []);
      } catch {
        setStakePositions([]);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const closeAction = () => {
    setActionModal(null);
    setActionError(null);
    setActionSuccess(null);
    setSwapQuote(null);
  };

  const handleSend = async () => {
    setActionError(null);
    const wallet = wallets.find(w => w.id === sendForm.walletId);
    if (!wallet || !sendForm.assetSymbol || !sendForm.toAddress || !sendForm.amount) {
      setActionError('Please fill in all fields.');
      return;
    }
    if (parseFloat(sendForm.amount) <= 0) {
      setActionError('Amount must be greater than zero.');
      return;
    }
    try {
      setActionLoading(true);
      await cryptoApi.sendCrypto({
        from_wallet_id: Number(sendForm.walletId),
        to_address: sendForm.toAddress,
        asset_symbol: sendForm.assetSymbol,
        amount: sendForm.amount,
        network: networkToEnum(wallet.network),
      });
      setActionSuccess(`Sent ${sendForm.amount} ${sendForm.assetSymbol} successfully.`);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwapQuote = async () => {
    setActionError(null);
    setSwapQuote(null);
    if (!swapForm.walletId || !swapForm.fromAsset || !swapForm.toAsset || !swapForm.amount) {
      setActionError('Please fill in all fields.');
      return;
    }
    try {
      setActionLoading(true);
      const quote = await cryptoApi.getSwapQuote({
        from_asset: swapForm.fromAsset,
        to_asset: swapForm.toAsset,
        amount: swapForm.amount,
        wallet_id: Number(swapForm.walletId),
      });
      setSwapQuote(quote);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to get a swap quote.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch { /* clipboard unavailable */ }
  };

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

      // Derive the BTC price so we can show each wallet's BTC-equivalent value.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summaryValue: any = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
      const summaryUSD = summaryValue?.total_usd_value ?? summaryValue?.totalValueUSD ?? 0;
      const summaryBTC = summaryValue?.total_btc_value ?? summaryValue?.totalValueBTC ?? 0;
      const btcPrice = summaryBTC > 0 ? summaryUSD / summaryBTC : 45000;

      // Map wallets to expected shape
      const mappedWallets: CryptoWallet[] = rawWallets.map(w => ({
        id: String(w.id),
        userId: w.user_id,
        name: w.name,
        address: w.address ?? '',
        network: w.network ?? 'unknown',
        type: (w.type ?? (w.is_primary ? 'hot' : 'cold')) as CryptoWallet['type'],
        balance: btcPrice > 0 ? (walletBalances[String(w.id)] ?? 0) / btcPrice : 0,
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

  // Combine holdings of the same token (across wallets) into a single row so a
  // token never appears more than once with conflicting prices.
  const aggregateBySymbol = (list: CryptoAsset[]): CryptoAsset[] => {
    const bySymbol = new Map<string, CryptoAsset>();
    for (const a of list) {
      const existing = bySymbol.get(a.symbol);
      if (existing) {
        existing.balance += a.balance;
        existing.balanceUSD += a.balanceUSD;
      } else {
        bySymbol.set(a.symbol, { ...a });
      }
    }
    return Array.from(bySymbol.values());
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
            totalValueBTC={portfolioSummary.total_btc_value ?? portfolioSummary.totalValueBTC ?? 0}
            change24h={portfolioSummary.total_24h_change_percent ?? portfolioSummary.change24h ?? 0}
            change7d={portfolioSummary.change7d ?? 0}
            topAssets={(portfolioSummary.top_holdings ?? portfolioSummary.topAssets ?? []).map((h: Record<string, unknown>) => ({
              asset: { symbol: (h.asset as Record<string, string>)?.symbol ?? (h.symbol as string) ?? '', name: (h.asset as Record<string, string>)?.name ?? (h.name as string) ?? '', icon: (h.asset as Record<string, string>)?.icon },
              valueUSD: (h.valueUSD as number) ?? (h.usd_value as number) ?? 0,
              percentage: (h.percentage as number) ?? 0,
            }))}
            assetAllocation={(portfolioSummary.asset_allocation ?? portfolioSummary.assetAllocation ?? []).map((a) => ({
              assetType: a.assetType ?? a.asset_type ?? '',
              valueUSD: a.valueUSD ?? a.usd_value ?? 0,
              percentage: a.percentage ?? 0,
            }))}
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
              assets={selectedWallet ? assets.filter(a => a.walletId === selectedWallet.id) : aggregateBySymbol(assets)}
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
            className="flex items-center justify-center gap-2"
            data-testid="crypto-send-btn"
            onClick={() => openAction('send')}
          >
            <ArrowUpRight className="w-4 h-4" /> Send
          </Button>
          <Button
            variant="secondary"
            fullWidth
            className="flex items-center justify-center gap-2"
            data-testid="crypto-receive-btn"
            onClick={() => openAction('receive')}
          >
            <ArrowDownLeft className="w-4 h-4" /> Receive
          </Button>
          <Button
            variant="secondary"
            fullWidth
            className="flex items-center justify-center gap-2"
            data-testid="crypto-swap-btn"
            onClick={() => openAction('swap')}
          >
            <RefreshCw className="w-4 h-4" /> Swap
          </Button>
          <Button
            variant="secondary"
            fullWidth
            className="flex items-center justify-center gap-2"
            data-testid="crypto-stake-btn"
            onClick={() => openAction('stake')}
          >
            <Lock className="w-4 h-4" /> Stake
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

      {/* Send Modal */}
      <Modal isOpen={actionModal === 'send'} onClose={closeAction} title="Send Crypto">
        {actionSuccess ? (
          <div className="space-y-4 text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-[var(--text-1)]">{actionSuccess}</p>
            <Button variant="primary" fullWidth onClick={closeAction}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-2)] mb-1">From Wallet</label>
              <select
                className="w-full p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--glass-border)] text-[var(--text-1)]"
                value={sendForm.walletId}
                onChange={(e) => {
                  const walletId = e.target.value;
                  setSendForm(f => ({ ...f, walletId, assetSymbol: walletAssets(walletId)[0]?.symbol ?? '' }));
                }}
                data-testid="crypto-send-wallet"
              >
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.network})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-2)] mb-1">Asset</label>
              <select
                className="w-full p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--glass-border)] text-[var(--text-1)]"
                value={sendForm.assetSymbol}
                onChange={(e) => setSendForm(f => ({ ...f, assetSymbol: e.target.value }))}
                data-testid="crypto-send-asset"
              >
                {walletAssets(sendForm.walletId).length === 0 && <option value="">No assets</option>}
                {walletAssets(sendForm.walletId).map(a => (
                  <option key={a.id} value={a.symbol}>{a.symbol} — {a.balance.toFixed(4)} available</option>
                ))}
              </select>
            </div>
            <Input
              label="Recipient Address"
              placeholder="0x..."
              fullWidth
              value={sendForm.toAddress}
              onChange={(e) => setSendForm(f => ({ ...f, toAddress: e.target.value }))}
              data-testid="crypto-send-address"
            />
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              fullWidth
              value={sendForm.amount}
              onChange={(e) => setSendForm(f => ({ ...f, amount: e.target.value }))}
              data-testid="crypto-send-amount"
            />
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}
            <Button variant="primary" fullWidth onClick={handleSend} disabled={actionLoading} data-testid="crypto-send-submit">
              {actionLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Receive Modal */}
      <Modal isOpen={actionModal === 'receive'} onClose={closeAction} title="Receive Crypto">
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">Share one of your wallet addresses to receive funds.</p>
          {wallets.length === 0 && <p className="text-[var(--text-3)]">No wallets available.</p>}
          {wallets.map(w => (
            <div key={w.id} className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--glass-border)]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[var(--text-1)]">{w.name}</span>
                <span className="text-xs text-[var(--text-3)]">{w.network}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-[var(--text-2)] truncate flex-1">{w.address || 'No address'}</code>
                {w.address && (
                  <button
                    onClick={() => copyAddress(w.address)}
                    className="p-1 rounded hover:bg-[rgba(var(--glass-rgb),0.5)]"
                    aria-label="Copy address"
                  >
                    {copiedAddress === w.address ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-[var(--text-2)]" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Swap Modal */}
      <Modal isOpen={actionModal === 'swap'} onClose={closeAction} title="Swap Crypto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-2)] mb-1">Wallet</label>
            <select
              className="w-full p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--glass-border)] text-[var(--text-1)]"
              value={swapForm.walletId}
              onChange={(e) => setSwapForm(f => ({ ...f, walletId: e.target.value }))}
            >
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.network})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From Asset" placeholder="ETH" fullWidth value={swapForm.fromAsset} onChange={(e) => setSwapForm(f => ({ ...f, fromAsset: e.target.value.toUpperCase() }))} />
            <Input label="To Asset" placeholder="USDC" fullWidth value={swapForm.toAsset} onChange={(e) => setSwapForm(f => ({ ...f, toAsset: e.target.value.toUpperCase() }))} />
          </div>
          <Input label="Amount" type="number" placeholder="0.00" fullWidth value={swapForm.amount} onChange={(e) => setSwapForm(f => ({ ...f, amount: e.target.value }))} />
          {actionError && <p className="text-sm text-red-500">{actionError}</p>}
          {swapQuote && (
            <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--glass-border)] space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-2)]">You receive</span><span className="text-[var(--text-1)] font-medium">{swapQuote.to_amount} {swapForm.toAsset}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-2)]">Price impact</span><span className="text-[var(--text-1)]">{swapQuote.price_impact}%</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-2)]">Est. gas</span><span className="text-[var(--text-1)]">${swapQuote.gas_estimate_usd}</span></div>
              {swapQuote.route?.length > 0 && <div className="flex justify-between"><span className="text-[var(--text-2)]">Route</span><span className="text-[var(--text-1)]">{swapQuote.route.join(' → ')}</span></div>}
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleSwapQuote} disabled={actionLoading}>
            {actionLoading ? 'Getting quote...' : 'Get Quote'}
          </Button>
        </div>
      </Modal>

      {/* Stake Modal */}
      <Modal isOpen={actionModal === 'stake'} onClose={closeAction} title="Staking & DeFi">
        <div className="space-y-4">
          {actionLoading ? (
            <p className="text-[var(--text-2)]">Loading positions...</p>
          ) : stakePositions.length === 0 ? (
            <p className="text-[var(--text-2)]">You have no active staking or DeFi positions yet.</p>
          ) : (
            stakePositions.map((p, i) => (
              <div key={p.id ?? i} className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--glass-border)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-[var(--text-1)]">{p.protocol}</span>
                  <span className="text-xs text-[var(--text-3)] capitalize">{p.position_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-2)]">{p.amount} {p.asset_symbol}</span>
                  <span className="text-green-500">{p.apy}% APY</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
