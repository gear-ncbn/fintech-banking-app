'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, DollarSign, CreditCard, Zap, CheckCircle, Lock } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import SlideToConfirm from '../ui/SlideToConfirm';
import TwoFactorInput from '../ui/TwoFactorInput';
import BiometricAuth from '../ui/BiometricAuth';

type TransferStep = 'details' | 'confirm' | 'auth' | 'success';
type AuthMethod = 'biometric' | '2fa';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (data: any) => void;
  defaultFromAccount?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultFromAccount,
}) => {
  const [currentStep, setCurrentStep] = useState<TransferStep>('details');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('biometric');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fromAccount: defaultFromAccount || '',
    toAccount: '',
    recipient: '',
    amount: '',
    note: '',
    transferType: 'instant',
  });
  
  const [errors, setErrors] = useState({
    fromAccount: '',
    toAccount: '',
    recipient: '',
    amount: '',
  });

  useEffect(() => {
    if (isOpen) {
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset form when modal closes
    if (!isOpen) {
      setCurrentStep('details');
      setFormData({
        fromAccount: defaultFromAccount || '',
        toAccount: '',
        recipient: '',
        amount: '',
        note: '',
        transferType: 'instant',
      });
      setErrors({
        fromAccount: '',
        toAccount: '',
        recipient: '',
        amount: '',
      });
    }
  }, [isOpen, defaultFromAccount]);

  // Mock accounts
  const accounts = [
    { value: 'checking-1', label: 'Main Checking - $12,450.00', icon: <CreditCard size={16} /> },
    { value: 'savings-1', label: 'Savings Account - $25,750.50', icon: <CreditCard size={16} /> },
  ];

  const transferTypes = [
    { value: 'instant', label: 'Instant Transfer', icon: <Zap size={16} /> },
    { value: 'standard', label: 'Standard (1-3 days)', icon: <CreditCard size={16} /> },
  ];

  // Analytics helper
  const _getAmountRange = (amount: number): string => {
    if (amount <= 100) return '0-100';
    if (amount <= 500) return '101-500';
    if (amount <= 1000) return '501-1000';
    if (amount <= 5000) return '1001-5000';
    return '5000+';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: '' });
    }
    
    // Log significant input events
  };

  const validateForm = () => {
    const newErrors = {
      fromAccount: '',
      toAccount: '',
      recipient: '',
      amount: '',
    };

    if (!formData.fromAccount) {
      newErrors.fromAccount = 'Please select a source account';
    }

    if (!formData.recipient && !formData.toAccount) {
      newErrors.recipient = 'Enter recipient or select destination account';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Enter a valid amount';
    } else if (parseFloat(formData.amount) > 12450) {
      newErrors.amount = 'Insufficient funds';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleNext = () => {
    if (!validateForm()) return;

    setCurrentStep('confirm');
  };

  const handleConfirm = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setCurrentStep('success');
    // Call onSuccess if provided
    if (onSuccess) {
      onSuccess({
        ...formData,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleNewTransfer = () => {
    setCurrentStep('details');
    setFormData({
      fromAccount: defaultFromAccount || '',
      toAccount: '',
      recipient: '',
      amount: '',
      note: '',
      transferType: 'instant',
    });
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-6">
            {/* From Account */}
            <Dropdown
              label="From Account"
              items={accounts}
              value={formData.fromAccount}
              onChange={(value) => {
                setFormData({ ...formData, fromAccount: value });
                setErrors({ ...errors, fromAccount: '' });
              }}
              error={errors.fromAccount}
              placeholder="Select source account"
            />

            {/* Recipient */}
            <div>
              <Input
                label="Recipient"
                type="text"
                placeholder="Email, phone, or username"
                value={formData.recipient}
                onChange={(e) => {
                  setFormData({ ...formData, recipient: e.target.value });
                  setErrors({ ...errors, recipient: '' });
                }}
                error={errors.recipient}
                icon={<User size={18} />}
              />
              <p className="text-xs text-[var(--text-2)] mt-1">
                Or select from your accounts above
              </p>
            </div>

            {/* Amount */}
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={errors.amount}
              icon={<DollarSign size={18} />}
            />

            {/* Transfer Type */}
            <Dropdown
              label="Transfer Speed"
              items={transferTypes}
              value={formData.transferType}
              onChange={(value) => setFormData({ ...formData, transferType: value })}
              placeholder="Select transfer type"
            />

            {/* Note */}
            <Input
              label="Note (Optional)"
              type="text"
              placeholder="What's this for?"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />

            {/* Fee Notice */}
            {formData.transferType === 'instant' && formData.amount && (
              <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)]">
                <p className="text-sm text-[var(--text-2)]">
                  Instant transfer fee: <span className="font-medium text-[var(--text-1)]">$0.75</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleNext}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            {/* Transfer Summary */}
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-[var(--border-1)]">
                <span className="text-[var(--text-2)]">From</span>
                <span className="font-medium text-[var(--text-1)]">
                  Main Checking
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-[var(--border-1)]">
                <span className="text-[var(--text-2)]">To</span>
                <span className="font-medium text-[var(--text-1)]">
                  {formData.recipient || 'Savings Account'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-[var(--border-1)]">
                <span className="text-[var(--text-2)]">Amount</span>
                <span className="text-2xl font-bold text-[var(--text-1)]">
                  ${parseFloat(formData.amount).toFixed(2)}
                </span>
              </div>
              {formData.transferType === 'instant' && (
                <div className="flex justify-between py-3 border-b border-[var(--border-1)]">
                  <span className="text-[var(--text-2)]">Fee</span>
                  <span className="font-medium text-[var(--text-1)]">
                    $0.75
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3">
                <span className="font-medium text-[var(--text-1)]">Total</span>
                <span className="text-2xl font-bold gradient-text">
                  ${(parseFloat(formData.amount) + (formData.transferType === 'instant' ? 0.75 : 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)]">
              <p className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Lock className="w-4 h-4 flex-shrink-0" />
                This transfer is protected by bank-level encryption and requires authentication
              </p>
            </div>

            {/* Slide to Confirm */}
            <SlideToConfirm
              onConfirm={handleConfirm}
              amount={parseFloat(formData.amount)}
              recipient={formData.recipient || 'Savings Account'}
              text="Slide to send money"
            />

            <Button
              variant="ghost"
              fullWidth
              onClick={() => setCurrentStep('details')}
            >
              Back to Edit
            </Button>
          </div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary-emerald)] to-[var(--primary-teal)] flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
            </motion.div>

            <h3 className="text-2xl font-bold text-[var(--text-1)] mb-2">
              Transfer Complete!
            </h3>
            <p className="text-[var(--text-2)] mb-6">
              ${parseFloat(formData.amount).toFixed(2)} has been sent successfully
            </p>

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={onClose}
              >
                Done
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={handleNewTransfer}
              >
                Make Another Transfer
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={currentStep === 'success' ? undefined : 'Send Money'}
        size="md"
        analyticsId="transfer-modal"
        analyticsLabel="Transfer Modal"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </Modal>

      {/* Authentication Modal */}
      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        closeOnBackdrop={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          {/* Auth Method Selector */}
          <div className="flex gap-2 p-1 bg-[rgba(var(--glass-rgb),0.2)] rounded-lg">
            <Button
              variant={authMethod === 'biometric' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              onClick={() => setAuthMethod('biometric')}
            >
              Biometric
            </Button>
            <Button
              variant={authMethod === '2fa' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              onClick={() => setAuthMethod('2fa')}
            >
              2FA Code
            </Button>
          </div>

          {/* Auth Components */}
          {authMethod === 'biometric' ? (
            <BiometricAuth
              onSuccess={handleAuthSuccess}
              onCancel={() => setShowAuthModal(false)}
              onFallback={() => setAuthMethod('2fa')}
              title="Verify Transfer"
              subtitle={`Authenticate to send $${formData.amount}`}
            />
          ) : (
            <TwoFactorInput
              onComplete={(_code) => {
                
                handleAuthSuccess();
              }}
              onResend={() => {}}
              title="Enter Security Code"
              subtitle="We sent a code to your phone ending in ****1234"
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default TransferModal;
