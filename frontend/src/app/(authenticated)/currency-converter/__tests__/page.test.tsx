import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import CurrencyConverterPage from '../page';
import { apiClient } from '@/lib/api/client';

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
    trackCurrencyConversion: jest.fn(),
    trackP2PTrade: jest.fn()
  })
}));

const mockFetchApi = apiClient as jest.Mocked<typeof apiClient>;

describe('CurrencyConverterPage', () => {
  const mockCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat' },
    { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat' },
    { code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat' },
    { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto' }
  ];

  const mockBalances = [
    { currency: 'USD', balance: 10000, available_balance: 9500, pending_balance: 500, currency_type: 'fiat' },
    { currency: 'EUR', balance: 5000, available_balance: 5000, pending_balance: 0, currency_type: 'fiat' },
    { currency: 'BTC', balance: 0.5, available_balance: 0.5, pending_balance: 0, currency_type: 'crypto' }
  ];

  const mockExchangeRate = {
    currency_pair: {
      from_currency: 'USD',
      to_currency: 'EUR',
      from_type: 'fiat',
      to_type: 'fiat'
    },
    rate: 0.92,
    spread: 0.001,
    effective_rate: 0.921,
    fee_percentage: 0.1,
    minimum_amount: 1,
    maximum_amount: 10000,
    estimated_arrival: '1-2 business days',
    last_updated: '2024-01-15T10:00:00Z'
  };

  const mockQuote = {
    quote_id: 'QUOTE123',
    from_currency: 'USD',
    to_currency: 'EUR',
    from_amount: 1000,
    to_amount: 920,
    exchange_rate: 0.92,
    fee_amount: 5,
    total_amount: 1005,
    expires_at: '2024-01-15T10:30:00Z',
    estimated_arrival: '1-2 business days'
  };

  const mockP2POffers = [
    {
      id: 1,
      peer_name: 'TrustedTrader123',
      currency: 'USD',
      currency_type: 'fiat',
      amount_available: 5000,
      exchange_rate: 0.915,
      rate_adjustment: -0.5,
      min_transaction: 100,
      max_transaction: 1000,
      transfer_methods: ['bank_transfer', 'wire_transfer'],
      peer_rating: 4.8,
      completed_trades: 234,
      verification_level: 'verified',
      is_online: true
    }
  ];

  const mockTrades = [
    {
      id: 1,
      trade_id: 'TRADE123',
      seller_name: 'Seller123',
      buyer_name: 'john_doe',
      currency: 'USD',
      amount: 500,
      exchange_rate: 0.92,
      total_cost: 460,
      status: 'completed',
      created_at: '2024-01-10T10:00:00Z',
      expires_at: '2024-01-10T11:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchApi.get = jest.fn() as never;
    mockFetchApi.post = jest.fn() as never;
    mockFetchApi.put = jest.fn() as never;
    mockFetchApi.delete = jest.fn() as never;
    (mockFetchApi.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
      if (url === '/api/currency-converter/currencies') {
        return Promise.resolve(mockCurrencies);
      }
      if (url === '/api/currency-converter/balances') {
        return Promise.resolve(mockBalances);
      }
      if (url.includes('/api/currency-converter/exchange-rate/')) {
        return Promise.resolve(mockExchangeRate);
      }
      if (url.includes('/api/currency-converter/p2p/offers/search')) {
        return Promise.resolve(mockP2POffers);
      }
      if (url === '/api/currency-converter/p2p/trades') {
        return Promise.resolve(mockTrades);
      }
      return Promise.resolve([]);
    });
    (mockFetchApi.post as jest.Mock<(url: string, data?: unknown, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
      if (url === '/api/currency-converter/quote') {
        return Promise.resolve(mockQuote);
      }
      if (url === '/api/currency-converter/orders') {
        return Promise.resolve({ id: 1, status: 'pending' });
      }
      if (url === '/api/currency-converter/p2p/trades') {
        return Promise.resolve({ id: 2, status: 'pending' });
      }
      return Promise.resolve({});
    });
  });

  test('renders currency converter page and loads data', async () => {
    render(<CurrencyConverterPage />);

    await waitFor(() => {
      expect(screen.getByText('Currency Converter')).toBeInTheDocument();
      expect(screen.getByText('Exchange currencies with competitive rates and P2P trading')).toBeInTheDocument();
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Your Balances')).toBeInTheDocument();
      expect(screen.getByText('$9,500.00')).toBeInTheDocument(); // USD balance
    });

    expect(mockFetchApi.get).toHaveBeenCalledWith('/api/currency-converter/currencies');
  });

  test('currency conversion form works correctly', async () => {
    render(<CurrencyConverterPage />);

    await waitFor(() => {
      expect(screen.getByText('Currency Exchange')).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '1000' } });

    // Check exchange rate is displayed
    await waitFor(() => {
      expect(screen.getByText('1 USD = 0.9200 EUR')).toBeInTheDocument();
      expect(screen.getByText('0.9210 (0.10% spread)')).toBeInTheDocument();
    });

    // Check calculated amount
    expect(screen.getByDisplayValue('920.00')).toBeInTheDocument();
  });

  test('swap currencies button works', async () => {
    render(<CurrencyConverterPage />);

    await waitFor(() => {
      expect(screen.getByText('Currency Exchange')).toBeInTheDocument();
    });

    // Initial currencies
    const fromSelect = screen.getAllByRole('combobox')[0];
    const toSelect = screen.getAllByRole('combobox')[1];
    expect(fromSelect).toHaveValue('USD');
    expect(toSelect).toHaveValue('EUR');

    // Click swap button
    const swapButton = screen.getAllByRole('button').find((button) => button.textContent === '');
    expect(swapButton).toBeDefined();
    fireEvent.click(swapButton!);

    // Check currencies are swapped
    await waitFor(() => {
      expect(fromSelect).toHaveValue('EUR');
      expect(toSelect).toHaveValue('USD');
    });
  });

  test('quote creation and confirmation modal', async () => {
    window.alert = jest.fn();
    render(<CurrencyConverterPage />);

    await waitFor(() => {
      expect(screen.getByText('Currency Exchange')).toBeInTheDocument();
    });

    // Enter amount and get quote
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '1000' } });

    await waitFor(() => {
      expect(screen.getByText('Get Quote')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText('Get Quote'));

    // Check quote modal appears
    await waitFor(() => {
      expect(screen.getByText('Conversion Quote')).toBeInTheDocument();
      expect(screen.getByText('You send')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();
      expect(screen.getByText('You receive')).toBeInTheDocument();
      expect(screen.getByText('€920.00')).toBeInTheDocument();
    });

    // Confirm conversion
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Conversion order placed successfully!');
    });
  });

  test('P2P tab displays offers correctly', async () => {
    render(<CurrencyConverterPage />);

    // Navigate to P2P tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('P2P Exchange'));
    });

    await waitFor(() => {
      expect(screen.getByText('Find P2P Offers')).toBeInTheDocument();
    });

    // Search for offers
    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByText('Search Offers'));

    await waitFor(() => {
      expect(screen.getByText('TrustedTrader123')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument(); // Rating
      expect(screen.getByText('(234 trades)')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  test('P2P trade modal opens and closes', async () => {
    render(<CurrencyConverterPage />);

    // Navigate to P2P tab and search
    await waitFor(() => {
      fireEvent.click(screen.getByText('P2P Exchange'));
    });
    
    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByText('Search Offers'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Trade Now'));
    });

    // Check modal is open
    expect(screen.getByText('Confirm P2P Trade')).toBeInTheDocument();
    expect(screen.getByText('Trading with')).toBeInTheDocument();
    expect(screen.getByText('Funds will be held in escrow until both parties confirm the transaction')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Confirm P2P Trade')).not.toBeInTheDocument();
    });
  });

  test('history tab displays transactions', async () => {
    render(<CurrencyConverterPage />);

    // Navigate to History tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('History'));
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
      expect(screen.getByText('P2P Trade')).toBeInTheDocument();
      expect(screen.getByText('USD $500.00')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  test('displays user balances correctly', async () => {
    render(<CurrencyConverterPage />);

    await waitFor(() => {
      const balancesSection = screen.getByText('Your Balances').parentElement;
      expect(balancesSection).toBeInTheDocument();
      
      // Check USD balance
      expect(screen.getByText('USD')).toBeInTheDocument();
      expect(screen.getByText('$9,500.00')).toBeInTheDocument();
      
      // Check EUR balance
      expect(screen.getByText('EUR')).toBeInTheDocument();
      expect(screen.getByText('€5,000.00')).toBeInTheDocument();
    });
  });

  test('features section displays correctly', async () => {
    render(<CurrencyConverterPage />);

    await waitFor(() => {
      expect(screen.getByText('Why Use Our Service?')).toBeInTheDocument();
      expect(screen.getByText('Competitive Rates')).toBeInTheDocument();
      expect(screen.getByText('Best exchange rates with minimal spreads')).toBeInTheDocument();
      expect(screen.getByText('Secure Transactions')).toBeInTheDocument();
      expect(screen.getByText('Bank-level security for all transfers')).toBeInTheDocument();
      expect(screen.getByText('Fast Processing')).toBeInTheDocument();
      expect(screen.getByText('Most transfers complete within minutes')).toBeInTheDocument();
    });
  });

  test('error handling when API fails', async () => {
    mockFetchApi.get.mockRejectedValueOnce(new Error('API Error'));

    render(<CurrencyConverterPage />);

    await waitFor(() => {
      expect(screen.getByText('Currency Converter')).toBeInTheDocument();
      expect(screen.getByText('Your Balances')).toBeInTheDocument();
    });
  });

  test('empty state for P2P trades history', async () => {
    // Override trades to return empty array
    (mockFetchApi.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
      if (url === '/api/currency-converter/p2p/trades') {
        return Promise.resolve([]);
      }
      // Return default mocks for other endpoints
      if (url === '/api/currency-converter/currencies') return Promise.resolve(mockCurrencies);
      if (url === '/api/currency-converter/balances') return Promise.resolve(mockBalances);
      return Promise.resolve([]);
    });

    render(<CurrencyConverterPage />);

    // Navigate to History tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('History'));
    });

    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });
  });
});
