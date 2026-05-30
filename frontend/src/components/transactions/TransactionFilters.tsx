import React from 'react';
import { Calendar, DollarSign, Tag, CreditCard, Filter, X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import DatePicker from '../ui/DatePicker';
import { UITransaction as Transaction } from '@/app/(authenticated)/transactions/page';
import type { Account } from '@/lib/api';
import { formatAccountLabel } from '@/lib/utils';

interface FilterState {
  dateRange: { start: string; end: string };
  categories: string[];
  accounts: string[];
  minAmount: string;
  maxAmount: string;
  status: string[];
  type: string[];
}

interface TransactionFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  transactions: Transaction[];
  accounts?: Account[];
  analyticsId?: string;
  analyticsLabel?: string;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
  transactions,
  accounts: accountList = [],
  analyticsId = 'transaction-filters',
  analyticsLabel = 'Transaction Filters',
}) => {
  // Extract unique values from transactions
  const categories = Array.from(new Set(transactions.map(t => t.category))).sort();
  // Build account options from the full account list (so accounts without
  // transactions still appear), falling back to those seen in transactions.
  const accounts = Array.from(
    new Set([
      ...accountList.map(formatAccountLabel),
      ...transactions.map(t => t.account),
    ])
  ).sort();
  const statuses = ['completed', 'pending', 'failed'];
  const types = ['credit', 'debit'];

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    });
  };

  const handleCategoryToggle = (category: string) => {
    const isRemoving = filters.categories.includes(category);
    const newCategories = isRemoving
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleAccountToggle = (account: string) => {
    const isRemoving = filters.accounts.includes(account);
    const newAccounts = isRemoving
      ? filters.accounts.filter(a => a !== account)
      : [...filters.accounts, account];
    onFiltersChange({ ...filters, accounts: newAccounts });
  };

  const handleStatusToggle = (status: string) => {
    const isRemoving = filters.status.includes(status);
    const newStatuses = isRemoving
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleTypeToggle = (type: string) => {
    const isRemoving = filters.type.includes(type);
    const newTypes = isRemoving
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    onFiltersChange({ ...filters, type: newTypes });
  };

  const clearFilters = () => {
    // Reset to default 30-day range instead of empty strings
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEnd = new Date().toISOString().split('T')[0];
    onFiltersChange({
      dateRange: { start: defaultStart, end: defaultEnd },
      categories: [],
      accounts: [],
      minAmount: '',
      maxAmount: '',
      status: [],
      type: [],
    });
  };

  const activeFilterCount = 
    filters.categories.length + 
    filters.accounts.length + 
    filters.status.length + 
    filters.type.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0) +
    (filters.dateRange.start ? 1 : 0) +
    (filters.dateRange.end ? 1 : 0);

  return (
    <Card variant="subtle" className="mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={16} />}
              onClick={clearFilters}
              analyticsId={`${analyticsId}-clear-button`}
              analyticsLabel={`${analyticsLabel} Clear Button`}
            >
              Clear All ({activeFilterCount})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date Range */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                value={filters.dateRange.start}
                onChange={(value) => handleDateChange('start', value)}
                placeholder="Start date"
                analyticsId={`${analyticsId}-date-start`}
                analyticsLabel="Start Date"
                maxDate={filters.dateRange.end || undefined}
              />
              <DatePicker
                value={filters.dateRange.end}
                onChange={(value) => handleDateChange('end', value)}
                placeholder="End date"
                analyticsId={`${analyticsId}-date-end`}
                analyticsLabel="End Date"
                minDate={filters.dateRange.start || undefined}
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-1)] mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amount Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={filters.minAmount}
                onChange={(e) => {
                  onFiltersChange({ ...filters, minAmount: e.target.value });
                }}
                placeholder="Min amount"
                icon={<DollarSign size={16} />}
                analyticsId={`${analyticsId}-min-amount`}
                analyticsLabel="Min Amount"
              />
              <Input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => {
                  onFiltersChange({ ...filters, maxAmount: e.target.value });
                }}
                placeholder="Max amount"
                icon={<DollarSign size={16} />}
                analyticsId={`${analyticsId}-max-amount`}
                analyticsLabel="Max Amount"
              />
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-3">
              Transaction Type
            </label>
            <div className="space-y-2">
              {types.map(type => (
                <label key={type} className="flex items-center cursor-pointer">
                  <Checkbox
                    checked={filters.type.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    size="sm"
                    analyticsId={`${analyticsId}-type-${type}`}
                    analyticsLabel={`Type ${type}`}
                  />
                  <span className="ml-2 text-sm text-[var(--text-1)] capitalize">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-3">
              Status
            </label>
            <div className="space-y-2">
              {statuses.map(status => (
                <label key={status} className="flex items-center cursor-pointer">
                  <Checkbox
                    checked={filters.status.includes(status)}
                    onChange={() => handleStatusToggle(status)}
                    size="sm"
                    analyticsId={`${analyticsId}-status-${status}`}
                    analyticsLabel={`Status ${status}`}
                  />
                  <span className="ml-2 text-sm text-[var(--text-1)] capitalize">
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(category => (
                <label key={category} className="flex items-center cursor-pointer min-w-0">
                  <Checkbox
                    checked={filters.categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    size="sm"
                    analyticsId={`${analyticsId}-category-${category}`}
                    analyticsLabel={`Category ${category}`}
                  />
                  <span className="ml-2 text-sm text-[var(--text-1)] truncate">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Accounts */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-[var(--text-1)] mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Accounts
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {accounts.map(account => (
                <label key={account} className="flex items-center cursor-pointer min-w-0">
                  <Checkbox
                    checked={filters.accounts.includes(account)}
                    onChange={() => handleAccountToggle(account)}
                    size="sm"
                    analyticsId={`${analyticsId}-account-${account}`}
                    analyticsLabel={`Account ${account}`}
                  />
                  <span className="ml-2 text-sm text-[var(--text-1)] truncate">
                    {account}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TransactionFilters;
