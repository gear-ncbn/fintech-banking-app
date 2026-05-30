import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi,
  Globe,
  ShoppingBag,
  Banknote,
  Shield,
  Smartphone,
  CreditCard,
  AlertCircle,
  Check
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import SpendingLimits from './SpendingLimits';
import { CreditCard as CreditCardType } from '@/app/(authenticated)/cards/page';

interface CardControlsProps {
  card: CreditCardType;
  onUpdate: (updates: Partial<CreditCardType>) => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const CardControls: React.FC<CardControlsProps> = ({ 
  card, 
  onUpdate,
  analyticsId: _analyticsId = 'card-controls',
  analyticsLabel: _analyticsLabel = 'Card Controls',
}) => {
  const [controls, setControls] = useState({
    contactless: card.features.contactless,
    international: card.features.international,
    online: card.features.online,
    atm: card.features.atm,
  });

  const handleToggleFeature = (feature: keyof typeof controls) => {
    const newControls = { ...controls, [feature]: !controls[feature] };
    setControls(newControls);
    onUpdate({
      features: { ...card.features, [feature]: newControls[feature] }
    });
  };
  const controlItems = [
    {
      id: 'contactless',
      label: 'Contactless Payments',
      description: 'Tap to pay at supported terminals',
      icon: <Wifi className="w-5 h-5" />,
      enabled: controls.contactless,
    },
    {
      id: 'international',
      label: 'International Transactions',
      description: 'Use your card abroad',
      icon: <Globe className="w-5 h-5" />,
      enabled: controls.international,
    },
    {
      id: 'online',
      label: 'Online Purchases',
      description: 'Shop online and pay for subscriptions',
      icon: <ShoppingBag className="w-5 h-5" />,
      enabled: controls.online,
    },
    {
      id: 'atm',
      label: 'ATM Withdrawals',
      description: 'Withdraw cash from ATMs',
      icon: <Banknote className="w-5 h-5" />,
      enabled: controls.atm,
    },
  ];
  return (
    <>
      <div className="space-y-6">
        {/* Card Controls */}
        <Card variant="default">
          <CardHeader>
            <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--primary-blue)]" />
              Card Controls
            </h3>
          </CardHeader>
          
          <CardBody className="space-y-4">
            {controlItems.map((control, index) => (
              <motion.div
                key={control.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  p-4 rounded-lg border transition-all cursor-pointer
                  ${control.enabled 
                    ? 'bg-[rgba(var(--glass-rgb),0.05)] border-[var(--primary-blue)]/30' 
                    : 'bg-transparent border-[var(--border-1)]'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`
                      p-2 rounded-lg transition-colors
                      ${control.enabled 
                        ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' 
                        : 'bg-[rgba(var(--glass-rgb),0.1)] text-[var(--text-2)]'
                      }
                    `}>
                      {control.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--text-1)]">{control.label}</h4>
                      <p className="text-sm text-[var(--text-2)] mt-1">{control.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleFeature(control.id as keyof typeof controls)}
                    className={`
                      relative w-12 h-6 rounded-full transition-colors
                      ${control.enabled 
                        ? 'bg-[var(--primary-blue)]' 
                        : 'bg-[rgba(var(--glass-rgb),0.2)]'
                      }
                    `}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-[var(--bg-color)] rounded-full shadow-sm"
                      animate={{ left: control.enabled ? '1.5rem' : '0.25rem' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    />
                  </button>
                </div>
              </motion.div>
            ))}
          </CardBody>
        </Card>

        {/* Spending Limits */}
        {card.id && !isNaN(parseInt(card.id)) ? (
          <SpendingLimits cardId={parseInt(card.id)} />
        ) : (
          <Card variant="default">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[var(--primary-indigo)]" />
                Spending Limits
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-[var(--text-2)]">Card ID not available for spending limits</p>
            </CardBody>
          </Card>
        )}

        {/* Security Features */}
        <Card variant="default">
          <CardHeader>
            <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--primary-emerald)]" />
              Security Features
            </h3>
          </CardHeader>
          
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-[var(--primary-blue)]" />
                  <h4 className="font-medium text-[var(--text-1)]">Mobile Notifications</h4>
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  Get instant alerts for every transaction
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--primary-emerald)]" />
                  <span className="text-sm text-[var(--primary-emerald)]">Enabled</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[var(--primary-indigo)]" />
                  <h4 className="font-medium text-[var(--text-1)]">3D Secure</h4>
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  Extra verification for online purchases
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--primary-emerald)]" />
                  <span className="text-sm text-[var(--primary-emerald)]">Enabled</span>
                </div>
              </div>
            </div>

            {card.status === 'frozen' && (
              <div className="mt-4 p-4 rounded-lg bg-[rgba(var(--primary-blue),0.1)] border border-[var(--primary-blue)]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--primary-blue)] mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[var(--text-1)]">Card is Frozen</h4>
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      This card is temporarily frozen. All transactions will be declined until you unfreeze it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default CardControls;
