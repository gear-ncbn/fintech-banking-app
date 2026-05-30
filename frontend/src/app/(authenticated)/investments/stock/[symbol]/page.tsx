"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart,
  Star,
  Building,
  Target
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface StockDetail {
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
  sector: string;
  industry: string;
  earnings_date?: string;
  beta?: number;
  forward_pe?: number;
  profit_margin?: number;
  analyst_rating?: string;
  analyst_target_price?: number;
}

interface Watchlist {
  id: number;
  symbols: string[];
  name: string;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;

  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');

  const fetchStockDetail = useCallback(async () => {
    try {
      setLoading(true);
      // The detail endpoint returns numeric fields as strings, which are parsed below.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetchApi.get<any>(`/api/investments/stock/${symbol.toUpperCase()}`);

      // Convert string numbers to actual numbers
      const processedStock = {
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
        beta: response.beta ? parseFloat(response.beta) : undefined,
        forward_pe: response.forward_pe ? parseFloat(response.forward_pe) : undefined,
        profit_margin: response.profit_margin ? parseFloat(response.profit_margin) : undefined,
        analyst_target_price: response.analyst_target_price ? parseFloat(response.analyst_target_price) : undefined
      };

      setStock(processedStock);

    } catch {
      setError('Failed to load stock details');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const checkWatchlist = useCallback(async () => {
    try {
      const watchlists = await fetchApi.get<Watchlist[]>('/api/investments/watchlists');
      const isInWatchlist = watchlists.some((w: Watchlist) =>
        w.symbols.includes(symbol.toUpperCase())
      );
      setInWatchlist(isInWatchlist);
    } catch {
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      fetchStockDetail();
      checkWatchlist();
    }
  }, [symbol, fetchStockDetail, checkWatchlist]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        // Remove from watchlist
        const watchlists = await fetchApi.get<Watchlist[]>('/api/investments/watchlists');
        const watchlist = watchlists.find((w: Watchlist) => w.symbols.includes(symbol.toUpperCase()));
        if (watchlist) {
          const updatedSymbols = watchlist.symbols.filter((s: string) => s !== symbol.toUpperCase());
          await fetchApi.put(`/api/investments/watchlists/${watchlist.id}`, updatedSymbols);
        }
      } else {
        // Add to watchlist
        const watchlists = await fetchApi.get<Watchlist[]>('/api/investments/watchlists');
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
      const accounts = await fetchApi.get<Array<{ id: number }>>('/api/investments/accounts');
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
        asset_type: 'stock',
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

  const getAnalystRatingColor = (rating?: string) => {
    if (!rating) return 'text-secondary';
    switch (rating) {
      case 'Strong Buy': return 'text-[var(--primary-emerald)]';
      case 'Buy': return 'text-success';
      case 'Hold': return 'text-[var(--primary-amber)]';
      case 'Sell': return 'text-[var(--primary-amber)]';
      case 'Strong Sell': return 'text-error';
      default: return 'text-secondary';
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

  if (error || !stock) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'Stock not found'}</p>
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

  const priceChangeColor = stock.price_change >= 0 ? 'text-success' : 'text-error';
  const priceChangeIcon = stock.price_change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />;

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
              <h1 className="text-3xl font-bold">{stock.symbol}</h1>
              <span className="px-3 py-1 bg-[var(--cat-emerald)] text-[var(--primary-emerald)] rounded-full text-sm font-medium">
                Stock
              </span>
            </div>
            <p className="text-lg text-secondary">{stock.name}</p>
            <p className="text-sm text-secondary opacity-75">{stock.sector} • {stock.industry}</p>
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
          <span className="text-4xl font-bold">${stock.current_price.toFixed(2)}</span>
          <div className={`flex items-center gap-1 ${priceChangeColor}`}>
            {priceChangeIcon}
            <span className="text-lg font-medium">
              ${Math.abs(stock.price_change).toFixed(2)} ({formatPercentage(Math.abs(stock.price_change_percent) / 100)})
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-secondary">Volume</p>
            <p className="font-medium">{stock.volume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Market Cap</p>
            <p className="font-medium">{formatCurrency(stock.market_cap)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">52W High</p>
            <p className="font-medium">${stock.week_52_high.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">52W Low</p>
            <p className="font-medium">${stock.week_52_low.toFixed(2)}</p>
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
              <span className="text-secondary">P/E Ratio</span>
              <span className="font-medium">{stock.pe_ratio?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Forward P/E</span>
              <span className="font-medium">{stock.forward_pe?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Dividend Yield</span>
              <span className="font-medium">{stock.dividend_yield?.toFixed(2) || '0.00'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Beta</span>
              <span className="font-medium">{stock.beta?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Profit Margin</span>
              <span className="font-medium">{stock.profit_margin?.toFixed(2) || 'N/A'}%</span>
            </div>
          </div>
        </Card>

        {/* Company Info */}
        <Card variant="default">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-[var(--primary-purple)]" />
            Company Info
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">Sector</span>
              <span className="font-medium">{stock.sector}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Industry</span>
              <span className="font-medium">{stock.industry}</span>
            </div>
            {stock.earnings_date && (
              <div className="flex justify-between">
                <span className="text-secondary">Next Earnings</span>
                <span className="font-medium">
                  {new Date(stock.earnings_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Analyst Information */}
      {(stock.analyst_rating || stock.analyst_target_price) && (
        <Card variant="prominent" className="mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--primary-indigo)]" />
            Analyst Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stock.analyst_rating && (
              <div>
                <p className="text-sm text-secondary mb-2">Analyst Rating</p>
                <p className={`text-2xl font-bold ${getAnalystRatingColor(stock.analyst_rating)}`}>
                  {stock.analyst_rating}
                </p>
              </div>
            )}
            {stock.analyst_target_price && (
              <div>
                <p className="text-sm text-secondary mb-2">Target Price</p>
                <p className="text-2xl font-bold">${stock.analyst_target_price.toFixed(2)}</p>
                <p className="text-sm text-secondary opacity-75 mt-1">
                  {stock.analyst_target_price > stock.current_price ? '+' : ''}{((stock.analyst_target_price - stock.current_price) / stock.current_price * 100).toFixed(2)}% from current
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Trade Modal */}
      <Modal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setQuantity('');
        }}
        title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}`}
        size="md"
        analyticsId={`stock-trade-modal-${stock.symbol}`}
        analyticsLabel={`Stock Trade Modal - ${stock.symbol}`}
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
                <p className="text-2xl font-bold">${stock.current_price.toFixed(2)}</p>
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
                      ${(parseFloat(quantity) * stock.current_price).toFixed(2)}
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
