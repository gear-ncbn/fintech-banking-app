import { apiClient } from './api/client';
import type { Goal } from './api/goals';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error' | 'budget_warning' | 'goal_milestone' | 'transaction_alert' | 'account_update' | 'new_message' | 'contact_request';
  created_at: string;
  is_read: boolean;
  user_id: number;
  related_entity_type?: 'transaction' | 'budget' | 'bill' | 'goal';
  related_entity_id?: number;
}

class NotificationsService {
  async getNotifications(isRead?: boolean): Promise<Notification[]> {
    let url = '/api/notifications';
    if (isRead !== undefined) {
      url += `?is_read=${isRead}`;
    }
    return await apiClient.get<Notification[]>(url);
  }

  async markAsRead(notificationId: number): Promise<void> {
    await apiClient.put(`/api/notifications/${notificationId}`, { is_read: true });
  }

  async markAllAsRead(): Promise<void> {
    await apiClient.put('/api/notifications/mark-all-read');
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/api/notifications/unread-count');
    return response.count;
  }

  // Helper to generate notifications from recent activities
  async generateNotificationsFromActivity(): Promise<Notification[]> {
    // This would typically be done on the backend, but for now we'll generate
    // notifications based on recent transactions and budget status
    const notifications: Notification[] = [];
    
    try {
      // Get recent transactions
      const transactions = await apiClient.get<unknown[]>('/api/transactions?page_size=5') || [];
      
      // Create notifications for large transactions
      if (Array.isArray(transactions)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transactions.forEach((txn: any, index: number) => {
          // Create notifications for different transaction types
          if (txn.transaction_type === 'CREDIT' && txn.amount > 500) {
            notifications.push({
              id: index + 1,
              title: 'Large deposit received',
              message: `You received $${txn.amount.toFixed(2)} from ${txn.merchant || txn.description || 'a transfer'}`,
              type: 'success',
              created_at: txn.transaction_date,
              is_read: false,
              user_id: txn.user_id,
              related_entity_type: 'transaction',
              related_entity_id: txn.id
            });
          } else if (txn.transaction_type === 'DEBIT' && txn.amount > 200) {
            // Different thresholds for different notification types
            const merchantName = txn.merchant || txn.description || 'Unknown merchant';
            let title = 'Large transaction';
            let type: 'warning' | 'info' = 'info';
            
            if (txn.amount > 500) {
              title = 'Significant purchase';
              type = 'warning';
            }
            
            notifications.push({
              id: index + 1,
              title,
              message: `You spent $${txn.amount.toFixed(2)} at ${merchantName}`,
              type,
              created_at: txn.transaction_date,
              is_read: false,
              user_id: txn.user_id,
              related_entity_type: 'transaction',
              related_entity_id: txn.id
            });
          }
        });
      }
      
      // Get budget status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const budgetSummary = await apiClient.get<any>('/api/budgets/summary');
      
      if (budgetSummary && budgetSummary.total_spent && budgetSummary.total_budget && 
          budgetSummary.total_spent / budgetSummary.total_budget > 0.8) {
        notifications.push({
          id: notifications.length + 1,
          title: 'Budget alert',
          message: `You've spent ${((budgetSummary.total_spent / budgetSummary.total_budget) * 100).toFixed(0)}% of your monthly budget`,
          type: 'warning',
          created_at: new Date().toISOString(),
          is_read: false,
          user_id: 1,
          related_entity_type: 'budget'
        });
      }
      
      // Check for goal progress
      try {
        const goals = await apiClient.get<Goal[]>('/api/goals');
        if (goals && goals.length > 0) {
          const nearCompletionGoal = goals.find((goal) => 
            goal.progress_percentage >= 80 && goal.progress_percentage < 100
          );
          
          if (nearCompletionGoal) {
            notifications.push({
              id: notifications.length + 1,
              title: 'Goal almost achieved!',
              message: `You're ${nearCompletionGoal.progress_percentage}% towards your "${nearCompletionGoal.name}" goal`,
              type: 'success',
              created_at: new Date().toISOString(),
              is_read: false,
              user_id: 1,
              related_entity_type: 'goal',
              related_entity_id: nearCompletionGoal.id
            });
          }
        }
      } catch {
        // Ignore goal fetch errors
      }
      
      // Add security notification
      if (Math.random() > 0.7) { // 30% chance to show
        notifications.push({
          id: notifications.length + 1,
          title: 'Security check',
          message: 'Enable two-factor authentication for better security',
          type: 'info',
          created_at: new Date().toISOString(),
          is_read: false,
          user_id: 1
        });
      }
      
    } catch (error) {
      console.error('Failed to generate notifications:', error);
    }
    
    return notifications.slice(0, 5); // Return max 5 notifications
  }
  
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
}

export const notificationsService = new NotificationsService();