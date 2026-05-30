import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import CreditCardsPage from '../page';
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
    trackCardApplication: jest.fn()
  })
}));

const mockFetchApi = apiClient as jest.Mocked<typeof apiClient>;

describe('CreditCardsPage', () => {
  const mockCreditScore = {
    credit_score: 750,
    score_range: 'Very Good',
    factors: {
      payment_history: { score: 98, impact: 'positive', description: 'Excellent payment history' },
      credit_utilization: { score: 25.5, impact: 'positive', description: 'Low utilization' },
      credit_age: { months: 84, impact: 'positive', description: '7 years' },
      credit_mix: { types: ['credit_cards', 'auto_loan'], impact: 'positive', description: 'Good mix' },
      recent_inquiries: { count: 1, impact: 'neutral', description: '1 inquiry in last 6 months' }
    },
    last_updated: '2024-01-15T10:00:00Z'
  };

  const mockRecommendations = [
    {
      card_offer_id: 1,
      card_name: 'Cashback Plus Card',
      issuer: 'Test Bank',
      card_type: 'cashback',
      match_score: 95,
      reasons: ['High cashback rate', 'No annual fee', 'Good for your spending pattern'],
      annual_fee: 0,
      benefits: ['3% cashback on dining', '2% on groceries', '1% on all other purchases'],
      apr_range: '15.99% - 25.99%',
      estimated_credit_limit: '$5,000 - $10,000',
      pre_qualified: true
    }
  ];

  const mockOffers = [
    {
      id: 1,
      name: 'Cashback Plus Card',
      issuer: 'Test Bank',
      type: 'cashback',
      annual_fee: 0,
      min_credit_score: 670,
      apr_range: '15.99% - 25.99%',
      benefits: ['3% cashback on dining', '2% on groceries', '1% on all other purchases'],
      signup_bonus: 200,
      cashback_rate: 3,
      credit_limit_range: '$1,000 - $10,000'
    },
    {
      id: 2,
      name: 'Travel Rewards Card',
      issuer: 'Test Bank',
      type: 'travel',
      annual_fee: 95,
      min_credit_score: 720,
      apr_range: '17.99% - 27.99%',
      benefits: ['3x points on travel', '2x points on dining', 'Airport lounge access'],
      signup_bonus: 50000,
      points_multiplier: 3,
      credit_limit_range: '$5,000 - $25,000'
    }
  ];

  const mockApplications = [
    {
      id: 1,
      card_name: 'Previous Card',
      issuer: 'Another Bank',
      status: 'approved',
      application_date: '2024-01-01T10:00:00Z',
      decision_date: '2024-01-02T10:00:00Z',
      approved_credit_limit: 5000
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchApi.get = jest.fn() as never;
    mockFetchApi.post = jest.fn() as never;
    mockFetchApi.put = jest.fn() as never;
    mockFetchApi.delete = jest.fn() as never;
    (mockFetchApi.get as jest.Mock<(url: string, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
      if (url === '/api/credit-cards/credit-score') {
        return Promise.resolve(mockCreditScore);
      }
      if (url === '/api/credit-cards/recommendations') {
        return Promise.resolve(mockRecommendations);
      }
      if (url === '/api/credit-cards/offers') {
        return Promise.resolve(mockOffers);
      }
      if (url === '/api/credit-cards/applications') {
        return Promise.resolve(mockApplications);
      }
      return Promise.resolve([]);
    });
    mockFetchApi.post.mockResolvedValue({});
  });

  test('renders credit cards page and loads data', async () => {
    render(<CreditCardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Credit Cards')).toBeInTheDocument();
      expect(screen.getByText('Find the perfect credit card for your needs')).toBeInTheDocument();
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('750')).toBeInTheDocument(); // Credit score
      expect(screen.getByText('Very Good')).toBeInTheDocument();
    });

    expect(mockFetchApi.get).toHaveBeenCalledWith('/api/credit-cards/credit-score');
  });

  test('displays credit score summary correctly', async () => {
    render(<CreditCardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Credit Score')).toBeInTheDocument();
      expect(screen.getByText('750')).toBeInTheDocument();
      expect(screen.getByText('Payment History')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
      expect(screen.getByText('Credit Utilization')).toBeInTheDocument();
      expect(screen.getByText('25.5%')).toBeInTheDocument();
    });
  });

  test('tab navigation works correctly', async () => {
    render(<CreditCardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cards Matched to Your Profile')).toBeInTheDocument();
    });

    // Click on Browse All Cards tab
    fireEvent.click(screen.getByText('Browse All Cards') || screen.getByText('Browse'));
    expect(screen.getByPlaceholderText('Search cards...')).toBeInTheDocument();

    // Click on My Applications tab
    fireEvent.click(screen.getByText('My Applications') || screen.getByText('Applications'));
    expect(screen.getByText('Previous Card')).toBeInTheDocument();
  });

  test('recommended cards display correctly', async () => {
    render(<CreditCardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cashback Plus Card')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument(); // Match score
      expect(screen.getByText('Pre-Qualified')).toBeInTheDocument();
      expect(screen.getByText('High cashback rate')).toBeInTheDocument();
    });
  });

  test('card search and filter functionality', async () => {
    render(<CreditCardsPage />);

    // Navigate to Browse tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Browse All Cards') || screen.getByText('Browse'));
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search cards...');
    fireEvent.change(searchInput, { target: { value: 'Travel' } });

    // Select filter
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'travel' } });

    await waitFor(() => {
      expect(screen.getByText('Travel Rewards Card')).toBeInTheDocument();
      expect(screen.queryByText('Cashback Plus Card')).not.toBeInTheDocument();
    });
  });

  test('application modal opens and closes', async () => {
    render(<CreditCardsPage />);

    await waitFor(() => {
      const applyButton = screen.getAllByText('Apply Now')[0];
      fireEvent.click(applyButton);
    });

    // Check modal is open
    expect(screen.getByText('Card Benefits')).toBeInTheDocument();
    expect(screen.getByText('Terms & Rates')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Card Benefits')).not.toBeInTheDocument();
    });
  });

  test('eligibility check displays correctly', async () => {
    render(<CreditCardsPage />);

    // Navigate to Browse tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Browse All Cards') || screen.getByText('Browse'));
    });

    // Cards should show eligibility based on credit score
    await waitFor(() => {
      // User has score 750, so should be eligible for card requiring 670
      const eligibleCard = screen.getByText('Cashback Plus Card').closest('div');
      expect(eligibleCard).not.toHaveClass('opacity-75');
      
      // Should also be eligible for card requiring 720
      const travelCard = screen.getByText('Travel Rewards Card').closest('div');
      expect(travelCard).not.toHaveClass('opacity-75');
    });
  });

  test('application submission works', async () => {
    (mockFetchApi.post as jest.Mock<(url: string, data?: unknown, options?: unknown) => Promise<unknown>>).mockImplementation((url: string) => {
      if (url === '/api/credit-cards/apply') {
        return Promise.resolve({
          status: 'approved',
          approved_credit_limit: 8000
        });
      }
      return Promise.resolve({});
    });

    window.alert = jest.fn();

    render(<CreditCardsPage />);

    await waitFor(() => {
      const applyButton = screen.getAllByText('Apply Now')[0];
      fireEvent.click(applyButton);
    });

    // Click Apply Now in modal
    const modalApplyButton = screen.getAllByText('Apply Now')[1];
    fireEvent.click(modalApplyButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Congratulations! Your application was approved with a credit limit of $8,000.00'
      );
    });
  });

  test('applications history displays correctly', async () => {
    render(<CreditCardsPage />);

    // Navigate to Applications tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('My Applications') || screen.getByText('Applications'));
    });

    await waitFor(() => {
      expect(screen.getByText('Previous Card')).toBeInTheDocument();
      expect(screen.getByText('Another Bank')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    });
  });

  test('error handling when API fails', async () => {
    mockFetchApi.get.mockRejectedValueOnce(new Error('API Error'));

    render(<CreditCardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Credit Cards')).toBeInTheDocument();
      expect(screen.getByText('No recommendations available yet. Try browsing all cards!')).toBeInTheDocument();
    });
  });
});
