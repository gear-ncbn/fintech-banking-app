import { jest } from '@jest/globals';
import { investmentsService, AssetType, OrderType, OrderSide, InvestmentAccountType } from '../investments';
import { apiClient } from '../client';

// Mock apiClient
jest.mock('../client');

describe('InvestmentsService', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Manually set up mock functions
    mockApiClient.get = jest.fn() as never;
    mockApiClient.post = jest.fn() as never;
    mockApiClient.put = jest.fn() as never;
    mockApiClient.delete = jest.fn() as never;
    mockApiClient.setAuthToken = jest.fn();
    mockApiClient.getAuthToken = jest.fn();
  });

  describe('Account Management', () => {
    test('getAccounts fetches all accounts', async () => {
      const mockAccounts = [
        { id: 1, account_name: 'Test Account', balance: 10000 }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockAccounts);

      const result = await investmentsService.getAccounts();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/accounts');
      expect(result).toEqual(mockAccounts);
    });

    test('getAccount fetches specific account', async () => {
      const mockAccount = { id: 1, account_name: 'Test Account', balance: 10000 };
      mockApiClient.get.mockResolvedValueOnce(mockAccount);

      const result = await investmentsService.getAccount(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/accounts/1');
      expect(result).toEqual(mockAccount);
    });

    test('createAccount creates new account', async () => {
      const newAccount = {
        account_type: InvestmentAccountType.INDIVIDUAL,
        account_name: 'New Account',
        initial_deposit: 5000
      };
      const mockResponse = { id: 2, ...newAccount };
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await investmentsService.createAccount(newAccount);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/investments/accounts', newAccount);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Portfolio Management', () => {
    test('getPortfolio fetches portfolio data', async () => {
      const mockPortfolio = {
        total_value: 50000,
        cash_balance: 10000,
        positions: []
      };
      mockApiClient.get.mockResolvedValueOnce(mockPortfolio);

      const result = await investmentsService.getPortfolio(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/portfolio/1');
      expect(result).toEqual(mockPortfolio);
    });

    test('getPortfolioPerformance fetches performance data', async () => {
      const mockPerformance = {
        dates: ['2024-01-01', '2024-01-02'],
        values: [50000, 51000],
        returns: [0, 2]
      };
      mockApiClient.get.mockResolvedValueOnce(mockPerformance);

      const result = await investmentsService.getPortfolioPerformance(1, '1M');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/accounts/1/performance?period=1M');
      expect(result).toEqual(mockPerformance);
    });
  });

  describe('Asset Search and Trading', () => {
    test('searchAssets searches with query', async () => {
      const mockAssets = [
        { id: 1, symbol: 'AAPL', name: 'Apple Inc.', asset_type: AssetType.STOCK }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockAssets);

      const result = await investmentsService.searchAssets({ query: 'AAPL' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/assets/search?query=AAPL');
      expect(result).toEqual(mockAssets);
    });

    test('searchAssets searches by type', async () => {
      const mockAssets = [
        { id: 2, symbol: 'VOO', name: 'Vanguard S&P 500', asset_type: AssetType.ETF }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockAssets);

      const result = await investmentsService.searchAssets({ asset_type: AssetType.ETF });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/assets/search?asset_type=etf');
      expect(result).toEqual(mockAssets);
    });

    test('placeOrder creates new order', async () => {
      const orderData = {
        account_id: 1,
        asset_id: 1,
        order_type: OrderType.MARKET,
        order_side: OrderSide.BUY,
        quantity: 10
      };
      const mockOrder = { id: 1, ...orderData, status: 'pending' };
      mockApiClient.post.mockResolvedValueOnce(mockOrder);

      const result = await investmentsService.placeOrder(orderData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/investments/orders', orderData);
      expect(result).toEqual(mockOrder);
    });

    test('cancelOrder cancels existing order', async () => {
      const mockResponse = { success: true };
      mockApiClient.put.mockResolvedValueOnce(mockResponse);

      const result = await investmentsService.cancelOrder(1);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/investments/orders/1/cancel', {});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Watchlist Management', () => {
    test('getWatchlists fetches all watchlists', async () => {
      const mockWatchlists = [
        { id: 1, name: 'Tech Stocks', assets: [] }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockWatchlists);

      const result = await investmentsService.getWatchlists();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/watchlists');
      expect(result).toEqual(mockWatchlists);
    });

    test('createWatchlist creates new watchlist', async () => {
      const mockWatchlist = { id: 2, name: 'My Watchlist', assets: [] };
      mockApiClient.post.mockResolvedValueOnce(mockWatchlist);

      const result = await investmentsService.createWatchlist('My Watchlist');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/investments/watchlists', { name: 'My Watchlist' });
      expect(result).toEqual(mockWatchlist);
    });

    test('addToWatchlist adds asset to watchlist', async () => {
      const mockResponse = { success: true };
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await investmentsService.addToWatchlist(1, 2);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/investments/watchlists/1/assets', { asset_id: 2 });
      expect(result).toEqual(mockResponse);
    });

    test('removeFromWatchlist removes asset from watchlist', async () => {
      const mockResponse = { success: true };
      mockApiClient.delete.mockResolvedValueOnce(mockResponse);

      const result = await investmentsService.removeFromWatchlist(1, 2);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/investments/watchlists/1/assets/2');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(investmentsService.getAccounts()).rejects.toThrow('API Error');
    });
  });
});