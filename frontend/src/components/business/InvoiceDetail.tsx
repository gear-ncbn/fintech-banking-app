import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Send,
  Printer,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Mail,
  MapPin
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Invoice, businessApi } from '@/lib/api/business';

interface InvoiceDetailProps {
  invoice: Invoice;
  onClose: () => void;
  onUpdate: () => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  onUpdate,
}) => {
  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { color: 'text-[var(--text-2)]', bg: 'bg-[var(--text-2)]/10', icon: Edit },
      pending: { color: 'text-[var(--primary-amber)]', bg: 'bg-[var(--primary-amber)]/10', icon: Clock },
      sent: { color: 'text-[var(--primary-blue)]', bg: 'bg-[var(--primary-blue)]/10', icon: Send },
      paid: { color: 'text-[var(--primary-emerald)]', bg: 'bg-[var(--primary-emerald)]/10', icon: CheckCircle },
      overdue: { color: 'text-[var(--primary-red)]', bg: 'bg-[var(--primary-red)]/10', icon: AlertCircle },
      cancelled: { color: 'text-[var(--text-2)]', bg: 'bg-[var(--text-2)]/10', icon: Clock },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color} ${config.bg}`}>
        <Icon className="w-4 h-4" />
        <span className="font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  };

  const handleMarkAsPaid = async () => {
    try {
      await businessApi.markInvoicePaid(invoice.id);
      onUpdate();
    } catch {
    }
  };

  const handleSendInvoice = async () => {
    try {
      await businessApi.sendInvoice(invoice.id);
      onUpdate();
    } catch {
    }
  };

  const handleDownloadPDF = () => {
    // For now, we'll just open a print preview
    // In production, this would generate and download a PDF
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        {getStatusBadge(invoice.status)}
        
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Send size={16} />}
              onClick={handleSendInvoice}
            >
              Send Invoice
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'pending') && (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCircle size={16} />}
              onClick={handleMarkAsPaid}
            >
              Mark as Paid
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={16} />}
            onClick={handleDownloadPDF}
          >
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Printer size={16} />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Header */}
      <Card variant="subtle" className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-1)] mb-2">
              Invoice #{invoice.invoice_number}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Calendar className="w-4 h-4" />
                <span>Issued: {new Date(invoice.issue_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Clock className="w-4 h-4" />
                <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-[var(--text-2)] mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-[var(--text-1)]">
              {formatCurrency(invoice.total_amount)}
            </p>
            {invoice.amount_paid > 0 && (
              <p className="text-sm text-[var(--primary-emerald)] mt-1">
                Paid: {formatCurrency(invoice.amount_paid)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Client Information */}
      <Card variant="subtle" className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Bill To</h3>
        <div className="space-y-2">
          <p className="font-medium text-[var(--text-1)]">{invoice.client_name}</p>
          {invoice.client_email && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Mail className="w-4 h-4" />
              <span>{invoice.client_email}</span>
            </div>
          )}
          {invoice.client_address && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <MapPin className="w-4 h-4" />
              <span>{invoice.client_address}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Line Items */}
      <Card variant="subtle" className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="text-left pb-3 text-sm font-medium text-[var(--text-2)]">Description</th>
                <th className="text-right pb-3 text-sm font-medium text-[var(--text-2)]">Qty</th>
                <th className="text-right pb-3 text-sm font-medium text-[var(--text-2)]">Unit Price</th>
                <th className="text-right pb-3 text-sm font-medium text-[var(--text-2)]">Discount</th>
                <th className="text-right pb-3 text-sm font-medium text-[var(--text-2)]">Tax</th>
                <th className="text-right pb-3 text-sm font-medium text-[var(--text-2)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-[var(--border-1)]"
                >
                  <td className="py-3 text-sm text-[var(--text-1)]">{item.description}</td>
                  <td className="py-3 text-sm text-[var(--text-1)] text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-[var(--text-1)] text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-1)] text-right">
                    {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '-'}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-1)] text-right">
                    {item.tax_amount > 0 ? formatCurrency(item.tax_amount) : '-'}
                  </td>
                  <td className="py-3 text-sm font-medium text-[var(--text-1)] text-right">
                    {formatCurrency(item.total)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Totals */}
        <div className="mt-6 pt-6 border-t border-[var(--border-1)]">
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-2)]">Subtotal</span>
              <span className="text-[var(--text-1)]">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-2)]">Discount</span>
                <span className="text-[var(--primary-emerald)]">
                  -{formatCurrency(invoice.discount_amount)}
                </span>
              </div>
            )}
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-2)]">Tax</span>
                <span className="text-[var(--text-1)]">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="border-t border-[var(--border-1)] pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-[var(--text-1)]">Total</span>
                <span className="text-xl font-bold text-[var(--text-1)]">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Information */}
      <Card variant="subtle" className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--text-2)] mb-1">Payment Terms</p>
            <p className="font-medium text-[var(--text-1)]">
              {invoice.payment_terms.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-2)] mb-1">Status</p>
            <p className="font-medium text-[var(--text-1)]">
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </p>
          </div>
          {invoice.sent_at && (
            <div>
              <p className="text-sm text-[var(--text-2)] mb-1">Sent Date</p>
              <p className="font-medium text-[var(--text-1)]">
                {new Date(invoice.sent_at).toLocaleDateString()}
              </p>
            </div>
          )}
          {invoice.paid_at && (
            <div>
              <p className="text-sm text-[var(--text-2)] mb-1">Paid Date</p>
              <p className="font-medium text-[var(--text-1)]">
                {new Date(invoice.paid_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card variant="subtle" className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Notes</h3>
          <p className="text-sm text-[var(--text-2)] whitespace-pre-wrap">{invoice.notes}</p>
        </Card>
      )}

      {/* Timestamps */}
      <div className="text-center text-sm text-[var(--text-2)]">
        Created on {new Date(invoice.created_at).toLocaleString()}
      </div>
    </div>
  );
};

export default InvoiceDetail;