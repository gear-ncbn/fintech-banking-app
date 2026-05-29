
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Check for token in localStorage on initialization
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('authToken');
    }
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('authToken', token);
        // Also set as cookie for SSR
        document.cookie = `authToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
      } else {
        localStorage.removeItem('authToken');
        // Remove cookie
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, headers = {}, ...restOptions } = options;

    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add auth token if available and not skipped
    if (this.authToken && !skipAuth) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Get session ID from cookie or generate one
    const _sessionId = this.getSessionId();

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      // Log request body for POST/PUT requests (for debugging)
      if ((options.method === 'POST' || options.method === 'PUT') && restOptions.body) {
        
      }

      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
        credentials: 'include',
        cache: 'no-store', // Prevent caching to ensure fresh data
      });

      const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        // Handle session timeout
        if (response.status === 401 && !skipAuth) {
          // Clear auth token and cookie immediately
          this.authToken = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            // Force clear the cookie with all possible paths
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Small delay to ensure cookie is cleared before redirect
            setTimeout(() => {
              window.location.href = '/session-timeout';
            }, 100);
          }
          return; // Don't throw error, just return
        }
        
        throw new APIError(
          data.detail || data.message || 'API request failed',
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-side';
    
    // Try to get from cookie first
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('session_id='));
    if (sessionCookie) {
      return sessionCookie.split('=')[1];
    }
    
    // Fall back to localStorage
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  // HTTP methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export class for testing or custom instances
export { APIClient, APIError };
