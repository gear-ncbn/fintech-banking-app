import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  DollarSign,
  Calendar,
  Upload,
  Store,
  Car,
  CheckSquare,
  MapPin,
  Receipt as ReceiptIcon
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import { CreateBusinessExpenseRequest, type BusinessAccount } from '@/lib/api/business';
import { businessApi } from '@/lib/api/business';

interface ExpenseFormProps {
  onSubmit: (data: CreateBusinessExpenseRequest, receiptFile?: File) => void;
  onCancel: () => void;
  businessAccountId?: number;
}

const expenseCategories = [
  { value: 'office_supplies', label: 'Office Supplies', icon: '📦' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'meals_entertainment', label: 'Meals & Entertainment', icon: '🍽️' },
  { value: 'vehicle', label: 'Vehicle/Transportation', icon: '🚗' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'rent', label: 'Rent/Lease', icon: '🏢' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'equipment', label: 'Equipment', icon: '💻' },
  { value: 'professional_services', label: 'Professional Services', icon: '👔' },
  { value: 'advertising', label: 'Advertising/Marketing', icon: '📢' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSubmit,
  onCancel,
  businessAccountId,
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    vendor: '',
    tax_deductible: true,
    date: new Date().toISOString().split('T')[0],
  });

  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [selectedBusinessAccountId, setSelectedBusinessAccountId] = useState<number | null>(
    businessAccountId || null
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMileageExpense, setIsMileageExpense] = useState(false);
  const [mileageData, setMileageData] = useState({
    startLocation: '',
    endLocation: '',
    miles: '',
    rate: '0.655', // 2024 IRS standard mileage rate
  });

  useEffect(() => {
    if (!businessAccountId) {
      loadBusinessAccounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessAccountId]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const calculateMileageAmount = () => {
    const miles = parseFloat(mileageData.miles) || 0;
    const rate = parseFloat(mileageData.rate) || 0;
    return miles * rate;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isMileageExpense) {
      if (!mileageData.startLocation) newErrors.startLocation = 'Start location is required';
      if (!mileageData.endLocation) newErrors.endLocation = 'End location is required';
      if (!mileageData.miles || parseFloat(mileageData.miles) <= 0) {
        newErrors.miles = 'Valid mileage is required';
      }
    } else {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'Valid amount is required';
      }
    }

    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.vendor) newErrors.vendor = 'Vendor is required';
    if (!selectedBusinessAccountId && !businessAccountId) {
      newErrors.businessAccount = 'Business account is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    let finalAmount = parseFloat(formData.amount);
    let finalDescription = formData.description;
    let finalVendor = formData.vendor;

    if (isMileageExpense) {
      finalAmount = calculateMileageAmount();
      finalDescription = `Mileage: ${mileageData.startLocation} to ${mileageData.endLocation} (${mileageData.miles} miles @ $${mileageData.rate}/mile) - ${formData.description}`;
      finalVendor = 'Mileage Expense';
    }

    const expenseData: CreateBusinessExpenseRequest = {
      business_account_id: businessAccountId || selectedBusinessAccountId!,
      amount: finalAmount,
      category: formData.category,
      description: finalDescription,
      vendor: finalVendor,
      tax_deductible: formData.tax_deductible,
    };

    onSubmit(expenseData, receiptFile || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Account Selection */}
      {!businessAccountId && businessAccounts.length > 0 && (
        <Card variant="subtle" className="p-4">
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Business Account <span className="text-[var(--primary-red)]">*</span>
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
          {errors.businessAccount && (
            <p className="mt-1 text-sm text-[var(--primary-red)]">{errors.businessAccount}</p>
          )}
        </Card>
      )}

      {/* Expense Type Toggle */}
      <Card variant="subtle" className="p-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="expenseType"
              checked={!isMileageExpense}
              onChange={() => setIsMileageExpense(false)}
              className="text-[var(--primary-blue)]"
            />
            <span className="text-sm font-medium text-[var(--text-1)]">Regular Expense</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="expenseType"
              checked={isMileageExpense}
              onChange={() => setIsMileageExpense(true)}
              className="text-[var(--primary-blue)]"
            />
            <span className="text-sm font-medium text-[var(--text-1)]">Mileage Expense</span>
          </label>
        </div>
      </Card>

      {/* Expense Details */}
      <Card variant="subtle" className="p-4">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Expense Details</h3>
        
        {isMileageExpense ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Start Location <span className="text-[var(--primary-red)]">*</span>
                </label>
                <Input
                  type="text"
                  value={mileageData.startLocation}
                  onChange={(e) => setMileageData({ ...mileageData, startLocation: e.target.value })}
                  placeholder="123 Main St, City, State"
                  icon={<MapPin size={18} />}
                  error={errors.startLocation}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  End Location <span className="text-[var(--primary-red)]">*</span>
                </label>
                <Input
                  type="text"
                  value={mileageData.endLocation}
                  onChange={(e) => setMileageData({ ...mileageData, endLocation: e.target.value })}
                  placeholder="456 Oak Ave, City, State"
                  icon={<MapPin size={18} />}
                  error={errors.endLocation}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Miles <span className="text-[var(--primary-red)]">*</span>
                </label>
                <Input
                  type="number"
                  value={mileageData.miles}
                  onChange={(e) => setMileageData({ ...mileageData, miles: e.target.value })}
                  placeholder="0.0"
                  min="0"
                  step="0.1"
                  icon={<Car size={18} />}
                  error={errors.miles}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Rate per Mile
                </label>
                <Input
                  type="number"
                  value={mileageData.rate}
                  onChange={(e) => setMileageData({ ...mileageData, rate: e.target.value })}
                  placeholder="0.655"
                  min="0"
                  step="0.001"
                  icon={<DollarSign size={18} />}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Total Amount
                </label>
                <div className="text-2xl font-bold text-[var(--text-1)]">
                  ${calculateMileageAmount().toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Amount <span className="text-[var(--primary-red)]">*</span>
              </label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                icon={<DollarSign size={18} />}
                error={errors.amount}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Date
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                icon={<Calendar size={18} />}
              />
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Category <span className="text-[var(--primary-red)]">*</span>
            </label>
            <Dropdown
              items={expenseCategories}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              placeholder="Select category"
            />
            {errors.category && (
              <p className="mt-1 text-sm text-[var(--primary-red)]">{errors.category}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
              Vendor/Merchant <span className="text-[var(--primary-red)]">*</span>
            </label>
            <Input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Enter vendor name"
              icon={<Store size={18} />}
              error={errors.vendor}
              disabled={isMileageExpense}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Description <span className="text-[var(--primary-red)]">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={isMileageExpense ? "Purpose of trip..." : "Expense description..."}
            className="w-full px-3 py-2 bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] rounded-lg text-[var(--text-1)] placeholder-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent resize-none"
            rows={3}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-[var(--primary-red)]">{errors.description}</p>
          )}
        </div>
      </Card>

      {/* Receipt Upload */}
      <Card variant="subtle" className="p-4">
        <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Receipt</h3>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-[var(--border-1)] rounded-lg p-6 text-center">
            {receiptPreview ? (
              <div className="space-y-4">
                <Image
                  src={receiptPreview}
                  alt="Receipt preview"
                  width={500}
                  height={256}
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReceiptFile(null);
                    setReceiptPreview(null);
                  }}
                >
                  Remove Receipt
                </Button>
              </div>
            ) : receiptFile ? (
              <div className="space-y-2">
                <ReceiptIcon className="w-12 h-12 mx-auto text-[var(--text-2)]" />
                <p className="text-sm text-[var(--text-1)]">{receiptFile.name}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReceiptFile(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)]" />
                <p className="text-sm text-[var(--text-1)] mb-1">
                  Click to upload receipt
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  PNG, JPG, GIF or PDF up to 5MB
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        </div>
      </Card>

      {/* Tax Deductible */}
      <Card variant="subtle" className="p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.tax_deductible}
            onChange={(e) => setFormData({ ...formData, tax_deductible: e.target.checked })}
            className="w-5 h-5 text-[var(--primary-blue)] rounded focus:ring-[var(--primary-blue)]"
          />
          <div>
            <span className="text-sm font-medium text-[var(--text-1)]">Tax Deductible</span>
            <p className="text-xs text-[var(--text-2)]">
              Mark this expense as tax deductible for business purposes
            </p>
          </div>
        </label>
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
          icon={<CheckSquare size={18} />}
        >
          Add Expense
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;