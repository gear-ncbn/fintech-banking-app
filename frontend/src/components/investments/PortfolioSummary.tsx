"use client";

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface PortfolioData {
  total_value: number;
  day_change: number;
  day_change_percent: number;
  week_change: number;
  week_change_percent: number;
  month_change: number;
  month_change_percent: number;
  year_change: number;
  year_change_percent: number;
  asset_allocation: {
    stocks: number;
    etfs: number;
    crypto: number;
    cash: number;
  };
  top_gainers: Array<{
    symbol: string;
    name: string;
    asset_type: string;
    current_value: number;
    gain_loss: number;
    gain_loss_percent: number;
  }>;
  top_losers: Array<{
    symbol: string;
    name: string;
    asset_type: string;
    current_value: number;
    gain_loss: number;
    gain_loss_percent: number;
  }>;
  performance_history: Array<{
    month: string;
    value: number;
  }>;
}

interface PortfolioSummaryProps {
  onLoading?: (loading: boolean) => void;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ onLoading }) => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('year');

  useEffect(() => {
    fetchPortfolioSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPortfolioSummary = async () => {
    try {
      setLoading(true);
      onLoading?.(true);

      const response = await fetch('/api/investments/portfolio-summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio summary:', error);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  if (loading || !portfolioData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const getPeriodData = () => {
    switch (selectedPeriod) {
      case 'day':
        return {
          change: portfolioData.day_change,
          changePercent: portfolioData.day_change_percent,
        };
      case 'week':
        return {
          change: portfolioData.week_change,
          changePercent: portfolioData.week_change_percent,
        };
      case 'month':
        return {
          change: portfolioData.month_change,
          changePercent: portfolioData.month_change_percent,
        };
      case 'year':
        return {
          change: portfolioData.year_change,
          changePercent: portfolioData.year_change_percent,
        };
    }
  };

  const periodData = getPeriodData();
  const isPositive = periodData.change >= 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Value Card */}
      <Card variant="prominent" className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <p className="text-[var(--text-2)] text-sm font-medium mb-2">
              Total Portfolio Value
            </p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-1)]">
              {formatCurrency(portfolioData.total_value)}
            </h2>

            {/* Period Change */}
            <div className="flex items-center gap-4 mt-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      isPositive
                        ? 'text-[var(--primary-emerald)]'
                        : 'text-[var(--primary-red)]'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(periodData.change)}
                  </span>
                  <span
                    className={`flex items-center text-lg ${
                      isPositive
                        ? 'text-[var(--primary-emerald)]'
                        : 'text-[var(--primary-red)]'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-5 h-5 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 mr-1" />
                    )}
                    {isPositive ? '+' : '-'}{Math.abs(periodData.changePercent).toFixed(2)}%
                  </span>
                </div>
                <p className="text-[var(--text-2)] text-sm mt-1">
                  {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} return
                </p>
              </div>

              {/* Period Selector */}
              <div className="flex gap-2 ml-auto lg:ml-0">
                {(['day', 'week', 'month', 'year'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedPeriod === period
                        ? 'bg-[var(--primary-blue)] text-white'
                        : 'bg-[var(--card-bg)] text-[var(--text-2)] hover:bg-[var(--border-color)]'
                    }`}
                  >
                    {period === 'day'
                      ? '1D'
                      : period === 'week'
                        ? '1W'
                        : period === 'month'
                          ? '1M'
                          : '1Y'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Asset Allocation & Top Performers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Allocation Donut Chart */}
        <Card variant="default" className="p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[var(--primary-blue)]" />
              Asset Allocation
            </h3>
          </div>

          {/* Donut Chart (CSS-based) */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <defs>
                  <style>{`
                    .donut-segment { transition: all 0.3s ease; }
                    .donut-segment:hover { filter: brightness(1.1); }
                  `}</style>
                </defs>
                {/* Stocks */}
                <circle
                  className="donut-segment"
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="40"
                  strokeDasharray={`${(portfolioData.asset_allocation.stocks / 100) * 440} 440`}
                  strokeDashoffset="0"
                  strokeLinecap="butt"
                  transform="rotate(-90 100 100)"
                />
                {/* ETFs */}
                <circle
                  className="donut-segment"
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="40"
                  strokeDasharray={`${(portfolioData.asset_allocation.etfs / 100) * 440} 440`}
                  strokeDashoffset={`-${(portfolioData.asset_allocation.stocks / 100) * 440}`}
                  strokeLinecap="butt"
                  transform="rotate(-90 100 100)"
                />
                {/* Crypto */}
                <circle
                  className="donut-segment"
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="40"
                  strokeDasharray={`${(portfolioData.asset_allocation.crypto / 100) * 440} 440`}
                  strokeDashoffset={`-${((portfolioData.asset_allocation.stocks + portfolioData.asset_allocation.etfs) / 100) * 440}`}
                  strokeLinecap="butt"
                  transform="rotate(-90 100 100)"
                />
                {/* Cash */}
                <circle
                  className="donut-segment"
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="40"
                  strokeDasharray={`${(portfolioData.asset_allocation.cash / 100) * 440} 440`}
                  strokeDashoffset={`-${((portfolioData.asset_allocation.stocks + portfolioData.asset_allocation.etfs + portfolioData.asset_allocation.crypto) / 100) * 440}`}
                  strokeLinecap="butt"
                  transform="rotate(-90 100 100)"
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs text-[var(--text-2)]">Diversified</p>
                <p className="text-sm font-semibold text-[var(--text-1)]">Portfolio</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-sm text-[var(--text-2)]">Stocks</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-1)]">
                {portfolioData.asset_allocation.stocks.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                <span className="text-sm text-[var(--text-2)]">ETFs</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-1)]">
                {portfolioData.asset_allocation.etfs.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-sm text-[var(--text-2)]">Crypto</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-1)]">
                {portfolioData.asset_allocation.crypto.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-sm text-[var(--text-2)]">Cash</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-1)]">
                {portfolioData.asset_allocation.cash.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>

        {/* Top Gainers */}
        <Card variant="default" className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[var(--primary-emerald)]" />
            Top Gainers
          </h3>

          {portfolioData.top_gainers.length > 0 ? (
            <div className="space-y-3">
              {portfolioData.top_gainers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--border-color)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-1)] truncate">{item.symbol}</p>
                    <p className="text-xs text-[var(--text-2)] capitalize">{item.asset_type}</p>
                  </div>
                  <div className="text-right ml-2">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-sm font-semibold text-[var(--primary-emerald)]">
                        +{Math.abs(item.gain_loss_percent).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-2)]">
                      {formatCurrency(item.gain_loss)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-2)] py-4">No positions yet</p>
          )}
        </Card>

        {/* Top Losers */}
        <Card variant="default" className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-[var(--primary-red)]" />
            Top Losers
          </h3>

          {portfolioData.top_losers.length > 0 ? (
            <div className="space-y-3">
              {portfolioData.top_losers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--border-color)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-1)] truncate">{item.symbol}</p>
                    <p className="text-xs text-[var(--text-2)] capitalize">{item.asset_type}</p>
                  </div>
                  <div className="text-right ml-2">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-sm font-semibold text-[var(--primary-red)]">
                        {item.gain_loss_percent.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-2)]">
                      {formatCurrency(item.gain_loss)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--text-2)] py-4">No positions yet</p>
          )}
        </Card>
      </div>

      {/* Performance Chart */}
      <Card variant="default" className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[var(--primary-blue)]" />
          Performance History (12 Months)
        </h3>

        {portfolioData.performance_history.length > 0 ? (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="h-64 flex items-end gap-1 px-2 py-4 bg-[var(--card-bg)] rounded-lg">
              {portfolioData.performance_history.map((point, idx) => {
                const values = portfolioData.performance_history.map((p) => p.value);
                // Use a zero-based scale so bar heights are proportional to the
                // actual values. A min-max scale exaggerates tiny movements
                // (e.g. a ~1.7% change would span the full 5%-100% height),
                // making the trend look far more dramatic than it really is.
                const maxValue = Math.max(...values) || 1;
                const heightPercent = (point.value / maxValue) * 100;

                return (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col items-center group relative"
                  >
                    {/* Bar area: a flex-grown region with a definite height so the
                        bar's percentage height resolves correctly. */}
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full rounded-t-lg transition-all duration-300 group-hover:bg-[var(--primary-blue)] hover:opacity-80 relative"
                        style={{
                          height: `${Math.max(heightPercent, 5)}%`,
                          backgroundColor: '#3b82f6',
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[var(--text-1)] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {formatCurrency(point.value)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-2)] mt-2 text-center leading-tight">
                      {point.month.split(' ')[0]}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-[var(--card-bg)] rounded-lg text-center">
                <p className="text-xs text-[var(--text-2)] mb-1">Starting Value</p>
                <p className="font-semibold text-[var(--text-1)]">
                  {formatCurrency(portfolioData.performance_history[0]?.value || 0)}
                </p>
              </div>
              <div className="p-3 bg-[var(--card-bg)] rounded-lg text-center">
                <p className="text-xs text-[var(--text-2)] mb-1">Peak Value</p>
                <p className="font-semibold text-[var(--text-1)]">
                  {formatCurrency(
                    Math.max(...portfolioData.performance_history.map((p) => p.value))
                  )}
                </p>
              </div>
              <div className="p-3 bg-[var(--card-bg)] rounded-lg text-center">
                <p className="text-xs text-[var(--text-2)] mb-1">Current Value</p>
                <p className="font-semibold text-[var(--text-1)]">
                  {formatCurrency(
                    portfolioData.performance_history[portfolioData.performance_history.length - 1]
                      ?.value || portfolioData.total_value
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-[var(--text-2)] py-8">No performance data available</p>
        )}
      </Card>
    </div>
  );
};

export default PortfolioSummary;
