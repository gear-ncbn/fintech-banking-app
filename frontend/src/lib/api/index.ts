// Export all API services and types

export { apiClient, APIClient, APIError } from './client';

// Import first, then re-export as fetchApi
import { apiClient as _apiClient } from './client';
export const fetchApi = _apiClient;

export { authService } from './auth';
export type { LoginCredentials, RegisterData, AuthResponse, UserResponse } from './auth';

export { accountsService } from './accounts';
export type { Account, AccountCreate, AccountUpdate, AccountSummary, JointAccountCreate } from './accounts';

export { transactionsService } from './transactions';
export type { Transaction, TransactionCreate, TransactionUpdate, TransactionFilters, TransactionStats } from './transactions';

export { budgetsService } from './budgets';
export type { Budget, BudgetCreate, BudgetUpdate, BudgetSummary, BudgetAlert } from './budgets';

export { categoriesService } from './categories';
export type { Category, CategoryCreate, CategoryUpdate, CategoryStats } from './categories';

export { goalsService } from './goals';
export type { Goal, GoalCreate, GoalUpdate, GoalContribution, GoalSummary } from './goals';

export { analyticsService } from './analytics';
export type { AnalyticsExportParams, SpendingByCategory, IncomeExpenseSummary, NetWorthHistory, BudgetPerformance, GoalProgress } from './analytics';

export { p2pApi } from './p2p';
export type { P2PContact, P2PTransferRequest, P2PTransferResponse, P2PSplitPaymentRequest, P2PSplitPaymentResponse, P2PPaymentRequest, P2PQRCodeResponse } from './p2p';

export { cardsApi } from './cards';
export type { Card, VirtualCard, CardCreate, CardUpdate, VirtualCardCreate, SpendingLimitRequest, SpendingLimitResponse, CardAnalytics, CardDetailedAnalytics, CardStatement, CardRewards, CardPaymentRequest, AlertConfig, FraudReport } from './cards';

export { securityApi } from './security';
export type { SecurityEvent, LoginSession, TwoFactorMethod, SecuritySettings, PasswordChangeRequest, TwoFactorSetupResponse } from './security';

export { subscriptionsService } from './subscriptions';
export type { Subscription, SubscriptionCreate, SubscriptionUpdate, SubscriptionAnalysis, CancellationReminder, OptimizationSuggestion, OptimizationResponse } from './subscriptions';

export { businessApi } from './business';
export type { 
  Invoice, InvoiceLineItem, CreateInvoiceRequest, BusinessExpense, 
  CreateBusinessExpenseRequest, ExpenseReport, GenerateExpenseReportRequest,
  Receipt, TaxEstimate, BusinessAccount, CashFlowAnalysis
} from './business';

export { messagesService } from './messages';
export type { Message, MessageCreate, Conversation, ConversationMessage, MessageSettings } from './messages';

export { contactsService } from './contacts';
export type { Contact, ContactCreate, ContactUpdate, ContactSearchResult, PendingRequests } from './contacts';

export { cryptoApi } from './crypto';
export type { CryptoWallet, CryptoAsset, NFTAsset, CryptoTransaction, DeFiPosition, AssetBridge } from '@/types';

export { loansApi } from './loans';
export type { Loan, LoanApplication, LoanOffer, LoanPaymentSchedule } from '@/types';

export { insuranceApi } from './insurance';
export type { InsurancePolicy, InsuranceClaim, InsuranceProvider } from '@/types';

export { investmentsService } from './investments';
export type { 
  InvestmentAccount, Asset, Position, TradeOrder, Portfolio, Watchlist,
  CreateInvestmentAccountRequest, TradeOrderRequest, AddToWatchlistRequest,
  AssetSearchParams, OrderHistoryParams, InvestmentAccountType, AssetType,
  OrderType, OrderStatus, OrderSide
} from './investments';

export { creditCardsService } from './creditCards';
export type {
  CreditCard, CardApplication, CreditScoreInfo, CardRecommendation,
  CardApplicationRequest, CardSearchParams, RecommendationParams,
  CardCategory, ApplicationStatus, EmploymentType
} from './creditCards';

export { currencyConverterService } from './currencyConverter';
export type {
  Currency, ExchangeRate, PeerOffer, P2PTrade, UserBalance, ConversionQuote,
  ConversionRequest, CreateOfferRequest, CreateTradeRequest, P2PSearchParams,
  TradeStatus, OfferStatus, PaymentMethod
} from './currencyConverter';

// Utility function to handle API errors in components
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'APIError') {
      const apiError = error as Error & { data?: { detail?: string } };
      return apiError.data?.detail || apiError.message || 'An error occurred';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}