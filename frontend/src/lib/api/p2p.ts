import { apiClient } from './client';

export interface PaymentRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  description?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

export interface P2PContact {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  is_favorite: boolean;
  last_transaction?: {
    date: string;
    amount: number;
    type: 'sent' | 'received';
  };
}

export interface P2PTransferRequest {
  recipient_id: string;
  amount: number;
  description?: string;
  method: 'instant' | 'standard';
  source_account_id: string;
}

export interface P2PTransferResponse {
  transaction_id: string;
  amount: number;
  fee: number;
  total_amount: number;
  status: string;
  method: string;
}

export interface P2PSplitPaymentRequest {
  total_amount: number;
  participants: string[];
  split_type: 'equal' | 'percentage' | 'amount';
  split_details?: Record<string, number>;
  description: string;
  source_account_id: string;
}

export interface P2PSplitPaymentResponse {
  split_id: string;
  total_amount: number;
  participant_amounts: Record<string, number>;
  payment_requests: Array<{
    id: string;
    requester_id: string;
    payer_id: string;
    amount: number;
    description: string;
    status: string;
    created_at: string;
  }>;
  status: string;
}

export interface P2PPaymentRequest {
  requester_id: string;
  amount: number;
  description: string;
  due_date?: string;
}

export interface P2PQRCodeResponse {
  qr_code: string;
  payment_link: string;
  expires_at: string;
}

export interface P2PQRCodeScanResult {
  recipient_id?: string;
  recipient?: string;
  amount?: number | string;
  description?: string;
  valid?: boolean;
}

export const p2pApi = {
  // Get P2P contacts
  getContacts: async (): Promise<P2PContact[]> => {
    return await apiClient.get('/api/p2p/contacts');
  },

  // Create P2P transfer
  createTransfer: async (data: P2PTransferRequest): Promise<P2PTransferResponse> => {
    return await apiClient.post('/api/p2p/transfer', data);
  },

  // Create split payment
  createSplitPayment: async (data: P2PSplitPaymentRequest): Promise<P2PSplitPaymentResponse> => {
    return await apiClient.post('/api/p2p/split-payment', data);
  },

  // Create payment request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPaymentRequest: async (data: P2PPaymentRequest): Promise<any> => {
    return await apiClient.post('/api/p2p/payment-request', data);
  },

  // Generate QR code
  generateQRCode: async (amount?: number, description?: string): Promise<P2PQRCodeResponse> => {
    const params = new URLSearchParams();
    if (amount) params.append('amount', amount.toString());
    if (description) params.append('description', description);
    
    return await apiClient.get(`/api/p2p/qr-code?${params.toString()}`);
  },

  // Scan QR code
  scanQRCode: async (qrData: Record<string, unknown>): Promise<P2PQRCodeScanResult> => {
    return await apiClient.post('/api/p2p/scan-qr', qrData);
  },

  // Get payment requests
  getPaymentRequests: async (): Promise<PaymentRequest[]> => {
    return await apiClient.get('/api/p2p/payment-requests');
  },

  // Accept payment request
  acceptPaymentRequest: async (requestId: string, accountId: string): Promise<{ success: boolean; transaction_id?: string }> => {
    const response = await apiClient.post<{ success: boolean; transaction_id?: string }>(`/api/p2p/payment-requests/${requestId}/accept`, {
      source_account_id: accountId
    });
    return response;
  },

  // Decline payment request
  declinePaymentRequest: async (requestId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(`/api/p2p/payment-requests/${requestId}/decline`);
    return response;
  }
};
