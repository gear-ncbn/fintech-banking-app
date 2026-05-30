'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, CreditCard, Zap, CheckCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import SlideToConfirm from '@/components/ui/SlideToConfirm';
import TwoFactorInput from '@/components/ui/TwoFactorInput';
import BiometricAuth from '@/components/ui/BiometricAuth';
import Modal from '@/components/ui/Modal';
import RecipientSearch from '@/components/transfer/RecipientSearch';
import { transfersService } from '@/lib/transfers';
import { accountsService, type Account } from '@/lib/api';
import { UserSearchResult } from '@/lib/api/users';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

type TransferStep = 'details' | 'confirm' | 'auth' | 'success';
type AuthMethod = 'biometric' | '2fa';

export default function TransferPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Initialize to details - we'll handle success state differently
  const [currentStep, setCurrentStep] = useState<TransferStep>('details');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('biometric');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [isTransferConfirmed, setIsTransferConfirmed] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fromAccount: '',
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
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    try {
      const data = await accountsService.getAccounts();
      setAccounts(data);
      if (data.length > 0) {
        // Prefer a checking/savings account with a positive balance instead
        // of defaulting to the first account (which might be a credit card).
        const preferred = data.find(a =>
          a.account_type?.toLowerCase() !== 'credit' && a.balance > 0
        ) || data[0];
        setFormData(prev => ({ ...prev, fromAccount: preferred.id.toString() }));
      }
    } catch {
      // Failed to load accounts
    }
  };

  const transferTypes = [
    { value: 'instant', label: 'Instant Transfer', icon: <Zap size={16} /> },
    { value: 'standard', label: 'Standard (1-3 days)', icon: <CreditCard size={16} /> },
  ];

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

    if (!selectedRecipient && !formData.recipient) {
      newErrors.recipient = 'Please select a recipient';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Enter a valid amount';
    } else {
      // Check balance for selected account (including fee)
      const selectedAccount = accounts.find(acc => acc.id.toString() === formData.fromAccount);
      const fee = formData.transferType === 'instant' ? 0.75 : 0;
      const totalAmount = parseFloat(formData.amount) + fee;
      
      if (selectedAccount && totalAmount > selectedAccount.balance) {
        newErrors.amount = `Insufficient funds (need ${formatCurrency(totalAmount)} including fee)`;
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleNext = () => {
    if (!validateForm()) return;
    
    const _selectedAccount = accounts.find(acc => acc.id.toString() === formData.fromAccount);
    const _fee = formData.transferType === 'instant' ? 0.75 : 0;
    
    
    setCurrentStep('confirm');
  };

  const handleConfirm = () => {
    setIsTransferConfirmed(true);
    // Small delay to ensure slider animation completes
    setTimeout(() => {
      setShowAuthModal(true);
    }, 100);
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    setIsLoading(true);
    
    try {
      // Calculate total amount including fee for instant transfers
      const baseAmount = parseFloat(formData.amount);
      const fee = formData.transferType === 'instant' ? 0.75 : 0;
      const totalAmount = baseAmount + fee;
      
      let response;
      
      // If we have a selected recipient, use send-money endpoint
      if (selectedRecipient) {
        const sendMoneyData = {
          recipient_identifier: selectedRecipient.username,
          source_account_id: parseInt(formData.fromAccount),
          amount: baseAmount, // Send base amount only
          description: formData.note || `Transfer to ${selectedRecipient.full_name}`,
          transfer_fee: fee, // Send fee separately
        };
        response = await transfersService.sendMoney(sendMoneyData);
      } else {
        // For external transfers without a selected recipient
        const requestData = {
          source_account_id: parseInt(formData.fromAccount),
          destination_account_id: 0, // 0 for external transfers
          amount: totalAmount, // Include fee in the amount
          description: formData.note || `Transfer to ${formData.recipient}`,
          is_external: true,
          transfer_fee: fee, // Send fee info in metadata
          transfer_type: formData.transferType,
        };
        response = await transfersService.transfer(requestData);
      }
      
      
      // Store transaction ID for receipt
      if (response?.id) {
        sessionStorage.setItem('lastTransactionId', response.id.toString());
        // Also store transfer details for the success page
        sessionStorage.setItem('lastTransferAmount', formData.amount);
        sessionStorage.setItem('lastTransferRecipient', selectedRecipient?.full_name || formData.recipient);
        sessionStorage.setItem('lastTransferTimestamp', Date.now().toString());
      }
      
      // Important: Set loading to false BEFORE changing step
      setIsLoading(false);
      setCurrentStep('success');
      notificationService.success('Money sent successfully!');
      
      // Don't refresh accounts immediately as it might cause state issues
      // await loadAccounts();
      
      // Force notification refresh
      // Trigger a custom event that the header can listen to
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
      
      // Also manually check for new notifications
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }, 2000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || 'Transfer failed. Please try again.';
      notificationService.error(errorMessage);
      setShowAuthModal(false);
      setCurrentStep('details'); // Go back to details on error
      setIsLoading(false);
    }
  };

  const handleNewTransfer = () => {
    // Clear session storage
    sessionStorage.removeItem('lastTransactionId');
    sessionStorage.removeItem('lastTransferAmount');
    sessionStorage.removeItem('lastTransferRecipient');
    sessionStorage.removeItem('lastTransferTimestamp');
    
    setCurrentStep('details');
    setFormData({
      fromAccount: accounts.length > 0 ? accounts[0].id.toString() : '',
      toAccount: '',
      recipient: '',
      amount: '',
      note: '',
      transferType: 'instant',
    });
    setSelectedRecipient(null);
    setIsTransferConfirmed(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => {
              router.push('/dashboard');
            }}
            className="mb-6"
          >
            Back to Dashboard
          </Button>

          {/* Step 1: Transfer Details */}
          {currentStep === 'details' && (
            <div>
                <Card variant="prominent" className="p-8">
                  <h1 className="text-2xl font-bold text-[var(--text-1)] mb-6">
                    Send Money
                  </h1>

                  <div className="space-y-6">
                    {/* From Account */}
                    <Dropdown
                      label="From Account"
                      items={accounts.map((account) => ({
                        value: account.id.toString(),
                        label: `${account.name} - $${account.balance.toLocaleString()} available`,
                        icon: <CreditCard size={16} />
                      }))}
                      value={formData.fromAccount}
                      onChange={(value) => {
                        const _previousAccount = accounts.find(a => a.id.toString() === formData.fromAccount);
                        const _newAccount = accounts.find(a => a.id.toString() === value);
                        setFormData({ ...formData, fromAccount: value });
                        setErrors({ ...errors, fromAccount: '' });
                      }}
                      error={errors.fromAccount}
                      placeholder="Select source account"
                    />

                    {/* Recipient */}
                    <RecipientSearch
                      value={formData.recipient}
                      onChange={(value) => {
                        setFormData({ ...formData, recipient: value });
                        setErrors({ ...errors, recipient: '' });
                      }}
                      onSelect={(user) => {
                        setSelectedRecipient(user);
                        setErrors({ ...errors, recipient: '' });
                      }}
                      error={errors.recipient}
                      placeholder="Search by username, email, or full name"
                    />

                    {/* Amount */}
                    <Input
                      label="Amount"
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => {
                        const amount = e.target.value;
                        setFormData({ ...formData, amount });
                        setErrors({ ...errors, amount: '' });
                        
                        if (amount && parseFloat(amount) > 0) {
                          const _selectedAccount = accounts.find(a => a.id.toString() === formData.fromAccount);
                          const fee = formData.transferType === 'instant' ? 0.75 : 0;
                          const _total = parseFloat(amount) + fee;
                          
                        }
                      }}
                      error={errors.amount}
                      icon={<DollarSign size={18} />}
                    />

                    {/* Transfer Type */}
                    <Dropdown
                      label="Transfer Speed"
                      items={transferTypes}
                      value={formData.transferType}
                      onChange={(value) => {
                        const _oldFee = formData.transferType === 'instant' ? 0.75 : 0;
                        const _newFee = value === 'instant' ? 0.75 : 0;
                        setFormData({ ...formData, transferType: value });
                      }}
                      placeholder="Select transfer type"
                    />

                    {/* Note */}
                    <Input
                      label="Note (Optional)"
                      type="text"
                      placeholder="What's this for?"
                      value={formData.note}
                      onChange={(e) => {
                        const noteValue = e.target.value;
                        setFormData({ ...formData, note: noteValue });
                        
                        if (noteValue.length > 0) {
                        }
                      }}
                    />

                    {/* Fee Notice */}
                    {formData.transferType === 'instant' && formData.amount && (
                      <div className="p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)]">
                        <p className="text-sm text-[var(--text-2)]">
                          Instant transfer fee: <span className="font-medium text-[var(--text-1)]">$0.75</span>
                        </p>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleNext}
                    >
                      Continue
                    </Button>
                  </div>
                </Card>
            </div>
          )}

          {/* Step 2: Confirm Transfer */}
          {currentStep === 'confirm' && (
            <div>
                <Card variant="prominent" className="p-8">
                  <h1 className="text-2xl font-bold text-[var(--text-1)] mb-6">
                    Confirm Transfer
                  </h1>

                  <div className="space-y-6">
                    {/* Transfer Summary */}
                    <div className="space-y-4">
                      <div className="flex justify-between py-3 border-b border-[var(--border-1)]">
                        <span className="text-[var(--text-2)]">From</span>
                        <span className="font-medium text-[var(--text-1)]">
                          {accounts.find(a => a.id.toString() === formData.fromAccount)?.name || 'Account'}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-[var(--border-1)]">
                        <span className="text-[var(--text-2)]">To</span>
                        <span className="font-medium text-[var(--text-1)]">
                          {selectedRecipient ? selectedRecipient.full_name : formData.recipient}
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
                      recipient={selectedRecipient ? selectedRecipient.full_name : formData.recipient}
                      text="Slide to send money"
                    />

                    {!isTransferConfirmed && (
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => {
                          setCurrentStep('details');
                        }}
                      >
                        Back to Edit
                      </Button>
                    )}
                  </div>
                </Card>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && !isLoading && (
            <Card variant="prominent" className="p-8">
                  <div className="text-center">
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

                    <h1 className="text-2xl font-bold text-[var(--text-1)] mb-4">
                      Transfer Complete!
                    </h1>
                    
                    {/* Transfer Summary */}
                    <div className="mb-8 p-6 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)]">
                      <div className="text-3xl font-bold text-[var(--primary-emerald)] mb-2">
                        ${formData.amount || '0.00'}
                      </div>
                      <p className="text-[var(--text-2)]">
                        Successfully sent to
                      </p>
                      <p className="text-lg font-medium text-[var(--text-1)] mt-1">
                        {selectedRecipient?.full_name || formData.recipient || 'Recipient'}
                      </p>
                      {formData.transferType === 'instant' && (
                        <p className="text-sm text-[var(--text-2)] mt-3">
                          Including $0.75 instant transfer fee
                        </p>
                      )}
                    </div>

                    {/* Transaction Details */}
                    <div className="text-left space-y-3 mb-6 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)]">
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--text-2)]">Reference Number</span>
                        <span className="font-mono text-sm text-[var(--text-1)]">
                          {sessionStorage.getItem('lastTransactionId')
                            ? `TRF${(sessionStorage.getItem('lastTransactionId') ?? '').padStart(8, '0')}`
                            : 'TRF00000000'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--text-2)]">Date & Time</span>
                        <span className="text-[var(--text-1)]">
                          {new Date().toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--text-2)]">Status</span>
                        <span className="text-[var(--primary-emerald)] font-medium">
                          Completed ✓
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => {
                          const transactionId = sessionStorage.getItem('lastTransactionId');
                          if (transactionId) {
                            router.push(`/transactions/${transactionId}`);
                          } else {
                            router.push('/transactions');
                          }
                        }}
                      >
                        View Full Receipt
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => {
                          handleNewTransfer();
                        }}
                      >
                        Make Another Transfer
                      </Button>
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => {
                          router.push('/dashboard');
                        }}
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  </div>
                </Card>
          )}

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
                  onClick={() => {
                    if (authMethod !== 'biometric') {
                      setAuthMethod('biometric');
                    }
                  }}
                >
                  Biometric
                </Button>
                <Button
                  variant={authMethod === '2fa' ? 'primary' : 'ghost'}
                  size="sm"
                  fullWidth
                  onClick={() => {
                    if (authMethod !== '2fa') {
                      setAuthMethod('2fa');
                    }
                  }}
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
                  onResend={() => {
                    // Resend 2FA code
                  }}
                  title="Enter Security Code"
                  subtitle="We sent a code to your phone ending in ****1234"
                />
              )}
            </div>
          </Modal>
        </div>
    </div>
  );
}
