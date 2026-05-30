"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { handleApiError } from "@/lib/api";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface LoginFormProps {
  sessionId?: string;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  _sessionId = 'default',
  analyticsId: _analyticsId = 'login-form',
  analyticsLabel: _analyticsLabel = 'Authentication Form'
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isRegister) {
        // Validate registration fields
        if (!email || !firstName || !lastName) {
          throw new Error("Please fill in all required fields");
        }
        
        await register({
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined
        });
      } else {
        await login(username, password);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeUsername = (value: string) => {
    setUsername(value);
  };

  const handleTypePassword = (value: string) => {
    setPassword(value);
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError(null);
    // Clear form fields
    setUsername("");
    setPassword("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    
  };

  // Demo credentials
  const demoCredentials = [
    { username: "john_doe", password: "DemoUser2026Banking", name: "John Doe" },
    { username: "jane_smith", password: "DemoUser2026Banking", name: "Jane Smith" },
    { username: "admin", password: "AdminUser2026Banking", name: "Admin User" }
  ];

  const handleDemoLogin = async (username: string, password: string) => {
    setUsername(username);
    setPassword(password);
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card-main rounded-2xl shadow-xl p-8 max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-[var(--text-1)] mb-6 text-center">
        {isRegister ? "Create Account" : "Welcome Back"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {isRegister && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-1)] mb-1">
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-1)] mb-1">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-1)] mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-1)] mb-1">
                Phone (Optional)
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-[var(--text-1)] mb-1">
            Username
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => handleTypeUsername(e.target.value)}
            placeholder="Enter your username"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--text-1)] mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => handleTypePassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-4 bg-[var(--primary-red)]/10 border border-[var(--primary-red)]/30 text-[var(--primary-red)] rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isRegister ? "Creating Account..." : "Signing In..."}
            </span>
          ) : (
            isRegister ? "Create Account" : "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={toggleMode}
          className="text-sm text-[var(--primary-blue)] hover:text-[var(--primary-indigo)] font-medium"
          disabled={isLoading}
        >
          {isRegister 
            ? "Already have an account? Sign in" 
            : "Don't have an account? Create one"}
        </button>
      </div>

      {/* Demo Credentials Section */}
      {!isRegister && (
        <div className="mt-8 pt-6 border-t border-[var(--border-1)]">
          <p className="text-sm text-[var(--text-2)] text-center mb-4">
            Demo Credentials (click to use)
          </p>
          <div className="space-y-2">
            {demoCredentials.map((cred) => (
              <button
                key={cred.username}
                onClick={() => handleDemoLogin(cred.username, cred.password)}
                className="w-full text-left px-4 py-3 glass-card hover:border-[var(--glass-border-prominent)] rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-[var(--text-1)]">{cred.name}</div>
                    <div className="text-sm text-[var(--text-2)]">
                      {cred.username} / {cred.password}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-[var(--text-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
