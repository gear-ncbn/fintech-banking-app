"use client";

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Star, 
  TrendingUp, 
  Shield, 
  Gift,
  Percent,
  DollarSign,
  Check,
  X,
  AlertCircle,
  Search
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface CreditScore {
  credit_score: number;
  score_range: string;
  factors: {
    payment_history: { score: number; impact: string; description: string };
    credit_utilization: { score: number; impact: string; description: string; recommendation?: string };
    credit_age: { months: number; impact: string; description: string };
    credit_mix: { types: string[]; impact: string; description: string };
    recent_inquiries: { count: number; impact: string; description: string };
  };
  last_updated: string;
}

interface CardOffer {
  id: number;
  name: string;
  issuer: string;
  type: string;
  annual_fee: number;
  min_credit_score: number;
  apr_range: string;
  benefits: string[];
  signup_bonus?: number;
  cashback_rate?: number;
  points_multiplier?: number;
  intro_apr_period?: number;
  credit_limit_range: string;
  eligible?: boolean;
  estimated_credit_limit?: string;
  approval_likelihood?: string;
}

interface CardRecommendation {
  card_offer_id: number;
  card_name: string;
  issuer: string;
  card_type: string;
  match_score: number;
  reasons: string[];
  annual_fee: number;
  benefits: string[];
  apr_range: string;
  estimated_credit_limit: string;
  pre_qualified: boolean;
}

interface Application {
  id: number;
  card_name: string;
  issuer: string;
  status: string;
  application_date: string;
  decision_date?: string;
  approved_credit_limit?: number;
}

const CARD_TYPE_ICONS = {
  cashback: DollarSign,
  travel: TrendingUp,
  rewards: Gift,
  secured: Shield,
  student: Star,
  business: CreditCard,
  balance_transfer: Percent
};

const CARD_TYPE_COLORS = {
  cashback: 'green',
  travel: 'blue',
  rewards: 'purple',
  secured: 'gray',
  student: 'orange',
  business: 'indigo',
  balance_transfer: 'red'
};

