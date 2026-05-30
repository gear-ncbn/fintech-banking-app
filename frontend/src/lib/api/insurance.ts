import { apiClient } from './client';
import { InsurancePolicy, InsuranceClaim, InsuranceProvider } from '@/types';

export const insuranceApi = {
  // Get all insurance policies
  async getPolicies() {
    return apiClient.get<InsurancePolicy[]>('/api/insurance/policies');
  },

  // Get specific policy details
  async getPolicy(policyId: string) {
    return apiClient.get<InsurancePolicy>(`/api/insurance/policies/${policyId}`);
  },

  // Create new policy quote
  async createQuote(data: {
    policyType: 'health' | 'auto' | 'home' | 'life' | 'disability' | 'travel' | 'pet' | 'dental' | 'vision';
    coverageAmount: number;
    deductible: number;
    term?: number;
    details: Record<string, unknown>;
  }) {
    return apiClient.post<{
      quoteId: string;
      premium: number;
      coverage: Record<string, unknown>;
      providers: Array<{
        providerId: string;
        name: string;
        premium: number;
        rating: number;
      }>;
    }>('/api/insurance/quotes', data);
  },

  // Purchase policy from quote
  async purchasePolicy(quoteId: string, providerId: string) {
    return apiClient.post<InsurancePolicy>('/api/insurance/policies', { quoteId, providerId });
  },

  // Update policy
  async updatePolicy(policyId: string, data: Partial<InsurancePolicy>) {
    return apiClient.put<InsurancePolicy>(`/api/insurance/policies/${policyId}`, data);
  },

  // Cancel policy
  async cancelPolicy(policyId: string, reason: string, effectiveDate: string) {
    return apiClient.post<{ message: string; refundAmount?: number }>(`/api/insurance/policies/${policyId}/cancel`, { reason, effectiveDate });
  },

  // Get insurance claims
  async getClaims(policyId?: string) {
    const params = policyId ? `?policy_id=${policyId}` : '';
    return apiClient.get<InsuranceClaim[]>(`/api/insurance/claims${params}`);
  },

  // Get specific claim
  async getClaim(claimId: string) {
    return apiClient.get<InsuranceClaim>(`/api/insurance/claims/${claimId}`);
  },

  // File new claim (backend expects snake_case fields)
  async fileClaim(data: {
    policyId: string;
    claimType: string;
    description: string;
    amount: number;
    dateOfIncident: string;
    documents?: string[];
  }) {
    return apiClient.post<InsuranceClaim>('/api/insurance/claims', {
      policy_id: Number(data.policyId),
      claim_type: data.claimType,
      incident_date: data.dateOfIncident,
      amount_claimed: data.amount,
      description: data.description,
      supporting_documents: data.documents,
    });
  },

  // Update claim
  async updateClaim(claimId: string, data: {
    description?: string;
    amount?: number;
    documents?: string[];
  }) {
    return apiClient.put<InsuranceClaim>(`/api/insurance/claims/${claimId}`, data);
  },

  // Upload claim document
  async uploadClaimDocument(claimId: string, file: File, documentType: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    return apiClient.post<{
      message: string;
      document: {
        id: string;
        name: string;
        url: string;
      };
    }>(`/api/insurance/claims/${claimId}/documents`, formData, {
      headers: {}, // Let browser set content-type for FormData
    });
  },

  // Get claim status updates
  async getClaimUpdates(claimId: string) {
    return apiClient.get<Array<{
      id: string;
      date: string;
      status: string;
      description: string;
      updatedBy: string;
    }>>(`/api/insurance/claims/${claimId}/updates`);
  },

  // Get insurance providers
  async getProviders(policyType?: string) {
    const params = policyType ? `?policy_type=${policyType}` : '';
    return apiClient.get<InsuranceProvider[]>(`/api/insurance/providers${params}`);
  },

  // Get provider details
  async getProvider(providerId: string) {
    return apiClient.get<InsuranceProvider>(`/api/insurance/providers/${providerId}`);
  },

  // Compare insurance plans
  async comparePlans(data: {
    policyType: string;
    coverageNeeds: Record<string, unknown>;
    budget?: number;
  }) {
    return apiClient.post<Array<{
      provider: InsuranceProvider;
      planName: string;
      premium: number;
      deductible: number;
      coverage: Record<string, unknown>;
      pros: string[];
      cons: string[];
      rating: number;
    }>>('/api/insurance/compare', data);
  },

  // Get coverage recommendations
  async getRecommendations(data: {
    age?: number;
    dependents?: number;
    income?: number;
    assets?: Record<string, number>;
    currentCoverage?: string[];
  }) {
    return apiClient.post<Array<{
      policyType: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
      recommendedCoverage: number;
      estimatedPremium: number;
    }>>('/api/insurance/recommendations', data);
  },

  // Get policy documents
  async getPolicyDocuments(policyId: string) {
    return apiClient.get<Array<{
      id: string;
      name: string;
      type: string;
      uploadDate: string;
      size: number;
      url: string;
    }>>(`/api/insurance/policies/${policyId}/documents`);
  },

  // Get insurance summary
  async getInsuranceSummary() {
    return apiClient.get<{
      totalPolicies: number;
      totalMonthlyPremium: number;
      totalCoverage: number;
      activeClaims: number;
      totalClaimsPaid: number;
      policiesByType: Array<{
        type: string;
        count: number;
        totalPremium: number;
        totalCoverage: number;
      }>;
      upcomingRenewals: Array<{
        policy: InsurancePolicy;
        daysUntilRenewal: number;
      }>;
    }>('/api/insurance/summary');
  },

  // Check eligibility
  async checkEligibility(data: {
    policyType: string;
    personalInfo: Record<string, unknown>;
  }) {
    return apiClient.post<{
      eligible: boolean;
      reasons?: string[];
      alternativeOptions?: Array<{
        policyType: string;
        description: string;
      }>;
    }>('/api/insurance/eligibility', data);
  },

  // Get benefits usage
  async getBenefitsUsage(policyId: string) {
    return apiClient.get<{
      deductibleUsed: number;
      deductibleRemaining: number;
      outOfPocketUsed: number;
      outOfPocketMax: number;
      benefitsByCategory: Array<{
        category: string;
        used: number;
        limit: number;
        percentage: number;
      }>;
    }>(`/api/insurance/policies/${policyId}/benefits-usage`);
  }
};