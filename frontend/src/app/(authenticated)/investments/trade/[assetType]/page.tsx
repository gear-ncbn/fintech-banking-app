"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  AlertCircle,
  Star,

  X
} from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import { fetchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Asset {
  symbol: string;
  name: string;
  asset_type: string;
  current_price: number;
  change_amount: number;
  change_percentage: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  expense_ratio?: number;
  category?: string;
}

interface InvestmentAccount {
  id: number;
  account_type: string;
  name: string;
  balance: number;
  buying_power: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_value: number;
}

interface OrderFormData {
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
}

const ASSET_TYPE_LABELS = {
  etf: 'ETFs',
  stock: 'Stocks',
  crypto: 'Crypto'
};

const TIME_IN_FORCE_OPTIONS = [
  { value: 'day', label: 'Day', description: 'Valid for current trading day' },
  { value: 'gtc', label: 'GTC', description: 'Good till cancelled' },
  { value: 'ioc', label: 'IOC', description: 'Immediate or cancel' },
  { value: 'fok', label: 'FOK', description: 'Fill or kill' }
];

export default function TradingPage() {
  const params = useParams();
  const router = useRouter();
  const assetType = params.assetType as string;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [_accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InvestmentAccount | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    symbol: '',
    order_type: 'market',
    side: 'buy',
    quantity: 0,
    time_in_force: 'day'
  });
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');

  const searchAssets = useCallback(async (query: string) => {
    try {
      const response = await fetchApi.get(`/api/investments/assets/search?query=${query}&asset_type=${assetType}`);
      const normalized = response.map((a: Record<string, unknown>) => ({
        ...a,
        change_amount: (a.change_amount as number) ?? (a.change_24h as number) ?? 0,
        change_percentage: (a.change_percentage as number) ?? (a.change_percent as number) ?? 0,
      }));
      setAssets(normalized);
    } catch {
    }
  }, [assetType]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch accounts
      const accountsRes = await fetchApi.get('/api/investments/accounts');
      setAccounts(accountsRes);

      if (accountsRes.length > 0) {
        setSelectedAccount(accountsRes[0]);

        // Fetch positions
        const portfolioRes = await fetchApi.get(`/api/investments/portfolio/${accountsRes[0].id}`);
        setPositions(portfolioRes.positions || []);
      }

      // Fetch available assets
      await searchAssets('');

      // Load watchlist from localStorage
      const savedWatchlist = localStorage.getItem(`watchlist_${assetType}`);
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [assetType, searchAssets]);

  const checkExistingPosition = useCallback((symbol: string) => {
    const position = positions.find(p => p.symbol === symbol);
    setCurrentPosition(position || null);
  }, [positions]);

  useEffect(() => {
    if (!['etf', 'stock', 'crypto'].includes(assetType)) {
      router.push('/investments');
      return;
    }

    fetchInitialData();
  }, [assetType, router, fetchInitialData]);

  useEffect(() => {
    if (selectedAsset) {
      setOrderForm(prev => ({ ...prev, symbol: selectedAsset.symbol }));
      checkExistingPosition(selectedAsset.symbol);
    }
  }, [selectedAsset, checkExistingPosition]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchAssets(searchQuery);
  };

  const calculateOrderTotal = () => {
    if (!selectedAsset || !orderForm.quantity) return 0;
    
    const price = orderForm.order_type === 'limit' && orderForm.limit_price 
      ? orderForm.limit_price 
      : selectedAsset.current_price;
    
    return price * orderForm.quantity;
  };

  const handleOrderSubmit = async () => {
    if (!selectedAccount || !selectedAsset) return;
    
    try {
      const orderData = {
        ...orderForm,
        account_id: selectedAccount.id,
        asset_type: assetType
      };
      
      await fetchApi.post('/api/investments/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      
      // Reset form
      setOrderForm({
        symbol: selectedAsset.symbol,
        order_type: 'market',
        side: 'buy',
        quantity: 0,
        time_in_force: 'day'
      });
      
      setShowOrderPreview(false);
      
      // Refresh account data
      await fetchInitialData();
      
      // Show success message
      alert('Order placed successfully!');
    } catch {
      alert('Failed to place order. Please try again.');
    }
  };

  const toggleWatchlist = (symbol: string) => {
    const newWatchlist = watchlist.includes(symbol)
      ? watchlist.filter(s => s !== symbol)
      : [...watchlist, symbol];
    
    setWatchlist(newWatchlist);
    localStorage.setItem(`watchlist_${assetType}`, JSON.stringify(newWatchlist));
  };

  const getAssetCategories = () => {
    const categories = new Set(assets.map(a => a.category).filter(Boolean));
    return Array.from(categories);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Trade {ASSET_TYPE_LABELS[assetType as keyof typeof ASSET_TYPE_LABELS]}
        </h1>
        <p className="text-gray-600">
          {assetType === 'etf' && 'Invest in diversified exchange-traded funds'}
          {assetType === 'stock' && 'Buy and sell individual company stocks'}
          {assetType === 'crypto' && 'Trade digital currencies 24/7'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Asset List */}
        <div className="xl:col-span-2 space-y-4">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${assetType}s...`}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow whitespace-nowrap"
              >
                Search
              </button>
            </form>
            
            {assetType === 'etf' && (
              <div className="flex gap-2">
                <Dropdown
                  value={filterCategory}
                  onChange={(value) => setFilterCategory(value)}
                  items={[
                    { value: '', label: 'All Categories' },
                    ...getAssetCategories().map(cat => ({
                      value: cat,
                      label: cat
                    }))
                  ]}
                  placeholder="Filter by category"
                  analyticsId="trade-category-filter"
                  analyticsLabel="Trade Category Filter"
                />
              </div>
            )}
          </div>

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Watchlist
              </h3>
              <div className="space-y-2">
                {assets
                  .filter(a => watchlist.includes(a.symbol))
                  .map(asset => (
                    <div
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedAsset?.symbol === asset.symbol
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{asset.symbol}</p>
                          <p className="text-sm text-gray-600">{asset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(asset.current_price)}</p>
                          <p className={`text-sm ${asset.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {asset.change_amount >= 0 ? '+' : ''}{asset.change_percentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Asset List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h3 className="font-semibold text-lg mb-4">Available {ASSET_TYPE_LABELS[assetType as keyof typeof ASSET_TYPE_LABELS]}</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {assets
                .filter(a => !filterCategory || a.category === filterCategory)
                .map(asset => (
                  <div
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedAsset?.symbol === asset.symbol
                        ? 'bg-blue-50 border border-blue-300 shadow-sm'
                        : 'border border-gray-100 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{asset.symbol}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(asset.symbol);
                            }}
                            className="text-gray-400 hover:text-yellow-500"
                          >
                            <Star className={`w-4 h-4 ${watchlist.includes(asset.symbol) ? 'fill-current text-yellow-500' : ''}`} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">{asset.name}</p>
                        {asset.category && (
                          <p className="text-xs text-gray-500">{asset.category}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(asset.current_price)}</p>
                        <div className={`flex items-center gap-1 text-sm ${asset.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {asset.change_amount >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{asset.change_amount >= 0 ? '+' : ''}{asset.change_percentage.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Order Form */}
        <div className="space-y-4 sticky top-4">
          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h3 className="font-semibold text-lg mb-4">Account</h3>
            {selectedAccount ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 text-sm">Balance</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(selectedAccount.balance)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600 text-sm">Buying Power</span>
                  <span className="font-semibold text-green-700">{formatCurrency(selectedAccount.buying_power)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No account available</p>
            )}
          </div>

          {/* Order Form */}
          {selectedAsset && selectedAccount && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold mb-3">Place Order</h3>
              
              {/* Asset Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold">{selectedAsset.symbol}</p>
                <p className="text-sm text-gray-600">{selectedAsset.name}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(selectedAsset.current_price)}</p>
              </div>

              {/* Current Position */}
              {currentPosition && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Current Position</p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Shares:</span>
                      <span className="font-medium">{currentPosition.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Cost:</span>
                      <span className="font-medium">{formatCurrency(currentPosition.avg_cost)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Side */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderForm(prev => ({ ...prev, side: 'buy' }))}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      orderForm.side === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setOrderForm(prev => ({ ...prev, side: 'sell' }))}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      orderForm.side === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>

              {/* Order Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                <Dropdown
                  value={orderForm.order_type}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(value) => setOrderForm(prev => ({ ...prev, order_type: value as any }))}
                  items={[
                    { value: 'market', label: 'Market Order' },
                    { value: 'limit', label: 'Limit Order' },
                    { value: 'stop', label: 'Stop Loss' },
                    { value: 'stop_limit', label: 'Stop Limit' }
                  ]}
                  placeholder="Select order type"
                  analyticsId="trade-order-type"
                  analyticsLabel="Trade Order Type"
                />
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderForm(prev => ({ ...prev, quantity: Math.max(0, prev.quantity - 1) }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setOrderForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Limit Price */}
              {(orderForm.order_type === 'limit' || orderForm.order_type === 'stop_limit') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderForm.limit_price || ''}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, limit_price: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Stop Price */}
              {(orderForm.order_type === 'stop' || orderForm.order_type === 'stop_limit') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stop Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderForm.stop_price || ''}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, stop_price: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Time in Force */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Time in Force</label>
                <Dropdown
                  value={orderForm.time_in_force}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(value) => setOrderForm(prev => ({ ...prev, time_in_force: value as any }))}
                  items={TIME_IN_FORCE_OPTIONS.map(option => ({
                    value: option.value,
                    label: `${option.label} - ${option.description}`
                  }))}
                  placeholder="Select time in force"
                  analyticsId="trade-time-in-force"
                  analyticsLabel="Trade Time in Force"
                />
              </div>

              {/* Order Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Estimated Total</span>
                  <span className="font-semibold">{formatCurrency(calculateOrderTotal())}</span>
                </div>
                {orderForm.side === 'buy' && calculateOrderTotal() > selectedAccount.buying_power && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Insufficient buying power
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={() => setShowOrderPreview(true)}
                disabled={!orderForm.quantity || (orderForm.side === 'buy' && calculateOrderTotal() > selectedAccount.buying_power)}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  !orderForm.quantity || (orderForm.side === 'buy' && calculateOrderTotal() > selectedAccount.buying_power)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : orderForm.side === 'buy'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Review Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Preview Modal */}
      {showOrderPreview && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Order Preview</h3>
              <button
                onClick={() => setShowOrderPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-lg">{selectedAsset.symbol}</p>
                <p className="text-gray-600">{selectedAsset.name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Action</span>
                  <span className={`font-medium ${orderForm.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                    {orderForm.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type</span>
                  <span className="font-medium">{orderForm.order_type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-medium">{orderForm.quantity} shares</span>
                </div>
                {orderForm.limit_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Limit Price</span>
                    <span className="font-medium">{formatCurrency(orderForm.limit_price)}</span>
                  </div>
                )}
                {orderForm.stop_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stop Price</span>
                    <span className="font-medium">{formatCurrency(orderForm.stop_price)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Time in Force</span>
                  <span className="font-medium">
                    {TIME_IN_FORCE_OPTIONS.find(o => o.value === orderForm.time_in_force)?.label}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Estimated Total</span>
                  <span>{formatCurrency(calculateOrderTotal())}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowOrderPreview(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOrderSubmit}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    orderForm.side === 'buy'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}