"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRightLeft, 
  DollarSign,
  Clock,
  Shield,
  Users,
  Info,
  Star
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useSyntheticTracking } from '@/hooks/useSyntheticTracking';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  type: 'fiat' | 'crypto' | 'virtual';
  flag?: string;
  icon?: string;
}

interface ExchangeRate {
  currency_pair: {
    from_currency: string;
    to_currency: string;
    from_type: string;
    to_type: string;
  };
  rate: number;
  spread: number;
  effective_rate: number;
  fee_percentage: number;
  minimum_amount: number;
  maximum_amount: number;
  estimated_arrival: string;
  last_updated: string;
  is_available: boolean;
}

interface ConversionQuote {
  quote_id: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  fee_amount: number;
  total_amount: number;
  expires_at: string;
  estimated_arrival: string;
}

interface PeerOffer {
  id: number;
  peer_name: string;
  currency: string;
  currency_type: string;
  amount_available: number;
  exchange_rate: number;
  rate_adjustment: number;
  min_transaction: number;
  max_transaction: number;
  transfer_methods: string[];
  peer_rating: number;
  completed_trades: number;
  verification_level: string;
  is_online: boolean;
}

interface P2PTrade {
  id: number;
  trade_id: string;
  seller_name: string;
  buyer_name: string;
  currency: string;
  amount: number;
  exchange_rate: number;
  total_cost: number;
  status: string;
  created_at: string;
  expires_at: string;
}

interface CurrencyBalance {
  currency: string;
  balance: number;
  available_balance: number;
  pending_balance: number;
  currency_type: string;
}

const CURRENCY_ICONS = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CAD: '🇨🇦',
  AUD: '🇦🇺',
  MXN: '🇲🇽',
  BRL: '🇧🇷',
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮'
};

const TRANSFER_METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  wire_transfer: 'Wire Transfer',
  crypto_wallet: 'Crypto Wallet',
  debit_card: 'Debit Card',
  cash_deposit: 'Cash Deposit',
  mobile_money: 'Mobile Money'
};

