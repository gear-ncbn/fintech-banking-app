'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRightLeft, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  User
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Dropdown from '../ui/Dropdown';
import { transfersService, TransferRequest, type TransferLimits } from '@/lib/transfers';
import { accountsService, Account } from '@/lib/api';

import { eventBus, EVENTS } from '@/services/eventBus';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExternal?: boolean;
  preselectedSourceAccount?: number;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  isExternal = false,
  preselectedSourceAccount,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceAccount, setSourceAccount] = useState<string>('');
  const [destinationAccount, setDestinationAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [limits, setLimits] = useState<TransferLimits | null>(null);

  // External transfer fields
  const [recipientName, setRecipientName] = useState('');
  const [recipientBank, setRecipientBank] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      loadLimits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedSourceAccount) {
      setSourceAccount(preselectedSourceAccount.toString());
    }
  }, [preselectedSourceAccount]);

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

  const loadLimits = async () => {
    try {
      const data = await transfersService.getTransferLimits();
      setLimits(data);
    } catch {
    }
  };

  const validateAmount = (value: string): boolean => {
    const numAmount = parseFloat(value);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (limits && numAmount > limits.single_transaction_limit) {
      setError(`Amount exceeds single transaction limit of $${limits.single_transaction_limit.toLocaleString()}`);
      return false;
    }
    if (limits && numAmount > limits.remaining_daily) {
      setError(`Amount exceeds remaining daily limit of $${limits.remaining_daily.toLocaleString()}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceAccount) {
      setError('Please select a source account');
      return;
    }

    if (!isExternal && !destinationAccount) {
      setError('Please select a destination account');
      return;
    }

    if (isExternal && (!recipientName || !recipientAccountNumber)) {
      setError('Please fill in all recipient details');
      return;
    }

    if (!validateAmount(amount)) {
      return;
    }

    const sourceAcc = accounts.find(acc => acc.id === parseInt(sourceAccount));
    if (sourceAcc && parseFloat(amount) > sourceAcc.balance) {
      setError('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const transferData: TransferRequest = {
        source_account_id: parseInt(sourceAccount),
        destination_account_id: isExternal ? 0 : parseInt(destinationAccount), // 0 for external
        amount: parseFloat(amount),
        description: description || (isExternal ? `Transfer to ${recipientName}` : 'Internal transfer'),
        is_external: isExternal,
      };

      await transfersService.transfer(transferData);
      

      // Emit events to update balances across the app
      eventBus.emit(EVENTS.TRANSFER_COMPLETED, {
        sourceAccountId: parseInt(sourceAccount),
        destinationAccountId: isExternal ? null : parseInt(destinationAccount),
        amount: parseFloat(amount),
        isExternal
      });
      eventBus.emit(EVENTS.BALANCE_UPDATE);
      eventBus.emit(EVENTS.ACCOUNT_UPDATE);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setSourceAccount('');
        setDestinationAccount('');
        setAmount('');
        setDescription('');
        setRecipientName('');
        setRecipientBank('');
        setRecipientAccountNumber('');
        setRoutingNumber('');
        setSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Transfer failed. Please try again.');
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
      title={isExternal ? 'Send Money' : 'Transfer Between Accounts'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Account */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            From Account
          </label>
          <Dropdown
            items={accounts.map((account) => ({
              value: account.id.toString(),
              label: `${account.name} - $${account.balance.toLocaleString()} available`
            }))}
            value={sourceAccount}
            onChange={setSourceAccount}
            placeholder="Select source account"
            fullWidth={true}
          />
        </div>

        {/* Destination - Internal or External */}
        {!isExternal ? (
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              To Account
            </label>
            <Dropdown
              items={accounts
                .filter(acc => acc.id !== parseInt(sourceAccount))
                .map((account) => ({
                  value: account.id.toString(),
                  label: `${account.name} - ${account.account_type}`
                }))}
              value={destinationAccount}
              onChange={setDestinationAccount}
              placeholder="Select destination account"
              fullWidth={true}
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Recipient Name
              </label>
              <Input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="John Doe"
                icon={<User size={18} />}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Bank Name
                </label>
                <Input
                  type="text"
                  value={recipientBank}
                  onChange={(e) => setRecipientBank(e.target.value)}
                  placeholder="Chase Bank"
                  icon={<Building2 size={18} />}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Routing Number
                </label>
                <Input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Account Number
              </label>
              <Input
                type="text"
                value={recipientAccountNumber}
                onChange={(e) => setRecipientAccountNumber(e.target.value)}
                placeholder="1234567890"
                required
              />
            </div>
          </>
        )}

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
          {limits && (
            <p className="text-xs text-[var(--text-2)] mt-1">
              Daily limit: ${limits.remaining_daily.toLocaleString()} remaining
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Description (Optional)
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note..."
          />
        </div>

        {/* Summary Card */}
        {sourceAccount && amount && parseFloat(amount) > 0 && (
          <Card variant="subtle" className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-2)]">Transfer Amount</span>
                <span className="font-semibold text-[var(--text-1)]">
                  ${parseFloat(amount).toLocaleString()}
                </span>
              </div>
              {!isExternal && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-2)]">Fee</span>
                  <span className="text-[var(--primary-emerald)]">Free</span>
                </div>
              )}
              {isExternal && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-2)]">External Transfer Fee</span>
                  <span className="text-[var(--primary-amber)]">$3.00</span>
                </div>
              )}
              <div className="pt-2 border-t border-[var(--border-1)]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-1)]">Total</span>
                  <span className="font-semibold text-lg text-[var(--text-1)]">
                    ${(parseFloat(amount) + (isExternal ? 3 : 0)).toLocaleString()}
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
                Transfer completed successfully!
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
            disabled={isLoading || !sourceAccount || !amount}
            icon={isLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRightLeft size={18} />}
            className="flex-1"
          >
            {isLoading ? 'Processing...' : 'Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferModal;
