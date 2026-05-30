import { apiClient } from './client';
import { Loan, LoanApplication, LoanOffer, LoanPaymentSchedule } from '@/types';

// The backend serializes loan entities in snake_case. The frontend types use
// camelCase, so we map raw API responses here to avoid undefined field access
// (e.g. `app.loanType.replace(...)` crashing when only `loan_type` exists).
interface RawLoanApplication {
  id: number | string;
  user_id: number;
  loan_type: string;
  requested_amount: number;
  purpose: string;
  term_months: number;
  status: string;
  credit_score_at_application?: number;
  debt_to_income_ratio?: number;
  created_at?: string;
  decision_date?: string | null;
  rejection_reason?: string | null;
}

interface RawLoanOffer {
  id: number | string;
  application_id: number | string;
  lender_name: string;
  approved_amount: number;
  interest_rate: number;
  apr: number;
  term_months: number;
  monthly_payment: number;
  total_interest: number;
  origination_fee?: number;
  special_conditions?: string[] | null;
  expires_at: string;
}

interface RawLoan {
  id: number | string;
  user_id: number;
  loan_type: string;
  status: string;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  originated_date: string;
  maturity_date: string;
  next_payment_date: string;
  lender_name: string;
  collateral_description?: string | null;
}

interface RawPaymentSchedule {
  payment_number: number;
  payment_date: string;
  payment_amount: number;
  principal: number;
  interest: number;
  remaining_balance: number;
}

function mapApplication(a: RawLoanApplication): LoanApplication {
  const decided = a.status === 'approved' || a.status === 'rejected';
  return {
    id: String(a.id),
    userId: a.user_id,
    loanType: a.loan_type ?? 'unknown',
    status: (a.status ?? 'submitted') as LoanApplication['status'],
    requestedAmount: a.requested_amount ?? 0,
    proposedTerm: a.term_months ?? 0,
    purpose: a.purpose ?? '',
    creditScore: a.credit_score_at_application,
    debtToIncome: a.debt_to_income_ratio,
    submittedAt: a.created_at,
    reviewedAt: a.decision_date ?? undefined,
    decision: decided
      ? { approved: a.status === 'approved', reason: a.rejection_reason ?? undefined }
      : undefined,
  };
}

function mapOffer(o: RawLoanOffer): LoanOffer {
  return {
    id: String(o.id),
    applicationId: String(o.application_id),
    lender: o.lender_name ?? 'Unknown lender',
    amount: o.approved_amount ?? 0,
    interestRate: o.interest_rate ?? 0,
    apr: o.apr ?? 0,
    term: o.term_months ?? 0,
    monthlyPayment: o.monthly_payment ?? 0,
    totalInterest: o.total_interest ?? 0,
    fees: { origination: o.origination_fee ?? 0, processing: 0, other: 0 },
    features: o.special_conditions ?? [],
    expiresAt: o.expires_at,
    isPreApproved: false,
  };
}

function mapLoan(l: RawLoan): Loan {
  return {
    id: String(l.id),
    userId: l.user_id,
    loanType: (l.loan_type ?? 'personal') as Loan['loanType'],
    status: (l.status ?? 'active') as Loan['status'],
    principal: l.original_amount ?? 0,
    balance: l.current_balance ?? 0,
    interestRate: l.interest_rate ?? 0,
    term: l.term_months ?? 0,
    monthlyPayment: l.monthly_payment ?? 0,
    startDate: l.originated_date,
    endDate: l.maturity_date,
    nextPaymentDate: l.next_payment_date,
    lender: l.lender_name ?? 'Unknown lender',
    collateral: l.collateral_description
      ? { type: '', value: 0, description: l.collateral_description }
      : undefined,
    refinanceEligible: false,
    earlyPayoffPenalty: 0,
  };
}

function mapSchedule(s: RawPaymentSchedule): LoanPaymentSchedule {
  return {
    paymentNumber: s.payment_number,
    dueDate: s.payment_date,
    payment: s.payment_amount,
    principal: s.principal,
    interest: s.interest,
    balance: s.remaining_balance,
    status: 'scheduled',
  };
}

