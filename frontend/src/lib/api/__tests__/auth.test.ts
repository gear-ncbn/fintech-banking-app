import { authService } from '../auth'
import { apiClient } from '../client'

// Mock dependencies
jest.mock('../client')

// Mock localStorage
const mockLocalStorage = {
  store: {} as { [key: string]: string },
  getItem: jest.fn((key: string): string | null => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {}
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('AuthService', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.clear()
    // Reset auth service state
    authService['currentUser'] = null
  })

  describe('login', () => {
    const mockCredentials = {
      username: 'testuser',
      password: 'testpass123',
    }

    const mockAuthResponse = {
      access_token: 'test-token-123',
      token_type: 'Bearer',
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
      },
    }

    it('should successfully login and store token', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockAuthResponse)

      const result = await authService.login(mockCredentials)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/auth/login',
        mockCredentials,
        { skipAuth: true }
      )
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('test-token-123')
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'currentUser',
        JSON.stringify(mockAuthResponse.user)
      )
      expect(result).toEqual(mockAuthResponse)
    })


    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials')
      mockApiClient.post.mockRejectedValueOnce(error)

      await expect(authService.login(mockCredentials)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    const mockRegisterData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
      phone: '+1234567890',
    }

    const mockUserResponse = {
      id: 2,
      username: 'newuser',
      email: 'newuser@example.com',
      first_name: 'New',
      last_name: 'User',
      phone: '+1234567890',
      role: 'user',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    it('should successfully register a new user', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockUserResponse)

      const result = await authService.register(mockRegisterData)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/auth/register',
        mockRegisterData,
        { skipAuth: true }
      )
      expect(result).toEqual(mockUserResponse)
    })


    it('should handle registration failure', async () => {
      const error = new Error('Username already exists')
      mockApiClient.post.mockRejectedValueOnce(error)

      await expect(authService.register(mockRegisterData)).rejects.toThrow(
        'Username already exists'
      )
    })
  })

  describe('logout', () => {
    beforeEach(() => {
      // Set up logged in state
      authService['currentUser'] = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }
      mockLocalStorage.store['currentUser'] = JSON.stringify(authService['currentUser'])
      mockLocalStorage.store['authToken'] = 'test-token'
    })

    it('should successfully logout', async () => {
      mockApiClient.post.mockResolvedValueOnce({})

      await authService.logout()

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/logout')
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith(null)
      expect(localStorage.removeItem).toHaveBeenCalledWith('currentUser')
      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken')
      expect(authService['currentUser']).toBeNull()
    })


    it('should clear local state even if API call fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'))

      await authService.logout()

      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith(null)
      expect(localStorage.removeItem).toHaveBeenCalledWith('currentUser')
      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken')
    })
  })

  describe('getCurrentUser', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    it('should return cached user when available', async () => {
      authService['currentUser'] = mockUser

      const result = await authService.getCurrentUser()

      expect(result).toEqual(mockUser)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should load user from localStorage', async () => {
      mockLocalStorage.store['currentUser'] = JSON.stringify(mockUser)

      const result = await authService.getCurrentUser()

      expect(result).toEqual(mockUser)
      expect(localStorage.getItem).toHaveBeenCalledWith('currentUser')
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should fetch user from API when forced', async () => {
      authService['currentUser'] = mockUser
      mockApiClient.getAuthToken.mockReturnValue('test-token')
      mockApiClient.get.mockResolvedValueOnce(mockUser)

      const result = await authService.getCurrentUser(true)

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/auth/me')
      expect(result).toEqual(mockUser)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'currentUser',
        JSON.stringify(mockUser)
      )
    })

    it('should logout on API error', async () => {
      mockApiClient.getAuthToken.mockReturnValue('test-token')
      mockApiClient.get.mockRejectedValueOnce(new Error('Unauthorized'))
      const logoutSpy = jest.spyOn(authService, 'logout')

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
      expect(logoutSpy).toHaveBeenCalled()
    })

    it('should return null when not authenticated', async () => {
      mockApiClient.getAuthToken.mockReturnValue(null)

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    const mockRefreshResponse = {
      access_token: 'new-token-456',
      token_type: 'Bearer',
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
      },
    }

    it('should successfully refresh token', async () => {
      mockApiClient.post.mockResolvedValueOnce(mockRefreshResponse)

      await authService.refreshToken()

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/refresh')
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('new-token-456')
    })

    it('should logout on refresh failure', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Token expired'))
      const logoutSpy = jest.spyOn(authService, 'logout')

      await expect(authService.refreshToken()).rejects.toThrow('Token expired')
      expect(logoutSpy).toHaveBeenCalled()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      mockApiClient.getAuthToken.mockReturnValue('test-token')

      expect(authService.isAuthenticated()).toBe(true)
    })

    it('should return false when no token', () => {
      mockApiClient.getAuthToken.mockReturnValue(null)

      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('getUser', () => {
    it('should return current user', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }
      authService['currentUser'] = mockUser

      expect(authService.getUser()).toEqual(mockUser)
    })

    it('should return null when no user', () => {
      authService['currentUser'] = null

      expect(authService.getUser()).toBeNull()
    })
  })
})
