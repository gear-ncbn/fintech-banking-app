'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Hash,
  Lock
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { transactionsService } from '@/lib/api';
import { Transaction } from '@/lib/api/transactions';
import { format } from 'date-fns';

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransaction = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await transactionsService.getTransaction(Number(params.id));
      setTransaction(data);
    } catch {
      router.push('/transactions');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      loadTransaction();
    }
  }, [params.id, loadTransaction]);

  const handleDownloadReceipt = () => {
    // In a real app, this would generate a PDF
    window.print();
  };

  const handleShare = () => {
    // In a real app, this would open a share dialog
    if (navigator.share && transaction) {
      navigator.share({
        title: 'Transaction Receipt',
        text: `Transaction #${transaction.reference_number} - $${transaction.amount.toFixed(2)}`,
        url: window.location.href,
      });
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-[var(--primary-emerald)]" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-[var(--primary-red)]" />;
      default:
        return <Clock className="w-5 h-5 text-[var(--primary-amber)]" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-[var(--primary-emerald)]';
      case 'FAILED':
        return 'text-[var(--primary-red)]';
      default:
        return 'text-[var(--primary-amber)]';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card variant="prominent" className="p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-[rgba(var(--glass-rgb),0.2)] rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-[rgba(var(--glass-rgb),0.2)] rounded"></div>
                <div className="h-4 bg-[rgba(var(--glass-rgb),0.2)] rounded w-5/6"></div>
                <div className="h-4 bg-[rgba(var(--glass-rgb),0.2)] rounded w-4/6"></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => router.push('/transactions')}
          className="mb-6"
        >
          Back to Transactions
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="prominent" className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center"
              >
                <DollarSign className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-[var(--text-1)] mb-2">
                Transaction Receipt
              </h1>
              <div className="flex items-center justify-center gap-2">
                {getStatusIcon(transaction.status)}
                <span className={`font-medium ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center mb-8 pb-8 border-b border-[var(--border-1)]">
              <p className="text-4xl font-bold text-[var(--text-1)]">
                {transaction.transaction_type === 'CREDIT' ? '+' : '-'}
                ${(typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount)).toFixed(2)}
              </p>
              <p className="text-sm text-[var(--text-2)] mt-2">
                {transaction.description}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-[var(--border-1)]">
                <div className="flex items-center gap-2 text-[var(--text-2)]">
                  <Hash size={16} />
                  <span>Reference Number</span>
                </div>
                <span className="font-mono text-sm text-[var(--text-1)]">
                  {transaction.reference_number}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-[var(--border-1)]">
                <div className="flex items-center gap-2 text-[var(--text-2)]">
                  <Calendar size={16} />
                  <span>Date & Time</span>
                </div>
                <span className="text-sm text-[var(--text-1)]">
                  {format(new Date(transaction.transaction_date || transaction.created_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-[var(--border-1)]">
                <div className="flex items-center gap-2 text-[var(--text-2)]">
                  <CreditCard size={16} />
                  <span>Account</span>
                </div>
                <span className="text-sm text-[var(--text-1)]">
                  Account ending in ****{transaction.account_id.toString().slice(-4)}
                </span>
              </div>

              {transaction.merchant && (
                <div className="flex justify-between items-center py-3 border-b border-[var(--border-1)]">
                  <div className="flex items-center gap-2 text-[var(--text-2)]">
                    <User size={16} />
                    <span>Merchant</span>
                  </div>
                  <span className="text-sm text-[var(--text-1)]">
                    {transaction.merchant}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                fullWidth
                icon={<Download size={18} />}
                onClick={handleDownloadReceipt}
              >
                Download Receipt
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<Share2 size={18} />}
                onClick={handleShare}
              >
                Share
              </Button>
            </div>

            {/* Security Note */}
            <div className="mt-6 p-4 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]">
              <p className="text-xs text-[var(--text-2)] text-center flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> This transaction is encrypted and secure. Keep this receipt for your records.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
