'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
  Home,
  Zap,
  Smartphone,
  CreditCard,
  Building2
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Checkbox from '../ui/Checkbox';
import { transfersService, BillPaymentRequest } from '@/lib/transfers';
import { accountsService, Account, handleApiError } from '@/lib/api';

interface BillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAccount?: number;
}

interface BillCategory {
  value: string;
  label: string;
  icon: React.ReactNode;
  billers: string[];
}

export const BillPaymentModal: React.FC<BillPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedAccount,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [billCategory, setBillCategory] = useState<BillPaymentRequest['bill_type']>('utility');
  const [billerName, setBillerName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [savePayee, setSavePayee] = useState(false);

  const billCategories: BillCategory[] = [
    {
      value: 'utility',
      label: 'Utilities',
      icon: <Zap size={20} />,
      billers: ['Electric Company', 'Gas Company', 'Water Department', 'Trash Service'],
    },
    {
      value: 'other_bills',
      label: 'Other Bills',
      icon: <Receipt size={20} />,
      billers: ['Phone', 'Internet', 'Subscription', 'Other'],
    },
    {
      value: 'credit_card',
      label: 'Credit Cards',
      icon: <CreditCard size={20} />,
      billers: ['Visa', 'Mastercard', 'American Express', 'Discover'],
    },
    {
      value: 'loan',
      label: 'Loans',
      icon: <Building2 size={20} />,
      billers: ['Auto Loan', 'Personal Loan', 'Student Loan', 'Home Equity'],
    },
    {
      value: 'rent',
      label: 'Rent',
      icon: <Home size={20} />,
      billers: ['Property Management', 'Landlord', 'Rental Company'],
    },
    {
      value: 'insurance',
      label: 'Insurance',
      icon: <Smartphone size={20} />,
      billers: ['Auto Insurance', 'Health Insurance', 'Life Insurance', 'Home Insurance'],
    },
    {
      value: 'other',
      label: 'Other',
      icon: <Receipt size={20} />,
      billers: [],
    },
  ];

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      // Set default due date to today
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
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
        setAccounts(data.filter(acc => acc.is_active && acc.account_type !== 'CREDIT'));
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    }
  };

  const selectedCategory = billCategories.find(cat => cat.value === billCategory);
  const selectedAccountData = accounts.find(acc => acc.id.toString() === selectedAccount);

  const validateAmount = (value: string): boolean => {
    const numAmount = parseFloat(value);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (selectedAccountData && numAmount > selectedAccountData.balance) {
      setError('Insufficient funds in selected account');
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

    if (!billerName) {
      setError('Please enter or select a biller name');
      return;
    }

    if (!accountNumber) {
      setError('Please enter your account number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Map bill types to category IDs
      const categoryMapping: Record<string, number> = {
        'utility': 4,  // Utilities
        'rent': 11,    // Rent
        'insurance': 12, // Insurance
        'loan': 13,    // Loan Payment
        'credit_card': 14, // Credit Card Payment
        'other_bills': 4, // Default to Utilities
        'other': 10    // Personal Care as default
      };

      const billData: BillPaymentRequest = {
        account_id: parseInt(selectedAccount),
        amount: parseFloat(amount),
        payee_name: billerName,
        payee_account_number: accountNumber,
        bill_type: billCategory as BillPaymentRequest['bill_type'],
        category_id: categoryMapping[billCategory] || 4, // Default to Utilities
        due_date: dueDate,
        description: description || `Bill payment to ${billerName}`,
      };

      await transfersService.payBill(billData);
      

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setSelectedAccount('');
        setAmount('');
        setBillCategory('utility');
        setBillerName('');
        setAccountNumber('');
        setDescription('');
        setSuccess(false);
        setSavePayee(false);
      }, 2000);
    } catch (err: unknown) {
      setError(handleApiError(err) || 'Bill payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2);
  };

  const getDaysUntilDue = () => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay Bill"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Category */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-3">
            Bill Category
          </label>
          <div className="grid grid-cols-3 gap-3">
            {billCategories.map((category) => (
              <motion.button
                key={category.value}
                type="button"
                onClick={() => {
                  setBillCategory(category.value as BillPaymentRequest['bill_type']);
                  setBillerName(''); // Reset biller when category changes
                }}
                className={`
                  p-3 rounded-lg border transition-all duration-200
                  ${billCategory === category.value 
                    ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]' 
                    : 'border-[var(--border-1)] hover:border-[var(--border-2)]'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`
                    ${billCategory === category.value 
                      ? 'text-[var(--primary-blue)]' 
                      : 'text-[var(--text-2)]'
                    }
                  `}>
                    {category.icon}
                  </div>
                  <span className="text-xs font-medium text-[var(--text-1)]">
                    {category.label}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Biller Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Biller Name
          </label>
          {selectedCategory && selectedCategory.billers.length > 0 ? (
            <div className="space-y-2">
              <Dropdown
                value={billerName}
                onChange={(value) => setBillerName(value)}
                placeholder="Select a biller..."
                items={[
                  ...selectedCategory.billers.map((biller) => ({
                    value: biller,
                    label: biller,
                  })),
                  { value: 'custom', label: 'Other (Enter manually)' },
                ]}
                fullWidth
              />
              {billerName === 'custom' && (
                <Input
                  type="text"
                  value=""
                  onChange={(e) => setBillerName(e.target.value)}
                  placeholder="Enter biller name"
                  required
                />
              )}
            </div>
          ) : (
            <Input
              type="text"
              value={billerName}
              onChange={(e) => setBillerName(e.target.value)}
              placeholder="Enter biller name"
              required
            />
          )}
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Account/Reference Number
          </label>
          <Input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Enter your account number"
            required
          />
        </div>

        {/* Payment From */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Pay From
          </label>
          <Dropdown
            items={accounts.map((account) => ({
              value: account.id.toString(),
              label: `${account.name} - Balance: $${account.balance.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}`
            }))}
            value={selectedAccount}
            onChange={setSelectedAccount}
            placeholder="Select account"
            fullWidth={true}
          />
        </div>

        {/* Amount and Due Date */}
        <div className="grid grid-cols-2 gap-4">
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
              icon={<span className="text-[var(--text-2)">$</span>}
              required
            />
          </div>
          <div>
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              minDate={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </div>

        {/* Due Date Warning */}
        {daysUntilDue !== null && (
          <div className={`
            p-3 rounded-lg flex items-center gap-2
            ${daysUntilDue < 0 
              ? 'bg-[rgba(var(--primary-red),0.1)] text-[var(--primary-red)]'
              : daysUntilDue <= 3
              ? 'bg-[rgba(var(--primary-amber),0.1)] text-[var(--primary-amber)]'
              : 'bg-[rgba(var(--primary-blue),0.1)] text-[var(--primary-blue)]'
            }
          `}>
            <AlertCircle size={16} />
            <span className="text-sm">
              {daysUntilDue < 0 
                ? `This bill is ${Math.abs(daysUntilDue)} days overdue`
                : daysUntilDue === 0
                ? 'This bill is due today'
                : `This bill is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
              }
            </span>
          </div>
        )}

        {/* Memo */}
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

        {/* Save Payee Option */}
        <Checkbox
          label="Save this payee for future payments"
          checked={savePayee}
          onChange={setSavePayee}
          analyticsId="save-payee-checkbox"
        />

        {/* Summary Card */}
        {selectedAccount && amount && parseFloat(amount) > 0 && (
          <Card variant="subtle" className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-2)]">Payment Amount</span>
                <span className="font-semibold text-[var(--text-1)]">
                  ${parseFloat(amount).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
              {selectedAccountData && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-2)]">Remaining Balance</span>
                  <span className="font-medium text-[var(--text-1)]">
                    ${(selectedAccountData.balance - parseFloat(amount)).toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
              )}
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
                Bill payment processed successfully!
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
            disabled={isLoading || !selectedAccount || !amount || !billerName || !accountNumber}
            icon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <Receipt size={18} />}
            className="flex-1"
          >
            {isLoading ? 'Processing...' : 'Pay Bill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BillPaymentModal;
