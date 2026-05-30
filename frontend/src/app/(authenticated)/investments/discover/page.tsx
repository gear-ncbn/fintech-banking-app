'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Search,

  ChevronRight,
  Star,
  Building,
  Bitcoin,
  Globe,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { apiClient } from '@/lib/api/client';

interface InvestmentAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'etf' | 'stock' | 'crypto';
  current_price: number;
  change_24h: number;
  change_percentage_24h: number;
  market_cap?: number;
  volume_24h: number;
  description?: string;
  sector?: string;
  holdings?: number;
  average_cost?: number;
  total_value?: number;
  total_return?: number;
  total_return_percentage?: number;
}

interface MarketSummary {
  indices: {
    name: string;
    value: number;
    change: number;
    change_percentage: number;
  }[];
  trending: InvestmentAsset[];
  gainers: InvestmentAsset[];
  losers: InvestmentAsset[];
}

const ASSET_TYPE_CONFIG = {
  etf: {
    icon: Globe,
    color: 'blue',
    label: 'ETF',
    description: 'Exchange-Traded Funds'
  },
  stock: {
    icon: Building,
    color: 'emerald',
    label: 'Stock',
    description: 'Company Stocks'
  },
  crypto: {
    icon: Bitcoin,
    color: 'orange',
    label: 'Crypto',
    description: 'Cryptocurrencies'
  }
};

export default function InvestmentDiscoverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<InvestmentAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'etf' | 'stock' | 'crypto'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'volume'>('name');

  useEffect(() => {
    fetchMarketData();
  }, []);

  const filterAndSortAssets = useCallback(() => {
    let filtered = assets;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.current_price - a.current_price;
        case 'change':
          return b.change_percentage_24h - a.change_percentage_24h;
        case 'volume':
          return b.volume_24h - a.volume_24h;
        default:
          return 0;
      }
    });

    setFilteredAssets(filtered);
  }, [assets, searchQuery, selectedType, sortBy]);

  useEffect(() => {
    filterAndSortAssets();
  }, [filterAndSortAssets]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      // Fetch market summary
      const summaryRes = await apiClient.get<MarketSummary>('/api/investments/market-summary');
      setMarketSummary(summaryRes);

      // Fetch available assets
      const assetsRes = await apiClient.get<InvestmentAsset[]>('/api/investments/assets');
      setAssets(assetsRes);
    } catch {
      // Error handling can be added here if needed
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Always render percentage changes with an explicit +/- sign so formatting is
  // consistent across Market Overview, gainers/losers, trending and the list.
  const formatSignedPercent = (value: number) =>
    `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}%`;

  const navigateToTrade = (asset: InvestmentAsset) => {
    router.push(`/investments/${asset.type}/${asset.symbol}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover Investments</h1>
        <p className="text-gray-600">Explore market opportunities and build your portfolio</p>
      </div>

      {/* Market Summary */}
      {marketSummary && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {marketSummary.indices.map((index, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{index.name}</p>
                    <p className="text-2xl font-bold">{formatNumber(index.value)}</p>
                  </div>
                  <div className={`text-right ${index.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center">
                      {index.change >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span className="font-medium">{formatSignedPercent(index.change_percentage)}</span>
                    </div>
                    <p className="text-sm">{index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Trending Assets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Gainers */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top Gainers
              </h3>
              <div className="space-y-2">
                {marketSummary.gainers.slice(0, 5).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => navigateToTrade(asset)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-sm text-gray-600">{asset.name}</span>
                    </div>
                    <span className="text-green-600 font-medium">
                      {formatSignedPercent(asset.change_percentage_24h)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Top Losers */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Top Losers
              </h3>
              <div className="space-y-2">
                {marketSummary.losers.slice(0, 5).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => navigateToTrade(asset)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-sm text-gray-600">{asset.name}</span>
                    </div>
                    <span className="text-red-600 font-medium">
                      {formatSignedPercent(asset.change_percentage_24h)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Trending */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                Trending Now
              </h3>
              <div className="space-y-2">
                {marketSummary.trending.slice(0, 5).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => navigateToTrade(asset)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-sm text-gray-600">{asset.name}</span>
                    </div>
                    <span className={asset.change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatSignedPercent(asset.change_percentage_24h)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-primary"
            />
          </div>
          <div className="flex gap-2">
            <Dropdown
              value={selectedType}
              onChange={(value) => setSelectedType(value as 'all' | 'etf' | 'stock' | 'crypto')}
              items={[
                { value: 'all', label: 'All Types' },
                { value: 'etf', label: 'ETFs' },
                { value: 'stock', label: 'Stocks' },
                { value: 'crypto', label: 'Crypto' }
              ]}
              placeholder="Filter by type"
              analyticsId="investment-type-filter"
              analyticsLabel="Investment Type Filter"
            />
            <Dropdown
              value={sortBy}
              onChange={(value) => setSortBy(value as 'name' | 'price' | 'change' | 'volume')}
              items={[
                { value: 'name', label: 'Name' },
                { value: 'price', label: 'Price' },
                { value: 'change', label: '24h Change' },
                { value: 'volume', label: 'Volume' }
              ]}
              placeholder="Sort by"
              analyticsId="investment-sort"
              analyticsLabel="Investment Sort"
            />
          </div>
        </div>
      </Card>

      {/* Asset List */}
      <div className="grid gap-4">
        {filteredAssets.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No assets found matching your criteria</p>
          </Card>
        ) : (
          filteredAssets.map((asset) => {
            const config = ASSET_TYPE_CONFIG[asset.type];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToTrade(asset)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 bg-${config.color}-100 rounded-lg`}>
                        <Icon className={`w-6 h-6 text-${config.color}-600`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{asset.symbol}</h3>
                          <span className={`text-xs px-2 py-1 bg-${config.color}-100 text-${config.color}-700 rounded`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-gray-600">{asset.name}</p>
                        {asset.sector && (
                          <p className="text-sm text-gray-500">{asset.sector}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(asset.current_price)}</p>
                        <div className={`flex items-center justify-end gap-1 ${asset.change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {asset.change_percentage_24h >= 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {formatSignedPercent(asset.change_percentage_24h)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Volume 24h</p>
                        <p className="font-medium">{formatCurrency(asset.volume_24h)}</p>
                      </div>
                      
                      {asset.holdings !== undefined && asset.holdings > 0 && (
                        <div className="text-right border-l pl-6">
                          <p className="text-sm text-gray-600">Your Holdings</p>
                          <p className="font-medium">{asset.holdings.toFixed(4)}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(asset.total_value || 0)}</p>
                        </div>
                      )}
                      
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}