import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  Shield,
  Lock,
  Unlock,
  Snowflake,
  Activity,
  Copy,
  Check,
  AlertCircle,
  Gift,
  TrendingUp
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import FreezeCardModal from './FreezeCardModal';
import CardTransactionsModal from './CardTransactionsModal';
import { AnimatedCardNumber, AnimatedCVV } from './AnimatedCardNumber';
import { CreditCard as CreditCardType } from '@/app/(authenticated)/cards/page';

interface CardDetailsProps {
  card: CreditCardType;
  showNumbers: boolean;
  onAction: (action: string) => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const CardDetails: React.FC<CardDetailsProps> = ({
  card,
  showNumbers,
  onAction,
  analyticsId = 'card-details',
  analyticsLabel: _analyticsLabel = 'Card Details',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  const handleCopy = (field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = () => {
    switch (card.status) {
      case 'active': return 'text-[var(--primary-emerald)]';
      case 'frozen': return 'text-[var(--primary-blue)]';
      case 'blocked': return 'text-[var(--primary-red)]';
    }
  };

  const getStatusIcon = () => {
    switch (card.status) {
      case 'active': return <Activity className="w-4 h-4" />;
      case 'frozen': return <Snowflake className="w-4 h-4" />;
      case 'blocked': return <Lock className="w-4 h-4" />;
    }
  };
  return (
    <>
      <Card variant="prominent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-1)]">
            Card Details
          </h2>
          <span className={`flex items-center gap-1 text-sm font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="capitalize">{card.status}</span>
          </span>
        </div>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Card Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Number */}
          <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <p className="text-sm text-[var(--text-2)] mb-1">Card Number</p>
            <div className="flex items-center justify-between">
              <AnimatedCardNumber
                showNumbers={showNumbers}
                fullNumber={card.cardNumber}
                lastFourDigits={card.lastFourDigits}
                className="font-mono text-[var(--text-1)]"
              />
              <button
                onClick={() => handleCopy('number', card.cardNumber.replace(/\s/g, ''))}
                className="p-1 rounded hover:bg-[rgba(var(--glass-rgb),0.2)] transition-colors"
              >
                {copiedField === 'number' ? (
                  <Check className="w-4 h-4 text-[var(--primary-emerald)]" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--text-2)]" />
                )}
              </button>
            </div>
          </div>

          {/* Expiry Date */}
          <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <p className="text-sm text-[var(--text-2)] mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Expiry Date
            </p>
            <p className="font-mono text-[var(--text-1)]">{card.expiryDate}</p>
          </div>

          {/* CVV */}
          <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <p className="text-sm text-[var(--text-2)] mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              CVV
            </p>
            <AnimatedCVV
              showNumbers={showNumbers}
              cvv={card.cvv}
              className="font-mono text-[var(--text-1)]"
            />
          </div>

          {/* Cardholder Name */}
          <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <p className="text-sm text-[var(--text-2)] mb-1">Cardholder Name</p>
            <p className="font-medium text-[var(--text-1)]">{card.cardholderName}</p>
          </div>
        </div>

        {/* Credit Card Specific Info */}
        {card.type === 'credit' && (
          <>
            {/* Credit Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-[var(--primary-red)]" />
                <p className="text-xs text-[var(--text-2)] mb-1">Current Balance</p>
                <p className="text-lg font-semibold text-[var(--text-1)]">
                  {formatCurrency(card.balance || 0)}
                </p>
              </div>

              <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[var(--primary-emerald)]" />
                <p className="text-xs text-[var(--text-2)] mb-1">Available Credit</p>
                <p className="text-lg font-semibold text-[var(--primary-emerald)]">
                  {formatCurrency(card.availableCredit || 0)}
                </p>
              </div>

              <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
                <Shield className="w-6 h-6 mx-auto mb-2 text-[var(--primary-blue)]" />
                <p className="text-xs text-[var(--text-2)] mb-1">Credit Limit</p>
                <p className="text-lg font-semibold text-[var(--text-1)]">
                  {formatCurrency(card.creditLimit || 0)}
                </p>
              </div>

              <div className="text-center p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
                <Gift className="w-6 h-6 mx-auto mb-2 text-[var(--primary-indigo)]" />
                <p className="text-xs text-[var(--text-2)] mb-1">Reward Points</p>
                <p className="text-lg font-semibold text-[var(--text-1)]">
                  {card.rewards?.points.toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* Payment Info */}
            {card.dueDate && (
              <div className="p-4 rounded-lg bg-[rgba(var(--primary-amber),0.1)] border border-[var(--primary-amber)]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--primary-amber)] mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[var(--text-1)]">Payment Due</h4>
                      <span className="text-sm font-medium text-[var(--text-1)]">
                        {new Date(card.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-2)]">Minimum Payment</span>
                      <span className="text-lg font-semibold text-[var(--primary-amber)]">
                        {formatCurrency(card.minimumPayment || 0)}
                      </span>
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="mt-3" 
                      fullWidth
                      onClick={() => {
                        onAction('payment');
                      }}
                      analyticsId={`${analyticsId}-make-payment`}
                      analyticsLabel="Make Payment"
                    >
                      Make Payment
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Debit Card Balance */}
        {card.type === 'debit' && (
          <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[var(--primary-emerald)]" />
                <span className="text-sm text-[var(--text-2)]">Account Balance</span>
              </div>
              <span className="text-xl font-semibold text-[var(--text-1)]">
                {formatCurrency(card.balance || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={card.status === 'frozen' ? 'primary' : 'secondary'}
            size="sm"
            icon={card.status === 'frozen' ? <Unlock size={16} /> : <Snowflake size={16} />}
            onClick={() => {
              setShowFreezeModal(true);
            }}
            fullWidth
            analyticsId={`${analyticsId}-freeze-toggle`}
            analyticsLabel={card.status === 'frozen' ? 'Unfreeze Card' : 'Freeze Card'}
          >
            {card.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
          </Button>
          
          
          <Button
            variant="secondary"
            size="sm"
            icon={<Activity size={16} />}
            onClick={() => {
              setShowTransactionsModal(true);
            }}
            fullWidth
            analyticsId={`${analyticsId}-transactions`}
            analyticsLabel="View Transactions"
          >
            Transactions
          </Button>
        </div>

        {/* Last Payment Info */}
        {card.lastPayment && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
            <span className="text-sm text-[var(--text-2)]">Last Payment</span>
            <span className="text-sm font-medium text-[var(--text-1)]">
              {formatCurrency(card.lastPayment.amount)} on {new Date(card.lastPayment.date).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardBody>
      </Card>
      
      {/* Freeze Card Modal */}
      <FreezeCardModal
        isOpen={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        card={{
          id: card.id,
          lastFour: card.lastFourDigits,
          status: card.status,
          type: card.type,
        }}
        onFreeze={(frozen) => {
          onAction(frozen ? 'freeze' : 'unfreeze');
        }}
      />
      
      {/* Card Transactions Modal */}
      <CardTransactionsModal
        isOpen={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
        cardId={card.id.toString()}
        cardName={card.cardName}
        lastFour={card.lastFourDigits}
      />
    </>
  );
};

export default CardDetails;
