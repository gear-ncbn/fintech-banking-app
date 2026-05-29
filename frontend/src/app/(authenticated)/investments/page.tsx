"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Bitcoin,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Shield,
  Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';
import PortfolioSummary from '@/components/investments/PortfolioSummary';

interface InvestmentAccount {
  id: number;
  account_type: string;
  account_name: string;
  balance: string;
  cash_balance: string;
  buying_power: string;
  portfolio_value: string;
  total_return: string;
  total_return_percent: string;
  is_retirement: boolean;
  risk_tolerance: string;
  created_at: string;
  updated_at: string;
}

interface AssetAllocation {
  asset_type: string;
  value: number;
  percentage: number;
  count: number;
}

interface Position {
  symbol: string;
  name: string;
  asset_type: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  current_value: number;
  total_return: number;
  total_return_percentage: number;
}

const ASSET_TYPE_CONFIG = {
  etf: {
    icon: Building2,
    label: 'ETFs',
    description: 'Exchange-Traded Funds - Low risk, diversified investments',
    color: 'blue',
    riskLevel: 'Low',
    features: ['Diversified portfolios', 'Low fees', 'Instant liquidity']
  },
  stock: {
    icon: BarChart3,
    label: 'Stocks',
    description: 'Individual company stocks - Medium risk, growth potential',
    color: 'green',
    riskLevel: 'Medium',
    features: ['Direct ownership', 'Dividend potential', 'Market hours trading']
  },
  crypto: {
    icon: Bitcoin,
    label: 'Crypto',
    description: 'Digital currencies - High risk, high reward potential',
    color: 'orange',
    riskLevel: 'High',
    features: ['24/7 trading', 'Global access', 'Decentralized assets']
  }
};

export default function InvestmentsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [allocation, setAllocation] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'performance'>('overview');

  useEffect(() => {
    fetchInvestmentData();
    
  }, []);

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);
      
      // Fetch investment accounts
      const accountsRes = await apiClient.get('/api/investments/accounts');
      setAccounts(accountsRes);

      // If user has accounts, fetch portfolio data
      if (accountsRes.length > 0) {
        const portfolioRes = await apiClient.get(`/api/investments/portfolio/${accountsRes[0].id}`);
        setPositions(portfolioRes.positions || []);
        setAllocation(portfolioRes.allocation || []);
      }
    } catch (error) {
      console.error('Error fetching investment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (accountType: string) => {
    try {

      await fetchApi.post('/api/investments/accounts', {
        account_type: 'individual',
        name: `My ${accountType.toUpperCase()} Portfolio`,
        risk_level: ASSET_TYPE_CONFIG[accountType as keyof typeof ASSET_TYPE_CONFIG].riskLevel.toLowerCase()
      });
      
      // Refresh data
      await fetchInvestmentData();
    } catch {
    }
  };

  const navigateToTrading = (assetType: string) => {
    router.push(`/investments/trade/${assetType}`);
  };

  const getTotalValue = () => {
    return accounts.reduce((sum, account) => sum + parseFloat(account.portfolio_value || '0'), 0);
  };

  const getTotalReturn = () => {
    return accounts.reduce((sum, account) => sum + parseFloat(account.total_return || '0'), 0);
  };

  const getTotalReturnPercentage = () => {
    const totalInvested = accounts.reduce((sum, account) => 
      sum + (parseFloat(account.portfolio_value || '0') - parseFloat(account.total_return || '0')), 0
    );
    return totalInvested > 0 ? (getTotalReturn() / totalInvested) * 100 : 0;
  };

  const handleTabChange = (tab: 'overview' | 'positions' | 'performance') => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Investment Portfolio</h1>
        <p className="text-gray-600">Manage your ETF, stock, and crypto investments</p>
      </div>

      {/* New Portfolio Summary Component */}
      {accounts.length > 0 && <PortfolioSummary />}

      {/* Legacy Portfolio Summary (keeping for backward compatibility) */}
      {accounts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 lg:p-8 mb-8 text-white shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-sm mb-2 font-medium">Total Portfolio Value</p>
              <p className="text-3xl lg:text-4xl font-bold">{formatCurrency(getTotalValue())}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-sm mb-2 font-medium">Total Return</p>
              <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                <p className="text-2xl lg:text-3xl font-bold">{formatCurrency(getTotalReturn())}</p>
                <span className={`flex items-center text-sm ${getTotalReturn() >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {getTotalReturn() >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(getTotalReturnPercentage()).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="text-center sm:text-left sm:col-span-2 lg:col-span-1">
              <p className="text-blue-100 text-sm mb-2 font-medium">Asset Allocation</p>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-2">
                {allocation.map((asset) => (
                  <div key={asset.asset_type} className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                    <span className="text-sm font-medium">{asset.asset_type}: {asset.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Investment Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const hasAccount = accounts.some(acc => (acc.account_name || '').toLowerCase().includes(key));
            
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className={`p-6 bg-gradient-to-br from-${config.color}-50 to-${config.color}-100`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-${config.color}-500 rounded-lg text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-3 py-1 bg-white rounded-full text-xs font-medium text-${config.color}-700`}>
                      {config.riskLevel} Risk
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{config.label}</h3>
                  <p className="text-sm text-gray-600 mb-4">{config.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {config.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    {hasAccount ? (
                      <button
                        onClick={() => navigateToTrading(key)}
                        className={`flex-1 px-4 py-2 bg-${config.color}-600 text-white rounded-lg hover:bg-${config.color}-700 transition-colors`}
                      >
                        Trade {config.label}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateAccount(key)}
                        className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        Get Started
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/investments/discover')}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Holdings</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleTabChange('overview')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Overview
              </button>
              <button
                onClick={() => handleTabChange('positions')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'positions' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Positions
              </button>
              <button
                onClick={() => handleTabChange('performance')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'performance' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Performance
              </button>
            </div>
          </div>
          
          {activeTab === 'positions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Symbol</th>
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-right py-3 px-4">Quantity</th>
                    <th className="text-right py-3 px-4">Avg Cost</th>
                    <th className="text-right py-3 px-4">Current Price</th>
                    <th className="text-right py-3 px-4">Value</th>
                    <th className="text-right py-3 px-4">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.symbol} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{position.symbol}</td>
                      <td className="py-3 px-4">{position.name}</td>
                      <td className="text-right py-3 px-4">{position.quantity}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(position.avg_cost)}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(position.current_price)}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(position.current_value)}</td>
                      <td className={`text-right py-3 px-4 ${position.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {position.total_return >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span>{formatCurrency(position.total_return)}</span>
                          <span className="text-sm">({position.total_return_percentage.toFixed(2)}%)</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Ready to invest?</h3>
            <p className="text-gray-600">Start building your diversified portfolio today</p>
          </div>
          <button
            onClick={() => router.push('/investments/discover')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-5 h-5" />
            Discover Investments
          </button>
        </div>
      </div>
    </div>
  );
}
