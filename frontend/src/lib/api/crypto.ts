import { apiClient } from './client';
import { CryptoWallet, CryptoAsset, NFTAsset, CryptoTransaction, DeFiPosition, AssetBridge } from '@/types';

// Wallet Management
export const cryptoApi = {
  // Get all crypto wallets for user
  async getWallets() {
    return apiClient.get<CryptoWallet[]>('/api/crypto/wallets');
  },

  // Get specific wallet details
  async getWallet(walletId: string) {
    return apiClient.get<CryptoWallet>(`/api/crypto/wallets/${walletId}`);
  },

  // Create new wallet
  async createWallet(data: {
    name: string;
    network: string;
    type: string;
  }) {
    return apiClient.post<CryptoWallet>('/api/crypto/wallets', data);
  },

  // Update wallet
  async updateWallet(walletId: string, data: Partial<CryptoWallet>) {
    return apiClient.put<CryptoWallet>(`/api/crypto/wallets/${walletId}`, data);
  },

  // Delete wallet
  async deleteWallet(walletId: string) {
    return apiClient.delete<{ message: string }>(`/api/crypto/wallets/${walletId}`);
  },

  // Get crypto assets
  async getAssets(walletId?: string) {
    const params = walletId ? `?wallet_id=${walletId}` : '';
    return apiClient.get<CryptoAsset[]>(`/api/crypto/assets${params}`);
  },

  async getWalletAssets(walletId: string) {
    return apiClient.get<CryptoAsset[]>(`/api/crypto/wallets/${walletId}/assets`);
  },

  // Get NFT assets
  async getNFTs(walletId?: string) {
    const params = walletId ? `?wallet_id=${walletId}` : '';
    return apiClient.get<NFTAsset[]>(`/api/crypto/nfts${params}`);
  },

  // Get crypto transactions
  async getTransactions(walletId?: string, assetId?: string) {
    const params = new URLSearchParams();
    if (walletId) params.append('wallet_id', walletId);
    if (assetId) params.append('asset_id', assetId);
    return apiClient.get<CryptoTransaction[]>(`/api/crypto/transactions?${params.toString()}`);
  },

  // Send crypto (matches backend POST /api/crypto/transactions payload)
  async sendCrypto(data: {
    from_wallet_id: number;
    to_address: string;
    asset_symbol: string;
    amount: string;
    network: string;
    note?: string;
  }) {
    return apiClient.post<CryptoTransaction>('/api/crypto/transactions', data);
  },

  // Get a swap quote
  async getSwapQuote(data: {
    from_asset: string;
    to_asset: string;
    amount: string;
    wallet_id: number;
    slippage_tolerance?: number;
  }) {
    return apiClient.post<{
      from_asset: string;
      to_asset: string;
      from_amount: string;
      to_amount: string;
      price_impact: number;
      gas_estimate_usd: number;
      route: string[];
      expires_at: string;
    }>('/api/crypto/swap/quote', data);
  },

  // Execute crypto transaction
  async executeTransaction(data: {
    fromWalletId: string;
    toAddress: string;
    assetId: string;
    amount: number;
    network: string;
    type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake';
  }) {
    return apiClient.post<CryptoTransaction>('/api/crypto/transactions', data);
  },

  // Get DeFi positions
  async getDeFiPositions(walletId?: string) {
    const params = walletId ? `?wallet_id=${walletId}` : '';
    return apiClient.get<DeFiPosition[]>(`/api/crypto/defi/positions${params}`);
  },

  // Create DeFi position
  async createDeFiPosition(data: {
    walletId: string;
    protocol: string;
    positionType: string;
    assetId: string;
    amount: number;
    apy: number;
  }) {
    return apiClient.post<DeFiPosition>('/api/crypto/defi', data);
  },

  // Close DeFi position
  async closeDeFiPosition(positionId: string) {
    return apiClient.post<{ message: string; transaction: CryptoTransaction }>(`/api/crypto/defi/${positionId}/close`);
  },

  // Get asset bridges (for conversion)
  async getAssetBridges() {
    return apiClient.get<AssetBridge[]>('/api/crypto/bridges');
  },

  // Convert between assets
  async convertAsset(data: {
    fromAssetId: string;
    toAssetId: string;
    amount: number;
    fromWalletId: string;
    toWalletId?: string;
  }) {
    return apiClient.post<{
      transaction: CryptoTransaction;
      exchangeRate: number;
      fees: number;
    }>('/api/crypto/convert', data);
  },

  // Get market prices
  async getMarketPrices(assetIds?: string[]) {
    const params = assetIds ? `?assets=${assetIds.join(',')}` : '';
    return apiClient.get<Record<string, {
      usd: number;
      change24h: number;
      marketCap: number;
    }>>(`/api/crypto/prices${params}`);
  },

  // Get portfolio summary
  async getPortfolioSummary() {
    return apiClient.get<{
      totalValueUSD: number;
      totalValueBTC: number;
      change24h: number;
      change7d: number;
      topAssets: Array<{
        asset: CryptoAsset;
        valueUSD: number;
        percentage: number;
      }>;
      assetAllocation: Array<{
        assetType: string;
        valueUSD: number;
        percentage: number;
      }>;
    }>('/api/crypto/portfolio/summary');
  },

  // Get staking opportunities
  async getStakingOpportunities() {
    return apiClient.get<Array<{
      assetId: string;
      assetSymbol: string;
      apy: number;
      minimumStake: number;
      lockPeriod: number;
      protocol: string;
    }>>('/api/crypto/staking/opportunities');
  },

  // Estimate gas fees
  async estimateGasFees(network: string, transactionType: string) {
    return apiClient.get<{
      slow: number;
      standard: number;
      fast: number;
      currency: string;
    }>(`/api/crypto/gas-fees/${network}?type=${transactionType}`);
  }
};
