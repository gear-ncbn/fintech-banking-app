import { apiClient } from './client';
import type { Transaction } from './transactions';

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'PURCHASE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  is_achieved: boolean;
  achieved_date?: string;
  created_at: string;
  updated_at?: string;
  progress_percentage: number;
  days_remaining: number;
  monthly_target: number;
  // Automatic allocation fields
  account_id?: number;
  auto_allocate_percentage?: number;
  auto_allocate_fixed_amount?: number;
  allocation_priority?: number;
  allocation_source_types?: string[];
}

export interface GoalCreate {
  name: string;
  description?: string;
  target_amount: number;
  target_date: string;
  category: 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'PURCHASE' | 'OTHER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  initial_amount?: number;
  // Automatic allocation fields
  account_id?: number;
  auto_allocate_percentage?: number;
  auto_allocate_fixed_amount?: number;
  allocation_priority?: number;
  allocation_source_types?: string[];
}

export interface GoalUpdate {
  name?: string;
  description?: string;
  target_amount?: number;
  target_date?: string;
  category?: 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'PURCHASE' | 'OTHER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  // Automatic allocation fields
  auto_allocate_percentage?: number;
  auto_allocate_fixed_amount?: number;
  allocation_priority?: number;
  allocation_source_types?: string[];
}

export interface GoalContribution {
  amount: number;
  note?: string;
  contribution_date?: string;
}

export interface GoalSummary {
  total_goals: number;
  achieved_goals: number;
  active_goals: number;
  total_target_amount: number;
  total_current_amount: number;
  overall_progress: number;
  goals_by_category: Record<string, {
    count: number;
    total_target: number;
    total_current: number;
  }>;
}

class GoalsService {
  async getGoals(includeAchieved = false): Promise<Goal[]> {
    const params = new URLSearchParams();
    if (includeAchieved) {
      params.append('include_achieved', 'true');
    }
    
    const queryString = params.toString();
    const url = queryString ? `/api/goals?${queryString}` : '/api/goals';
    return apiClient.get<Goal[]>(url);
  }

  async getGoal(id: number): Promise<Goal> {
    return apiClient.get<Goal>(`/api/goals/${id}`);
  }

  async createGoal(data: GoalCreate): Promise<Goal> {
    return apiClient.post<Goal>('/api/goals', data);
  }

  async updateGoal(id: number, data: GoalUpdate): Promise<Goal> {
    return apiClient.put<Goal>(`/api/goals/${id}`, data);
  }

  async deleteGoal(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/goals/${id}`);
  }

  async addContribution(goalId: number, data: GoalContribution): Promise<Goal> {
    return apiClient.post<Goal>(`/api/goals/${goalId}/contribute`, data);
  }

  async withdrawFromGoal(goalId: number, amount: number, note?: string): Promise<Goal> {
    return apiClient.post<Goal>(`/api/goals/${goalId}/withdraw`, { amount, note });
  }

  async getGoalSummary(): Promise<GoalSummary> {
    return apiClient.get<GoalSummary>('/api/goals/summary');
  }

  async getGoalTransactions(goalId: number, params?: {
    skip?: number;
    limit?: number;
  }): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient.get<Transaction[]>(`/api/goals/${goalId}/transactions?${queryParams.toString()}`);
  }

  async getAllocationSummary(accountId: number): Promise<{
    account_id: number;
    linked_goals_count: number;
    total_percentage_allocation: number;
    total_fixed_allocation: number;
    goals: Array<{
      id: number;
      name: string;
      allocation_percentage?: number;
      allocation_fixed_amount?: number;
      priority: number;
      current_amount: number;
      target_amount: number;
      progress_percentage: number;
    }>;
  }> {
    return apiClient.get(`/api/goals/allocation-summary/${accountId}`);
  }
}

// Export singleton instance
export const goalsService = new GoalsService();