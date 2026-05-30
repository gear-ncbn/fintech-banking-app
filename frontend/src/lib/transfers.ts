import { apiClient } from './api/client';

export interface TransferRequest {
  source_account_id: number;
  destination_account_id: number;
  amount: number;
  description?: string;
  is_external?: boolean;
  transfer_fee?: number;
  transfer_type?: string;
}

export interface DepositRequest {
  account_id: number;
  amount: number;
  description?: string;
  deposit_method: 'cash' | 'check' | 'wire' | 'ach' | 'mobile';
  source?: string;
}

export interface WithdrawalRequest {
  account_id: number;
  amount: number;
  description?: string;
  withdrawal_method: 'atm' | 'bank' | 'wire' | 'check';
}

export interface BillPaymentRequest {
  account_id: number;
  amount: number;
  payee_name: string;
  payee_account_number: string;
  bill_type: 'utility' | 'credit_card' | 'loan' | 'rent' | 'insurance' | 'other';
  category_id?: number;
  due_date?: string;
  description?: string;
}

export interface SendMoneyRequest {
  recipient_identifier: string;  // username or email
  source_account_id: number;
  amount: number;
  description?: string;
  transfer_fee?: number;
}

export interface TransferLimits {
  daily_limit: number;
  single_transaction_limit: number;
  monthly_limit: number;
  remaining_daily: number;
  remaining_monthly: number;
}

export interface TransactionResult {
  id: number;
  status?: string;
  [key: string]: unknown;
}

export const transfersService = {
  transfer: async (data: TransferRequest) => {
    const response = await apiClient.post<TransactionResult>('/api/transfers/transfer', data);
    return response;
  },

  deposit: async (data: DepositRequest) => {
    const response = await apiClient.post('/api/transfers/deposit', data);
    return response;
  },

  withdraw: async (data: WithdrawalRequest) => {
    const response = await apiClient.post('/api/transfers/withdraw', data);
    return response;
  },

  payBill: async (data: BillPaymentRequest) => {
    const response = await apiClient.post('/api/transfers/bill-payment', data);
    return response;
  },

  getTransferLimits: async () => {
    const response = await apiClient.get<TransferLimits>('/api/transfers/transfer-limits');
    return response;
  },

  sendMoney: async (data: SendMoneyRequest) => {
    const response = await apiClient.post<TransactionResult>('/api/transfers/send-money', data);
    return response;
  },
};