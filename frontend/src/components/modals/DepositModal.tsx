'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  FileCheck
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Dropdown from '../ui/Dropdown';
import { transfersService, DepositRequest } from '@/lib/transfers';
import { accountsService, Account, handleApiError } from '@/lib/api';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAccount?: number;
}

type DepositMethod = 'cash' | 'check' | 'wire' | 'ach' | 'mobile';

interface DepositMethodOption {
  value: DepositMethod;
  label: string;
  icon: React.ReactNode;
  description: string;
  processingTime: string;
  fee: number;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  preselectedAccount,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('mobile');
  const [source, setSource] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const depositMethods: DepositMethodOption[] = [
    {
      value: 'mobile',
      label: 'Mobile Deposit',
      icon: <Smartphone size={20} />,
      description: 'Take a photo of your check',
      processingTime: '1-2 business days',
      fee: 0,
    },
    {
      value: 'ach',
      label: 'Bank Transfer (ACH)',
      icon: <Building2 size={20} />,
      description: 'Transfer from external bank',
      processingTime: '2-3 business days',
      fee: 0,
    },
    {
      value: 'wire',
      label: 'Wire Transfer',
      icon: <CreditCard size={20} />,
      description: 'Fast transfer for large amounts',
      processingTime: 'Same day',
      fee: 25,
    },
    {
      value: 'check',
      label: 'Mail Check',
      icon: <FileCheck size={20} />,
      description: 'Mail a physical check',
      processingTime: '5-7 business days',
      fee: 0,
    },
    {
      value: 'cash',
      label: 'Cash Deposit',
      icon: <Banknote size={20} />,
      description: 'Deposit at partner ATM',
      processingTime: 'Instant',
      fee: 2.5,
    },
  ];

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedAccount) {
      setSelectedAccount(preselectedAccount.toString());
    }
  }, [preselectedAccount]);

  const loadAccounts = async () => {
    try {
      const data = await accountsService.getAccounts();
      if (data && Array.isArray(data)) {
        setAccounts(data.filter(acc => acc.is_active));
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    }
  };

  const selectedMethod = depositMethods.find(m => m.value === depositMethod);

  const validateAmount = (value: string): boolean => {
    const numAmount = parseFloat(value);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (numAmount > 100000) {
      setError('Amount exceeds maximum deposit limit of $100,000');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    if (!validateAmount(amount)) {
      return;
    }

    if (depositMethod === 'check' && !checkNumber) {
      setError('Please enter check number');
      return;
    }

    if ((depositMethod === 'ach' || depositMethod === 'wire') && !source) {
      setError('Please enter source bank information');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const depositData: DepositRequest = {
        account_id: parseInt(selectedAccount),
        amount: parseFloat(amount),
        deposit_method: depositMethod,
        source: source || (depositMethod === 'check' ? `Check #${checkNumber}` : undefined),
        description: description || `${selectedMethod?.label} deposit`,
      };

      await transfersService.deposit(depositData);
      

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setSelectedAccount('');
        setAmount('');
        setDepositMethod('mobile');
        setSource('');
        setCheckNumber('');
        setDescription('');
        setSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      setError(handleApiError(err) || 'Deposit failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Money"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Deposit To
          </label>
          <Dropdown
            items={accounts.map((account) => ({
              value: account.id.toString(),
              label: `${account.name} - Current balance: $${account.balance.toLocaleString()}`
            }))}
            value={selectedAccount}
            onChange={setSelectedAccount}
            placeholder="Select account"
            fullWidth={true}
          />
        </div>

        {/* Deposit Method */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-3">
            Deposit Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            {depositMethods.map((method) => (
              <motion.button
                key={method.value}
                type="button"
                onClick={() => setDepositMethod(method.value)}
                className={`
                  p-3 rounded-lg border transition-all duration-200
                  ${depositMethod === method.value 
                    ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]' 
                    : 'border-[var(--border-1)] hover:border-[var(--border-2)]'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`
                    ${depositMethod === method.value 
                      ? 'text-[var(--primary-blue)]' 
                      : 'text-[var(--text-2)]'
                    }
                  `}>
                    {method.icon}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-1)]">
                    {method.label}
                  </span>
                  {method.fee > 0 && (
                    <span className="text-xs text-[var(--text-2)]">
                      Fee: ${method.fee}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
          {selectedMethod && (
            <div className="mt-3 p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] border border-[var(--border-1)]">
              <p className="text-sm text-[var(--text-2)]">{selectedMethod.description}</p>
              <p className="text-xs text-[var(--text-2)] mt-1">
                Processing time: {selectedMethod.processingTime}
              </p>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Amount
          </label>
          <Input
            type="text"
            value={amount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setAmount(value);
            }}
            onBlur={(e) => {
              const formatted = formatCurrency(e.target.value);
              if (formatted) setAmount(formatted);
            }}
            placeholder="0.00"
            icon={<span className="text-[var(--text-2)]">$</span>}
            required
          />
        </div>

        {/* Method-specific fields */}
        {depositMethod === 'check' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Check Number
            </label>
            <Input
              type="text"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              placeholder="1234"
              required
            />
          </div>
        )}

        {(depositMethod === 'ach' || depositMethod === 'wire') && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Source Bank
            </label>
            <Input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Bank name and account ending"
              icon={<Building2 size={18} />}
              required
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Memo (Optional)
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note..."
          />
        </div>

        {/* Summary Card */}
        {selectedAccount && amount && parseFloat(amount) > 0 && (
          <Card variant="subtle" className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-2)]">Deposit Amount</span>
                <span className="font-semibold text-[var(--text-1)]">
                  ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {selectedMethod && selectedMethod.fee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-2)]">Processing Fee</span>
                  <span className="text-[var(--primary-amber)]">
                    ${selectedMethod.fee.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-[var(--border-1)]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-1)]">Total Deposit</span>
                  <span className="font-semibold text-lg text-[var(--text-1)]">
                    ${(parseFloat(amount) - (selectedMethod?.fee || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-[rgba(var(--primary-red),0.1)] border border-[rgba(var(--primary-red),0.2)]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--primary-red)]" />
              <p className="text-sm text-[var(--primary-red)]">{error}</p>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-[rgba(var(--primary-emerald),0.1)] border border-[rgba(var(--primary-emerald),0.2)]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[var(--primary-emerald)]" />
              <p className="text-sm text-[var(--primary-emerald)]">
                Deposit initiated successfully!
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !selectedAccount || !amount}
            icon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            className="flex-1"
          >
            {isLoading ? 'Processing...' : 'Add Money'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DepositModal;
