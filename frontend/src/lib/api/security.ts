import { apiClient } from './client';

export interface SecurityEvent {
  id: number;
  type: 'login' | 'password_change' | 'settings_change' | 'suspicious_activity';
  description: string;
  timestamp: string;
  location: string;
  device: string;
  ip: string;
  status: 'success' | 'failed' | 'warning';
}

export interface LoginSession {
  id: number;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface TwoFactorMethod {
  method: 'authenticator' | 'sms' | 'email';
  enabled: boolean;
  phoneNumber?: string;
  email?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  loginNotifications: boolean;
  transactionAlerts: boolean;
  dataSharing: boolean;
  lastPasswordChange: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface TwoFactorSetupResponse {
  qrCode?: string;
  qr_code?: string;
  secret?: string;
  message?: string;
  backupCodes?: string[];
  backup_codes?: string[];
}

// The UI labels the TOTP method "authenticator"; the backend enum value is "totp".
type UiTwoFactorMethod = 'authenticator' | 'sms' | 'email';
const toBackendMethod = (method: UiTwoFactorMethod): 'totp' | 'sms' | 'email' =>
  method === 'authenticator' ? 'totp' : method;

export const securityApi = {
  // Get security settings
  async getSecuritySettings(): Promise<SecuritySettings> {
    return apiClient.get<SecuritySettings>('/api/security/settings');
  },

  // Update security settings
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    return apiClient.put<SecuritySettings>('/api/security/settings', settings);
  },

  // Get security events
  async getSecurityEvents(): Promise<SecurityEvent[]> {
    return apiClient.get<SecurityEvent[]>('/api/security/events');
  },

  // Get login sessions
  async getLoginSessions(): Promise<LoginSession[]> {
    return apiClient.get<LoginSession[]>('/api/security/sessions');
  },

  // End a specific session
  async endSession(sessionId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/security/sessions/${sessionId}`);
  },

  // End all other sessions
  async endAllOtherSessions(): Promise<{ message: string; count: number }> {
    return apiClient.post<{ message: string; count: number }>('/api/security/sessions/end-others');
  },

  // Change password
  async changePassword(request: PasswordChangeRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/change-password', {
      old_password: request.currentPassword,
      new_password: request.newPassword
    });
  },

  // Get configured 2FA methods for the current user
  async getTwoFactorMethods(): Promise<Array<{ id: number; method: string; is_enabled: boolean; is_primary: boolean }>> {
    return apiClient.get<Array<{ id: number; method: string; is_enabled: boolean; is_primary: boolean }>>('/api/security/2fa');
  },

  // Setup 2FA (backend expects snake_case body and the "totp" method value)
  async setupTwoFactor(method: UiTwoFactorMethod, phoneOrEmail?: string): Promise<TwoFactorSetupResponse> {
    const backendMethod = toBackendMethod(method);
    return apiClient.post<TwoFactorSetupResponse>('/api/security/2fa/setup', {
      method: backendMethod,
      phone_number: method === 'sms' ? phoneOrEmail : undefined,
      email: method === 'email' ? phoneOrEmail : undefined,
    });
  },

  // Verify 2FA setup (backend route is /2fa/verify/{method} and requires method+code)
  async verifyTwoFactorSetup(method: UiTwoFactorMethod, code: string): Promise<{ message: string; backupCodes?: string[] }> {
    const backendMethod = toBackendMethod(method);
    return apiClient.post<{ message: string; backupCodes?: string[] }>(`/api/security/2fa/verify/${backendMethod}`, { code, method: backendMethod });
  },

  // Disable 2FA
  async disableTwoFactor(): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>('/api/security/2fa');
  },

  // Enable biometric
  async enableBiometric(enabled: boolean): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/security/biometric', { enabled });
  },

  // Download security report
  async downloadSecurityReport(): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/security/export/report/pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Accept': 'application/pdf',
      },
      credentials: 'include',
      mode: 'cors',
    });
    if (!response.ok) throw new Error('Failed to download security report');
    return response.blob();
  },

  // Request data export
  async requestDataExport(): Promise<{ message: string; requestId: string }> {
    return apiClient.post<{ message: string; requestId: string }>('/api/security/data-export');
  },

  // Request account deletion
  async requestAccountDeletion(password: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/security/delete-account', { password });
  },
};