'use client';

import { useState, useEffect } from 'react';
import { 
  Send,
  Search,
  QrCode,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  MessageSquare,
  Star,
  Zap
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Dropdown from '@/components/ui/Dropdown';
import SlideToConfirm from '@/components/ui/SlideToConfirm';
import P2PContactList from '@/components/p2p/P2PContactList';
import P2PTransactionHistory from '@/components/p2p/P2PTransactionHistory';
import P2PQuickSend from '@/components/p2p/P2PQuickSend';
import SplitPaymentModal from '@/components/modals/SplitPaymentModal';
import PaymentRequestModal from '@/components/modals/PaymentRequestModal';
import QRCodeModal from '@/components/modals/QRCodeModal';
import { p2pApi, type P2PContact as ApiP2PContact } from '@/lib/api/p2p';
import { notificationService } from '@/services/notificationService';
import { accountsService } from '@/lib/api/accounts';
import { Account } from '@/lib/api/accounts';
import { useAuth } from '@/contexts/AuthContext';

export interface P2PContact {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  isFavorite: boolean;
  lastTransaction?: {
    date: string;
    amount: number;
    type: 'sent' | 'received';
  };
}

export interface P2PTransaction {
  id: string;
  contact: P2PContact;
  amount: number;
  type: 'sent' | 'received';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
  method: 'instant' | 'standard';
  fee?: number;
}

const fromApiContact = (c: ApiP2PContact): P2PContact => ({
  id: c.id,
  name: c.name,
  username: c.username,
  email: c.email,
  phone: c.phone,
  avatar: c.avatar,
  isFavorite: c.is_favorite,
  lastTransaction: c.last_transaction,
});

const toApiContact = (c: P2PContact): ApiP2PContact => ({
  id: c.id,
  name: c.name,
  username: c.username,
  email: c.email,
  phone: c.phone,
  avatar: c.avatar,
  is_favorite: c.isFavorite,
  last_transaction: c.lastTransaction,
});

export default function P2PPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<P2PContact[]>([]);
  const [transactions, setTransactions] = useState<P2PTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedContact, setSelectedContact] = useState<P2PContact | null>(null);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showRequestMoney, setShowRequestMoney] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sendMethod, setSendMethod] = useState<'instant' | 'standard'>('instant');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Fetch accounts
      const accountsData = await accountsService.getAccounts();
      setAccounts(accountsData || []);
      if (accountsData && accountsData.length > 0) {
        // Default to a cash (debit) account rather than a credit card so we
        // don't pre-select sending money from a credit line.
        const isCredit = (acc: Account) =>
          (acc.account_type || '').toLowerCase().includes('credit');
        const defaultAccount =
          accountsData.find(acc => !isCredit(acc)) || accountsData[0];
        setSelectedAccount(defaultAccount.id.toString());
      }

      // Fetch contacts from API
      const contactsData = await p2pApi.getContacts();
      setContacts((contactsData || []).map(fromApiContact));

      // Generate mock transactions for now. Dates are relative to today so the
      // history never looks stale.
      const dayMs = 24 * 60 * 60 * 1000;
      const dateDaysAgo = (n: number) => new Date(Date.now() - n * dayMs).toISOString().slice(0, 10);
      const dateTimeDaysAgo = (n: number, time = '12:00:00') => `${dateDaysAgo(n)}T${time}`;
    const mockContacts: P2PContact[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        username: '@sarahj',
        email: 'sarah@example.com',
        phone: '+1 555-0123',
        isFavorite: true,
        lastTransaction: {
          date: dateDaysAgo(2),
          amount: 50,
          type: 'sent',
        },
      },
      {
        id: '2',
        name: 'Mike Chen',
        username: '@mikechen',
        email: 'mike@example.com',
        phone: '+1 555-0124',
        isFavorite: true,
        lastTransaction: {
          date: dateDaysAgo(4),
          amount: 125,
          type: 'received',
        },
      },
      {
        id: '3',
        name: 'Emma Williams',
        username: '@emmaw',
        email: 'emma@example.com',
        phone: '+1 555-0125',
        isFavorite: false,
        lastTransaction: {
          date: dateDaysAgo(6),
          amount: 75,
          type: 'sent',
        },
      },
      {
        id: '4',
        name: 'David Martinez',
        username: '@davidm',
        email: 'david@example.com',
        phone: '+1 555-0126',
        isFavorite: false,
        lastTransaction: {
          date: dateDaysAgo(8),
          amount: 200,
          type: 'received',
        },
      },
      {
        id: '5',
        name: 'Lisa Anderson',
        username: '@lisaa',
        email: 'lisa@example.com',
        phone: '+1 555-0127',
        isFavorite: true,
      },
    ];

    // Build sample transaction history against the user's real contacts so the
    // activity feed stays consistent with the Contacts directory. Fall back to
    // the local sample contacts only when the API returns none.
    const historyContacts: P2PContact[] =
      contactsData && contactsData.length > 0
        ? (contactsData as unknown as P2PContact[])
        : mockContacts;
    const pickContact = (i: number) => historyContacts[i % historyContacts.length];

    const mockTransactions: P2PTransaction[] = [
      {
        id: '1',
        contact: pickContact(0),
        amount: 50,
        type: 'sent',
        status: 'completed',
        date: dateTimeDaysAgo(2, '15:30:00'),
        description: 'Lunch money',
        method: 'instant',
        fee: 0.50,
      },
      {
        id: '2',
        contact: pickContact(1),
        amount: 125,
        type: 'received',
        status: 'completed',
        date: dateTimeDaysAgo(4, '10:15:00'),
        description: 'Concert tickets',
        method: 'standard',
      },
      {
        id: '3',
        contact: pickContact(2),
        amount: 75,
        type: 'sent',
        status: 'pending',
        date: dateTimeDaysAgo(6, '18:45:00'),
        description: 'Birthday gift',
        method: 'instant',
        fee: 0.75,
      },
      {
        id: '4',
        contact: pickContact(3),
        amount: 200,
        type: 'received',
        status: 'completed',
        date: dateTimeDaysAgo(8, '09:00:00'),
        description: 'Rent split',
        method: 'standard',
      },
      {
        id: '5',
        contact: pickContact(0),
        amount: 30,
        type: 'sent',
        status: 'failed',
        date: dateTimeDaysAgo(11, '14:20:00'),
        description: 'Coffee',
        method: 'instant',
      },
    ];

      setTransactions(mockTransactions);
      
      // Log data loaded event
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const totalSent = (transactions || [])
    .filter(t => t.type === 'sent' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);

  const totalReceived = (transactions || [])
    .filter(t => t.type === 'received' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingCount = (transactions || []).filter(t => t.status === 'pending').length;
  const favoriteContacts = (contacts || []).filter(c => c.isFavorite);

  const handleSendMoney = () => {
    if (!selectedContact || !amount || !selectedAccount) return;

    // Find the selected account to check balance
    const account = accounts.find(a => a.id.toString() === selectedAccount);
    if (!account) return;

    // Calculate total amount including fee
    const amountNum = parseFloat(amount);
    const fee = sendMethod === 'instant' ? amountNum * 0.01 : 0;
    const totalAmount = amountNum + fee;

    // Check if account has sufficient balance
    if (account.balance < totalAmount) {
      alert(`Insufficient balance. Your ${account.name} has $${account.balance.toFixed(2)}, but you need $${totalAmount.toFixed(2)} (including ${sendMethod === 'instant' ? '$' + fee.toFixed(2) + ' fee' : 'no fee'}).`);
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    if (!selectedContact || !selectedAccount) return;

    try {
      const transferAmount = parseFloat(amount);
      const _fee = sendMethod === 'instant' ? transferAmount * 0.01 : 0;
      
      const _result = await p2pApi.createTransfer({
        recipient_id: selectedContact.id,
        amount: transferAmount,
        description: description || undefined,
        method: sendMethod,
        source_account_id: selectedAccount
      });
      // Refresh data
      loadData();
      
      setShowConfirmation(false);
      setShowSendMoney(false);
      setSelectedContact(null);
      setAmount('');
      setDescription('');
      notificationService.success(`Sent ${formatCurrency(transferAmount)} to ${selectedContact.name}`);
    } catch (err) {
      notificationService.error(err instanceof Error ? err.message : 'Transfer failed. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-96">
          <div className="text-[var(--text-2)]">Loading P2P payments...</div>
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
              Send & Receive Money
            </h1>
            <p className="text-[var(--text-2)] mt-2">
              Transfer money instantly to friends and family
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<Users size={18} />}
              onClick={() => {
                setShowSplitPayment(true);
              }}
            >
              Split
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<DollarSign size={18} />}
              onClick={() => {
                setShowRequestMoney(true);
              }}
            >
              Request
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<QrCode size={18} />}
              onClick={() => {
                setShowQRGenerator(true);
              }}
            >
              QR Code
            </Button>
            <Button
              variant="primary"
              icon={<Send size={18} />}
              onClick={() => {
                setShowSendMoney(true);
              }}
            >
              Send Money
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Sent</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {formatCurrency(totalSent)}
                </p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-[var(--primary-red)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Total Received</p>
                <p className="text-2xl font-bold text-[var(--primary-emerald)]">
                  {formatCurrency(totalReceived)}
                </p>
              </div>
              <ArrowDownLeft className="w-8 h-8 text-[var(--primary-emerald)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Contacts</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {contacts.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-[var(--primary-blue)] opacity-20" />
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-2)]">Pending</p>
                <p className="text-2xl font-bold text-[var(--primary-amber)]">
                  {pendingCount}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[var(--primary-amber)] opacity-20" />
            </div>
          </Card>
        </div>

        {/* Quick Send */}
        {favoriteContacts.length > 0 && (
          <P2PQuickSend
            contacts={favoriteContacts}
            onSelectContact={(contact) => {
              setSelectedContact(contact);
              setShowSendMoney(true);
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transaction History */}
          <div className="lg:col-span-2">
            <P2PTransactionHistory
              transactions={transactions}
              onSelectTransaction={(_transaction) => {
                // Handle transaction selection
                
              }}
            />
          </div>

          {/* Contacts */}
          <div className="lg:col-span-1">
            <P2PContactList
              contacts={contacts}
              onSelectContact={(contact) => {
                setSelectedContact(contact);
                setShowSendMoney(true);
              }}
              onAddContact={() => {
                setShowAddContact(true);
              }}
            />
          </div>
        </div>
      {/* Send Money Modal */}
      <Modal
        isOpen={showSendMoney}
        onClose={() => {
          setShowSendMoney(false);
          setSelectedContact(null);
          setAmount('');
          setDescription('');
        }}
        title="Send Money"
        size="md"
      >
        {!selectedContact ? (
          <div className="space-y-4">
            <p className="text-[var(--text-2)] mb-4">
              Select a contact to send money to
            </p>
            
            {/* Search Contacts */}
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                
                if (query.length > 0) {
                  const _filteredCount = contacts.filter(contact => 
                    contact.name.toLowerCase().includes(query.toLowerCase()) ||
                    contact.username.toLowerCase().includes(query.toLowerCase()) ||
                    contact.email.toLowerCase().includes(query.toLowerCase())
                  ).length;
                  
                }
              }}
              icon={<Search size={18} />}
            />
            
            {/* Contact List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {contacts
                .filter(contact => 
                  searchQuery === '' || 
                  contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  contact.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setSearchQuery('');
                    }}
                    className="w-full p-3 rounded-lg border border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)] transition-all flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-[var(--text-1)]">{contact.name}</p>
                      <p className="text-sm text-[var(--text-2)]">{contact.username}</p>
                    </div>
                    {contact.isFavorite && (
                      <Star size={16} className="text-[var(--primary-amber)] fill-current" />
                    )}
                  </button>
                ))
              }
            </div>
            
            {contacts.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-[var(--text-2)] opacity-30" />
                <p className="text-[var(--text-2)]">No contacts found</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setShowSendMoney(false);
                    setShowAddContact(true);
                  }}
                >
                  Add Contact
                </Button>
              </div>
            )}
          </div>
        ) : !showConfirmation ? (
          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium">
                  {selectedContact.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-1)]">{selectedContact.name}</p>
                  <p className="text-sm text-[var(--text-2)]">{selectedContact.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedContact(null);
                }}
              >
                Change
              </Button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Amount
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => {
                  const newAmount = e.target.value;
                  setAmount(newAmount);
                  
                  if (newAmount && parseFloat(newAmount) > 0) {
                    const amountNum = parseFloat(newAmount);
                    const _fee = sendMethod === 'instant' ? amountNum * 0.01 : 0;
                    
                  }
                }}
                placeholder="0.00"
                icon={<DollarSign size={18} />}
                size="lg"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Description (optional)
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => {
                  const desc = e.target.value;
                  setDescription(desc);
                  
                  if (desc.length > 0) {
                  }
                }}
                placeholder="What's this for?"
                icon={<MessageSquare size={18} />}
              />
            </div>

            {/* Account Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                From Account
              </label>
              <Dropdown
                value={selectedAccount}
                onChange={(value) => {
                  const _previousAccount = accounts.find(a => a.id.toString() === selectedAccount);
                  const newAccount = accounts.find(a => a.id.toString() === value);
                  setSelectedAccount(value);
                  
                  if (newAccount) {
                  }
                }}
                items={accounts.map(account => ({
                  value: account.id.toString(),
                  label: `${account.name} - $${account.balance.toFixed(2)}`
                }))}
                placeholder="Select an account"
                fullWidth
              />
            </div>

            {/* Send Method */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                Send Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (sendMethod !== 'instant') {
                      setSendMethod('instant');
                      
                      const amountNum = amount ? parseFloat(amount) : 0;
                      const _newFee = amountNum * 0.01;
                      
                    }
                  }}
                  className={`
                    p-3 rounded-lg border transition-all
                    ${sendMethod === 'instant'
                      ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]'
                      : 'border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
                    }
                  `}
                >
                  <Zap className="w-5 h-5 mx-auto mb-1 text-[var(--primary-blue)]" />
                  <p className="text-sm font-medium text-[var(--text-1)]">Instant</p>
                  <p className="text-xs text-[var(--text-2)] mt-1">Fee: 1%</p>
                </button>
                
                <button
                  onClick={() => {
                    if (sendMethod !== 'standard') {
                      setSendMethod('standard');
                      
                      const amountNum = amount ? parseFloat(amount) : 0;
                      const _oldFee = amountNum * 0.01;
                      
                    }
                  }}
                  className={`
                    p-3 rounded-lg border transition-all
                    ${sendMethod === 'standard'
                      ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]'
                      : 'border-[var(--border-1)] hover:bg-[rgba(var(--glass-rgb),0.1)]'
                    }
                  `}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1 text-[var(--primary-amber)]" />
                  <p className="text-sm font-medium text-[var(--text-1)]">Standard</p>
                  <p className="text-xs text-[var(--text-2)] mt-1">Free • 1-3 days</p>
                </button>
              </div>
            </div>

            {/* Fee Info and Balance Check */}
            {amount && (
              <div className="space-y-3">
                {sendMethod === 'instant' && (
                  <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-2)]">Amount</span>
                      <span className="text-[var(--text-1)]">{formatCurrency(parseFloat(amount))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-2)]">Fee (1%)</span>
                      <span className="text-[var(--text-1)]">{formatCurrency(parseFloat(amount) * 0.01)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-[var(--border-1)]">
                      <span className="text-[var(--text-1)]">Total</span>
                      <span className="text-[var(--text-1)]">{formatCurrency(parseFloat(amount) * 1.01)}</span>
                    </div>
                  </div>
                )}
                
                {/* Balance Warning */}
                {(() => {
                  const account = accounts.find(a => a.id.toString() === selectedAccount);
                  if (!account) return null;
                  
                  const amountNum = parseFloat(amount);
                  const fee = sendMethod === 'instant' ? amountNum * 0.01 : 0;
                  const totalAmount = amountNum + fee;
                  
                  if (account.balance < totalAmount) {
                    return (
                      <div className="p-3 rounded-lg bg-[rgba(var(--primary-red),0.1)] border border-[var(--primary-red)]">
                        <p className="text-sm text-[var(--primary-red)] font-medium">
                          Insufficient balance
                        </p>
                        <p className="text-xs text-[var(--text-2)] mt-1">
                          Available: {formatCurrency(account.balance)} • Required: {formatCurrency(totalAmount)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowSendMoney(false);
                  setSelectedContact(null);
                  setAmount('');
                  setDescription('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSendMoney}
                disabled={!amount || parseFloat(amount) <= 0 || (() => {
                  const account = accounts.find(a => a.id.toString() === selectedAccount);
                  if (!account) return true;
                  const amountNum = parseFloat(amount);
                  const fee = sendMethod === 'instant' ? amountNum * 0.01 : 0;
                  return account.balance < (amountNum + fee);
                })()}
              >
                Review & Send
              </Button>
            </div>
          </div>
        ) : showConfirmation && selectedContact ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--primary-emerald)]" />
              <h3 className="text-xl font-semibold text-[var(--text-1)] mb-2">
                Confirm Payment
              </h3>
              <p className="text-3xl font-bold text-[var(--text-1)]">
                {formatCurrency(parseFloat(amount))}
              </p>
              <p className="text-sm text-[var(--text-2)] mt-2">
                to {selectedContact.name}
              </p>
            </div>

            <SlideToConfirm
              amount={parseFloat(amount)}
              recipient={selectedContact.name}
              onConfirm={handleConfirmSend}
            />
          </div>
        ) : null}
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        title="Add Contact"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            Contact addition form will be implemented here.
          </p>
        </div>
      </Modal>

      {/* Split Payment Modal */}
      <SplitPaymentModal
        isOpen={showSplitPayment}
        onClose={() => setShowSplitPayment(false)}
        accounts={accounts}
        contacts={contacts.map(toApiContact)}
        onSuccess={loadData}
      />

      {/* Payment Request Modal */}
      <PaymentRequestModal
        isOpen={showRequestMoney}
        onClose={() => setShowRequestMoney(false)}
        contacts={contacts.map(toApiContact)}
        onSuccess={loadData}
      />

      {/* QR Code Modal - Generate */}
      <QRCodeModal
        isOpen={showQRGenerator}
        onClose={() => setShowQRGenerator(false)}
        mode="generate"
      />

      {/* QR Code Modal - Scan */}
      <QRCodeModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        mode="scan"
        onScanSuccess={(_data) => {
          
          setShowQRScanner(false);
        }}
      />
    </div>
  );
}
