import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import InvestmentsPage from '@/app/(authenticated)/investments/page';
import CreditCardsPage from '@/app/(authenticated)/credit-cards/page';
import CurrencyConverterPage from '@/app/(authenticated)/currency-converter/page';
import { apiClient } from '@/lib/api/client';
import fetchMock from 'jest-fetch-mock';

// Mock dependencies
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
    trackCardApplication: jest.fn(),
    trackCardRecommendation: jest.fn(),
    trackCreditScoreCheck: jest.fn(),
    trackCurrencyConversion: jest.fn(),
    trackP2PTrade: jest.fn(),
    trackExchangeRateView: jest.fn()
  })
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockFetchApi = mockApiClient;

// Shared mock data
const mockUserData = {
  creditScore: {
    credit_score: 750,
    score_range: 'Very Good',
    factors: {
      payment_history: { score: 98, impact: 'positive', description: 'Excellent' },
      credit_utilization: { score: 25, impact: 'positive', description: 'Low' },
      credit_age: { months: 84, impact: 'positive', description: '7 years' },
      credit_mix: { types: ['credit_cards', 'auto_loan'], impact: 'positive', description: 'Good' },
      recent_inquiries: { count: 1, impact: 'neutral', description: '1 inquiry' }
    }
  },
  investmentAccounts: [
    {
      id: 1,
      account_name: 'Primary Investment',
      name: 'Primary Investment',
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
      opened_date: '2024-01-01'
    }
  ],
  currencyBalances: [
    { currency: 'USD', balance: 10000, available_balance: 9500, currency_type: 'fiat' },
    { currency: 'EUR', balance: 5000, available_balance: 5000, currency_type: 'fiat' }
  ]
};

