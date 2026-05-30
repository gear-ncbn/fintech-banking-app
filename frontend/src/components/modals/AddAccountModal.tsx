'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  Wallet,
  PiggyBank,
  TrendingUp,
  Home,
  Users
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import UserSearchInput from '../ui/UserSearchInput';
import { accountsService, AccountCreate, JointAccountCreate } from '@/lib/api/accounts';
import { handleApiError } from '@/lib/api';
import { UserSearchResult } from '@/lib/api/users';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: () => void;
}

type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'LOAN';

interface AccountTypeOption {
  value: AccountType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
}) => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>('CHECKING');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [isJointAccount, setIsJointAccount] = useState(false);
  const [jointOwner, setJointOwner] = useState<UserSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const accountTypes: AccountTypeOption[] = [
    {
      value: 'CHECKING',
      label: 'Checking Account',
      icon: <Wallet size={24} />,
      description: 'For everyday transactions and payments',
    },
    {
      value: 'SAVINGS',
      label: 'Savings Account',
      icon: <PiggyBank size={24} />,
      description: 'Earn interest on your savings',
    },
    {
      value: 'CREDIT',
      label: 'Credit Card',
      icon: <CreditCard size={24} />,
      description: 'Credit line for purchases',
    },
    {
      value: 'INVESTMENT',
      label: 'Investment Account',
      icon: <TrendingUp size={24} />,
      description: 'For stocks, bonds, and investments',
    },
    {
      value: 'LOAN',
      label: 'Loan Account',
      icon: <Home size={24} />,
      description: 'Track loans and mortgages',
    },
  ];

  const resetForm = () => {
    setStep(1);
    setAccountType('CHECKING');
    setAccountName('');
    setAccountNumber('');
    setInstitutionName('');
    setInitialBalance('');
    setCreditLimit('');
    setInterestRate('');
    setIsJointAccount(false);
    setJointOwner(null);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate required fields
      if (!accountName.trim()) {
        setError('Account name is required');
        return;
      }

      const accountData: AccountCreate = {
        name: accountName.trim(),
        account_type: accountType,
        account_number: accountNumber.trim() || undefined,
        institution_name: institutionName.trim() || undefined,
        initial_balance: initialBalance ? parseFloat(initialBalance) : 0,
        credit_limit: creditLimit ? parseFloat(creditLimit) : undefined,
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
      };

      if (isJointAccount && jointOwner) {
        const jointAccountData: JointAccountCreate = {
          ...accountData,
          joint_owner_username: jointOwner.username,
        };
        
        await accountsService.createJointAccount(jointAccountData);
      } else if (isJointAccount && !jointOwner) {
        setError('Please select a joint owner for the account');
        return;
      } else {
        
        await accountsService.createAccount(accountData);
      }
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onAccountCreated?.();
      }, 1500);

    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--text-1)] mb-4">
        Select Account Type
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {accountTypes.map((type) => (
          <motion.button
            key={type.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setAccountType(type.value);
            }}
            className={`
              p-4 rounded-lg border transition-all text-left
              ${accountType === type.value
                ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue-rgb),0.1)]'
                : 'border-[var(--border-1)] hover:border-[var(--border-2)]'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                p-2 rounded-lg
                ${accountType === type.value
                  ? 'bg-[var(--primary-blue)] text-white'
                  : 'bg-[rgba(var(--glass-rgb),0.3)] text-[var(--text-2)]'
                }
              `}>
                {type.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-1)]">{type.label}</p>
                <p className="text-sm text-[var(--text-2)] mt-1">{type.description}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          onClick={() => setStep(2)}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--text-1)] mb-4">
        Account Details
      </h3>
      
      <Input
        label="Account Name"
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="e.g., Main Checking"
        required
      />

      <Input
        label="Account Number (Optional)"
        type="text"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="Last 4 digits"
      />

      <Input
        label="Bank/Institution Name (Optional)"
        type="text"
        value={institutionName}
        onChange={(e) => setInstitutionName(e.target.value)}
        placeholder="e.g., Chase Bank"
      />

      <Input
        label="Initial Balance"
        type="number"
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
        placeholder="0.00"
        step="0.01"
      />

      {(accountType === 'CREDIT' || accountType === 'LOAN') && (
        <Input
          label="Credit Limit"
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="0.00"
          step="0.01"
        />
      )}

      {(accountType === 'SAVINGS' || accountType === 'INVESTMENT' || accountType === 'LOAN') && (
        <Input
          label="Interest Rate (%)"
          type="number"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
          placeholder="0.00"
          step="0.01"
        />
      )}

      <div className="flex items-center gap-3 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
        <input
          type="checkbox"
          id="jointAccount"
          checked={isJointAccount}
          onChange={(e) => setIsJointAccount(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--border-2)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
        />
        <label htmlFor="jointAccount" className="flex items-center gap-2 cursor-pointer">
          <Users size={18} className="text-[var(--text-2)]" />
          <span className="text-sm text-[var(--text-1)]">Make this a joint account</span>
        </label>
      </div>

      {isJointAccount && (
        <UserSearchInput
          label="Joint Owner"
          placeholder="Search for a user to add as joint owner..."
          value={jointOwner}
          onChange={setJointOwner}
          required
        />
      )}

      <div className="flex justify-between mt-6">
        <Button
          variant="secondary"
          onClick={() => setStep(1)}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isLoading || !accountName.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Creating...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Account"
      size="lg"
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="py-12 text-center"
          >
            <CheckCircle className="w-16 h-16 text-[var(--primary-emerald)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-1)] mb-2">
              Account Created Successfully!
            </h3>
            <p className="text-[var(--text-2)]">
              Your new account has been added to your profile.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {error && (
              <Card variant="error" className="mb-4 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--primary-red)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-1)]">
                      Error Creating Account
                    </p>
                    <p className="text-sm text-[var(--text-2)] mt-1">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default AddAccountModal;
