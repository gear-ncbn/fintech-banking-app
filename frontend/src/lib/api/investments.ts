import { apiClient } from './client';

// Enums
export enum InvestmentAccountType {
  INDIVIDUAL = 'individual',
  IRA = 'ira',
  ROTH_IRA = 'roth_ira',
  JOINT = 'joint',
  TRUST = 'trust'
}

export enum AssetType {
  ETF = 'etf',
  STOCK = 'stock',
  CRYPTO = 'crypto'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

export enum OrderStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

// Interfaces
export interface InvestmentAccount {
  id: number;
  user_id: number;
  account_name: string;
  account_type: InvestmentAccountType;
  account_number: string;
  cash_balance: number;
  buying_power: number;
  total_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  asset_type: AssetType;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap?: number;
  volume_24h?: number;
  last_updated: string;
}

export interface Position {
  id: number;
  account_id: number;
  asset_id: number;
  quantity: number;
  average_cost: number;
  current_value: number;
  unrealized_gain_loss: number;
  unrealized_gain_loss_percentage: number;
  asset: Asset;
}

export interface TradeOrder {
  id: number;
  account_id: number;
  asset_id: number;
  order_type: OrderType;
  order_side: OrderSide;
  quantity: number;
  price?: number;
  stop_price?: number;
  status: OrderStatus;
  filled_quantity: number;
  average_fill_price?: number;
  created_at: string;
  executed_at?: string;
  asset: Asset;
}

export interface Portfolio {
  account_id: number;
  total_value: number;
  cash_balance: number;
  invested_amount: number;
  total_gain_loss: number;
  total_gain_loss_percentage: number;
  positions: Position[];
  asset_allocation: {
    etf: number;
    stock: number;
    crypto: number;
  };
}

export interface PortfolioSummaryData {
  total_value: number;
  day_change: number;
  day_change_percent: number;
  week_change: number;
  week_change_percent: number;
  month_change: number;
  month_change_percent: number;
  year_change: number;
  year_change_percent: number;
  asset_allocation: {
    stocks: number;
    etfs: number;
    crypto: number;
    cash: number;
  };
  top_gainers: Array<{
    symbol: string;
    name: string;
    asset_type: string;
    current_value: number;
    gain_loss: number;
    gain_loss_percent: number;
  }>;
  top_losers: Array<{
    symbol: string;
    name: string;
    asset_type: string;
    current_value: number;
    gain_loss: number;
    gain_loss_percent: number;
  }>;
  performance_history: Array<{ month: string; value: number }>;
}

export interface Watchlist {
  id: number;
  user_id: number;
  name: string;
  assets: Asset[];
  created_at: string;
  updated_at: string;
}

// Request/Response types
export interface CreateInvestmentAccountRequest {
  account_name: string;
  account_type: InvestmentAccountType;
  initial_deposit?: number;
}

export interface TradeOrderRequest {
  account_id: number;
  asset_id: number;
  order_type: OrderType;
  order_side: OrderSide;
  quantity: number;
  price?: number;
  stop_price?: number;
}

export interface AddToWatchlistRequest {
  watchlist_id: number;
  asset_id: number;
}

export interface AssetSearchParams {
  query?: string;
  asset_type?: AssetType;
  limit?: number;
}

export interface OrderHistoryParams {
  account_id?: number;
  status?: OrderStatus;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// Service class
class InvestmentsService {
  // Investment Accounts
  async getAccounts(): Promise<InvestmentAccount[]> {
    return apiClient.get<InvestmentAccount[]>('/api/investments/accounts');
  }

  async getAccount(accountId: number): Promise<InvestmentAccount> {
    return apiClient.get<InvestmentAccount>(`/api/investments/accounts/${accountId}`);
  }

  async createAccount(data: CreateInvestmentAccountRequest): Promise<InvestmentAccount> {
    return apiClient.post<InvestmentAccount>('/api/investments/accounts', data);
  }

