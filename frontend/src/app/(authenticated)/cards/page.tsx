'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard,
  Plus,
  Lock,
  Snowflake,
  Eye,
  EyeOff,
  Wifi
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CardDetails from '@/components/cards/CardDetails';
import CardSpending from '@/components/cards/CardSpending';
import CardControls from '@/components/cards/CardControls';
import VirtualCardsList from '@/components/cards/VirtualCardsList';
import CardAnalytics from '@/components/cards/CardAnalytics';
import AddCardModal from '@/components/cards/AddCardModal';
import { AnimatedCardNumber } from '@/components/cards/AnimatedCardNumber';
import { cardsApi, accountsService } from '@/lib/api';
import type { Account } from '@/lib/api';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export interface CreditCard {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'virtual';
  cardNumber: string;
  lastFourDigits: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  status: 'active' | 'frozen' | 'blocked';
  balance?: number;
  creditLimit?: number;
  availableCredit?: number;
  dueDate?: string;
  minimumPayment?: number;
  lastPayment?: {
    amount: number;
    date: string;
  };
  rewards?: {
    points: number;
    cashback: number;
  };
  spending: {
    current: number;
    limit: number;
    categories: {
      name: string;
      amount: number;
      percentage: number;
    }[];
  };
  features: {
    contactless: boolean;
    international: boolean;
    online: boolean;
    atm: boolean;
  };
  isDefault: boolean;
}

export default function CardsPage() {
  const { user: _user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'physical' | 'virtual'>('physical');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  const fetchCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiCards = await cardsApi.getCards();
      
      // Transform API cards to match the frontend interface
      // Filter out virtual cards from the main cards list
      const physicalCards = apiCards.filter(card => card.card_type !== 'virtual');
      
      const transformedCards: CreditCard[] = await Promise.all(physicalCards.map(async (card) => {
        // Get spending analytics for the card
        let spendingCategories: { name: string; amount: number; percentage: number; }[] = [];
        let totalSpent = 0;
        try {
          const analytics = await cardsApi.getCardAnalytics(card.id, 30);
          totalSpent = analytics.total_spent || 0;
          if (analytics.spending_by_category) {
            const total = Object.values(analytics.spending_by_category).reduce((sum, amt) => sum + amt, 0);
            spendingCategories = Object.entries(analytics.spending_by_category)
              .map(([name, amount]) => ({
                name,
                amount,
                percentage: total > 0 ? (amount / total) * 100 : 0,
              }))
              // Sort descending by amount so the breakdown, chart, and the
              // "highest spending category" insight (which reads index 0) agree.
              .sort((a, b) => b.amount - a.amount);
          }
        } catch {
          // If no analytics, generate some demo data
          if (card.card_type === 'credit' && card.current_balance) {
            totalSpent = card.current_balance;
            spendingCategories = [
              { name: 'Shopping', amount: totalSpent * 0.35, percentage: 35 },
              { name: 'Dining', amount: totalSpent * 0.25, percentage: 25 },
              { name: 'Groceries', amount: totalSpent * 0.20, percentage: 20 },
              { name: 'Transportation', amount: totalSpent * 0.12, percentage: 12 },
              { name: 'Other', amount: totalSpent * 0.08, percentage: 8 },
            ];
          }
        }

        return {
          id: card.id.toString(),
          name: card.card_name || `${card.card_type} Card`,
          type: card.card_type as 'credit' | 'debit',
          cardNumber: formatCardNumber(card.card_number || `**** **** **** ${card.last_four}`),
          lastFourDigits: card.last_four,
          expiryDate: card.expiry_date ? new Date(card.expiry_date).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }).replace('/', '/') : '12/28',
          cvv: card.cvv || '***',
          cardholderName: 'JOHN DOE', // This would come from user data
          status: mapCardStatus(card.status || (card.is_active ? 'active' : 'frozen')),
          creditLimit: card.credit_limit,
          balance: card.current_balance || 0,
          availableCredit: card.available_credit,
          dueDate: card.due_date,
          minimumPayment: card.minimum_payment,
          lastPayment: card.last_payment,
          rewards: {
            points: card.rewards_points || 0,
            cashback: card.rewards_cashback || 0,
          },
          spending: {
            current: totalSpent || card.spent_amount || 0, // Use actual spending from analytics
            limit: card.credit_limit || card.spending_limit || 5000, // Default limit if not set
            categories: spendingCategories,
          },
          features: {
            contactless: card.is_contactless_enabled ?? true,
            international: card.is_international_enabled ?? true,
            online: card.is_online_enabled ?? true,
            atm: card.is_atm_enabled ?? true,
          },
          isDefault: card.is_default || false,
        };
      }));

      setCards(transformedCards);
      if (transformedCards.length > 0) {
        setSelectedCard(transformedCards[0]);
      }
    } catch {
      notificationService.error('Failed to load cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const formatCardNumber = (cardNumber: string) => {
    // Ensure the card number is formatted as XXXX **** **** XXXX
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.includes('*')) {
      return cardNumber; // Already formatted
    }
    // Format full card number
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const mapCardStatus = (status: string): 'active' | 'frozen' | 'blocked' => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'active';
      case 'frozen':
        return 'frozen';
      case 'blocked':
        return 'blocked';
      default:
        return 'active';
    }
  };

  // Remove mock cards definition
  if (false) {
    const _mockCards: CreditCard[] = [
      {
        id: '1',
        name: 'Platinum Rewards',
        type: 'credit',
        cardNumber: '4532 **** **** 7890',
        lastFourDigits: '7890',
        expiryDate: '12/27',
        cvv: '***',
        cardholderName: 'JOHN DOE',
        status: 'active',
        creditLimit: 15000,
        balance: 3247.85,
        availableCredit: 11752.15,
        dueDate: '2025-07-05',
        minimumPayment: 97.44,
        lastPayment: {
          amount: 500,
          date: '2025-06-01',
        },
        rewards: {
          points: 12453,
          cashback: 87.32,
        },
        spending: {
          current: 3247.85,
          limit: 15000,
          categories: [
            { name: 'Shopping', amount: 1234.56, percentage: 38 },
            { name: 'Dining', amount: 892.34, percentage: 27.5 },
            { name: 'Travel', amount: 654.32, percentage: 20.1 },
            { name: 'Other', amount: 466.63, percentage: 14.4 },
          ],
        },
        features: {
          contactless: true,
          international: true,
          online: true,
          atm: true,
        },
        isDefault: true,
      },
      {
        id: '2',
        name: 'Everyday Debit',
        type: 'debit',
        cardNumber: '4147 **** **** 4523',
        lastFourDigits: '4523',
        expiryDate: '08/26',
        cvv: '***',
        cardholderName: 'JOHN DOE',
        status: 'active',
        balance: 5423.67,
        spending: {
          current: 1876.43,
          limit: 5000,
          categories: [
            { name: 'Groceries', amount: 623.45, percentage: 33.2 },
            { name: 'Transportation', amount: 412.98, percentage: 22 },
            { name: 'Utilities', amount: 356.78, percentage: 19 },
            { name: 'Other', amount: 483.22, percentage: 25.8 },
          ],
        },
        features: {
          contactless: true,
          international: false,
          online: true,
          atm: true,
        },
        isDefault: false,
      },
      {
        id: '3',
        name: 'Virtual Shopping',
        type: 'virtual',
        cardNumber: '5412 **** **** 3456',
        lastFourDigits: '3456',
        expiryDate: '03/26',
        cvv: '***',
        cardholderName: 'JOHN DOE',
        status: 'active',
        balance: 500,
        spending: {
          current: 234.56,
          limit: 500,
          categories: [
            { name: 'Online Shopping', amount: 234.56, percentage: 100 },
          ],
        },
        features: {
          contactless: false,
          international: true,
          online: true,
          atm: false,
        },
        isDefault: false,
      },
      {
        id: '4',
        name: 'Business Card',
        type: 'credit',
        cardNumber: '3742 **** **** 0015',
        lastFourDigits: '0015',
        expiryDate: '10/28',
        cvv: '****',
        cardholderName: 'JOHN DOE',
        status: 'frozen',
        creditLimit: 25000,
        balance: 8934.21,
        availableCredit: 16065.79,
        dueDate: '2025-07-15',
        minimumPayment: 268.03,
        rewards: {
          points: 34567,
          cashback: 156.78,
        },
        spending: {
          current: 8934.21,
          limit: 25000,
          categories: [
            { name: 'Business', amount: 5432.10, percentage: 60.8 },
            { name: 'Travel', amount: 2345.67, percentage: 26.3 },
            { name: 'Entertainment', amount: 1156.44, percentage: 12.9 },
          ],
        },
        features: {
          contactless: true,
          international: true,
          online: true,
          atm: true,
        },
        isDefault: false,
      },
    ];
  }

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountsService.getAccounts();
      setAccounts(data);
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchAccounts();
  }, [fetchCards, fetchAccounts]);

  const _totalBalance = cards.reduce((sum, card) => {
    if (card.type === 'credit') {
      return sum + (card.balance || 0);
    }
    return sum;
  }, 0);

  const _totalAvailableCredit = cards.reduce((sum, card) => {
    if (card.type === 'credit') {
      return sum + (card.availableCredit || 0);
    }
    return sum;
  }, 0);

  const _totalRewards = cards.reduce((sum, card) => {
    return sum + (card.rewards?.points || 0);
  }, 0);

  const handleCardAction = async (cardId: string, action: string) => {
    const _card = cards.find(c => c.id === cardId);

    if (action === 'freeze' || action === 'unfreeze') {
      try {
        const freeze = action === 'freeze';
        await cardsApi.freezeCard(parseInt(cardId), freeze);
        
        // Update local state
        setCards(cards.map(card => {
          if (card.id === cardId) {
            const updatedCard = {
              ...card,
              status: (freeze ? 'frozen' : 'active') as CreditCard['status'],
            };
            if (selectedCard?.id === cardId) {
              setSelectedCard(updatedCard);
            }
            return updatedCard;
          }
          return card;
        }));

        // Force analytics refresh
        setAnalyticsRefreshKey(prev => prev + 1);

        notificationService.success(`Card ${freeze ? 'frozen' : 'unfrozen'} successfully`);
      } catch {
        notificationService.error(`Failed to ${action} card. Please try again.`);
      }
    }
  };

  const handleCardAdded = async () => {
    // Refresh cards list after successful addition
    await fetchCards();
    setAnalyticsRefreshKey(prev => prev + 1);
  };

  const getCardGradient = (type: CreditCard['type'], status: CreditCard['status']) => {
    if (status === 'frozen') return 'from-gray-400 to-gray-600';
    if (status === 'blocked') return 'from-red-400 to-red-600';
    
    switch (type) {
      case 'credit': return 'from-[var(--primary-indigo)] to-[var(--primary-navy)]';
      case 'debit': return 'from-[var(--primary-blue)] to-[var(--primary-indigo)]';
      case 'virtual': return 'from-[var(--primary-violet)] to-[var(--primary-indigo)]';
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading cards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-1)]">
              Cards & Credit
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Manage your credit and debit cards
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="secondary"
              size="sm"
              icon={showCardNumbers ? <EyeOff size={18} /> : <Eye size={18} />}
              onClick={() => {
                const newState = !showCardNumbers;
                setShowCardNumbers(newState);
              }}
            >
              {showCardNumbers ? 'Hide' : 'Show'} Numbers
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => {
                setShowAddCard(true);
              }}
            >
              Add Card
            </Button>
          </div>
        </div>

        {/* Card Analytics */}
        <CardAnalytics refreshTrigger={[analyticsRefreshKey]} />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[rgba(var(--glass-rgb),0.05)] rounded-lg mb-8">
          <button
            onClick={() => {
              setActiveTab('physical');
            }}
            className={`
              flex-1 px-4 py-2 rounded-md font-medium transition-all
              ${activeTab === 'physical'
                ? 'bg-[var(--bg-color)] text-[var(--text-1)] shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
              }
            `}
          >
            Physical Cards
          </button>
          <button
            onClick={() => {
              setActiveTab('virtual');
            }}
            className={`
              flex-1 px-4 py-2 rounded-md font-medium transition-all
              ${activeTab === 'virtual'
                ? 'bg-[var(--bg-color)] text-[var(--text-1)] shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
              }
            `}
          >
            Virtual Cards
          </button>
        </div>

        {activeTab === 'physical' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cards List */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setSelectedCard(card);
                  }}
                  className="cursor-pointer"
                >
                  <div className={`
                    relative h-48 rounded-xl overflow-hidden p-6 text-white shadow-xl
                    bg-gradient-to-br ${getCardGradient(card.type, card.status)}
                    ${selectedCard?.id === card.id ? 'ring-2 ring-[var(--primary-blue)] ring-offset-2 ring-offset-[var(--bg-color)]' : ''}
                    transition-all hover:scale-105
                  `}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[rgba(var(--glass-rgb),0.2)] blur-3xl" />
                      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[rgba(var(--glass-rgb),0.1)] blur-3xl" />
                    </div>

                    {/* Card Content */}
                    <div className="relative h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs opacity-90 uppercase tracking-wider">{card.type}</p>
                          <p className="text-lg font-semibold mt-1">{card.name}</p>
                        </div>
                        {card.status === 'frozen' && (
                          <Snowflake className="w-5 h-5 opacity-80" />
                        )}
                        {card.status === 'blocked' && (
                          <Lock className="w-5 h-5 opacity-80" />
                        )}
                        {card.isDefault && card.status === 'active' && (
                          <div className="px-2 py-1 bg-[rgba(var(--glass-rgb),0.2)] rounded text-xs">
                            Default
                          </div>
                        )}
                      </div>

                      <div>
                        <AnimatedCardNumber
                          showNumbers={showCardNumbers}
                          fullNumber={card.cardNumber}
                          lastFourDigits={card.lastFourDigits}
                          className="text-sm tracking-wider mb-2"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs opacity-80">{card.cardholderName}</p>
                          <div className="flex items-center gap-3">
                            {/* Card Icons moved inline with expiry date */}
                            <div className="flex gap-1">
                              {card.features.contactless && <Wifi className="w-4 h-4 opacity-60" />}
                              {card.type === 'credit' && <CreditCard className="w-4 h-4 opacity-60" />}
                            </div>
                            <p className="text-xs opacity-80">{card.expiryDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Add Card Button */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: cards.length * 0.1 }}
              >
                <Card
                  variant="subtle"
                  className="h-48 flex items-center justify-center cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.2)] transition-all"
                  onClick={() => {
                    setShowAddCard(true);
                  }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[rgba(var(--glass-rgb),0.2)] flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-[var(--text-2)]" />
                    </div>
                    <p className="text-[var(--text-2)]">Add New Card</p>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Card Details */}
          <div className="lg:col-span-2">
            {selectedCard ? (
              <div className="space-y-6">
                <CardDetails
                  card={selectedCard}
                  showNumbers={showCardNumbers}
                  onAction={(action) => handleCardAction(selectedCard.id, action)}
                />
                
                <CardSpending card={selectedCard} />
                
                <CardControls
                  card={selectedCard}
                  onUpdate={(updates) => {
                    setCards(cards.map(c => 
                      c.id === selectedCard.id ? { ...c, ...updates } : c
                    ));
                    setSelectedCard({ ...selectedCard, ...updates });
                  }}
                />
              </div>
            ) : (
              <Card variant="subtle" className="h-full min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
                  <p className="text-[var(--text-2)]">
                    Select a card to view details
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
        ) : (
          <VirtualCardsList accounts={accounts} />
        )}

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={showAddCard}
        onClose={() => {
          setShowAddCard(false);
        }}
        onSuccess={handleCardAdded}
        accounts={accounts}
      />
    </div>
  );
}
