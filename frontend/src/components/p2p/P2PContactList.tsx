import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search,
  UserPlus,
  Star,
  Mail,
  Phone,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  User
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { P2PContact } from '@/app/(authenticated)/p2p/page';

interface P2PContactListProps {
  contacts: P2PContact[];
  onSelectContact: (contact: P2PContact) => void;
  onAddContact: () => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const P2PContactList: React.FC<P2PContactListProps> = ({
  contacts,
  onSelectContact,
  onAddContact,
  analyticsId = 'p2p-contact-list',
  analyticsLabel: _analyticsLabel = 'P2P Contact List',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getTransactionIcon = (type: 'sent' | 'received') => {
    return type === 'sent' ? (
      <ArrowUpRight className="w-3 h-3 text-[var(--primary-red)]" />
    ) : (
      <ArrowDownLeft className="w-3 h-3 text-[var(--primary-emerald)]" />
    );
  };

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFavorite = !showFavoritesOnly || contact.isFavorite;

    return matchesSearch && matchesFavorite;
  });

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-1)]">
            Contacts
          </h3>
          <Button
            variant="secondary"
            size="sm"
            icon={<UserPlus size={16} />}
            onClick={() => {
              onAddContact();
            }}
            analyticsId={`${analyticsId}-add-contact`}
            analyticsLabel="Add Contact"
          >
            Add
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        {/* Search and Filter */}
        <div className="space-y-3 mb-4">
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            icon={<Search size={18} />}
            analyticsId={`${analyticsId}-search`}
            analyticsLabel="Search Contacts"
          />
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
              }}
              className={`
                flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all
                ${showFavoritesOnly
                  ? 'bg-[var(--primary-amber)]/10 text-[var(--primary-amber)]'
                  : 'bg-[rgba(var(--glass-rgb),0.1)] text-[var(--text-2)] hover:bg-[rgba(var(--glass-rgb),0.2)]'
                }
              `}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>
          </div>
        </div>

        {/* Contacts List */}
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-[var(--text-2)] opacity-50" />
            <p className="text-[var(--text-2)]">No contacts found</p>
            <Button
              variant="secondary"
              size="sm"
              icon={<UserPlus size={16} />}
              onClick={() => {
                onAddContact();
              }}
              className="mt-4"
              analyticsId={`${analyticsId}-add-contact-empty`}
              analyticsLabel="Add Contact (Empty)"
            >
              Add Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="group"
              >
                <div 
                  className="p-3 rounded-lg hover:bg-[rgba(var(--glass-rgb),0.05)] transition-all cursor-pointer"
                  onClick={() => {
                    onSelectContact(contact);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium">
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      {contact.isFavorite && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary-amber)] flex items-center justify-center">
                          <Star className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-1)]">
                            {contact.name}
                          </p>
                          <p className="text-sm text-[var(--text-2)]">
                            {contact.username}
                          </p>
                        </div>

                        {/* Send Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectContact(contact);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-[var(--primary-blue)] text-white hover:bg-[var(--primary-blue)]/90"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Last Transaction */}
                      {contact.lastTransaction && (
                        <div className="flex items-center gap-2 mt-2">
                          {getTransactionIcon(contact.lastTransaction.type)}
                          <span className="text-xs text-[var(--text-2)]">
                            {contact.lastTransaction.type === 'sent' ? 'Sent' : 'Received'}{' '}
                            {formatCurrency(contact.lastTransaction.amount)}
                          </span>
                          <span className="text-xs text-[var(--text-2)]">•</span>
                          <span className="text-xs text-[var(--text-2)]">
                            {new Date(contact.lastTransaction.date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <motion.div
                    initial={false}
                    animate={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-[var(--border-1)] grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-[var(--text-2)]">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-2)]">
                        <Phone className="w-4 h-4" />
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default P2PContactList;
