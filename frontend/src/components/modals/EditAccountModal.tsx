'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { accountsService, AccountUpdate } from '@/lib/api/accounts';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: {
    id: string;
    name: string;
    type: string;
    accountNumber?: string;
    institutionName?: string;
    creditLimit?: number;
    interestRate?: number;
    isActive?: boolean;
  };
  onAccountUpdated?: () => void;
  onAccountDeleted?: () => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onAccountUpdated,
  onAccountDeleted,
}) => {
  const [accountName, setAccountName] = useState(account.name);
  const [institutionName, setInstitutionName] = useState(account.institutionName || '');
  const [creditLimit, setCreditLimit] = useState(account.creditLimit?.toString() || '');
  const [interestRate, setInterestRate] = useState(account.interestRate?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form when account changes
  useEffect(() => {
    setAccountName(account.name);
    setInstitutionName(account.institutionName || '');
    setCreditLimit(account.creditLimit?.toString() || '');
    setInterestRate(account.interestRate?.toString() || '');
    setError(null);
    setSuccess(false);
    setShowDeleteConfirm(false);
  }, [account]);

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setShowDeleteConfirm(false);
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

      const updateData: AccountUpdate = {
        name: accountName.trim(),
        institution_name: institutionName.trim() || undefined,
        credit_limit: creditLimit ? parseFloat(creditLimit) : undefined,
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
      };

      await accountsService.updateAccount(parseInt(account.id), updateData);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onAccountUpdated?.();
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await accountsService.deleteAccount(parseInt(account.id));
      handleClose();
      onAccountDeleted?.();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const showCreditFields = account.type === 'credit' || account.type === 'loan';
  const showInterestFields = account.type === 'savings' || account.type === 'investment' || account.type === 'loan';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Account Settings"
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
              Account Updated Successfully!
            </h3>
            <p className="text-[var(--text-2)]">
              Your changes have been saved.
            </p>
          </motion.div>
        ) : showDeleteConfirm ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-4"
          >
            <Card variant="error" className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-[var(--primary-red)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--text-1)] mb-2">
                    Delete Account?
                  </h3>
                  <p className="text-[var(--text-2)] mb-1">
                    Are you sure you want to delete &quot;{account.name}&quot;?
                  </p>
                  <p className="text-sm text-[var(--text-2)]">
                    This action cannot be undone. The account must have a zero balance to be deleted.
                  </p>
                </div>
              </div>
            </Card>

            {error && (
              <Card variant="error" className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--primary-red)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-1)]">
                      Error
                    </p>
                    <p className="text-sm text-[var(--text-2)] mt-1">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} className="mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {error && (
              <Card variant="error" className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--primary-red)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-1)]">
                      Error
                    </p>
                    <p className="text-sm text-[var(--text-2)] mt-1">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            <Input
              label="Account Name"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Main Checking"
              required
            />

            <Input
              label="Bank/Institution Name"
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g., Chase Bank"
            />

            {showCreditFields && (
              <Input
                label="Credit Limit"
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            )}

            {showInterestFields && (
              <Input
                label="Interest Rate (%)"
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            )}
            <div className="border-t border-[var(--border-1)] pt-4">
              <h3 className="text-sm font-medium text-[var(--text-1)] mb-3">
                Danger Zone
              </h3>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={16} />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </Button>
              <p className="text-xs text-[var(--text-2)] mt-2">
                Account must have zero balance to be deleted
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isLoading || !accountName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default EditAccountModal;