  async updateAccount(accountId: number, data: Partial<CreateInvestmentAccountRequest>): Promise<InvestmentAccount> {
    return apiClient.put<InvestmentAccount>(`/api/investments/accounts/${accountId}`, data);
  }

  async deleteAccount(accountId: number): Promise<void> {
    return apiClient.delete<void>(`/api/investments/accounts/${accountId}`);
  }

  // Portfolio
  async getPortfolio(accountId: number): Promise<Portfolio> {
    return apiClient.get<Portfolio>(`/api/investments/portfolio/${accountId}`);
  }

  async getPositions(accountId: number): Promise<Position[]> {
    return apiClient.get<Position[]>(`/api/investments/accounts/${accountId}/positions`);
  }

  // Trading
  async placeOrder(data: TradeOrderRequest): Promise<TradeOrder> {
    return apiClient.post<TradeOrder>('/api/investments/orders', data);
  }

  async getOrders(params?: OrderHistoryParams): Promise<TradeOrder[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiClient.get<TradeOrder[]>(`/api/investments/orders?${queryParams.toString()}`);
  }

  async getOrder(orderId: number): Promise<TradeOrder> {
    return apiClient.get<TradeOrder>(`/api/investments/orders/${orderId}`);
  }

  async cancelOrder(orderId: number): Promise<TradeOrder> {
    return apiClient.put<TradeOrder>(`/api/investments/orders/${orderId}/cancel`, {});
  }

  // Assets
  async searchAssets(params?: AssetSearchParams): Promise<Asset[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiClient.get<Asset[]>(`/api/investments/assets/search?${queryParams.toString()}`);
  }

  async getAsset(assetId: number): Promise<Asset> {
    return apiClient.get<Asset>(`/api/investments/assets/${assetId}`);
  }

  async getAssetBySymbol(symbol: string): Promise<Asset> {
    return apiClient.get<Asset>(`/api/investments/assets/symbol/${symbol}`);
  }

  // Watchlists
  async getWatchlists(): Promise<Watchlist[]> {
    return apiClient.get<Watchlist[]>('/api/investments/watchlists');
  }

  async getWatchlist(watchlistId: number): Promise<Watchlist> {
    return apiClient.get<Watchlist>(`/api/investments/watchlists/${watchlistId}`);
  }

  async createWatchlist(name: string): Promise<Watchlist> {
    return apiClient.post<Watchlist>('/api/investments/watchlists', { name });
  }

  async addToWatchlist(watchlistId: number, assetId: number): Promise<Watchlist> {
    return apiClient.post<Watchlist>(`/api/investments/watchlists/${watchlistId}/assets`, {
      asset_id: assetId
    });
  }

  async removeFromWatchlist(watchlistId: number, assetId: number): Promise<Watchlist> {
    return apiClient.delete<Watchlist>(`/api/investments/watchlists/${watchlistId}/assets/${assetId}`);
  }

  async deleteWatchlist(watchlistId: number): Promise<void> {
    return apiClient.delete<void>(`/api/investments/watchlists/${watchlistId}`);
  }

  // Analytics
  async getPerformanceHistory(accountId: number, period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL' = '1M'): Promise<{
    dates: string[];
    values: number[];
    returns: number[];
  }> {
    return apiClient.get(`/api/investments/accounts/${accountId}/performance?period=${period}`);
  }

  // Alias for backward compatibility with tests
  async getPortfolioPerformance(accountId: number, period: string = '1M'): Promise<{
    dates: string[];
    values: number[];
    returns: number[];
  }> {
    return this.getPerformanceHistory(accountId, period as '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL');
  }

  // Aggregate portfolio summary shared by the Investments and Analytics pages
  // so asset allocation stays consistent across the app.
  async getPortfolioSummary(): Promise<PortfolioSummaryData> {
    return apiClient.get<PortfolioSummaryData>('/api/investments/portfolio-summary');
  }
}

// Export singleton instance
export const investmentsService = new InvestmentsService();