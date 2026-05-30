import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthContext } from '@/contexts/AuthContext'
import { SecurityContext } from '@/contexts/SecurityContext'
import { DemoModeProvider } from '@/contexts/DemoModeContext'
import { AlertProvider } from '@/contexts/AlertContext'

// Mock user for testing
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock auth context value
const mockAuthContextValue = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  error: null,
  refreshAuth: jest.fn(),
  clearError: jest.fn(),
}

// Mock security context value
const mockSecurityContextValue = {
  isBiometricEnabled: false,
  isTwoFactorEnabled: false,
  toggleBiometric: jest.fn(),
  toggleTwoFactor: jest.fn(),
  verifyBiometric: jest.fn(),
  lastActivity: Date.now(),
  updateActivity: jest.fn(),
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  checkSessionTimeout: jest.fn(),
}

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return (
    <AlertProvider>
      <AuthContext.Provider value={mockAuthContextValue as unknown as React.ContextType<typeof AuthContext>}>
        <SecurityContext.Provider value={mockSecurityContextValue as unknown as React.ContextType<typeof SecurityContext>}>
          <DemoModeProvider>
            {children}
          </DemoModeProvider>
        </SecurityContext.Provider>
      </AuthContext.Provider>
    </AlertProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }