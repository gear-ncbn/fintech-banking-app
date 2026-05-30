'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Snowflake,
  Unlock,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import VirtualCardModal from './VirtualCardModal';
import { cardsApi } from '@/lib/api';
import type { VirtualCard, Account } from '@/lib/api';

interface VirtualCardsListProps {
  accounts?: Account[];
}

// Safely format a card expiry; never render the literal "Invalid Date" string.
function formatExpiry(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
}

export default function VirtualCardsList({ accounts = [] }: VirtualCardsListProps) {
  const [virtualCards, setVirtualCards] = useState<VirtualCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNumbers, setShowNumbers] = useState<Record<number, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCard, setCopiedCard] = useState<number | null>(null);

  useEffect(() => {
    fetchVirtualCards();
  }, []);

  const fetchVirtualCards = async () => {
    try {
      setIsLoading(true);
      const cards = await cardsApi.getVirtualCards();
      setVirtualCards(cards);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreezeCard = async (cardId: number, freeze: boolean) => {
    try {
      await cardsApi.freezeCard(cardId, freeze);
      await fetchVirtualCards();
    } catch {
    }
  };

  const handleCopyNumber = (cardNumber: string, cardId: number) => {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    setCopiedCard(cardId);
    setTimeout(() => setCopiedCard(null), 2000);
  };

  const toggleShowNumber = (cardId: number) => {
    setShowNumbers(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const getCardStatus = (card: VirtualCard) => {
    if (card.status === 'EXPIRED') {
      return { color: 'var(--error-text)', icon: <AlertCircle className="w-4 h-4" />, text: 'Expired' };
    }
    if (card.status === 'FROZEN') {
      return { color: 'var(--primary-blue)', icon: <Snowflake className="w-4 h-4" />, text: 'Frozen' };
    }
    if (card.single_use && card.spent_amount > 0) {
      return { color: 'var(--text-2)', icon: <CheckCircle className="w-4 h-4" />, text: 'Used' };
    }
    return { color: 'var(--primary-emerald)', icon: <ShieldCheck className="w-4 h-4" />, text: 'Active' };
  };

  const getSpendingProgress = (spent: number, limit?: number) => {
    if (!limit) return 0;
    return Math.min((spent / limit) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} variant="default" className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-[rgba(var(--glass-rgb),0.1)] rounded w-1/3"></div>
              <div className="h-3 bg-[rgba(var(--glass-rgb),0.1)] rounded w-1/2"></div>
              <div className="h-8 bg-[rgba(var(--glass-rgb),0.1)] rounded w-full"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-1)]">
            Virtual Cards
          </h3>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Virtual Card
          </Button>
        </div>

        {virtualCards.length === 0 ? (
          <Card variant="subtle" className="p-8 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
            <h4 className="text-lg font-medium text-[var(--text-1)] mb-2">
              No Virtual Cards Yet
            </h4>
            <p className="text-sm text-[var(--text-2)] mb-4">
              Create virtual cards for secure online shopping and subscriptions
            </p>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Virtual Card
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {virtualCards.map((card, index) => {
              const status = getCardStatus(card);
              const progress = getSpendingProgress(card.spent_amount, card.spending_limit);
              
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card variant="default" className="p-6 space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[var(--text-1)]">
                          {card.name || 'Virtual Card'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ color: status.color }} className="flex items-center gap-1 text-sm">
                            {status.icon}
                            {status.text}
                          </span>
                          {card.single_use && (
                            <span className="text-xs px-2 py-0.5 bg-[rgba(var(--glass-rgb),0.1)] rounded">
                              Single Use
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={showNumbers[card.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        onClick={() => toggleShowNumber(card.id)}
                      />
                    </div>

                    {/* Card Number */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-[rgba(var(--glass-rgb),0.05)] rounded-lg">
                        <span className="font-mono text-sm text-[var(--text-1)]">
                          {showNumbers[card.id] 
                            ? card.card_number_masked 
                            : card.card_number_masked.replace(/\d(?=\d{4})/g, '*')
                          }
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={copiedCard === card.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                          onClick={() => handleCopyNumber(card.card_number_masked, card.id)}
                        />
                      </div>
                    </div>

                    {/* Spending Info */}
                    {card.spending_limit && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[var(--text-2)]">Spending</span>
                          <span className="text-sm font-medium text-[var(--text-1)]">
                            ${card.spent_amount.toFixed(2)} / ${card.spending_limit.toFixed(2)}
                          </span>
                        </div>
                        <div className="relative h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-[var(--primary-blue)] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--text-2)]" />
                        <span className="text-[var(--text-2)]">
                          Expires {formatExpiry(card.expires_at)}
                        </span>
                      </div>
                      {card.merchant_restrictions && card.merchant_restrictions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[var(--text-2)]" />
                          <span className="text-[var(--text-2)]">
                            {card.merchant_restrictions.length} restrictions
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {card.status === 'ACTIVE' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          icon={<Snowflake size={16} />}
                          onClick={() => handleFreezeCard(card.id, true)}
                        >
                          Freeze
                        </Button>
                      )}
                      {card.status === 'FROZEN' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          icon={<Unlock size={16} />}
                          onClick={() => handleFreezeCard(card.id, false)}
                        >
                          Unfreeze
                        </Button>
                      )}
                      {(card.status === 'EXPIRED' || (card.single_use && card.spent_amount > 0)) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          disabled
                        >
                          Card Expired
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Virtual Card Modal */}
      <VirtualCardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        accounts={accounts}
        onSuccess={fetchVirtualCards}
      />
    </>
  );
}