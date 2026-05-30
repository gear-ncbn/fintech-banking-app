import { apiClient } from './client';
import { normalizeTransaction, type Transaction } from './transactions';

export interface Account {
  id: number;
  name: string;
  account_type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'LOAN';
  account_number?: string;
  institution_name?: string;
  balance: number;
  credit_limit?: number;
  interest_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AccountCreate {
  name: string;
  account_type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'LOAN';
  account_number?: string;
  institution_name?: string;
  initial_balance?: number;
  credit_limit?: number;
  interest_rate?: number;
}

export interface AccountUpdate {
  name?: string;
  institution_name?: string;
  credit_limit?: number;
  interest_rate?: number;
}

export interface AccountSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  total_balance?: number; // Optional for backward compatibility
  net_worth_change_percent?: number; // Optional; not always provided by the API
  accounts: Account[];
}

export interface JointAccountCreate extends AccountCreate {
  joint_owner_username: string;
}

class AccountsService {
  async getAccounts(includeInactive = false): Promise<Account[]> {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('include_inactive', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString ? `/api/accounts?${queryString}` : '/api/accounts';
    return apiClient.get<Account[]>(url);
  }

  async getAccount(id: number): Promise<Account> {
    return apiClient.get<Account>(`/api/accounts/${id}`);
  }

  async createAccount(data: AccountCreate): Promise<Account> {
    return apiClient.post<Account>('/api/accounts', data);
  }

  async createJointAccount(data: JointAccountCreate): Promise<Account> {
    return apiClient.post<Account>('/api/accounts/joint', data);
  }

  async updateAccount(id: number, data: AccountUpdate): Promise<Account> {
    return apiClient.put<Account>(`/api/accounts/${id}`, data);
  }

  async deleteAccount(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/accounts/${id}`);
  }

  async getAccountSummary(): Promise<AccountSummary> {
    return apiClient.get<AccountSummary>('/api/accounts/summary');
  }

  async transferFunds(fromAccountId: number, toAccountId: number, amount: number, description?: string): Promise<{ success: boolean; transaction_id?: number; message?: string }> {
    return apiClient.post('/api/transactions/transfer', {
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount,
      description
    });
  }

  async getAccountTransactions(id: number, params?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const queryString = queryParams.toString();
    const url = queryString ? `/api/accounts/${id}/transactions?${queryString}` : `/api/accounts/${id}/transactions`;
    const transactions = await apiClient.get<Transaction[]>(url);
    return transactions.map(normalizeTransaction);
  }
}

// Export singleton instance
export const accountsService = new AccountsService();