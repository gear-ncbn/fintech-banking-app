"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart,
  Activity,
  Info,
  Star
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface CryptoDetail {
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
}

export default function CryptoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  
  const [crypto, setCrypto] = useState<CryptoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');

  const fetchCryptoDetail = useCallback(async () => {
    try {
      setLoading(true);
      // The detail endpoint returns numeric fields as strings, which are parsed below.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetchApi.get<any>(`/api/investments/crypto/${symbol.toUpperCase()}`);

      // Convert string numbers to actual numbers
      const processedCrypto = {
        ...response,
        current_price: parseFloat(response.current_price),
        price_change: parseFloat(response.price_change),
        price_change_percent: parseFloat(response.price_change_percent),
        volume: parseInt(response.volume),
        market_cap: parseFloat(response.market_cap),
        pe_ratio: response.pe_ratio ? parseFloat(response.pe_ratio) : undefined,
        dividend_yield: response.dividend_yield ? parseFloat(response.dividend_yield) : undefined,
        week_52_high: parseFloat(response.week_52_high),
        week_52_low: parseFloat(response.week_52_low)
      };

      setCrypto(processedCrypto);

    } catch {
      setError('Failed to load crypto details');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const checkWatchlist = useCallback(async () => {
    try {
      const watchlists = await fetchApi.get<Array<{ id: number; symbols: string[] }>>('/api/investments/watchlists');
      interface Watchlist { symbols: string[] }
      const isInWatchlist = watchlists.some((w: Watchlist) =>
        w.symbols.includes(symbol.toUpperCase())
      );
      setInWatchlist(isInWatchlist);
    } catch {
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      fetchCryptoDetail();
      checkWatchlist();
    }
  }, [symbol, fetchCryptoDetail, checkWatchlist]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        // Remove from watchlist
        const watchlists = await fetchApi.get<Array<{ id: number; symbols: string[] }>>('/api/investments/watchlists');
        interface Watchlist { id: number; symbols: string[] }
        const watchlist = watchlists.find((w: Watchlist) => w.symbols.includes(symbol.toUpperCase()));
        if (watchlist) {
          const updatedSymbols = watchlist.symbols.filter((s: string) => s !== symbol.toUpperCase());
          await fetchApi.put(`/api/investments/watchlists/${watchlist.id}`, updatedSymbols);
        }
      } else {
        // Add to watchlist
        const watchlists = await fetchApi.get<Array<{ id: number; symbols: string[] }>>('/api/investments/watchlists');
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
        asset_type: 'crypto',
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

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '₮',
      USDC: '$',
      BNB: 'BNB',
      ADA: 'ADA',
      SOL: 'SOL',
      DOT: 'DOT',
      MATIC: 'MATIC',
      LINK: 'LINK',
      UNI: 'UNI',
      AAVE: 'AAVE'
    };
    return icons[symbol] || symbol;
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

  if (error || !crypto) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'Cryptocurrency not found'}</p>
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

  const priceChangeColor = crypto.price_change >= 0 ? 'text-success' : 'text-error';
  const priceChangeIcon = crypto.price_change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />;
  const priceChangePercentage = crypto.current_price > 50000 ? 2 : crypto.current_price > 1000 ? 4 : 6;

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
          <div className="flex items-start gap-4">
            <div className="text-3xl font-bold gradient-tertiary text-white rounded-full w-16 h-16 flex items-center justify-center flex-shrink-0">
              {getCryptoIcon(crypto.symbol)}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">{crypto.symbol}</h1>
                <span className="px-3 py-1 bg-[var(--cat-amber)] text-[var(--primary-amber)] rounded-full text-sm font-medium">
                  Crypto
                </span>
              </div>
              <p className="text-lg text-secondary">{crypto.name}</p>
            </div>
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
          <span className="text-4xl font-bold">
            ${crypto.current_price < 1 
              ? crypto.current_price.toFixed(priceChangePercentage) 
              : crypto.current_price.toFixed(2)}
          </span>
          <div className={`flex items-center gap-1 ${priceChangeColor}`}>
            {priceChangeIcon}
            <span className="text-lg font-medium">
              ${Math.abs(crypto.price_change).toFixed(crypto.current_price < 1 ? priceChangePercentage : 2)} ({formatPercentage(Math.abs(crypto.price_change_percent) / 100)})
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-secondary">24h Volume</p>
            <p className="font-medium">{formatCurrency(crypto.volume)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Market Cap</p>
            <p className="font-medium">{formatCurrency(crypto.market_cap)}</p>
          </div>
          <div>
            <p className="text-sm text-secondary">52W High</p>
            <p className="font-medium">
              ${crypto.week_52_high < 1 
                ? crypto.week_52_high.toFixed(priceChangePercentage) 
                : crypto.week_52_high.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary">52W Low</p>
            <p className="font-medium">
              ${crypto.week_52_low < 1 
                ? crypto.week_52_low.toFixed(priceChangePercentage) 
                : crypto.week_52_low.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Market Stats */}
        <Card variant="default">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-[var(--primary-blue)]" />
            Market Statistics
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">24h Change</span>
              <span className={`font-medium ${priceChangeColor}`}>
                {crypto.price_change >= 0 ? '+' : ''}{formatPercentage(crypto.price_change_percent / 100)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Market Dominance</span>
              <span className="font-medium">
                {(crypto.market_cap / 2e12 * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Circulating Supply</span>
              <span className="font-medium">
                {(crypto.market_cap / crypto.current_price / 1e6).toFixed(2)}M {crypto.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">24h High/Low</span>
              <span className="font-medium text-sm">
                ${(crypto.current_price * 1.05).toFixed(2)} / ${(crypto.current_price * 0.95).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        {/* Trading Info */}
        <Card variant="default">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--primary-purple)]" />
            Trading Information
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary">Trading Pairs</span>
              <span className="font-medium">{crypto.symbol}/USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">24h Transactions</span>
              <span className="font-medium">
                {Math.floor(crypto.volume / crypto.current_price).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Volatility (24h)</span>
              <span className="font-medium">
                {(Math.abs(crypto.price_change_percent) * 1.5).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Network</span>
              <span className="font-medium">
                {crypto.symbol === 'BTC' ? 'Bitcoin' : 
                 crypto.symbol === 'ETH' ? 'Ethereum' :
                 crypto.symbol === 'BNB' ? 'BSC' :
                 crypto.symbol === 'MATIC' ? 'Polygon' :
                 'Blockchain'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Info */}
      <Card variant="prominent" className="mt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-[var(--primary-indigo)]" />
          About {crypto.name}
        </h2>
        <p className="text-secondary leading-relaxed">
          {crypto.symbol === 'BTC' ? 
            'Bitcoin is the first and most well-known cryptocurrency, created in 2009. It operates on a decentralized network using blockchain technology, allowing peer-to-peer transactions without intermediaries.' :
           crypto.symbol === 'ETH' ?
            'Ethereum is a decentralized platform that enables smart contracts and decentralized applications (dApps) to be built and operated without downtime, fraud, or interference from third parties.' :
           crypto.symbol === 'USDT' || crypto.symbol === 'USDC' ?
            `${crypto.name} is a stablecoin pegged to the US Dollar, providing the stability of traditional currency with the efficiency of cryptocurrency. It's widely used for trading and as a store of value.` :
            `${crypto.name} is a cryptocurrency that operates on blockchain technology, offering unique features and use cases within the digital asset ecosystem.`}
        </p>
      </Card>

      {/* Trade Modal */}
      <Modal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setQuantity('');
        }}
        title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${crypto.symbol}`}
        size="md"
        analyticsId={`crypto-trade-modal-${crypto.symbol}`}
        analyticsLabel={`Crypto Trade Modal - ${crypto.symbol}`}
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
                <p className="text-2xl font-bold">
                  ${crypto.current_price < 1 
                    ? crypto.current_price.toFixed(priceChangePercentage) 
                    : crypto.current_price.toFixed(2)}
                </p>
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
                  step={crypto.current_price < 1 ? "0.000001" : "0.01"}
                  className="w-full px-3 py-2 border border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-primary"
                />
              </div>
              
              {quantity && parseFloat(quantity) > 0 && (
                <div className="p-4 bg-surface-alt rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-secondary">Estimated Total</span>
                    <span className="font-medium">
                      ${(parseFloat(quantity) * crypto.current_price).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary opacity-75">Network Fee</span>
                    <span className="text-secondary opacity-75">~$2.50</span>
                  </div>
                </div>
              )}
            </div>
      </Modal>
    </div>
  );
}