export default function CurrencyConverterPage() {
  const { trackCurrencyConversion } = useSyntheticTracking();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [activeTab, setActiveTab] = useState<'convert' | 'p2p' | 'history'>('convert');
  const [loading, setLoading] = useState(true);
  
  // Conversion state
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [fromAmount, setFromAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [quote, setQuote] = useState<ConversionQuote | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  
  // P2P state
  const [peerOffers, setPeerOffers] = useState<PeerOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<PeerOffer | null>(null);
  const [p2pSearchCurrency, setP2pSearchCurrency] = useState('USD');
  const [p2pSearchAmount, setP2pSearchAmount] = useState('');
  const [myTrades, setMyTrades] = useState<P2PTrade[]>([]);
  const [showP2PModal, setShowP2PModal] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch supported currencies
      const currenciesRes = await fetchApi.get('/api/currency-converter/currencies');
      setCurrencies(currenciesRes);

      // Fetch user balances
      const balancesRes = await fetchApi.get('/api/currency-converter/balances');
      setBalances(balancesRes);

      // Fetch user's P2P trades
      const tradesRes = await fetchApi.get('/api/currency-converter/p2p/trades');
      setMyTrades(tradesRes);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

  }, [fetchInitialData]);

  // Default the "from" currency to one the user actually holds so the
  // available balance isn't shown as $0.00 for an unheld currency.
  useEffect(() => {
    if (balances.length > 0 && !balances.some(b => b.currency === fromCurrency)) {
      setFromCurrency(balances[0].currency);
    }
  }, [balances, fromCurrency]);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const rateRes = await fetchApi.get(`/api/currency-converter/exchange-rate/${fromCurrency}/${toCurrency}`);
      setExchangeRate(rateRes);
    } catch {
    }
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    if (fromCurrency && toCurrency) {
      fetchExchangeRate();
    }
  }, [fromCurrency, toCurrency, fetchExchangeRate]);

  const handleCreateQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    
    try {
      // Track quote request
      trackCurrencyConversion({
        fromCurrency,
        toCurrency,
        amount: parseFloat(fromAmount),
        conversionType: 'standard',
        rate: exchangeRate?.rate,
        action: 'quote'
      });

      const quoteRes = await fetchApi.post('/api/currency-converter/quote', {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount: parseFloat(fromAmount)
      });
      
      setQuote(quoteRes);
      setShowQuoteModal(true);
    } catch {
      alert('Failed to create quote. Please try again.');
    }
  };

  const handleConfirmConversion = async () => {
    if (!quote) return;
    
    try {
      // Track conversion confirmation
      trackCurrencyConversion({
        fromCurrency: quote.from_currency,
        toCurrency: quote.to_currency,
        amount: quote.from_amount,
        conversionType: 'standard',
        rate: quote.exchange_rate,
        action: 'convert'
      });

      await fetchApi.post('/api/currency-converter/orders', {
        quote_id: quote.quote_id,
        recipient_details: {
          account_number: 'ACC123456',
          bank_name: 'International Bank',
          recipient_name: 'John Doe'
        },
        purpose: 'Personal transfer',
        reference: `CONV-${Date.now()}`
      });
      
      alert('Conversion order placed successfully!');
      setShowQuoteModal(false);
      setQuote(null);
      setFromAmount('');
      
      // Refresh balances
      const balancesRes = await fetchApi.get('/api/currency-converter/balances');
      setBalances(balancesRes);
    } catch {
      alert('Failed to process conversion. Please try again.');
    }
  };

  const searchP2POffers = async () => {
    if (!p2pSearchAmount || parseFloat(p2pSearchAmount) <= 0) return;
    
    try {
      const offersRes = await fetchApi.get(
        `/api/currency-converter/p2p/offers/search?currency=${p2pSearchCurrency}&amount=${p2pSearchAmount}`
      );
      setPeerOffers(offersRes);
    } catch {
    }
  };

  const handleCreateP2PTrade = async (offer: PeerOffer) => {
    try {
      await fetchApi.post('/api/currency-converter/p2p/trades', {
        offer_id: offer.id,
        amount: parseFloat(p2pSearchAmount),
        transfer_method: offer.transfer_methods[0]
      });
      
      alert('P2P trade initiated successfully!');
      setShowP2PModal(false);
      setSelectedOffer(null);
      
      // Refresh trades
      const tradesRes = await fetchApi.get('/api/currency-converter/p2p/trades');
      setMyTrades(tradesRes);
    } catch {
      alert('Failed to create trade. Please try again.');
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getBalance = (currency: string) => {
    const balance = balances.find(b => b.currency === currency);
    return balance ? balance.available_balance : 0;
  };

  const calculateToAmount = () => {
    if (!fromAmount || !exchangeRate) return '0';
    return (parseFloat(fromAmount) * exchangeRate.rate).toFixed(2);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-alt-200 rounded w-1/4"></div>
          <div className="h-64 bg-surface-alt-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Currency Converter</h1>
        <p className="text-secondary">Exchange currencies with competitive rates and P2P trading</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('convert')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'convert'
              ? 'text-[var(--primary-blue)] border-b-2 border-[var(--primary-blue)]'
              : 'text-secondary-500 hover:text-secondary-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Convert
          </div>
        </button>
        <button
          onClick={() => setActiveTab('p2p')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'p2p'
              ? 'text-[var(--primary-blue)] border-b-2 border-[var(--primary-blue)]'
              : 'text-secondary-500 hover:text-secondary-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            P2P Exchange
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-[var(--primary-blue)] border-b-2 border-[var(--primary-blue)]'
              : 'text-secondary-500 hover:text-secondary-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            History
          </div>
        </button>
      </div>

      {/* Convert Tab */}
      {activeTab === 'convert' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="default">
            <h2 className="text-xl font-semibold mb-4">Currency Exchange</h2>
            
            <div className="space-y-4">
              {/* From Currency */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">From</label>
                <div className="flex gap-2">
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-32 px-3 py-2 border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {CURRENCY_ICONS[currency.code as keyof typeof CURRENCY_ICONS]} {currency.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-secondary opacity-75 mt-1">
                  Available: {formatCurrency(getBalance(fromCurrency), fromCurrency)}
                </p>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  onClick={swapCurrencies}
                  className="p-2 bg-surface-alt-100 rounded-full hover:bg-surface-alt-200 transition-colors"
                >
                  <ArrowRightLeft className="w-5 h-5 text-secondary-600" />
                </button>
              </div>

              {/* To Currency */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">To</label>
                <div className="flex gap-2">
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-32 px-3 py-2 border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {CURRENCY_ICONS[currency.code as keyof typeof CURRENCY_ICONS]} {currency.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={calculateToAmount()}
                    readOnly
                    className="flex-1 px-3 py-2 border border-default-300 rounded-lg bg-surface-alt-50"
                  />
                </div>
              </div>

              {/* Exchange Rate Info */}
              {exchangeRate && exchangeRate.rate !== undefined && (
                <div className="p-4 bg-[var(--cat-blue)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-secondary-600">Exchange Rate</span>
                    <span className="font-medium">
                      1 {fromCurrency} = {(typeof exchangeRate.rate === 'number' ? exchangeRate.rate : parseFloat(exchangeRate.rate)).toFixed(4)} {toCurrency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">Effective Rate</span>
                    <span className="text-sm">
                      {(exchangeRate.effective_rate != null ? parseFloat(String(exchangeRate.effective_rate)) : parseFloat(String(exchangeRate.rate))).toFixed(4)} ({(exchangeRate.spread != null ? parseFloat(String(exchangeRate.spread)) * 100 : exchangeRate.spread_percentage != null ? parseFloat(String(exchangeRate.spread_percentage)) : 0).toFixed(2)}% spread)
                    </span>
                  </div>
                </div>
              )}

              {/* Convert Button */}
              <button
                onClick={handleCreateQuote}
                disabled={!fromAmount || parseFloat(fromAmount) <= 0}
                className="w-full py-3 btn-primary bg-gradient-secondary rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get Quote
              </button>
            </div>
          </Card>

          {/* Features */}
          <div className="space-y-4">
            <Card variant="default">
              <h3 className="text-lg font-semibold mb-4">Why Use Our Service?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[var(--cat-emerald)] rounded-lg">
                    <DollarSign className="w-5 h-5 text-[var(--primary-emerald)]" />
                  </div>
                  <div>
                    <p className="font-medium">Competitive Rates</p>
                    <p className="text-sm text-secondary-600">Best exchange rates with minimal spreads</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[var(--cat-blue)] rounded-lg">
                    <Shield className="w-5 h-5 text-[var(--primary-blue)]" />
                  </div>
                  <div>
                    <p className="font-medium">Secure Transactions</p>
                    <p className="text-sm text-secondary-600">Bank-level security for all transfers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[var(--cat-purple)] rounded-lg">
                    <Clock className="w-5 h-5 text-[var(--primary-purple)]" />
                  </div>
                  <div>
                    <p className="font-medium">Fast Processing</p>
                    <p className="text-sm text-secondary-600">Most transfers complete within minutes</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Balances */}
            <Card variant="default">
              <h3 className="text-lg font-semibold mb-4">Your Balances</h3>
              <div className="space-y-2">
                {balances.slice(0, 5).map(balance => (
                  <div key={balance.currency} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {CURRENCY_ICONS[balance.currency as keyof typeof CURRENCY_ICONS] || '💱'}
                      </span>
                      <span className="font-medium">{balance.currency}</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(balance.available_balance, balance.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* P2P Tab */}
      {activeTab === 'p2p' && (
        <div className="space-y-6">
          {/* Search */}
          <Card variant="default">
            <h3 className="text-lg font-semibold mb-4">Find P2P Offers</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={p2pSearchCurrency}
                onChange={(e) => setP2pSearchCurrency(e.target.value)}
                className="px-3 py-2 border border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-primary"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={p2pSearchAmount}
                onChange={(e) => setP2pSearchAmount(e.target.value)}
                placeholder="Amount"
                className="px-3 py-2 border border-default rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-primary"
              />
              <button
                onClick={searchP2POffers}
                className="px-4 py-2 btn-primary bg-gradient-secondary rounded-lg transition-all"
              >
                Search Offers
              </button>
            </div>
          </Card>

          {/* Offers */}
          {peerOffers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {peerOffers.map(offer => (
                <Card key={offer.id} variant="default" className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold">{offer.peer_name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-[var(--primary-amber)] fill-current" />
                        <span className="text-sm">{offer.peer_rating.toFixed(1)}</span>
                        <span className="text-sm text-secondary-500">({offer.completed_trades} trades)</span>
                      </div>
                    </div>
                    {offer.is_online && (
                      <span className="px-2 py-1 bg-[var(--cat-emerald)] text-[var(--primary-emerald)] rounded-full text-xs">
                        Online
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-600">Available</span>
                      <span className="font-medium">
                        {formatCurrency(offer.amount_available, offer.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-600">Rate</span>
                      <span className="font-medium">
                        {offer.exchange_rate.toFixed(4)} 
                        <span className={`text-xs ml-1 ${offer.rate_adjustment > 0 ? 'text-error' : 'text-success'}`}>
                          ({offer.rate_adjustment > 0 ? '+' : ''}{offer.rate_adjustment}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-600">Limits</span>
                      <span className="font-medium">
                        {offer.min_transaction} - {offer.max_transaction}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {offer.transfer_methods.map(method => (
                      <span key={method} className="px-2 py-1 bg-surface-alt-100 rounded text-xs">
                        {TRANSFER_METHOD_LABELS[method as keyof typeof TRANSFER_METHOD_LABELS] || method}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOffer(offer);
                      setShowP2PModal(true);
                    }}
                    className="w-full py-2 btn-primary bg-gradient-secondary rounded-lg transition-all"
                  >
                    Trade Now
                  </button>
                </Card>
              ))}
            </div>
          )}

          {/* Active Trades */}
          {myTrades.length > 0 && (
            <Card variant="default">
              <h3 className="text-lg font-semibold mb-4">Your Active Trades</h3>
              <div className="space-y-3">
                {myTrades.filter(t => t.status !== 'completed').map(trade => (
                  <div key={trade.id} className="flex items-center justify-between p-4 bg-surface-alt rounded-lg">
                    <div>
                      <p className="font-medium">
                        {trade.currency} {formatCurrency(trade.amount, trade.currency)}
                      </p>
                      <p className="text-sm text-secondary">
                        Trade with {trade.seller_name || trade.buyer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trade.status === 'pending' ? 'bg-[var(--cat-amber)] text-[var(--primary-amber)]' :
                        trade.status === 'processing' ? 'bg-[var(--cat-blue)] text-[var(--primary-blue)]' :
                        'bg-surface-alt text-secondary'
                      }`}>
                        {trade.status}
                      </span>
                      <p className="text-sm text-secondary opacity-75 mt-1">
                        Expires {new Date(trade.expires_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card variant="default">
          <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
          {myTrades.length === 0 ? (
            <p className="text-secondary text-center py-8">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Rate</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTrades.map(trade => (
                    <tr key={trade.id} className="border-b hover:bg-surface-alt-50">
                      <td className="py-3 px-4">
                        {new Date(trade.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">P2P Trade</td>
                      <td className="py-3 px-4">
                        {trade.currency} {formatCurrency(trade.amount, trade.currency)}
                      </td>
                      <td className="py-3 px-4">{trade.exchange_rate.toFixed(4)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.status === 'completed' ? 'bg-[var(--cat-emerald)] text-[var(--primary-emerald)]' :
                          trade.status === 'cancelled' ? 'bg-[var(--cat-red)] text-error' :
                          'bg-[var(--cat-amber)] text-[var(--primary-amber)]'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Quote Modal */}
      <Modal
        isOpen={showQuoteModal && quote !== null}
        onClose={() => {
          setShowQuoteModal(false);
          setQuote(null);
        }}
        title="Conversion Quote"
        size="md"
        analyticsId="currency-quote-modal"
        analyticsLabel="Currency Quote Modal"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowQuoteModal(false);
                setQuote(null);
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmConversion}
              fullWidth
            >
              Confirm
            </Button>
          </div>
        }
      >
        {quote && (
          <div className="space-y-3">
            <div className="p-4 bg-surface-alt rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-secondary">You send</span>
                <span className="font-semibold">
                  {formatCurrency(quote.from_amount, quote.from_currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">You receive</span>
                <span className="font-semibold text-success">
                  {formatCurrency(quote.to_amount, quote.to_currency)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">Exchange rate</span>
                <span>{quote.exchange_rate.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Fee</span>
                <span>{formatCurrency(quote.fee_amount, quote.from_currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Total amount</span>
                <span className="font-medium">{formatCurrency(quote.total_amount, quote.from_currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Estimated arrival</span>
                <span>{quote.estimated_arrival}</span>
              </div>
            </div>
            
            <div className="p-3 bg-[var(--cat-amber)] rounded-lg text-sm">
              <p className="text-[var(--primary-amber)]">
                This quote expires at {new Date(quote.expires_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* P2P Trade Modal */}
      <Modal
        isOpen={showP2PModal && selectedOffer !== null}
        onClose={() => {
          setShowP2PModal(false);
          setSelectedOffer(null);
        }}
        title="Confirm P2P Trade"
        size="md"
        analyticsId="p2p-trade-modal"
        analyticsLabel="P2P Trade Modal"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowP2PModal(false);
                setSelectedOffer(null);
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => selectedOffer && handleCreateP2PTrade(selectedOffer)}
              fullWidth
            >
              Confirm Trade
            </Button>
          </div>
        }
      >
        {selectedOffer && (
          <div className="space-y-3">
            <div className="p-4 bg-surface-alt rounded-lg">
              <p className="text-sm text-secondary mb-1">Trading with</p>
              <p className="font-semibold">{selectedOffer.peer_name}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-[var(--primary-amber)] fill-current" />
                <span className="text-sm">{selectedOffer.peer_rating.toFixed(1)}</span>
                <span className="text-sm text-secondary opacity-75">• {selectedOffer.completed_trades} trades</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary">Amount</span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(p2pSearchAmount), selectedOffer.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Exchange rate</span>
                <span className="font-medium">{selectedOffer.exchange_rate.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">You will pay</span>
                <span className="font-semibold">
                  {formatCurrency(parseFloat(p2pSearchAmount) * selectedOffer.exchange_rate, 'USD')}
                </span>
              </div>
            </div>
            
            <div className="p-3 bg-[var(--cat-blue)] rounded-lg">
              <p className="text-sm text-[var(--primary-blue)]">
                <Info className="w-4 h-4 inline mr-1" />
                Funds will be held in escrow until both parties confirm the transaction
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
