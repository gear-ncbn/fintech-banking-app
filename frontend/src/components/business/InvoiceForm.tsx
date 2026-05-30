import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  DollarSign,
  Percent,
  FileText,
  Mail,
  MapPin,
  Hash
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import { CreateInvoiceRequest, type BusinessAccount } from '@/lib/api/business';
import { businessApi } from '@/lib/api/business';

interface InvoiceFormProps {
  onSubmit: (data: CreateInvoiceRequest) => void;
  onCancel: () => void;
  initialData?: Partial<CreateInvoiceRequest>;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percentage: number;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    invoice_number: initialData?.invoice_number || '',
    client_name: initialData?.client_name || '',
    client_email: initialData?.client_email || '',
    client_address: initialData?.client_address || '',
    issue_date: initialData?.issue_date || new Date().toISOString().split('T')[0],
    due_date: initialData?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: initialData?.payment_terms || 'net_30' as const,
    notes: initialData?.notes || '',
    tax_rate: initialData?.tax_rate || 0,
    discount_percentage: initialData?.discount_percentage || 0,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.line_items?.map((item, index) => ({
      id: `item-${index}`,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate || 0,
      discount_percentage: item.discount_percentage || 0,
    })) || [
      {
        id: 'item-1',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        discount_percentage: 0,
      },
    ]
  );

  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [selectedBusinessAccountId, setSelectedBusinessAccountId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBusinessAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusinessAccounts = async () => {
    try {
      const accounts = await businessApi.getBusinessAccounts();
      setBusinessAccounts(accounts);
      if (accounts.length > 0 && !selectedBusinessAccountId) {
        setSelectedBusinessAccountId(accounts[0].id);
      }
    } catch {
    }
  };

  const paymentTermsOptions = [
    { value: 'due_on_receipt', label: 'Due on Receipt' },
    { value: 'net_15', label: 'Net 15' },
    { value: 'net_30', label: 'Net 30' },
    { value: 'net_45', label: 'Net 45' },
    { value: 'net_60', label: 'Net 60' },
  ];

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `item-${Date.now()}`,
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        discount_percentage: 0,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: unknown) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateLineItemTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = subtotalAfterDiscount * (item.tax_rate / 100);
    return subtotalAfterDiscount + taxAmount;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    lineItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount_percentage / 100);
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount;
      const itemTax = itemSubtotalAfterDiscount * (item.tax_rate / 100);
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });

    // Apply invoice-level discount
    const invoiceDiscount = (subtotal - totalDiscount) * (formData.discount_percentage / 100);
    totalDiscount += invoiceDiscount;

    // Apply invoice-level tax
    const taxableAmount = subtotal - totalDiscount;
    const invoiceTax = taxableAmount * (formData.tax_rate / 100);
    totalTax += invoiceTax;

    const total = subtotal - totalDiscount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total,
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name) newErrors.client_name = 'Client name is required';
    if (!formData.client_email) newErrors.client_email = 'Client email is required';
    if (!formData.issue_date) newErrors.issue_date = 'Issue date is required';
    if (!formData.due_date) newErrors.due_date = 'Due date is required';
    
    const hasValidLineItems = lineItems.some(item => 
      item.description && item.quantity > 0 && item.unit_price > 0
    );
    
    if (!hasValidLineItems) {
      newErrors.line_items = 'At least one valid line item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const validLineItems = lineItems.filter(item => 
      item.description && item.quantity > 0 && item.unit_price > 0
    );

    const invoiceData: CreateInvoiceRequest = {
      ...formData,
      line_items: validLineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || undefined,
        discount_percentage: item.discount_percentage || undefined,
      })),
      business_account_id: selectedBusinessAccountId || undefined,
    };

    onSubmit(invoiceData);
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Account Selection */}
      {businessAccounts.length > 0 && (
        <Card variant="subtle" className="p-4">
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Business Account
          </label>
          <Dropdown
            items={businessAccounts.map(acc => ({
              value: acc.id.toString(),
              label: `${acc.business_name} - ${acc.account_type}`,
            }))}
            value={selectedBusinessAccountId?.toString() || ''}
            onChange={(value) => setSelectedBusinessAccountId(parseInt(value))}
            placeholder="Select business account"
          />
        </Card>
      )}

      {/* Client Information */}
      <Card variant="subtle" className="p-4">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Client Name <span className="text-[var(--primary-red)]">*</span>
            </label>
            <Input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="Enter client name"
              error={errors.client_name}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Client Email <span className="text-[var(--primary-red)]">*</span>
            </label>
            <Input
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
              placeholder="client@example.com"
              icon={<Mail size={18} />}
              error={errors.client_email}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Client Address
            </label>
            <Input
              type="text"
              value={formData.client_address}
              onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
              placeholder="123 Main St, City, State ZIP"
              icon={<MapPin size={18} />}
            />
          </div>
        </div>
      </Card>

      {/* Invoice Details */}
      <Card variant="subtle" className="p-4">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Invoice Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Invoice Number
            </label>
            <Input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              placeholder="Auto-generated"
              icon={<Hash size={18} />}
            />
          </div>
          
          <div>
            <DatePicker
              label="Issue Date"
              value={formData.issue_date}
              onChange={(date) => setFormData({ ...formData, issue_date: date })}
              required
              placeholder="Select issue date"
            />
            {errors.issue_date && (
              <p className="mt-1 text-sm text-[var(--primary-red)]">{errors.issue_date}</p>
            )}
          </div>
          
          <div>
            <DatePicker
              label="Due Date"
              value={formData.due_date}
              onChange={(date) => setFormData({ ...formData, due_date: date })}
              required
              placeholder="Select due date"
              minDate={formData.issue_date}
            />
            {errors.due_date && (
              <p className="mt-1 text-sm text-[var(--primary-red)]">{errors.due_date}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Payment Terms
            </label>
            <Dropdown
              items={paymentTermsOptions}
              value={formData.payment_terms}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(value) => setFormData({ ...formData, payment_terms: value as any })}
              placeholder="Select payment terms"
            />
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card variant="subtle" className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-1)]">Line Items</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={addLineItem}
          >
            Add Item
          </Button>
        </div>
        
        {errors.line_items && (
          <p className="text-sm text-[var(--primary-red)] mb-4">{errors.line_items}</p>
        )}
        
        <div className="space-y-4">
          <AnimatePresence>
            {lineItems.map((item, _index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="border border-[var(--border-1)] rounded-lg p-4 relative"
              >
                {/* First Row: Description, Quantity, Unit Price */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                  <div className="md:col-span-6">
                    <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                      Description
                    </label>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                      Unit Price
                    </label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      icon={<DollarSign size={16} />}
                    />
                  </div>
                </div>

                {/* Second Row: Tax %, Discount % */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                      Tax Rate (%)
                    </label>
                    <Input
                      type="number"
                      value={item.tax_rate}
                      onChange={(e) => updateLineItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      icon={<Percent size={16} />}
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                      Discount (%)
                    </label>
                    <Input
                      type="number"
                      value={item.discount_percentage}
                      onChange={(e) => updateLineItem(item.id, 'discount_percentage', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      icon={<Percent size={16} />}
                    />
                  </div>

                  {/* Total with better styling - aligned to the right */}
                  <div className="md:col-span-6 flex items-end justify-end">
                    <div className="text-right">
                      <div className="text-sm text-[var(--text-2)] mb-1">Line Total</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-[var(--text-1)]">
                          ${calculateLineItemTotal(item).toFixed(2)}
                        </div>
                        {lineItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={() => removeLineItem(item.id)}
                            className="ml-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>

      {/* Invoice-level Adjustments */}
      <Card variant="subtle" className="p-4">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Invoice Adjustments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Invoice Tax Rate (%)
            </label>
            <Input
              type="number"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
              step="0.01"
              icon={<Percent size={16} />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2 min-h-[1.5rem]">
              Invoice Discount (%)
            </label>
            <Input
              type="number"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
              step="0.01"
              icon={<Percent size={16} />}
            />
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card variant="subtle" className="p-4">
        <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes or payment instructions..."
          className="w-full px-3 py-2 bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] rounded-lg text-[var(--text-1)] placeholder-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent resize-none"
          rows={4}
        />
      </Card>

      {/* Totals Summary */}
      <Card variant="default" className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-2)]">Subtotal</span>
            <span className="text-[var(--text-1)]">${totals.subtotal.toFixed(2)}</span>
          </div>
          {totals.totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-2)]">Discount</span>
              <span className="text-[var(--primary-emerald)]">-${totals.totalDiscount.toFixed(2)}</span>
            </div>
          )}
          {totals.totalTax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-2)]">Tax</span>
              <span className="text-[var(--text-1)]">${totals.totalTax.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-[var(--border-1)] pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-[var(--text-1)]">Total</span>
              <span className="text-xl font-bold text-[var(--text-1)]">${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={<FileText size={18} />}
        >
          Create Invoice
        </Button>
      </div>
    </form>
  );
};

export default InvoiceForm;