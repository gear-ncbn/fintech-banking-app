import { apiClient } from './client';

export interface Message {
  id: number;
  sender_id: number;
  sender_username?: string;
  recipient_id: number;
  recipient_username?: string;
  subject: string;
  message: string;
  priority: string;
  is_read: boolean;
  read_at?: string;
  is_draft: boolean;
  parent_message_id?: number;
  folder_id?: number;
  sent_at: string;
  message_type: 'text' | 'transaction' | 'payment_request';
  metadata?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    file_type: string;
    file_size: number;
  }>;
  created_at: string;
  updated_at?: string;
}

export interface MessageCreate {
  recipient_username: string;
  subject: string;
  message: string;
  priority?: string;
  attachments?: Array<{
    filename: string;
    file_type: string;
    file_size: number;
  }>;
  is_draft?: boolean;
}

export interface MessageFolder {
  id: number;
  user_id: number;
  folder_name: string;
  color?: string;
  message_count?: number;
}

export interface MessageSettings {
  user_id: number;
  email_on_new_message: boolean;
  push_notifications: boolean;
  notification_sound: boolean;
  auto_mark_read: boolean;
}

export interface Conversation {
  id: number;
  other_user: {
    id: number;
    username: string;
    full_name: string;
  };
  last_message?: {
    id: number;
    message: string;
    sent_at: string;
    is_from_me: boolean;
  };
  unread_count: number;
  last_message_at: string;
}

export interface ConversationMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  message: string;
  message_type: 'text' | 'transaction' | 'payment_request';
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  sent_at: string;
  is_from_me: boolean;
  transaction_details?: {
    transaction_id: number;
    amount: number;
    direction: 'sent' | 'received';
    note?: string;
    transaction_date: string;
  };
  attachments?: Array<{
    url?: string;
    filename?: string;
    file_type?: string;
    file_size?: number;
  }>;
}

class MessagesService {
  // Messages
  async sendMessage(data: MessageCreate): Promise<Message> {
    return apiClient.post<Message>('/api/messages', data);
  }

  async getInbox(limit = 50, offset = 0): Promise<Message[]> {
    return apiClient.get<Message[]>(`/api/messages/inbox?limit=${limit}&offset=${offset}`);
  }

  async getSentMessages(limit = 50, offset = 0): Promise<Message[]> {
    return apiClient.get<Message[]>(`/api/messages/sent?limit=${limit}&offset=${offset}`);
  }

  async getDrafts(): Promise<Message[]> {
    return apiClient.get<Message[]>('/api/messages/drafts');
  }

  async getMessage(id: number): Promise<Message> {
    return apiClient.get<Message>(`/api/messages/${id}`);
  }

  async markAsRead(id: number): Promise<Message> {
    return apiClient.put<Message>(`/api/messages/${id}/read`);
  }

  async replyToMessage(id: number, message: string): Promise<Message> {
    return apiClient.post<Message>(`/api/messages/${id}/reply`, { message });
  }

  async deleteMessage(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/messages/${id}`);
  }

  async searchMessages(query: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/api/messages/search?query=${encodeURIComponent(query)}`);
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>('/api/conversations');
  }

  async getConversationMessages(userId: number, limit = 50, offset = 0): Promise<ConversationMessage[]> {
    return apiClient.get<ConversationMessage[]>(
      `/api/conversations/${userId}/messages?limit=${limit}&offset=${offset}`
    );
  }

  async markConversationAsRead(userId: number): Promise<{ messages_marked_read: number }> {
    return apiClient.post(`/api/conversations/${userId}/mark-read`);
  }

  async getTotalUnreadCount(): Promise<{ unread_count: number }> {
    return apiClient.get<{ unread_count: number }>('/api/conversations/unread-count');
  }

  // Settings
  async getMessageSettings(): Promise<MessageSettings> {
    return apiClient.get<MessageSettings>('/api/messages/settings');
  }

  async updateMessageSettings(settings: Partial<MessageSettings>): Promise<MessageSettings> {
    return apiClient.put<MessageSettings>('/api/messages/settings', settings);
  }

  // Folders
  async createFolder(folder_name: string, color?: string): Promise<MessageFolder> {
    return apiClient.post<MessageFolder>('/api/messages/folders', { folder_name, color });
  }

  async moveToFolder(messageId: number, folderId: number): Promise<void> {
    return apiClient.put<void>(`/api/messages/${messageId}/move`, { folder_id: folderId });
  }

  // Blocking
  async blockUser(username: string, reason?: string): Promise<{ message: string }> {
    return apiClient.post('/api/messages/block', { username, reason });
  }

  async getBlockedUsers(): Promise<string[]> {
    return apiClient.get<string[]>('/api/messages/blocked');
  }
}

export const messagesService = new MessagesService();