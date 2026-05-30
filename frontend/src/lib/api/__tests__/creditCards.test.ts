import { jest } from '@jest/globals';
import { creditCardsService, CardCategory, ApplicationStatus, EmploymentType } from '../creditCards';
import { apiClient } from '../client';

// Mock apiClient
jest.mock('../client');

describe('CreditCardsService', () => {
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

  describe('Credit Score', () => {
    test('getCreditScore fetches user credit score', async () => {
      const mockScore = {
        score: 750,
        rating: 'very_good',
        factors: {
          payment_history: { score: 98, impact: 'positive' },
          credit_utilization: { score: 25, impact: 'positive' }
        }
      };
      mockApiClient.get.mockResolvedValueOnce(mockScore);

      const result = await creditCardsService.getCreditScore();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/credit-score');
      expect(result).toEqual(mockScore);
    });

    test('updateCreditScore updates score', async () => {
      const mockResponse = { score: 760, rating: 'very_good' };
      mockApiClient.put.mockResolvedValueOnce(mockResponse);

      const result = await creditCardsService.updateCreditScore(760);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/credit-cards/credit-score', { score: 760 });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Card Offers', () => {
    test('getCards fetches all cards', async () => {
      const mockCards = [
        { id: 1, card_name: 'Test Card', category: CardCategory.CASH_BACK }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockCards);

      const result = await creditCardsService.getCards();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards');
      expect(result).toEqual(mockCards);
    });

    test('getCards with filters', async () => {
      const mockCards = [
        { id: 1, card_name: 'Travel Card', category: CardCategory.TRAVEL }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockCards);

      const result = await creditCardsService.getCards({
        category: CardCategory.TRAVEL,
        min_credit_score: 700
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/credit-cards?category=travel&min_credit_score=700'
      );
      expect(result).toEqual(mockCards);
    });

    test('getCard fetches specific card', async () => {
      const mockCard = { id: 1, card_name: 'Test Card' };
      mockApiClient.get.mockResolvedValueOnce(mockCard);

      const result = await creditCardsService.getCard(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/1');
      expect(result).toEqual(mockCard);
    });

    test('getFeaturedCards fetches featured cards', async () => {
      const mockCards = [
        { id: 1, card_name: 'Featured Card', is_featured: true }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockCards);

      const result = await creditCardsService.getFeaturedCards();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/featured');
      expect(result).toEqual(mockCards);
    });
  });

  describe('Recommendations', () => {
    test('getRecommendations fetches basic recommendations', async () => {
      const mockRecommendations = [
        { card: { id: 1, name: 'Recommended Card' }, match_score: 0.95 }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockRecommendations);

      const result = await creditCardsService.getRecommendations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/recommendations');
      expect(result).toEqual(mockRecommendations);
    });

    test('getRecommendations with parameters', async () => {
      const mockRecommendations = [
        { card: { id: 1, name: 'Travel Card' }, match_score: 0.9 }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockRecommendations);

      const result = await creditCardsService.getRecommendations({
        income_level: 'high',
        spending_categories: ['travel', 'dining']
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/credit-cards/recommendations?income_level=high&spending_categories=travel%2Cdining'
      );
      expect(result).toEqual(mockRecommendations);
    });

    test('getPersonalizedRecommendations fetches personalized recommendations', async () => {
      const mockRecommendations = [
        { card: { id: 1, name: 'Personalized Card' }, match_score: 0.98 }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockRecommendations);

      const result = await creditCardsService.getPersonalizedRecommendations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/recommendations/personalized');
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('Applications', () => {
    test('submitApplication creates new application', async () => {
      const applicationData = {
        card_id: 1,
        annual_income: 75000,
        employment_type: EmploymentType.FULL_TIME,
        employment_duration_months: 36,
        housing_payment: 1500,
        existing_cards_count: 2
      };
      const mockResponse = { id: 1, status: ApplicationStatus.PENDING };
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await creditCardsService.submitApplication(applicationData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/credit-cards/applications', applicationData);
      expect(result).toEqual(mockResponse);
    });

    test('getApplications fetches all applications', async () => {
      const mockApplications = [
        { id: 1, card_name: 'Test Card', status: ApplicationStatus.APPROVED }
      ];
      mockApiClient.get.mockResolvedValueOnce(mockApplications);

      const result = await creditCardsService.getApplications();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/applications');
      expect(result).toEqual(mockApplications);
    });

    test('getApplication fetches specific application', async () => {
      const mockApplication = { id: 1, status: ApplicationStatus.APPROVED };
      mockApiClient.get.mockResolvedValueOnce(mockApplication);

      const result = await creditCardsService.getApplication(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/applications/1');
      expect(result).toEqual(mockApplication);
    });

    test('withdrawApplication withdraws application', async () => {
      const mockResponse = { id: 1, status: ApplicationStatus.WITHDRAWN };
      mockApiClient.put.mockResolvedValueOnce(mockResponse);

      const result = await creditCardsService.withdrawApplication(1);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/credit-cards/applications/1/withdraw', {});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Card Comparison', () => {
    test('compareCards compares multiple cards', async () => {
      const mockComparison = {
        cards: [
          { id: 1, name: 'Card A' },
          { id: 2, name: 'Card B' }
        ],
        comparison_matrix: [
          { feature: 'Annual Fee', values: [0, 95] }
        ]
      };
      mockApiClient.post.mockResolvedValueOnce(mockComparison);

      const result = await creditCardsService.compareCards([1, 2]);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/credit-cards/compare', { card_ids: [1, 2] });
      expect(result).toEqual(mockComparison);
    });
  });

  describe('Eligibility', () => {
    test('checkEligibility checks card eligibility', async () => {
      const mockEligibility = {
        eligible: true,
        approval_odds: 'high',
        reasons: ['Good credit score', 'Low utilization']
      };
      mockApiClient.post.mockResolvedValueOnce(mockEligibility);

      const result = await creditCardsService.checkEligibility(1);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/credit-cards/1/check-eligibility', {});
      expect(result).toEqual(mockEligibility);
    });
  });

  describe('Analytics', () => {
    test('getApplicationStats fetches application statistics', async () => {
      const mockStats = {
        total_applications: 10,
        approved_count: 7,
        rejected_count: 2,
        pending_count: 1,
        approval_rate: 0.7
      };
      mockApiClient.get.mockResolvedValueOnce(mockStats);

      const result = await creditCardsService.getApplicationStats();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/credit-cards/applications/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(creditCardsService.getCreditScore()).rejects.toThrow('API Error');
    });
  });
});