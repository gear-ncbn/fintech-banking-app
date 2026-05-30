import { apiClient } from './client';
import type { Transaction } from './transactions';

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  name?: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  alert_threshold: number;
  is_active: boolean;
  spent_amount?: number;
  remaining_amount?: number;
  percentage_used?: number;
  created_at: string;
  updated_at?: string;
  category?: {
    id: number;
    name: string;
    type: string;
    icon?: string;
    color?: string;
  };
}

export interface BudgetCreate {
  category_id: number;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  alert_threshold?: number;
}

export interface BudgetUpdate {
  amount?: number;
  alert_threshold?: number;
  is_active?: boolean;
}

export interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  over_budget_count?: number;
  budgets: Budget[];
}

export interface BudgetAlert {
  id: number;
  budget_id: number;
  alert_type: 'WARNING' | 'EXCEEDED' | 'NEARING_END';
  message: string;
  percentage_used: number;
  created_at: string;
  is_read: boolean;
  budget: Budget;
}

class BudgetsService {
  async getBudgets(includeInactive = false): Promise<Budget[]> {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('include_inactive', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString ? `/api/budgets?${queryString}` : '/api/budgets';
    return apiClient.get<Budget[]>(url);
  }

  async getBudget(id: number): Promise<Budget> {
    return apiClient.get<Budget>(`/api/budgets/${id}`);
  }

  async createBudget(data: BudgetCreate): Promise<Budget> {
    return apiClient.post<Budget>('/api/budgets', data);
  }

  async updateBudget(id: number, data: BudgetUpdate): Promise<Budget> {
    return apiClient.put<Budget>(`/api/budgets/${id}`, data);
  }

  async deleteBudget(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/budgets/${id}`);
  }

  async getBudgetSummary(period?: 'weekly' | 'monthly' | 'yearly'): Promise<BudgetSummary> {
    const params = new URLSearchParams();
    if (period) {
      params.append('period', period);
    }
    const queryString = params.toString();
    const url = queryString ? `/api/budgets/summary?${queryString}` : '/api/budgets/summary';
    return apiClient.get<BudgetSummary>(url);
  }

  async getBudgetAlerts(): Promise<BudgetAlert[]> {
    return apiClient.get<BudgetAlert[]>('/api/budgets/alerts');
  }

  async markAlertAsRead(alertId: number): Promise<void> {
    return apiClient.put<void>(`/api/budgets/alerts/${alertId}/read`);
  }

  async getBudgetTransactions(budgetId: number, params?: {
    skip?: number;
    limit?: number;
  }): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient.get<Transaction[]>(`/api/budgets/${budgetId}/transactions?${queryParams.toString()}`);
  }

  async recalculateBudget(budgetId: number): Promise<Budget> {
    return apiClient.post<Budget>(`/api/budgets/${budgetId}/recalculate`);
  }
}

// Export singleton instance
export const budgetsService = new BudgetsService();