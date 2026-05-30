'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,

  Download,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Edit,
  Eye,
  Copy
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import InvoiceForm from '@/components/business/InvoiceForm';
import InvoiceDetail from '@/components/business/InvoiceDetail';
import { businessApi, Invoice, type CreateInvoiceRequest } from '@/lib/api/business';
import { useAuth } from '@/contexts/AuthContext';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due'>('date');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [_showBulkActions, _setShowBulkActions] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const filterAndSortInvoices = useCallback(() => {
    let filtered = [...invoices];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(invoice =>
        invoice.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client_email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'amount':
          return b.total_amount - a.total_amount;
        case 'due':
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        default:
          return 0;
      }
    });

    setFilteredInvoices(filtered);
  }, [invoices, searchQuery, filterStatus, sortBy]);

  useEffect(() => {
    filterAndSortInvoices();
  }, [filterAndSortInvoices]);

  const loadInvoices = async () => {
    try {
      const data = await businessApi.getInvoices();
      setInvoices(data);

      // Log data loaded event
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async (invoiceData: CreateInvoiceRequest) => {
    try {
      const newInvoice = await businessApi.createInvoice(invoiceData);
      setInvoices([newInvoice, ...invoices]);
      setShowCreateModal(false);
      
    } catch {
      
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
    
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { color: 'text-[var(--text-2)]', bg: 'bg-[var(--text-2)]/10', icon: Edit },
      pending: { color: 'text-[var(--primary-amber)]', bg: 'bg-[var(--primary-amber)]/10', icon: Clock },
      sent: { color: 'text-[var(--primary-blue)]', bg: 'bg-[var(--primary-blue)]/10', icon: Send },
      paid: { color: 'text-[var(--primary-emerald)]', bg: 'bg-[var(--primary-emerald)]/10', icon: CheckCircle },
      overdue: { color: 'text-[var(--primary-red)]', bg: 'bg-[var(--primary-red)]/10', icon: AlertCircle },
      cancelled: { color: 'text-[var(--text-2)]', bg: 'bg-[var(--text-2)]/10', icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // Calculate statistics
  const stats = {
    total: invoices.length,
    totalValue: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    paid: invoices.filter(inv => inv.status === 'paid').length,
    paidValue: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0),
    pending: invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent').length,
    pendingValue: invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent').reduce((sum, inv) => sum + inv.total_amount, 0),
    overdue: invoices.filter(inv => inv.status === 'overdue').length,
    overdueValue: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total_amount, 0),
    cancelled: invoices.filter(inv => inv.status === 'cancelled').length,
    cancelledValue: invoices.filter(inv => inv.status === 'cancelled').reduce((sum, inv) => sum + inv.total_amount, 0),
  };

  const statuses = ['all', 'draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'];

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading invoices...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-1)]">Invoices</h1>
            <p className="text-[var(--text-2)] mt-2">
              Create and manage your business invoices
            </p>
          </div>
          
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              setShowCreateModal(true);
            }}
            className="mt-4 md:mt-0"
          >
            Create Invoice
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-4 ${stats.cancelled > 0 ? 'xl:grid-cols-5' : ''} gap-4 mb-8`}>
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Invoices</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">{stats.total}</p>
                <p className="text-sm text-[var(--text-2)] mt-1">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Paid</p>
                <p className="text-2xl font-bold text-[var(--primary-emerald)]">{stats.paid}</p>
                <p className="text-sm text-[var(--text-2)] mt-1">
                  {formatCurrency(stats.paidValue)}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Pending</p>
                <p className="text-2xl font-bold text-[var(--primary-amber)]">{stats.pending}</p>
                <p className="text-sm text-[var(--text-2)] mt-1">
                  {formatCurrency(stats.pendingValue)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[var(--primary-amber)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Overdue</p>
                <p className="text-2xl font-bold text-[var(--primary-red)]">{stats.overdue}</p>
                <p className="text-sm text-[var(--text-2)] mt-1">
                  {formatCurrency(stats.overdueValue)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-[var(--primary-red)] opacity-20" />
            </div>
          </Card>

          {stats.cancelled > 0 && (
            <Card variant="default" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-2)]">Cancelled</p>
                  <p className="text-2xl font-bold text-[var(--text-2)]">{stats.cancelled}</p>
                  <p className="text-sm text-[var(--text-2)] mt-1">
                    {formatCurrency(stats.cancelledValue)}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-[var(--text-2)] opacity-20" />
              </div>
            </Card>
          )}
        </div>

        {/* Filters and Search */}
        <Card variant="default" className="mb-8">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setSearchQuery(query);
                  }}
                  icon={<Search size={18} />}
                />
              </div>
              
              <div className="flex gap-2">
                <Dropdown
                  items={statuses.map(status => ({ 
                    value: status, 
                    label: status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1) 
                  }))}
                  value={filterStatus}
                  onChange={(value) => {
                    setFilterStatus(value);
                  }}
                  placeholder="Status"
                />
                
                <Dropdown
                  items={[
                    { value: 'date', label: 'Sort by Date' },
                    { value: 'amount', label: 'Sort by Amount' },
                    { value: 'due', label: 'Sort by Due Date' },
                  ]}
                  value={sortBy}
                  onChange={(value) => {
                    const newSort = value as 'date' | 'amount' | 'due';
                    setSortBy(newSort);
                  }}
                  placeholder="Sort by"
                />
                
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={16} />}
                  onClick={() => {
                    // Generate CSV export
                    const csvContent = [
                      ['Invoice #', 'Client', 'Email', 'Issue Date', 'Due Date', 'Amount', 'Status', 'Amount Paid'],
                      ...filteredInvoices.map(inv => [
                        inv.invoice_number,
                        inv.client_name,
                        inv.client_email,
                        new Date(inv.issue_date).toLocaleDateString(),
                        new Date(inv.due_date).toLocaleDateString(),
                        inv.total_amount.toFixed(2),
                        inv.status,
                        inv.amount_paid.toFixed(2)
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Bulk Actions */}
        {selectedInvoices.size > 0 && (
          <Card variant="default" className="mb-4">
            <div className="p-4 flex items-center justify-between">
              <p className="text-sm text-[var(--text-2)]">
                {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const selectedDrafts = Array.from(selectedInvoices).filter(id => {
                      const inv = invoices.find(i => i.id === id);
                      return inv?.status === 'draft';
                    });
                    
                    if (selectedDrafts.length > 0) {
                      
                      for (const id of selectedDrafts) {
                        try {
                          await businessApi.sendInvoice(id);
                        } catch {
                        }
                      }
                      await loadInvoices();
                      setSelectedInvoices(new Set());
                    }
                  }}
                >
                  Send Selected Drafts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvoices(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Invoices List */}
        <Card variant="default">
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
                <p className="text-[var(--text-2)]">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'No invoices found matching your criteria' 
                    : 'No invoices yet'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={() => {
                      setShowCreateModal(true);
                    }}
                    className="mt-4"
                  >
                    Create Your First Invoice
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-1)]">
                    <th className="w-12 p-4">
                      <input
                        type="checkbox"
                        className="rounded border-[var(--border-1)]"
                        checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoices.has(inv.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
                          } else {
                            setSelectedInvoices(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Invoice #</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Client</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Issue Date</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Due Date</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--text-2)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.02)] transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          className="rounded border-[var(--border-1)]"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedInvoices);
                            if (e.target.checked) {
                              newSelected.add(invoice.id);
                            } else {
                              newSelected.delete(invoice.id);
                            }
                            setSelectedInvoices(newSelected);
                          }}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-1)]">{invoice.invoice_number}</div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-[var(--text-1)]">{invoice.client_name}</div>
                          <div className="text-sm text-[var(--text-2)]">{invoice.client_email}</div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-[var(--text-2)]">
                        {new Date(invoice.issue_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-[var(--text-2)]">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-1)]">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        {invoice.amount_paid > 0 && (
                          <div className="text-sm text-[var(--primary-emerald)]">
                            Paid: {formatCurrency(invoice.amount_paid)}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye size={16} />}
                            onClick={() => handleViewInvoice(invoice)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Copy size={16} />}
                            onClick={async () => {
                              try {
                                await businessApi.duplicateInvoice(invoice.id);
                                await loadInvoices();
                              } catch {
                              }
                            }}
                          />
                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Send size={16} />}
                              onClick={async () => {
                                try {
                                  await businessApi.sendInvoice(invoice.id);
                                  await loadInvoices();
                                } catch {
                                }
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Invoice"
        size="xl"
      >
        <InvoiceForm onSubmit={handleCreateInvoice} onCancel={() => setShowCreateModal(false)} />
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Invoice Details"
        size="xl"
      >
        {selectedInvoice && (
          <InvoiceDetail 
            invoice={selectedInvoice} 
            onClose={() => setShowDetailModal(false)}
            onUpdate={loadInvoices}
          />
        )}
      </Modal>
    </div>
  );
}
