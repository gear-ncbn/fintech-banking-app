'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Percent,
  Hash,
  Plus,
  Calculator,
  X,
  AlertCircle
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { p2pApi, P2PContact } from '@/lib/api/p2p';
import { Account } from '@/lib/api/accounts';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  contacts: P2PContact[];
  onSuccess?: () => void;
}

interface Participant {
  id: string;
  name: string;
  amount?: number;
  percentage?: number;
  isPayer: boolean;
}

export default function SplitPaymentModal({
  isOpen,
  onClose,
  accounts,
  contacts,
  onSuccess
}: SplitPaymentModalProps) {
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'amount'>('equal');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const handleAddParticipant = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || selectedContacts.includes(contactId)) return;

    const newParticipant: Participant = {
      id: contactId,
      name: contact.name,
      isPayer: false
    };

    setParticipants([...participants, newParticipant]);
    setSelectedContacts([...selectedContacts, contactId]);
    
    // Recalculate splits
    recalculateSplits([...participants, newParticipant]);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
    setSelectedContacts(selectedContacts.filter(id => id !== participantId));
    
    // Recalculate splits
    recalculateSplits(participants.filter(p => p.id !== participantId));
  };

  const recalculateSplits = (currentParticipants: Participant[]) => {
    if (!totalAmount || currentParticipants.length === 0) return;

    const total = parseFloat(totalAmount);
    
    if (splitType === 'equal') {
      // Equal split including the user
      const splitAmount = total / (currentParticipants.length + 1);
      setParticipants(currentParticipants.map(p => ({
        ...p,
        amount: Math.round(splitAmount * 100) / 100,
        percentage: undefined
      })));
    }
  };

  const handleAmountChange = (participantId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, amount } : p
    ));
  };

  const handlePercentageChange = (participantId: string, value: string) => {
    const percentage = parseFloat(value) || 0;
    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, percentage } : p
    ));
  };

  const validateSplit = () => {
    const errors: Record<string, string> = {};
    const total = parseFloat(totalAmount);

    if (!totalAmount || total <= 0) {
      errors.total = 'Please enter a valid amount';
    }

    if (participants.length === 0) {
      errors.participants = 'Please add at least one participant';
    }

    if (!description.trim()) {
      errors.description = 'Please enter a description';
    }

    if (splitType === 'percentage') {
      const totalPercentage = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (totalPercentage > 100) {
        errors.percentage = 'Total percentage cannot exceed 100%';
      }
    } else if (splitType === 'amount') {
      const totalAssigned = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
      if (totalAssigned > total) {
        errors.amount = 'Total assigned amount exceeds bill amount';
      }
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateSplit()) return;

    setIsSubmitting(true);
    try {
      const splitDetails: Record<string, number> = {};
      
      if (splitType === 'percentage') {
        participants.forEach(p => {
          splitDetails[p.id] = p.percentage || 0;
        });
      } else if (splitType === 'amount') {
        participants.forEach(p => {
          splitDetails[p.id] = p.amount || 0;
        });
      }

      await p2pApi.createSplitPayment({
        total_amount: parseFloat(totalAmount),
        participants: participants.map(p => p.id),
        split_type: splitType,
        split_details: splitType !== 'equal' ? splitDetails : undefined,
        description: description,
        source_account_id: selectedAccount
      });

      onSuccess?.();
      handleClose();
    } catch {
      setErrors({ submit: 'Failed to create split payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTotalAmount('');
    setDescription('');
    setSplitType('equal');
    setParticipants([]);
    setSelectedContacts([]);
    setErrors({});
    onClose();
  };

  const calculateUserShare = () => {
    const total = parseFloat(totalAmount) || 0;
    
    if (splitType === 'equal') {
      return total / (participants.length + 1);
    } else if (splitType === 'percentage') {
      const totalPercentage = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
      return (total * (100 - totalPercentage)) / 100;
    } else {
      const totalAssigned = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
      return total - totalAssigned;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Split Payment"
      size="lg"
    >
      <div className="space-y-6">
        {/* Total Amount */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Total Amount
          </label>
          <Input
            type="number"
            value={totalAmount}
            onChange={(e) => {
              setTotalAmount(e.target.value);
              recalculateSplits(participants);
            }}
            placeholder="0.00"
            icon={<DollarSign size={18} />}
            size="lg"
            error={errors.total}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Description
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this split for?"
            error={errors.description}
          />
        </div>

        {/* Split Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Split Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                setSplitType('equal');
                recalculateSplits(participants);
              }}
              className={`
                p-3 rounded-lg border transition-all
                ${splitType === 'equal'
                  ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]'
                  : 'border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
                }
              `}
            >
              <Users className="w-5 h-5 mx-auto mb-1 text-[var(--primary-blue)]" />
              <p className="text-sm font-medium text-[var(--text-1)]">Equal</p>
            </button>

            <button
              onClick={() => setSplitType('percentage')}
              className={`
                p-3 rounded-lg border transition-all
                ${splitType === 'percentage'
                  ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]'
                  : 'border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
                }
              `}
            >
              <Percent className="w-5 h-5 mx-auto mb-1 text-[var(--primary-blue)]" />
              <p className="text-sm font-medium text-[var(--text-1)]">Percentage</p>
            </button>

            <button
              onClick={() => setSplitType('amount')}
              className={`
                p-3 rounded-lg border transition-all
                ${splitType === 'amount'
                  ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]'
                  : 'border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
                }
              `}
            >
              <Hash className="w-5 h-5 mx-auto mb-1 text-[var(--primary-blue)]" />
              <p className="text-sm font-medium text-[var(--text-1)]">Amount</p>
            </button>
          </div>
        </div>

        {/* Add Participants */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Add Participants
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {contacts
              .filter(c => !selectedContacts.includes(c.id))
              .map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleAddParticipant(contact.id)}
                  className="w-full p-2 rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white text-sm font-medium">
                      {contact.name.charAt(0)}
                    </div>
                    <span className="text-sm text-[var(--text-1)]">{contact.name}</span>
                  </div>
                  <Plus className="w-4 h-4 text-[var(--text-2)]" />
                </button>
              ))}
          </div>
          {errors.participants && (
            <p className="text-sm text-[var(--primary-red)] mt-1">{errors.participants}</p>
          )}
        </div>

        {/* Participants List */}
        {participants.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Split Details
            </label>
            <div className="space-y-2">
              {/* User's share */}
              <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary-emerald)] to-[var(--primary-blue)] flex items-center justify-center text-white text-sm font-medium">
                      You
                    </div>
                    <span className="text-sm font-medium text-[var(--text-1)]">Your Share</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-1)]">
                    ${calculateUserShare().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Other participants */}
              {participants.map(participant => (
                <div key={participant.id} className="p-3 rounded-lg border border-[var(--border-1)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white text-sm font-medium">
                        {participant.name.charAt(0)}
                      </div>
                      <span className="text-sm text-[var(--text-1)]">{participant.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {splitType === 'equal' && (
                        <span className="text-sm font-medium text-[var(--text-1)]">
                          ${participant.amount?.toFixed(2)}
                        </span>
                      )}
                      
                      {splitType === 'percentage' && (
                        <Input
                          type="number"
                          value={participant.percentage || ''}
                          onChange={(e) => handlePercentageChange(participant.id, e.target.value)}
                          placeholder="0"
                          className="w-20"
                          suffix="%"
                        />
                      )}
                      
                      {splitType === 'amount' && (
                        <Input
                          type="number"
                          value={participant.amount || ''}
                          onChange={(e) => handleAmountChange(participant.id, e.target.value)}
                          placeholder="0.00"
                          className="w-24"
                          prefix="$"
                        />
                      )}
                      
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="p-1 rounded hover:bg-[rgba(var(--glass-rgb),0.1)]"
                      >
                        <X className="w-4 h-4 text-[var(--text-2)]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {errors.percentage && (
              <p className="text-sm text-[var(--primary-red)] mt-2">{errors.percentage}</p>
            )}
            {errors.amount && (
              <p className="text-sm text-[var(--primary-red)] mt-2">{errors.amount}</p>
            )}
          </div>
        )}

        {/* Account Selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Pay From Account
          </label>
          <Dropdown
            value={selectedAccount}
            onChange={(value) => setSelectedAccount(value)}
            items={accounts.map(account => ({
              value: account.id.toString(),
              label: `${account.name} - $${account.balance.toFixed(2)}`
            }))}
            placeholder="Select an account"
            fullWidth
          />
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 rounded-lg bg-[rgba(var(--primary-red),0.1)] border border-[var(--primary-red)]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--primary-red)]" />
              <p className="text-sm text-[var(--primary-red)]">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting || participants.length === 0}
            loading={isSubmitting}
            icon={<Calculator size={18} />}
          >
            Create Split
          </Button>
        </div>
      </div>
    </Modal>
  );
}