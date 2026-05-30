import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X,
  Edit2,
  Save,
  Trash2,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Paperclip,
  Plus,
  Link,
  ExternalLink,
  AlertCircle,
  Download,
  Upload,
  Hash,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Gamepad2,
  HeartPulse,
  Plane,
  Briefcase,
  DollarSign,
  RefreshCw,
  Gift
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import Modal from '../ui/Modal';
import { UITransaction as Transaction } from '@/app/(authenticated)/transactions/page';
import { transactionsService, TransactionUpdate, Category } from '@/lib/api';
import { useAlert } from '@/contexts/AlertContext';

interface TransactionDetailProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  allTransactions?: Transaction[];
  categories?: Category[];
}

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transaction,
  onClose,
  onEdit,
  allTransactions = [],
  categories = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState(transaction);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string; size: string }[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<Transaction[]>([]);
  const { showError, showWarning } = useAlert();

  // Update editedTransaction when the transaction prop changes (only when transaction ID changes)
  useEffect(() => {
    setEditedTransaction(transaction);
    setIsEditing(false);
    setNewTag('');
    
    // Convert attachments data if available
    if (transaction.attachmentData && transaction.attachmentData.length > 0) {
      // Use actual attachment data from the transaction
      const attachmentList = transaction.attachmentData.map(att => ({
        name: att.file_name,
        type: att.file_type.replace('application/', ''),
        size: `${Math.round(att.file_size / 1024)} KB`
      }));
      setAttachments(attachmentList);
    } else {
      setAttachments([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction.id]); // Only depend on transaction ID to avoid infinite loops

  // Find related transactions in a separate effect
  useEffect(() => {
    if (allTransactions.length > 0 && transaction) {
      const related = allTransactions.filter(t => 
        t.id !== transaction.id && (
          // Same merchant
          (t.merchant === transaction.merchant && transaction.merchant !== 'Unknown Merchant') ||
          // Same category and similar amount (within 20%)
          (t.category === transaction.category && 
           Math.abs(t.amount - transaction.amount) / transaction.amount < 0.2) ||
          // Same tags
          (transaction.tags && t.tags && 
           transaction.tags.some(tag => t.tags?.includes(tag)))
        )
      ).slice(0, 3); // Limit to 3 related transactions
      
      setRelatedTransactions(related);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction.id, allTransactions.length]); // Simplified dependencies

  // Use categories from props or fall back to defaults
  const categoryNames = categories.length > 0 
    ? categories.map(c => c.name)
    : [
        'Shopping', 'Groceries', 'Dining', 'Transportation', 'Housing',
        'Utilities', 'Entertainment', 'Healthcare', 'Travel', 'Business',
        'Income', 'Transfer', 'Subscriptions', 'Gifts'
      ];

  const handleSave = async () => {
    try {
      // Find category ID from name
      const category = categories.find(c => c.name === editedTransaction.category);
      
      const updateData: TransactionUpdate = {
        description: editedTransaction.description,
        merchant: editedTransaction.merchant,
        notes: editedTransaction.notes,
        category_id: category?.id,
        tags: editedTransaction.tags,
        attachments: attachments
      };
      
      const updatedTransaction = await transactionsService.updateTransaction(parseInt(editedTransaction.id), updateData);
      
      // Update the local state with the response from the server
      const updatedUITransaction: Transaction = {
        ...editedTransaction,
        description: updatedTransaction.description || editedTransaction.description,
        merchant: updatedTransaction.merchant || editedTransaction.merchant,
        notes: updatedTransaction.notes || '',
        tags: updatedTransaction.tags || [],
        attachmentData: updatedTransaction.attachments || []
      };
      
      setEditedTransaction(updatedUITransaction);
      setIsEditing(false);
      
      // Call parent's onEdit to refresh the data - this will trigger a full reload
      onEdit(updatedUITransaction);
    } catch (error: unknown) {
      const e = error as { message?: string };
      showError(
        'Update Failed', 
        e.message || 'Failed to update transaction. Please try again.'
      );
    }
  };

  const handleDelete = async () => {
    try {
      await transactionsService.deleteTransaction(parseInt(transaction.id));
      
      
      setShowDeleteConfirm(false);
      onClose();
      
      // Call parent's onEdit to refresh the data
      onEdit(transaction);
    } catch (error: unknown) {
      setShowDeleteConfirm(false);
      const e = error as { message?: string };
      
      // Check if it's a specific error about pending status
      if (e.message?.includes('pending')) {
        showWarning(
          'Cannot Delete Transaction', 
          'Only pending transactions can be deleted. This transaction has already been completed.'
        );
      } else {
        showError(
          'Delete Failed', 
          e.message || 'Failed to delete transaction. Please try again.'
        );
      }
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setEditedTransaction({
        ...editedTransaction,
        tags: [...(editedTransaction.tags || []), newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTransaction({
      ...editedTransaction,
      tags: editedTransaction.tags?.filter(tag => tag !== tagToRemove) || [],
    });
  };

  const handleDownloadAttachment = (attachment: { name: string; type: string; size: string }) => {
    // Generate a simple PDF with mock content
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 24 Tf
50 700 Td
(${attachment.name}) Tj
0 -40 Td
/F1 16 Tf
(Transaction: ${editedTransaction.description}) Tj
0 -30 Td
(Amount: ${formatAmount(editedTransaction.amount, editedTransaction.type)}) Tj
0 -30 Td
(Date: ${new Date(editedTransaction.date).toLocaleDateString()}) Tj
0 -30 Td
(Merchant: ${editedTransaction.merchant}) Tj
0 -30 Td
(Category: ${editedTransaction.category}) Tj
0 -50 Td
/F1 12 Tf
(This is a sample receipt/document for demonstration purposes.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000248 00000 n
0000000336 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
636
%%EOF`;
    
    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  };

  const formatAmount = (amount: number, type: 'credit' | 'debit') => {
    const sign = type === 'credit' ? '+' : '';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Shopping': <ShoppingBag className="w-8 h-8" />,
      'Groceries': <ShoppingCart className="w-8 h-8" />,
      'Dining': <Utensils className="w-8 h-8" />,
      'Transportation': <Car className="w-8 h-8" />,
      'Housing': <Home className="w-8 h-8" />,
      'Utilities': <Zap className="w-8 h-8" />,
      'Entertainment': <Gamepad2 className="w-8 h-8" />,
      'Healthcare': <HeartPulse className="w-8 h-8" />,
      'Travel': <Plane className="w-8 h-8" />,
      'Business': <Briefcase className="w-8 h-8" />,
      'Income': <DollarSign className="w-8 h-8" />,
      'Transfer': <RefreshCw className="w-8 h-8" />,
      'Subscriptions': <Calendar className="w-8 h-8" />,
      'Gifts': <Gift className="w-8 h-8" />,
    };
    return iconMap[category] || <CreditCard className="w-8 h-8" />;
  };

  return (
    <>
      <Card variant="prominent" className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-1)]">
              Transaction Details
            </h3>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditedTransaction(transaction);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Save size={16} />}
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 size={16} />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<X size={16} />}
                    onClick={onClose}
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Amount and Status */}
          <div className="text-center py-4">
            <div className="flex justify-center mb-2">{getCategoryIcon(editedTransaction.category)}</div>
            <p className={`text-3xl font-bold ${
              editedTransaction.type === 'credit' 
                ? 'text-[var(--primary-emerald)]' 
                : 'text-[var(--text-1)]'
            }`}>
              {formatAmount(editedTransaction.amount, editedTransaction.type)}
            </p>
            {editedTransaction.status === 'pending' && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <AlertCircle className="w-4 h-4 text-[var(--primary-amber)]" />
                <span className="text-sm text-[var(--primary-amber)]">Pending</span>
              </div>
            )}
          </div>

          {/* Transaction Info */}
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1">
                Description
              </label>
              {isEditing ? (
                <Input
                  value={editedTransaction.description}
                  onChange={(e) => setEditedTransaction({
                    ...editedTransaction,
                    description: e.target.value
                  })}
                />
              ) : (
                <p className="text-[var(--text-1)]">{editedTransaction.description}</p>
              )}
            </div>

            {/* Merchant */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1">
                Merchant
              </label>
              {isEditing ? (
                <Input
                  value={editedTransaction.merchant}
                  onChange={(e) => setEditedTransaction({
                    ...editedTransaction,
                    merchant: e.target.value
                  })}
                />
              ) : (
                <p className="text-[var(--text-1)]">{editedTransaction.merchant}</p>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time
              </label>
              <p className="text-[var(--text-1)]">
                {new Date(editedTransaction.date).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1">
                Category
              </label>
              {isEditing ? (
                <Dropdown
                  items={categoryNames.map(cat => ({ value: cat, label: cat }))}
                  value={editedTransaction.category}
                  onChange={(value) => setEditedTransaction({
                    ...editedTransaction,
                    category: value
                  })}
                  placeholder="Select category"
                />
              ) : (
                <p className="text-[var(--text-1)]">
                  {editedTransaction.category}
                  {editedTransaction.subcategory && ` • ${editedTransaction.subcategory}`}
                </p>
              )}
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Account
              </label>
              <p className="text-[var(--text-1)]">{editedTransaction.account}</p>
            </div>

            {/* Location */}
            {editedTransaction.location && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <p className="text-[var(--text-1)] flex items-center gap-2">
                  {editedTransaction.location}
                  <ExternalLink className="w-4 h-4 text-[var(--primary-blue)] cursor-pointer" />
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </label>
              {isEditing ? (
                <textarea
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] resize-none"
                  rows={3}
                  value={editedTransaction.notes || ''}
                  onChange={(e) => setEditedTransaction({
                    ...editedTransaction,
                    notes: e.target.value
                  })}
                  placeholder="Add notes..."
                />
              ) : (
                <p className="text-[var(--text-1)]">
                  {editedTransaction.notes || 'No notes added'}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editedTransaction.tags?.map((tag, _index) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] text-sm text-[var(--text-1)]"
                  >
                    {tag}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-[var(--text-2)] hover:text-[var(--primary-red)]"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </motion.span>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    size="sm"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({attachments.length})
              </label>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)]"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[var(--primary-blue)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          {attachment.size}
                        </p>
                      </div>
                    </div>
                    {isEditing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X size={16} />}
                        onClick={() => {
                          setAttachments(attachments.filter((_, idx) => idx !== index));
                        }}
                      />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Download size={16} />}
                        onClick={() => handleDownloadAttachment(attachment)}
                      />
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload size={16} />}
                    fullWidth
                    onClick={() => {
                      // Mock file upload - in a real app, this would open a file picker
                      const mockFile = {
                        name: `document_${Date.now()}.pdf`,
                        type: 'pdf',
                        size: `${Math.floor(Math.random() * 900) + 100} KB`
                      };
                      setAttachments([...attachments, mockFile]);
                    }}
                  >
                    Add Attachment
                  </Button>
                )}
              </div>
            </div>

            {/* Related Transactions */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2 flex items-center gap-2">
                <Link className="w-4 h-4" />
                Related Transactions
              </label>
              {relatedTransactions.length > 0 ? (
                <div className="space-y-2">
                  {relatedTransactions.map((relTx) => (
                    <div
                      key={relTx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.2)] cursor-pointer transition-colors"
                      onClick={() => {
                        // In a real app, this would navigate to or update the selected transaction
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {relTx.description}
                        </p>
                        <p className="text-xs text-[var(--text-2)] mt-1">
                          {new Date(relTx.date).toLocaleDateString()} • {relTx.category}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${
                        relTx.type === 'credit' 
                          ? 'text-[var(--primary-emerald)]' 
                          : 'text-[var(--text-1)]'
                      }`}>
                        {formatAmount(relTx.amount, relTx.type)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] text-center">
                  <p className="text-sm text-[var(--text-2)]">
                    No related transactions found
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="pt-4 border-t border-[var(--border-1)]">
              <Button
                variant="secondary"
                fullWidth
                icon={<Trash2 size={18} />}
                onClick={() => {
                  if (transaction.status !== 'pending') {
                    showWarning(
                      'Cannot Delete Transaction', 
                      'Only pending transactions can be deleted. This transaction has already been completed.'
                    );
                  } else {
                    setShowDeleteConfirm(true);
                  }
                }}
                disabled={transaction.status !== 'pending'}
                className={transaction.status === 'pending' 
                  ? "text-[var(--primary-red)] hover:bg-[rgba(var(--primary-red),0.1)]"
                  : "opacity-50 cursor-not-allowed"
                }
              >
                Delete Transaction
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Transaction"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-1)]">
            Are you sure you want to delete this transaction?
          </p>
          <p className="text-sm text-[var(--text-2)]">
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleDelete}
              className="bg-[var(--primary-red)] hover:bg-[var(--primary-red)]/90"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TransactionDetail;
