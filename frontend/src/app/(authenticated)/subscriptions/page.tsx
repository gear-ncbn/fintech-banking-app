'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CreditCard,
  Calendar,
  DollarSign,
  Plus,
  Search,
  
  RefreshCw,
  Music,
  Video,
  Cloud,
  Shield,
  Zap,
  Globe,
  Briefcase,
  Heart,
  Book,
  Gamepad2,
  Download
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Dropdown from '@/components/ui/Dropdown';
import SubscriptionCard from '@/components/subscriptions/SubscriptionCard';
import SubscriptionStats from '@/components/subscriptions/SubscriptionStats';
import SubscriptionCalendar from '@/components/subscriptions/SubscriptionCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionsService, Subscription as ApiSubscription } from '@/lib/api';

export interface Subscription {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  amount: number;
  billing: 'monthly' | 'yearly' | 'weekly';
  nextBilling: string;
  lastBilling: string;
  status: 'active' | 'paused' | 'cancelled';
  paymentMethod: string;
  notifications: boolean;
  usage?: {
    current: number;
    limit: number;
    unit: string;
  };
  savings?: {
    amount: number;
    percentage: number;
  };
  trialEnd?: string;
  cancellationDate?: string;
  autoRenew: boolean;
}

export default function SubscriptionsPage() {
  const { user: _user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'date'>('date');
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const categoryIcons = useMemo(() => ({
    'Entertainment': <Video className="w-5 h-5" />,
    'Music': <Music className="w-5 h-5" />,
    'Cloud Storage': <Cloud className="w-5 h-5" />,
    'Security': <Shield className="w-5 h-5" />,
    'Productivity': <Briefcase className="w-5 h-5" />,
    'Health': <Heart className="w-5 h-5" />,
    'Education': <Book className="w-5 h-5" />,
    'Gaming': <Gamepad2 className="w-5 h-5" />,
    'News': <Globe className="w-5 h-5" />,
    'Other': <Zap className="w-5 h-5" />,
  }), []);

  const categoryColors = useMemo(() => ({
    'Entertainment': 'from-[var(--cat-pink)] to-[var(--cat-pink)]/80',
    'Music': 'from-[var(--cat-violet)] to-[var(--cat-violet)]/80',
    'Cloud Storage': 'from-[var(--cat-blue)] to-[var(--cat-blue)]/80',
    'Security': 'from-[var(--cat-emerald)] to-[var(--cat-emerald)]/80',
    'Productivity': 'from-[var(--cat-indigo)] to-[var(--cat-indigo)]/80',
    'Health': 'from-[var(--cat-red)] to-[var(--cat-red)]/80',
    'Education': 'from-[var(--cat-amber)] to-[var(--cat-amber)]/80',
    'Gaming': 'from-[var(--cat-teal)] to-[var(--cat-teal)]/80',
    'News': 'from-[var(--cat-yellow)] to-[var(--cat-yellow)]/80',
    'Other': 'from-[var(--primary-blue)] to-[var(--primary-indigo)]/80',
  }), []);

  const mapApiCategoryToDisplay = useCallback((category: ApiSubscription['category']): string => {
    const categoryMap: Record<string, string> = {
      'STREAMING': 'Entertainment',
      'SOFTWARE': 'Productivity',
      'CLOUD_STORAGE': 'Productivity',
      'FITNESS': 'Health',
      'FOOD': 'Food',
      'NEWS': 'News',
      'UTILITIES': 'Utilities',
      'GAMING': 'Gaming',
      'EDUCATION': 'Education',
      'OTHER': 'Other'
    };
    return categoryMap[String(category).toUpperCase()] || 'Other';
  }, []);

  const mapApiBillingToDisplay = useCallback((billing: ApiSubscription['billing_cycle']): 'monthly' | 'yearly' | 'weekly' => {
    // The API may return values in either case (e.g. "YEARLY" or "annual"),
    // so normalize before mapping.
    const billingMap: Record<string, 'monthly' | 'yearly' | 'weekly'> = {
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly',
      'QUARTERLY': 'monthly',
      'YEARLY': 'yearly',
      'ANNUAL': 'yearly',
      'ANNUALLY': 'yearly',
      'CUSTOM': 'monthly'
    };
    return billingMap[String(billing).toUpperCase()] || 'monthly';
  }, []);

  const mapApiStatusToDisplay = useCallback((status: ApiSubscription['status']): 'active' | 'paused' | 'cancelled' => {
    const statusMap: Record<string, 'active' | 'paused' | 'cancelled'> = {
      'ACTIVE': 'active',
      'PAUSED': 'paused',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'cancelled',
      'TRIAL': 'active'
    };
    return statusMap[String(status).toUpperCase()] || 'active';
  }, []);

  const loadMockData = useCallback(() => {
    const mockSubscriptions: Subscription[] = [
      {
        id: '1',
        name: 'Netflix',
        description: 'Premium streaming service',
        category: 'Entertainment',
        icon: categoryIcons['Entertainment'],
        color: categoryColors['Entertainment'],
        amount: 19.99,
        billing: 'monthly',
        nextBilling: '2025-07-15',
        lastBilling: '2025-06-15',
        status: 'active',
        paymentMethod: 'Visa ****7890',
        notifications: true,
        autoRenew: true,
        usage: {
          current: 127,
          limit: 200,
          unit: 'hours',
        },
      },
      {
        id: '2',
        name: 'Spotify Premium',
        description: 'Music streaming service',
        category: 'Music',
        icon: categoryIcons['Music'],
        color: categoryColors['Music'],
        amount: 9.99,
        billing: 'monthly',
        nextBilling: '2025-07-01',
        lastBilling: '2025-06-01',
        status: 'active',
        paymentMethod: 'Visa ****7890',
        notifications: true,
        autoRenew: true,
      },
      {
        id: '3',
        name: 'Adobe Creative Cloud',
        description: 'Complete creative suite',
        category: 'Productivity',
        icon: categoryIcons['Productivity'],
        color: categoryColors['Productivity'],
        amount: 599.88,
        billing: 'yearly',
        nextBilling: '2026-01-15',
        lastBilling: '2025-01-15',
        status: 'active',
        paymentMethod: 'Visa ****7890',
        notifications: true,
        autoRenew: true,
        savings: {
          amount: 120.00,
          percentage: 16.7,
        },
      },
      {
        id: '4',
        name: 'iCloud+',
        description: '2TB cloud storage',
        category: 'Cloud Storage',
        icon: categoryIcons['Cloud Storage'],
        color: categoryColors['Cloud Storage'],
        amount: 9.99,
        billing: 'monthly',
        nextBilling: '2025-07-20',
        lastBilling: '2025-06-20',
        status: 'active',
        paymentMethod: 'Apple Pay',
        notifications: false,
        autoRenew: true,
        usage: {
          current: 1247,
          limit: 2048,
          unit: 'GB',
        },
      },
      {
        id: '5',
        name: 'Gym Membership',
        description: 'Local fitness center',
        category: 'Health',
        icon: categoryIcons['Health'],
        color: categoryColors['Health'],
        amount: 49.99,
        billing: 'monthly',
        nextBilling: '2025-07-01',
        lastBilling: '2025-06-01',
        status: 'paused',
        paymentMethod: 'Debit ****4523',
        notifications: true,
        autoRenew: false,
      },
      {
        id: '6',
        name: 'Coursera Plus',
        description: 'Online learning platform',
        category: 'Education',
        icon: categoryIcons['Education'],
        color: categoryColors['Education'],
        amount: 399.00,
        billing: 'yearly',
        nextBilling: '2025-09-01',
        lastBilling: '2024-09-01',
        status: 'active',
        paymentMethod: 'Visa ****7890',
        notifications: true,
        autoRenew: true,
        trialEnd: '2025-07-01',
      },
      {
        id: '7',
        name: 'PlayStation Plus',
        description: 'Gaming subscription',
        category: 'Gaming',
        icon: categoryIcons['Gaming'],
        color: categoryColors['Gaming'],
        amount: 9.99,
        billing: 'monthly',
        nextBilling: '2025-07-10',
        lastBilling: '2025-06-10',
        status: 'cancelled',
        paymentMethod: 'PayPal',
        notifications: false,
        autoRenew: false,
        cancellationDate: '2025-07-10',
      },
      {
        id: '8',
        name: '1Password',
        description: 'Password manager',
        category: 'Security',
        icon: categoryIcons['Security'],
        color: categoryColors['Security'],
        amount: 2.99,
        billing: 'monthly',
        nextBilling: '2025-07-05',
        lastBilling: '2025-06-05',
        status: 'active',
        paymentMethod: 'Visa ****7890',
        notifications: true,
        autoRenew: true,
      },
    ];

    setSubscriptions(mockSubscriptions);
    setFilteredSubscriptions(mockSubscriptions);
    setIsLoading(false);
  }, [categoryColors, categoryIcons]);

  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get subscriptions from API
      const apiSubscriptions = await subscriptionsService.getSubscriptions();
      
      // Get subscription analysis for additional data
      const _analysis = await subscriptionsService.getSubscriptionAnalysis();
      
      // Convert API subscriptions to frontend format
      const formattedSubscriptions: Subscription[] = apiSubscriptions.map(sub => {
        const category = mapApiCategoryToDisplay(sub.category);
        const billing = mapApiBillingToDisplay(sub.billing_cycle);
        
        return {
          id: sub.id.toString(),
          name: sub.name,
          description: sub.merchant_name,
          category,
          icon: categoryIcons[category] || categoryIcons['Other'],
          color: categoryColors[category] || categoryColors['Other'],
          amount: sub.amount,
          billing,
          nextBilling: sub.next_billing_date,
          lastBilling: sub.last_billing_date || sub.start_date,
          status: mapApiStatusToDisplay(sub.status),
          paymentMethod: 'Card ****' + Math.floor(Math.random() * 9000 + 1000), // Mock payment method
          notifications: true,
          autoRenew: sub.status === 'ACTIVE',
          trialEnd: sub.free_trial_end_date,
          ...(sub.days_until_billing && sub.days_until_billing < 0 ? { cancellationDate: sub.next_billing_date } : {})
        };
      });
      
      setSubscriptions(formattedSubscriptions);
      setFilteredSubscriptions(formattedSubscriptions);
      setIsLoading(false);
      
      // Log data loaded event
    } catch {
      // Fall back to mock data
      loadMockData();
    }
  }, [categoryColors, categoryIcons, loadMockData, mapApiCategoryToDisplay, mapApiBillingToDisplay, mapApiStatusToDisplay]);

  useEffect(() => {
    // Enhanced page view logging

    // Load real subscriptions from backend
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...subscriptions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(sub => 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(sub => sub.category === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(sub => sub.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'amount':
          const aMonthly = a.billing === 'yearly' ? a.amount / 12 : a.billing === 'weekly' ? a.amount * 4 : a.amount;
          const bMonthly = b.billing === 'yearly' ? b.amount / 12 : b.billing === 'weekly' ? b.amount * 4 : b.amount;
          return bMonthly - aMonthly;
        case 'date':
          return new Date(a.nextBilling).getTime() - new Date(b.nextBilling).getTime();
        default:
          return 0;
      }
    });

    setFilteredSubscriptions(filtered);
  }, [subscriptions, searchQuery, filterCategory, filterStatus, sortBy]);

  const handleSubscriptionAction = (id: string, action: string) => {
    const subscription = subscriptions.find(s => s.id === id);
    if (!subscription) return;
    setSubscriptions(subscriptions.map(sub => {
      if (sub.id === id) {
        switch (action) {
          case 'pause':
            return { ...sub, status: 'paused' };
          case 'resume':
            return { ...sub, status: 'active' };
          case 'cancel':
            return { ...sub, status: 'cancelled', cancellationDate: sub.nextBilling };
          case 'toggle-notifications':
            return { ...sub, notifications: !sub.notifications };
          default:
            return sub;
        }
      }
      return sub;
    }));
  };

  const categories = ['all', ...Array.from(new Set(subscriptions.map(s => s.category)))];
  const statuses = ['all', 'active', 'paused', 'cancelled'];

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading subscriptions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-1)]">
              Subscriptions
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Manage and track all your recurring payments
            </p>
          </div>
          
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button
              variant="secondary"
              icon={<Download size={18} />}
              onClick={() => {
                
                // Generate CSV
                const csvContent = [
                  ['Name', 'Description', 'Category', 'Amount', 'Billing', 'Monthly Cost', 'Status', 'Next Billing', 'Payment Method'],
                  ...subscriptions.map(sub => [
                    sub.name,
                    sub.description,
                    sub.category,
                    sub.amount.toFixed(2),
                    sub.billing,
                    (sub.billing === 'yearly' ? sub.amount / 12 : 
                     sub.billing === 'weekly' ? sub.amount * 4 : 
                     sub.amount).toFixed(2),
                    sub.status,
                    sub.nextBilling,
                    sub.paymentMethod
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `subscriptions_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }}
            >
              Export
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => {
                setShowAddSubscription(true);
              }}
            >
              Add Subscription
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <SubscriptionStats subscriptions={subscriptions} />

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search subscriptions..."
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
              items={categories.map(cat => ({ 
                value: cat, 
                label: cat === 'all' ? 'All Categories' : cat 
              }))}
              value={filterCategory}
              onChange={(value) => {
                setFilterCategory(value);
              }}
              placeholder="Category"
            />
            
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
                { value: 'name', label: 'Sort by Name' },
              ]}
              value={sortBy}
              onChange={(value) => {
                const newSort = value as 'name' | 'amount' | 'date';
                setSortBy(newSort);
              }}
              placeholder="Sort by"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subscriptions List */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubscriptions.map((subscription, _index) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onAction={handleSubscriptionAction}
                  onClick={() => {
                      setSelectedSubscription(subscription);
                      setShowDetails(true);
                    }}
                  />
              ))}

              {filteredSubscriptions.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <RefreshCw className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
                  <p className="text-[var(--text-2)]">No subscriptions found</p>
                  <p className="text-sm text-[var(--text-2)] mt-2">
                    Try adjusting your filters or add a new subscription
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Calendar View */}
          <div className="lg:col-span-1">
            <SubscriptionCalendar subscriptions={subscriptions} />
          </div>
        </div>
      {/* Add Subscription Modal */}
      <Modal
        isOpen={showAddSubscription}
        onClose={() => setShowAddSubscription(false)}
        title="Add New Subscription"
        size="md"
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const newSubscription: Subscription = {
            id: Date.now().toString(),
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            icon: categoryIcons[formData.get('category') as string] || categoryIcons['Other'],
            color: categoryColors[formData.get('category') as string] || categoryColors['Other'],
            amount: parseFloat(formData.get('amount') as string),
            billing: formData.get('billing') as 'monthly' | 'yearly' | 'weekly',
            nextBilling: formData.get('nextBilling') as string,
            lastBilling: new Date().toISOString().split('T')[0],
            status: 'active',
            paymentMethod: formData.get('paymentMethod') as string,
            notifications: true,
            autoRenew: true,
          };
          
          setSubscriptions([...subscriptions, newSubscription]);
          setShowAddSubscription(false);
          
        }}>
          <Input
            name="name"
            type="text"
            placeholder="Subscription name"
            required
            label="Name"
          />
          
          <Input
            name="description"
            type="text"
            placeholder="Brief description"
            label="Description"
          />
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-1)] mb-2">Category</label>
            <select
              name="category"
              className="w-full px-3 py-2 bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] rounded-lg text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              required
            >
              {Object.keys(categoryIcons).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              label="Amount"
              icon={<DollarSign size={18} />}
            />
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">Billing Cycle</label>
              <select
                name="billing"
                className="w-full px-3 py-2 bg-[rgba(var(--glass-rgb),0.1)] border border-[var(--border-1)] rounded-lg text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                required
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          
          <Input
            name="nextBilling"
            type="date"
            required
            label="Next Billing Date"
            icon={<Calendar size={18} />}
          />
          
          <Input
            name="paymentMethod"
            type="text"
            placeholder="e.g., Visa ****1234"
            required
            label="Payment Method"
            icon={<CreditCard size={18} />}
          />
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddSubscription(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Add Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subscription Details Modal */}
      {selectedSubscription && (
        <Modal
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedSubscription(null);
          }}
          title={selectedSubscription.name}
          size="lg"
        >
          <div className="space-y-6">
            {/* Header with Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  p-3 rounded-lg bg-gradient-to-r ${selectedSubscription.color}
                  flex items-center justify-center
                `}>
                  {selectedSubscription.icon}
                </div>
                <div>
                  <p className="text-[var(--text-2)]">{selectedSubscription.description}</p>
                  <p className="text-sm text-[var(--text-2)] mt-1">Category: {selectedSubscription.category}</p>
                </div>
              </div>
              <div className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${selectedSubscription.status === 'active' ? 'bg-[var(--primary-emerald)]/10 text-[var(--primary-emerald)]' : ''}
                ${selectedSubscription.status === 'paused' ? 'bg-[var(--primary-amber)]/10 text-[var(--primary-amber)]' : ''}
                ${selectedSubscription.status === 'cancelled' ? 'bg-[var(--text-2)]/10 text-[var(--text-2)]' : ''}
              `}>
                {selectedSubscription.status.charAt(0).toUpperCase() + selectedSubscription.status.slice(1)}
              </div>
            </div>

            {/* Billing Information */}
            <Card variant="subtle" className="p-4">
              <h4 className="font-semibold text-[var(--text-1)] mb-3">Billing Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-2)]">Amount</span>
                  <span className="font-medium text-[var(--text-1)]">
                    ${selectedSubscription.amount.toFixed(2)} / {selectedSubscription.billing}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-2)]">Monthly Cost</span>
                  <span className="font-medium text-[var(--text-1)]">
                    ${(selectedSubscription.billing === 'yearly' ? selectedSubscription.amount / 12 : 
                       selectedSubscription.billing === 'weekly' ? selectedSubscription.amount * 4 : 
                       selectedSubscription.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-2)]">Payment Method</span>
                  <span className="font-medium text-[var(--text-1)]">{selectedSubscription.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-2)]">Next Billing Date</span>
                  <span className="font-medium text-[var(--text-1)]">
                    {new Date(selectedSubscription.nextBilling).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-2)]">Auto-Renew</span>
                  <span className="font-medium text-[var(--text-1)]">
                    {selectedSubscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Usage Information */}
            {selectedSubscription.usage && (
              <Card variant="subtle" className="p-4">
                <h4 className="font-semibold text-[var(--text-1)] mb-3">Usage</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-2)]">Current Usage</span>
                    <span className="font-medium text-[var(--text-1)]">
                      {selectedSubscription.usage.current} / {selectedSubscription.usage.limit} {selectedSubscription.usage.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]"
                      style={{ width: `${(selectedSubscription.usage.current / selectedSubscription.usage.limit) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-2)]">
                    {((selectedSubscription.usage.current / selectedSubscription.usage.limit) * 100).toFixed(1)}% used
                  </p>
                </div>
              </Card>
            )}

            {/* Billing History */}
            <Card variant="subtle" className="p-4">
              <h4 className="font-semibold text-[var(--text-1)] mb-3">Recent Payments</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-[var(--border-1)]">
                  <span className="text-sm text-[var(--text-2)]">
                    {new Date(selectedSubscription.lastBilling).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-[var(--text-1)]">
                    ${selectedSubscription.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-1)]">
              {selectedSubscription.status === 'active' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleSubscriptionAction(selectedSubscription.id, 'pause');
                      setShowDetails(false);
                    }}
                  >
                    Pause Subscription
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleSubscriptionAction(selectedSubscription.id, 'cancel');
                      setShowDetails(false);
                    }}
                  >
                    Cancel Subscription
                  </Button>
                </>
              )}
              {selectedSubscription.status === 'paused' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleSubscriptionAction(selectedSubscription.id, 'resume');
                    setShowDetails(false);
                  }}
                >
                  Resume Subscription
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setShowDetails(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
