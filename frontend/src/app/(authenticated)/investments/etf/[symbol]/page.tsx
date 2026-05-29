"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  PieChart,
  Star,
  BarChart
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface ETFDetail {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  volume: number;
  market_cap: number;
  pe_ratio?: number;
  dividend_yield?: number;
  week_52_high: number;
  week_52_low: number;
  expense_ratio: number;
  net_assets: number;
  category: string;
  holdings_count: number;
  top_holdings: Array<{
    symbol: string;
    name: string;
    weight: number;
    shares: number;
    value: number;
  }>;
  sector_allocation: Record<string, number>;
}

interface Holding {
  symbol: string;
  name: string;
  weight: number;
  shares: number;
  value: number;
}

interface Watchlist {
  id: number;
  symbols: string[];
  name: string;
}

export default function ETFDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;

  const [etf, setEtf] = useState<ETFDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');

  const fetchETFDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi.get(`/api/investments/etf/${symbol.toUpperCase()}`);

      // Convert string numbers to actual numbers
      const processedETF = {
        ...response,
        current_price: parseFloat(response.current_price),
        price_change: parseFloat(response.price_change),
        price_change_percent: parseFloat(response.price_change_percent),
        volume: parseInt(response.volume),
        market_cap: parseFloat(response.market_cap),
        pe_ratio: response.pe_ratio ? parseFloat(response.pe_ratio) : undefined,
        dividend_yield: response.dividend_yield ? parseFloat(response.dividend_yield) : undefined,
        week_52_high: parseFloat(response.week_52_high),
        week_52_low: parseFloat(response.week_52_low),
        expense_ratio: parseFloat(response.expense_ratio),
        net_assets: parseFloat(response.net_assets),
        holdings_count: parseInt(response.holdings_count),
        top_holdings: response.top_holdings.map((h: Holding) => ({
          ...h,
          weight: parseFloat(h.weight.toString()),
          shares: parseInt(h.shares.toString()),
          value: parseFloat(h.value.toString())
        })),
        sector_allocation: Object.fromEntries(
          Object.entries(response.sector_allocation).map(([k, v]) => [k, parseFloat(v as string)])
        )
      };

      setEtf(processedETF);

    } catch {
      setError('Failed to load ETF details');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const checkWatchlist = useCallback(async () => {
    try {
      const watchlists = await fetchApi.get('/api/investments/watchlists');
      const isInWatchlist = watchlists.some((w: Watchlist) =>
        w.symbols.includes(symbol.toUpperCase())
      );
      setInWatchlist(isInWatchlist);
    } catch {
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      fetchETFDetail();
      checkWatchlist();
    }
  }, [symbol, fetchETFDetail, checkWatchlist]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        // Remove from watchlist
        const watchlists = await fetchApi.get('/api/investments/watchlists');
        const watchlist = watchlists.find((w: Watchlist) => w.symbols.includes(symbol.toUpperCase()));
        if (watchlist) {
          const updatedSymbols = watchlist.symbols.filter((s: string) => s !== symbol.toUpperCase());
          await fetchApi.put(`/api/investments/watchlists/${watchlist.id}`, updatedSymbols);
        }
      } else {
        // Add to watchlist
        const watchlists = await fetchApi.get('/api/investments/watchlists');
        if (watchlists.length > 0) {
          const watchlist = watchlists[0];
          const updatedSymbols = [...watchlist.symbols, symbol.toUpperCase()];
          await fetchApi.put(`/api/investments/watchlists/${watchlist.id}`, updatedSymbols);
        } else {
          // Create new watchlist
          await fetchApi.post('/api/investments/watchlists', {
            name: 'My Watchlist',
            symbols: [symbol.toUpperCase()]
          });
        }
      }
      setInWatchlist(!inWatchlist);
    } catch {
    }
  };

  const handleTrade = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    
    try {
      // Get user's investment accounts
      const accounts = await fetchApi.get('/api/investments/accounts');
      if (accounts.length === 0) {
        alert('Please create an investment account first');
        router.push('/investments');
        return;
      }
      
      // Use first account
      const account = accounts[0];
      
      // Create order
      await fetchApi.post('/api/investments/orders', {
        account_id: account.id,
        symbol: symbol.toUpperCase(),
        asset_type: 'etf',
        order_type: 'market',
        order_side: tradeType,
        quantity: parseFloat(quantity)
      });
      
      alert(`${tradeType === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`);
      setShowTradeModal(false);
      setQuantity('');
    } catch {
      alert('Failed to place trade. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 skeleton-item rounded w-1/4"></div>
          <div className="h-64 skeleton-item rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !etf) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'ETF not found'}</p>
          <button
            onClick={() => router.push('/investments/discover')}
            className="link-primary hover:underline"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  const priceChangeColor = etf.price_change >= 0 ? 'text-success' : 'text-error';
  const priceChangeIcon = etf.price_change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/investments/discover')}
          className="flex items-center gap-2 text-secondary hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Discover
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{etf.symbol}</h1>
              <span className="px-3 py-1 bg-[var(--cat-blue)] text-[var(--primary-blue)] rounded-full text-sm font-medium">
                ETF
              </span>
            </div>
            <p className="text-lg text-secondary">{etf.name}</p>
            <p className="text-sm text-secondary opacity-75">{etf.category}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={toggleWatchlist}
              className={`p-2 rounded-lg border transition-all ${
                inWatchlist 
                  ? 'bg-[var(--cat-amber)] border-[var(--primary-amber)] text-[var(--primary-amber)]' 
                  : 'border-default hover:bg-surface-alt'
              }`}
            >
              <Star className={`w-5 h-5 ${inWatchlist ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => {
                setTradeType('buy');
                setShowTradeModal(true);
              }}
              className="px-4 py-2 btn-primary bg-gradient-secondary rounded-lg transition-all"
            >
              Buy
            </button>
            <button
              onClick={() => {
                setTradeType('sell');
                setShowTradeModal(true);
              }}
              className="px-4 py-2 bg-gradient-danger text-white rounded-lg transition-all hover:shadow-lg"
            >
              Sell
            </button>
          </div>
        </div>
      </div>

      {/* Price Info */}
      <Card variant="prominent" className="mb-6">
        <div className="flex items-baseline gap-4">
          <span className="text-4xl font-bold">${etf.current_price.toFixed(2)}</span>
          <div className={`flex items-center gap-1 ${priceChangeColor}`}>
            {priceChangeIcon}
            <span className="text-lg font-medium">
              ${Math.abs(etf.price_change).toFixed(2)} ({formatPercentage(Math.abs(etf.price_change_percent) / 100)})
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-secondary">Volume</p>
            <p className="font-medium">{etf.volume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Net Assets</p>
            <p className="font-medium">{formatCurrency(etf.net_assets)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">52W High</p>
            <p className="font-medium">${etf.week_52_high.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">52W Low</p>
            <p className="font-medium">${etf.week_52_low.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <Card variant="default">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-[var(--primary-blue)]" />
            Key Metrics
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">Expense Ratio</span>
              <span className="font-medium">{etf.expense_ratio}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Dividend Yield</span>
              <span className="font-medium">{etf.dividend_yield?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Holdings Count</span>
              <span className="font-medium">{etf.holdings_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Category</span>
              <span className="font-medium capitalize">{etf.category}</span>
            </div>
          </div>
        </Card>

        {/* Sector Allocation */}
        <Card variant="default">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[var(--primary-purple)]" />
            Sector Allocation
          </h2>
          <div className="space-y-2">
            {Object.entries(etf.sector_allocation)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([sector, allocation]) => (
                <div key={sector} className="flex items-center justify-between">
                  <span className="text-secondary">{sector}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-alt rounded-full h-2">
                      <div 
                        className="h-2 rounded-full gradient-main"
                        style={{ width: `${allocation}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{allocation}%</span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Top Holdings */}
      <Card variant="prominent" className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Top Holdings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-default">
                <th className="text-left py-3 px-4 text-primary">Symbol</th>
                <th className="text-left py-3 px-4 text-primary">Name</th>
                <th className="text-right py-3 px-4 text-primary">Weight</th>
                <th className="text-right py-3 px-4 text-primary">Shares</th>
                <th className="text-right py-3 px-4 text-primary">Value</th>
              </tr>
            </thead>
            <tbody>
              {etf.top_holdings.map((holding, index) => (
                <tr key={index} className="border-b border-default hover:bg-surface-alt transition-colors">
                  <td className="py-3 px-4 font-medium text-primary">{holding.symbol}</td>
                  <td className="py-3 px-4 text-secondary">{holding.name}</td>
                  <td className="py-3 px-4 text-right text-secondary">{holding.weight}%</td>
                  <td className="py-3 px-4 text-right text-secondary">{holding.shares.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-secondary">{formatCurrency(holding.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Trade Modal */}
      <Modal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setQuantity('');
        }}
        title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${etf.symbol}`}
        size="md"
        analyticsId={`etf-trade-modal-${etf.symbol}`}
        analyticsLabel={`ETF Trade Modal - ${etf.symbol}`}
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTradeModal(false);
                setQuantity('');
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleTrade}
              disabled={!quantity || parseFloat(quantity) <= 0}
              fullWidth
              className={tradeType === 'sell' ? 'bg-gradient-danger' : ''}
            >
              {tradeType === 'buy' ? 'Buy' : 'Sell'}
            </Button>
          </div>
        }
      >
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Current Price
                </label>
                <p className="text-2xl font-bold">${etf.current_price.toFixed(2)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-primary"
                />
              </div>
              
              {quantity && parseFloat(quantity) > 0 && (
                <div className="p-4 bg-surface-alt rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-secondary">Estimated Total</span>
                    <span className="font-medium">
                      ${(parseFloat(quantity) * etf.current_price).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary opacity-75">Commission</span>
                    <span className="text-secondary opacity-75">$0.00</span>
                  </div>
                </div>
              )}
            </div>
      </Modal>
    </div>
  );
}