export default function CreditCardsPage() {
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [recommendations, setRecommendations] = useState<CardRecommendation[]>([]);
  const [allOffers, setAllOffers] = useState<CardOffer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recommended' | 'browse' | 'applications'>('recommended');
  const [selectedCard, setSelectedCard] = useState<CardOffer | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);

  useEffect(() => {
    fetchCreditData();
    
  }, []);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      
      // Fetch credit score
      const scoreRes = await fetchApi.get<CreditScore>('/api/credit-cards/credit-score');
      setCreditScore(scoreRes);
      
      // Fetch recommendations (API wraps card data inside a 'card' object)
      const recsRes = await fetchApi.get<Record<string, unknown>[]>('/api/credit-cards/recommendations');
      const flatRecs = (recsRes || []).map((rec) => {
        const card = rec.card as Record<string, unknown> | undefined;
        if (card) {
          return { ...card, match_score: rec.match_score, reasons: rec.reasons };
        }
        return rec;
      }) as unknown as CardRecommendation[];
      setRecommendations(flatRecs);
      
      // Fetch all offers (normalize API field names)
      const offersRes = await fetchApi.get<Record<string, unknown>[]>('/api/credit-cards/offers');
      const normalizedOffers = (offersRes || []).map((offer) => ({
        ...offer,
        name: offer.card_name || offer.name,
        type: offer.category || offer.type,
      })) as unknown as CardOffer[];
      setAllOffers(normalizedOffers);
      
      // Fetch applications
      const appsRes = await fetchApi.get<Application[]>('/api/credit-cards/applications');
      setApplications(appsRes);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleCardApplication = async (cardId: number) => {
    try {
      // Track application submission
      const _card = allOffers.find(c => c.id === cardId);
      const result = await fetchApi.post<{ status: string; approved_credit_limit: number }>('/api/credit-cards/apply', { card_offer_id: cardId });
      
      if (result.status === 'approved') {
        alert(`Congratulations! Your application was approved with a credit limit of ${formatCurrency(result.approved_credit_limit)}`);
        
      } else {
        alert('Your application is being reviewed. We will notify you of our decision soon.');
      }
      
      setShowApplicationModal(false);
      setSelectedCard(null);
      
      // Refresh applications
      await fetchCreditData();
    } catch {
      alert('Failed to submit application. Please try again.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 740) return 'text-green-600';
    if (score >= 670) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredOffers = allOffers.filter(offer => {
    if (searchQuery && !offer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !offer.issuer.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType && offer.type !== filterType) {
      return false;
    }
    if (showOnlyEligible && creditScore && offer.min_credit_score > creditScore.credit_score) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Cards</h1>
        <p className="text-gray-600">Find the perfect credit card for your needs</p>
      </div>

      {/* Credit Score Summary */}
      {creditScore && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 lg:p-8 mb-8 text-white shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-sm mb-2 font-medium">Your Credit Score</p>
              <p className={`text-5xl lg:text-6xl font-bold ${getScoreColor(creditScore.credit_score)}`}>
                {creditScore.credit_score}
              </p>
              <p className="text-blue-200 text-sm mt-2 font-medium">{creditScore.score_range}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-sm mb-2 font-medium">Payment History</p>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-semibold">{creditScore.factors.payment_history.score}%</p>
                <p className="text-blue-200 text-xs mt-1">{creditScore.factors.payment_history.description}</p>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-sm mb-2 font-medium">Credit Utilization</p>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-semibold">{creditScore.factors.credit_utilization.score.toFixed(1)}%</p>
                <p className="text-blue-200 text-xs mt-1">{creditScore.factors.credit_utilization.description}</p>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-sm mb-2 font-medium">Credit Age</p>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xl font-semibold">{creditScore.factors.credit_age.description}</p>
                <p className="text-blue-200 text-xs mt-1">Impact: {creditScore.factors.credit_age.impact}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-4 mb-6 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab('recommended')}
          className={`pb-3 px-2 sm:px-4 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'recommended'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="hidden sm:inline">Recommended for You</span>
          <span className="sm:hidden">Recommended</span>
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-3 px-2 sm:px-4 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'browse'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="hidden sm:inline">Browse All Cards</span>
          <span className="sm:hidden">Browse</span>
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-2 sm:px-4 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'applications'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="hidden sm:inline">My Applications</span>
          <span className="sm:hidden">Applications</span>
          {applications.length > 0 && (
            <span className="absolute -top-1 -right-2 sm:-right-4 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {applications.length}
            </span>
          )}
        </button>
      </div>

      {/* Recommended Cards */}
      {activeTab === 'recommended' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Cards Matched to Your Profile</h2>
          </div>
          
          {recommendations.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No recommendations available yet. Try browsing all cards!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((rec) => {
                const TypeIcon = CARD_TYPE_ICONS[rec.card_type as keyof typeof CARD_TYPE_ICONS] || CreditCard;
                const color = CARD_TYPE_COLORS[rec.card_type as keyof typeof CARD_TYPE_COLORS] || 'gray';
                
                return (
                  <div key={rec.card_offer_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`p-6 bg-gradient-to-br from-${color}-50 to-${color}-100`}>
                      {rec.pre_qualified && (
                        <div className="mb-3">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Pre-Qualified
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 bg-${color}-500 rounded-lg text-white`}>
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{Math.round(rec.match_score <= 1 ? rec.match_score * 100 : rec.match_score)}%</p>
                          <p className="text-xs text-gray-600">Match Score</p>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-1">{rec.card_name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{rec.issuer}</p>
                      
                      <div className="space-y-2 mb-4">
                        {rec.reasons.slice(0, 2).map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-1 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Annual Fee</span>
                          <span className="font-medium">{rec.annual_fee === 0 ? 'None' : `$${rec.annual_fee}`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">APR</span>
                          <span className="font-medium">{rec.apr_range}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Credit Limit</span>
                          <span className="font-medium">{rec.estimated_credit_limit}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          const fullCard = allOffers.find(o => o.id === rec.card_offer_id);
                          if (fullCard) {
                            setSelectedCard(fullCard);
                            setShowApplicationModal(true);
                          }
                        }}
                        className={`w-full px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors`}
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Browse All Cards */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cards..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="cashback">Cashback</option>
                <option value="travel">Travel</option>
                <option value="rewards">Rewards</option>
                <option value="secured">Secured</option>
                <option value="student">Student</option>
                <option value="business">Business</option>
                <option value="balance_transfer">Balance Transfer</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyEligible}
                  onChange={(e) => setShowOnlyEligible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Only show eligible</span>
              </label>
            </div>
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => {
              const TypeIcon = CARD_TYPE_ICONS[offer.type as keyof typeof CARD_TYPE_ICONS] || CreditCard;
              const color = CARD_TYPE_COLORS[offer.type as keyof typeof CARD_TYPE_COLORS] || 'gray';
              const isEligible = !creditScore || offer.min_credit_score <= creditScore.credit_score;
              
              return (
                <div 
                  key={offer.id} 
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                    !isEligible ? 'border-gray-200 opacity-75' : 'border-gray-200'
                  }`}
                >
                  <div className={`p-6 bg-gradient-to-br from-${color}-50 to-${color}-100`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 ${isEligible ? `bg-${color}-500` : 'bg-gray-400'} rounded-lg text-white`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      {!isEligible && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          Min Score: {offer.min_credit_score}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-1">{offer.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{offer.issuer}</p>
                    
                    {/* Benefits */}
                    <div className="space-y-1 mb-4">
                      {offer.benefits.slice(0, 3).map((benefit, idx) => (
                        <p key={idx} className="text-sm text-gray-700">• {benefit}</p>
                      ))}
                    </div>
                    
                    {/* Card Details */}
                    <div className="space-y-1 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Annual Fee</span>
                        <span className="font-medium">{offer.annual_fee === 0 ? 'None' : `$${offer.annual_fee}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">APR</span>
                        <span className="font-medium">{offer.apr_range}</span>
                      </div>
                      {offer.signup_bonus && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Signup Bonus</span>
                          <span className="font-medium">${offer.signup_bonus}</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedCard(offer);
                        setShowApplicationModal(true);
                      }}
                      disabled={!isEligible}
                      className={`w-full px-4 py-2 rounded-lg transition-colors ${
                        isEligible
                          ? `bg-${color}-600 text-white hover:bg-${color}-700`
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isEligible ? 'View Details' : 'Not Eligible'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {applications.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">You haven&apos;t applied for any cards yet.</p>
              <button
                onClick={() => setActiveTab('recommended')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Recommendations
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Card</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Issuer</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Applied</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Credit Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium">{app.card_name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{app.issuer}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          app.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(app.application_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {app.approved_credit_limit
                          ? formatCurrency(app.approved_credit_limit)
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCard.name}</h3>
                  <p className="text-gray-600">{selectedCard.issuer}</p>
                </div>
                <button
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedCard(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Card Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-3">Card Benefits</h4>
                  <ul className="space-y-2">
                    {selectedCard.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Terms & Rates</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Fee</span>
                      <span className="font-medium">{selectedCard.annual_fee === 0 ? 'None' : `$${selectedCard.annual_fee}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase APR</span>
                      <span className="font-medium">{selectedCard.apr_range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Limit</span>
                      <span className="font-medium">{selectedCard.credit_limit_range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Credit Score</span>
                      <span className="font-medium">{selectedCard.min_credit_score}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eligibility Check */}
              {creditScore && (
                <div className={`p-4 rounded-lg mb-6 ${
                  creditScore.credit_score >= selectedCard.min_credit_score
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {creditScore.credit_score >= selectedCard.min_credit_score ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">You meet the credit requirements</p>
                          <p className="text-sm text-green-700">Your score: {creditScore.credit_score} | Required: {selectedCard.min_credit_score}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-900">You may not qualify for this card</p>
                          <p className="text-sm text-red-700">Your score: {creditScore.credit_score} | Required: {selectedCard.min_credit_score}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedCard(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCardApplication(selectedCard.id)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
