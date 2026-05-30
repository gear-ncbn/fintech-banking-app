import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import InvestmentsPage from '../page';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  },
  APIClient: jest.fn(),
  APIError: class APIError extends Error {},
}));

jest.mock('@/hooks/useSyntheticTracking', () => ({
  useSyntheticTracking: () => ({
    trackInvestmentOrder: jest.fn(),
    trackPortfolioView: jest.fn(),
    trackAssetSearch: jest.fn(),
  }),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('InvestmentsPage', () => {
  const mockAccounts = [
    {
      id: 1,
      account_name: 'Test Investment Account',
      name: 'Test Investment Account',
      account_type: 'individual',
      balance: 50000,
      cash_balance: 10000,
      invested_balance: 40000,
      total_value: 50000,
      total_return: 5000,
      total_return_percentage: 12.5,
      buying_power: 10000,
      status: 'active',
      risk_level: 'medium',
      opened_date: '2024-01-01',
    },
  ];

  const mockPortfolio = {
    total_value: 50000,
    cash_balance: 10000,
    invested_balance: 40000,
    total_return: 5000,
    total_return_percentage: 12.5,
    positions: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        asset_type: 'stock',
        quantity: 100,
        avg_cost: 150,
        current_price: 175.5,
        current_value: 17550,
        total_return: 2550,
        total_return_percentage: 17,
      },
    ],
    allocation: [
      { asset_type: 'Stocks', value: 30000, percentage: 60, count: 4 },
      { asset_type: 'ETFs', value: 15000, percentage: 30, count: 2 },
      { asset_type: 'Crypto', value: 5000, percentage: 10, count: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    mockApiClient.get = jest.fn() as never;
    mockApiClient.post = jest.fn() as never;
    mockApiClient.put = jest.fn() as never;
    mockApiClient.delete = jest.fn() as never;
    mockApiClient.setAuthToken = jest.fn();
    mockApiClient.getAuthToken = jest.fn();
    fetchMock.mockResponse(JSON.stringify({
      total_value: 50000,
      day_change: 100,
      day_change_percent: 0.2,
      week_change: 200,
      week_change_percent: 0.4,
      month_change: 500,
      month_change_percent: 1,
      year_change: 5000,
      year_change_percent: 12.5,
      asset_allocation: { stocks: 70, etfs: 20, crypto: 10, cash: 0 },
      top_gainers: [],
      top_losers: [],
      performance_history: [],
    }));

    (mockApiClient.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
      if (url === '/api/investments/accounts') {
        return Promise.resolve(mockAccounts);
      }
      if (url.includes('/api/investments/portfolio/')) {
        return Promise.resolve(mockPortfolio);
      }
      return Promise.resolve([]);
    });
    mockApiClient.post.mockResolvedValue({});
  });

  test('renders investment page and loads portfolio data', async () => {
    render(<InvestmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Investment Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Manage your ETF, stock, and crypto investments')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText('$50,000.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Investment Options')).toBeInTheDocument();
    });

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/accounts');
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/investments/portfolio/1');
  });

  test('displays current investment options', async () => {
    render(<InvestmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ETFs')).toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
      expect(screen.getByText('Crypto')).toBeInTheDocument();
      expect(screen.getByText('Discover Investments')).toBeInTheDocument();
    });
  });

  test('shows positions in the holdings table', async () => {
    render(<InvestmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Holdings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Positions'));

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('$175.50')).toBeInTheDocument();
      expect(screen.getByText('$17,550.00')).toBeInTheDocument();
    });
  });

  test('renders allocation from the portfolio response', async () => {
    render(<InvestmentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Asset Allocation').length).toBeGreaterThan(0);
      expect(screen.getByText('Stocks: 60%')).toBeInTheDocument();
      expect(screen.getByText('ETFs: 30%')).toBeInTheDocument();
      expect(screen.getByText('Crypto: 10%')).toBeInTheDocument();
    });
  });

  test('handles investment API failures', async () => {
    mockApiClient.get.mockRejectedValue(new Error('API Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<InvestmentsPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching investment data:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