export const loansApi = {
  // Get all loans for user
  async getLoans(): Promise<Loan[]> {
    const raw = await apiClient.get<RawLoan[]>('/api/loans');
    return (raw ?? []).map(mapLoan);
  },

  // Get specific loan details
  async getLoan(loanId: string): Promise<Loan> {
    const raw = await apiClient.get<RawLoan>(`/api/loans/${loanId}`);
    return mapLoan(raw);
  },

  // Get loan applications
  async getApplications(): Promise<LoanApplication[]> {
    const raw = await apiClient.get<RawLoanApplication[]>('/api/loans/applications');
    return (raw ?? []).map(mapApplication);
  },

  // Get specific application
  async getApplication(applicationId: string): Promise<LoanApplication> {
    const raw = await apiClient.get<RawLoanApplication>(`/api/loans/applications/${applicationId}`);
    return mapApplication(raw);
  },

  // Create loan application
  async createApplication(data: {
    loanType: 'personal' | 'auto' | 'mortgage' | 'student' | 'business' | 'crypto_backed';
    amount: number;
    term: number;
    purpose: string;
    employmentInfo?: {
      employer: string;
      position: string;
      income: number;
      employmentLength: number;
    };
    collateral?: {
      type: string;
      value: number;
      description: string;
    };
  }) {
    return apiClient.post<LoanApplication>('/api/loans/applications', data);
  },

  // Update application
  async updateApplication(applicationId: string, data: Partial<LoanApplication>) {
    return apiClient.put<LoanApplication>(`/api/loans/applications/${applicationId}`, data);
  },

  // Submit application for review
  async submitApplication(applicationId: string) {
    return apiClient.post<{ message: string; application: LoanApplication }>(`/api/loans/applications/${applicationId}/submit`);
  },

  // Get loan offers
  async getOffers(applicationId?: string): Promise<LoanOffer[]> {
    const params = applicationId ? `?application_id=${applicationId}` : '';
    const raw = await apiClient.get<RawLoanOffer[]>(`/api/loans/offers${params}`);
    return (raw ?? []).map(mapOffer);
  },

  // Get specific offer
  async getOffer(offerId: string): Promise<LoanOffer> {
    const raw = await apiClient.get<RawLoanOffer>(`/api/loans/offers/${offerId}`);
    return mapOffer(raw);
  },

  // Accept loan offer
  async acceptOffer(offerId: string) {
    return apiClient.post<{ message: string; loan: Loan }>(`/api/loans/offers/${offerId}/accept`);
  },

  // Reject loan offer
  async rejectOffer(offerId: string) {
    return apiClient.post<{ message: string }>(`/api/loans/offers/${offerId}/reject`);
  },

  // Get payment schedule
  async getPaymentSchedule(loanId: string): Promise<LoanPaymentSchedule[]> {
    const raw = await apiClient.get<RawPaymentSchedule[]>(`/api/loans/${loanId}/payment-schedule`);
    return (raw ?? []).map(mapSchedule);
  },

  // Make loan payment
  async makePayment(loanId: string, data: {
    amount: number;
    paymentType: 'regular' | 'extra_principal' | 'payoff';
    accountId: string;
  }) {
    return apiClient.post<{
      message: string;
      payment: {
        id: string;
        amount: number;
        appliedToPrincipal: number;
        appliedToInterest: number;
        remainingBalance: number;
      };
    }>(`/api/loans/${loanId}/payments`, data);
  },

  // Get payment history
  async getPaymentHistory(loanId: string) {
    return apiClient.get<Array<{
      id: string;
      date: string;
      amount: number;
      principal: number;
      interest: number;
      balance: number;
      status: string;
    }>>(`/api/loans/${loanId}/payments`);
  },

  // Calculate loan details
  async calculateLoan(data: {
    amount: number;
    term: number;
    interestRate: number;
    loanType: string;
  }) {
    return apiClient.post<{
      monthlyPayment: number;
      totalInterest: number;
      totalPayment: number;
      schedule: Array<{
        month: number;
        payment: number;
        principal: number;
        interest: number;
        balance: number;
      }>;
    }>('/api/loans/calculate', data);
  },

  // Get refinance options
  async getRefinanceOptions(loanId: string) {
    return apiClient.get<Array<{
      id: string;
      lender: string;
      interestRate: number;
      term: number;
      monthlyPayment: number;
      totalSavings: number;
      closingCosts: number;
    }>>(`/api/loans/${loanId}/refinance-options`);
  },

  // Request refinance
  async requestRefinance(loanId: string, offerId: string) {
    return apiClient.post<{
      message: string;
      application: LoanApplication;
    }>(`/api/loans/${loanId}/refinance`, { offerId });
  },

  // Get loan documents
  async getDocuments(loanId: string) {
    return apiClient.get<Array<{
      id: string;
      name: string;
      type: string;
      uploadDate: string;
      size: number;
      url: string;
    }>>(`/api/loans/${loanId}/documents`);
  },

  // Upload document
  async uploadDocument(loanId: string, file: File, documentType: string) {
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
    }>(`/api/loans/${loanId}/documents`, formData, {
      headers: {}, // Let browser set content-type for FormData
    });
  },

  // Get prequalification
  async getPrequalification(data: {
    loanType: string;
    amount: number;
    creditScore?: number;
    income?: number;
  }) {
    return apiClient.post<{
      qualified: boolean;
      estimatedRate: number;
      estimatedPayment: number;
      maxAmount: number;
      reasons?: string[];
    }>('/api/loans/prequalify', data);
  },

  // Get loan summary
  async getLoanSummary() {
    return apiClient.get<{
      totalBalance: number;
      totalMonthlyPayment: number;
      nextPaymentDue: string;
      totalPaidThisYear: number;
      totalInterestPaid: number;
      loansByType: Array<{
        type: string;
        count: number;
        totalBalance: number;
      }>;
    }>('/api/loans/summary');
  }
};