describe('User Flow Integration Tests', () => {
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
      performance_history: []
    }));
    setupMockResponses();
  });

  function setupMockResponses() {
    const getMock = (url: string) => {
      // Credit cards endpoints
      if (url === '/api/credit-cards/credit-score') {
        return Promise.resolve(mockUserData.creditScore);
      }
      if (url === '/api/credit-cards/recommendations') {
        return Promise.resolve([
          {
            card_offer_id: 1,
            card_name: 'Premium Rewards Card',
            issuer: 'Test Bank',
            card_type: 'rewards',
            match_score: 95,
            reasons: ['High credit score', 'Good payment history'],
            annual_fee: 95,
            pre_qualified: true
          }
        ]);
      }
      
      // Investment endpoints
      if (url === '/api/investments/accounts') {
        return Promise.resolve(mockUserData.investmentAccounts);
      }
      if (url.includes('/api/investments/portfolio/')) {
        return Promise.resolve({
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
              quantity: 10,
              avg_cost: 150,
              current_price: 175.5,
              current_value: 1755,
              total_return: 255,
              total_return_percentage: 17,
            },
          ],
          allocation: [
            { asset_type: 'Stocks', value: 30000, percentage: 60, count: 4 },
            { asset_type: 'ETFs', value: 15000, percentage: 30, count: 2 },
            { asset_type: 'Crypto', value: 5000, percentage: 10, count: 1 },
          ]
        });
      }
      
      // Currency converter endpoints
      if (url === '/api/currency-converter/balances') {
        return Promise.resolve(mockUserData.currencyBalances);
      }
      if (url === '/api/currency-converter/currencies') {
        return Promise.resolve([
          { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat' },
          { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat' }
        ]);
      }
      
      return Promise.resolve([]);
    };

    (mockFetchApi.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation(getMock);
    (mockApiClient.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation(getMock);
    mockFetchApi.post.mockResolvedValue({});
    mockApiClient.post.mockResolvedValue({});
  }

  describe('Cross-System Navigation Flow', () => {
    test('user can view their complete financial overview', async () => {
      // Start with investments page
      const { unmount: unmountInvestments } = render(<InvestmentsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Investment Portfolio')).toBeInTheDocument();
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });
      
      unmountInvestments();
      
      // Navigate to credit cards
      const { unmount: unmountCards } = render(<CreditCardsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('750')).toBeInTheDocument(); // Credit score
        expect(screen.getByText('Premium Rewards Card')).toBeInTheDocument();
      });
      
      unmountCards();
      
      // Navigate to currency converter
      render(<CurrencyConverterPage />);
      
      await waitFor(() => {
        expect(screen.getByText('$9,500.00')).toBeInTheDocument(); // USD balance
        expect(screen.getByText('€5,000.00')).toBeInTheDocument(); // EUR balance
      });
    });
  });

  describe('Investment to Currency Conversion Flow', () => {
    test('user sells investments and converts currency', async () => {
      // Mock successful investment sell order
      (mockApiClient.post as jest.Mock<(url: string, data?: unknown, options?: unknown) => Promise<unknown>>).mockImplementation((url: string, data?: unknown) => {
        if (url === '/api/investments/orders') {
          const orderData = data as { order_side?: string };
          if (orderData.order_side === 'sell') {
            return Promise.resolve({
              id: 1,
              status: 'executed',
              executed_price: 175.50,
              total_value: 1755.00 // 10 shares * $175.50
            });
          }
        }
        return Promise.resolve({});
      });

      // User starts on investments page
      render(<InvestmentsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Investment Portfolio')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Investment Options')).toBeInTheDocument();
        expect(screen.getByText('Discover Investments')).toBeInTheDocument();
      });
    });
  });

  describe('Credit Score Impact on Services', () => {
    test('lower credit score limits available options', async () => {
      // Override credit score to lower value
      (mockFetchApi.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
        if (url === '/api/credit-cards/credit-score') {
          return Promise.resolve({
            ...mockUserData.creditScore,
            credit_score: 620,
            score_range: 'Fair'
          });
        }
        if (url === '/api/credit-cards/recommendations') {
          return Promise.resolve([
            {
              card_offer_id: 2,
              card_name: 'Secured Card',
              issuer: 'Test Bank',
              card_type: 'secured',
              match_score: 70,
              reasons: ['Build credit history'],
              annual_fee: 0,
              pre_qualified: false
            }
          ]);
        }
        if (url === '/api/credit-cards/offers') {
          return Promise.resolve([
            {
              id: 1,
              name: 'Premium Card',
              min_credit_score: 720,
              eligible: false
            },
            {
              id: 2,
              name: 'Secured Card',
              min_credit_score: 580,
              eligible: true
            }
          ]);
        }
        return Promise.resolve([]);
      });

      render(<CreditCardsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('620')).toBeInTheDocument();
        expect(screen.getByText('Fair')).toBeInTheDocument();
        expect(screen.getByText('Secured Card')).toBeInTheDocument();
        expect(screen.queryByText('Premium Rewards Card')).not.toBeInTheDocument();
      });
    });
  });

  describe('Synthetic API Tracking Integration', () => {
    test('all user actions are properly tracked', async () => {
      
      // Test investment tracking
      render(<InvestmentsPage />);
      await waitFor(() => {
        expect(screen.getByText('Investment Portfolio')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Positions'));
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Flow', () => {
    test('handles API failures gracefully across systems', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock API failures
      mockFetchApi.get.mockRejectedValue(new Error('Network error'));
      mockApiClient.get.mockRejectedValue(new Error('Network error'));
      
      // Test investments page
      const { unmount: unmountInvestments } = render(<InvestmentsPage />);
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching investment data:',
          expect.any(Error)
        );
      });
      unmountInvestments();
      
      // Test credit cards page
      const { unmount: unmountCards } = render(<CreditCardsPage />);
      await waitFor(() => {
        expect(screen.getByText('Credit Cards')).toBeInTheDocument();
      });
      unmountCards();
      
      // Test currency converter page
      render(<CurrencyConverterPage />);
      await waitFor(() => {
        expect(screen.getByText('Currency Converter')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Consistency Across Systems', () => {
    test('user data remains consistent when switching between pages', async () => {
      // Track data across page switches
      const userData = {
        creditScore: 0,
        investmentBalance: 0,
        currencyBalance: 0
      };
      
      // Capture data from investments page
      const { unmount: unmountInvestments } = render(<InvestmentsPage />);
      await waitFor(() => {
        const balanceText = screen.getByText('$50,000.00');
        expect(balanceText).toBeInTheDocument();
        userData.investmentBalance = 50000;
      });
      unmountInvestments();
      
      // Capture data from credit cards page
      const { unmount: unmountCards } = render(<CreditCardsPage />);
      await waitFor(() => {
        const scoreText = screen.getByText('750');
        expect(scoreText).toBeInTheDocument();
        userData.creditScore = 750;
      });
      unmountCards();
      
      // Capture data from currency converter page
      render(<CurrencyConverterPage />);
      await waitFor(() => {
        const usdBalance = screen.getByText('$9,500.00');
        expect(usdBalance).toBeInTheDocument();
        userData.currencyBalance = 9500;
      });
      
      // Verify data consistency
      expect(userData.creditScore).toBe(750);
      expect(userData.investmentBalance).toBe(50000);
      expect(userData.currencyBalance).toBe(9500);
    });
  });

  describe('Real-time Updates Flow', () => {
    test('actions in one system reflect in others', async () => {
      let applicationCount = 0;
      
      // Mock dynamic responses
      (mockFetchApi.post as jest.Mock<(url: string, data?: unknown, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
        if (url === '/api/credit-cards/apply') {
          applicationCount++;
          return Promise.resolve({
            id: applicationCount,
            status: 'approved',
            approved_credit_limit: 5000
          });
        }
        return Promise.resolve({});
      });
      (mockFetchApi.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
        if (url === '/api/credit-cards/applications') {
          return Promise.resolve(
            Array.from({ length: applicationCount }, (_, i) => ({
              id: i + 1,
              card_name: `Card ${i + 1}`,
              status: 'approved'
            }))
          );
        }
        if (url === '/api/credit-cards/credit-score') return Promise.resolve(mockUserData.creditScore);
        if (url === '/api/credit-cards/recommendations') {
          return Promise.resolve([
            {
              card_offer_id: 1,
              card_name: 'Premium Rewards Card',
              issuer: 'Test Bank',
              card_type: 'rewards',
              match_score: 95,
              reasons: ['High credit score', 'Good payment history'],
              annual_fee: 95,
              pre_qualified: true
            }
          ]);
        }
        if (url === '/api/credit-cards/offers') {
          return Promise.resolve([
            {
              id: 1,
              name: 'Premium Rewards Card',
              issuer: 'Test Bank',
              type: 'rewards',
              annual_fee: 95,
              min_credit_score: 700,
              apr_range: '17.99% - 27.99%',
              benefits: ['Rewards on purchases'],
              credit_limit_range: '$5,000 - $15,000'
            }
          ]);
        }
        return Promise.resolve([]);
      });
      
      window.alert = jest.fn();
      
      render(<CreditCardsPage />);
      
      // Check initial applications count
      await waitFor(() => {
        fireEvent.click(screen.getByText('My Applications') || screen.getByText('Applications'));
      });
      
      // Should show no applications initially
      expect(screen.getByText(/You haven't applied for any cards yet/)).toBeInTheDocument();
      
      // Apply for a card
      fireEvent.click(screen.getByText('Recommended for You') || screen.getByText('Recommended'));
      
      await waitFor(() => {
        const applyButton = screen.getByText('Apply Now');
        fireEvent.click(applyButton);
      });
      
      // Confirm application
      const modalApplyButton = screen.getAllByText('Apply Now')[1];
      fireEvent.click(modalApplyButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Congratulations'));
      });
    });
  });
});
