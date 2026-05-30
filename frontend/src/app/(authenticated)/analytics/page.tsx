'use client';

import { useEffect, useState } from 'react';
import { analyticsIntelligenceService, type DashboardSummary, type Anomaly } from '@/lib/api/analytics-intelligence';
import { investmentsService, type PortfolioSummaryData } from '@/lib/api/investments';
import { formatCurrency } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function KPICard({ title, value, subtitle, trend, trendValue }: KPICardProps) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        {trendValue && (
          <span className={`ml-2 text-sm font-medium ${trendColor}`}>
            {trendIcon} {trendValue}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
}

interface AnomalyCardProps {
  anomaly: Anomaly;
}

function AnomalyCard({ anomaly }: AnomalyCardProps) {
  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[anomaly.severity]}`}>
              {anomaly.severity.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{anomaly.type.replace('_', ' ')}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700">{anomaly.description}</p>
          {anomaly.amount && (
            <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(anomaly.amount)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummaryData | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    loadDashboardData();

    // Set up WebSocket for real-time updates
    const websocket = analyticsIntelligenceService.connectWebSocket(
      (data: unknown) => {
        const message = data as { type: string; data?: unknown };
        if (message.type === 'event') {
          // Reload dashboard on new events
          loadDashboardData();
        }
        setLastUpdate(new Date().toLocaleTimeString());
      },
      (error) => {
        console.error('WebSocket error:', error);
      }
    );

    if (websocket) {
      setWs(websocket);
    }

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, portfolio] = await Promise.all([
        analyticsIntelligenceService.getDashboardSummary(),
        investmentsService.getPortfolioSummary().catch(() => null),
      ]);
      setDashboardData(data);
      setPortfolioSummary(portfolio);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary, cash_flow, investment_performance, budget_adherence, anomalies } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Intelligence</h1>
            <p className="mt-2 text-sm text-gray-600">
              Comprehensive financial insights and real-time analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            {ws && ws.readyState === WebSocket.OPEN && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            )}
            {lastUpdate && (
              <span className="text-sm text-gray-500">Last update: {lastUpdate}</span>
            )}
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Net Worth"
            value={formatCurrency(summary.net_worth)}
            subtitle={`Assets: ${formatCurrency(summary.total_assets)}`}
            trend={summary.net_worth > 0 ? 'up' : 'down'}
          />
          <KPICard
            title="Monthly Cash Flow"
            value={formatCurrency(Math.abs(summary.monthly_cash_flow))}
            subtitle={summary.monthly_cash_flow >= 0 ? 'Positive flow' : 'Negative flow'}
            trend={summary.monthly_cash_flow >= 0 ? 'up' : 'down'}
            trendValue={`${summary.savings_rate.toFixed(1)}%`}
          />
          <KPICard
            title="Financial Health"
            value={`${summary.financial_health_score}/100`}
            subtitle={summary.financial_health_rating}
            trend={summary.financial_health_score >= 70 ? 'up' : summary.financial_health_score >= 50 ? 'neutral' : 'down'}
          />
          <KPICard
            title="Savings Rate"
            value={`${summary.savings_rate.toFixed(1)}%`}
            subtitle="Last 30 days"
            trend={summary.savings_rate >= 20 ? 'up' : summary.savings_rate >= 10 ? 'neutral' : 'down'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cash Flow */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cash Flow Analysis</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Money In</span>
                <span className="text-lg font-semibold text-green-600">${cash_flow.money_in.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Money Out</span>
                <span className="text-lg font-semibold text-red-600">${cash_flow.money_out.toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-medium text-gray-900">Net Flow</span>
                <span className={`text-xl font-bold ${cash_flow.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(cash_flow.net_flow).toLocaleString()}
                </span>
              </div>

              {cash_flow.categories.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Top Categories</h3>
                  <div className="space-y-2">
                    {cash_flow.categories.slice(0, 5).map((cat, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{cat.category}</span>
                        <span className={cat.type === 'income' ? 'text-green-600' : 'text-gray-900'}>
                          ${cat.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Investment Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Investment Portfolio</h2>
            {investment_performance.total_value > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Value</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(investment_performance.total_value)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cost Basis</span>
                  <span className="text-lg font-semibold text-gray-600">
                    {formatCurrency(investment_performance.total_cost_basis)}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-medium text-gray-900">Gain/Loss</span>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${investment_performance.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {investment_performance.total_gain_loss >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(investment_performance.total_gain_loss))}
                    </div>
                    <div className={`text-sm ${investment_performance.total_gain_loss_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {investment_performance.total_gain_loss_percentage >= 0 ? '+' : ''}
                      {investment_performance.total_gain_loss_percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {portfolioSummary && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Asset Allocation</h3>
                    <div className="space-y-2">
                      {([
                        ['Stocks', portfolioSummary.asset_allocation.stocks],
                        ['ETFs', portfolioSummary.asset_allocation.etfs],
                        ['Crypto', portfolioSummary.asset_allocation.crypto],
                        ['Cash', portfolioSummary.asset_allocation.cash],
                      ] as const).map(([label, percentage]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className="text-gray-900">{percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No investment data available</p>
            )}
          </div>

          {/* Budget Adherence */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget Status</h2>
            {budget_adherence.total_budgets > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{budget_adherence.on_track_count}</div>
                    <div className="text-xs text-gray-600 mt-1">On Track</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{budget_adherence.at_risk_count}</div>
                    <div className="text-xs text-gray-600 mt-1">At Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{budget_adherence.over_budget_count}</div>
                    <div className="text-xs text-gray-600 mt-1">Over Budget</div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Total Budgets: <span className="font-medium text-gray-900">{budget_adherence.total_budgets}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No budgets configured</p>
            )}
          </div>

          {/* Anomalies */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Anomalies
              {anomalies.count > 0 && (
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {anomalies.count}
                </span>
              )}
            </h2>
            {anomalies.recent.length > 0 ? (
              <div className="space-y-3">
                {anomalies.recent.map((anomaly, index) => (
                  <AnomalyCard key={index} anomaly={anomaly} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No anomalies detected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
