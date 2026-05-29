'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  UserCheck,
  UserX,
  MessageSquare,
  MoreVertical,
  Clock,
  Check,
  X
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { contactsService } from '@/lib/api';
import type { Contact, ContactSearchResult, PendingRequests } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequests>({ 
    sent_requests: [], 
    received_requests: [] 
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [_loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts');

  const loadContacts = useCallback(async () => {
    try {
      const data = await contactsService.getContacts('accepted', false);
      setContacts(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const data = await contactsService.getPendingRequests();
      setPendingRequests(data);
    } catch {
    }
  }, []);

  useEffect(() => {
    loadContacts();
    loadPendingRequests();
  }, [loadContacts, loadPendingRequests]);

  const searchUsers = useCallback(async () => {
    if (!userSearchQuery.trim() || userSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await contactsService.searchUsers(userSearchQuery);
      setSearchResults(results);
    } catch {
    } finally {
      setSearching(false);
    }
  }, [userSearchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery, searchUsers]);

  const sendContactRequest = async (userId: number) => {
    try {
      await contactsService.createContactRequest({ contact_id: userId });
      
      setShowAddModal(false);
      setUserSearchQuery('');
      setSearchResults([]);
      loadPendingRequests();
    } catch {
    }
  };

  const handleContactRequest = async (contactId: number, accept: boolean) => {
    try {
      await contactsService.updateContactStatus(contactId, accept ? 'accepted' : 'blocked');
      
      loadContacts();
      loadPendingRequests();
    } catch {
    }
  };

  const _removeContact = async (contactId: number) => {
    try {
      await contactsService.removeContact(contactId);
      
      loadContacts();
    } catch {
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.contact_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRequests = pendingRequests.sent_requests.length + pendingRequests.received_requests.length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Contacts</h1>
        <p className="text-[var(--text-secondary)] mt-2">Manage your contacts and connection requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'bg-[var(--primary-blue)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Contacts ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
            activeTab === 'requests'
              ? 'bg-[var(--primary-blue)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Requests
          {totalRequests > 0 && (
            <span className="absolute -top-2 -right-2 bg-[var(--primary-red)] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {totalRequests}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'contacts' ? (
        <>
          {/* Search and Add */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Contact
            </Button>
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[var(--primary-blue)] rounded-full flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)]">
                        {contact.nickname || contact.contact_username?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        @{contact.contact_username}
                      </p>
                      {contact.contact_email && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                          {contact.contact_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <button className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/messages?user=${contact.contact_username}`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/profile/${contact.contact_id}`)}
                  >
                    View Profile
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Pending Requests */}
          <div className="space-y-6">
            {/* Received Requests */}
            {pendingRequests.received_requests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Received Requests ({pendingRequests.received_requests.length})
                </h2>
                <div className="space-y-2">
                  {pendingRequests.received_requests.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--primary-amber)] rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {request.username}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {request.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleContactRequest(request.id, true)}
                            className="text-[var(--primary-emerald)]"
                          >
                            <Check className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleContactRequest(request.id, false)}
                            className="text-[var(--primary-red)]"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            {pendingRequests.sent_requests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Sent Requests ({pendingRequests.sent_requests.length})
                </h2>
                <div className="space-y-2">
                  {pendingRequests.sent_requests.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--glass-bg)] rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {request.username}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Pending approval
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {totalRequests === 0 && (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">No pending requests</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setUserSearchQuery('');
          setSearchResults([]);
        }}
        title="Add Contact"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search by username or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {searching && (
            <div className="text-center py-4">
              <p className="text-[var(--text-secondary)]">Searching...</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3 border border-[var(--border-1)] rounded-lg hover:bg-[rgba(var(--glass-rgb),0.1)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.username
                        }
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        @{user.username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendContactRequest(user.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userSearchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <div className="text-center py-4">
              <p className="text-[var(--text-secondary)]">No users found</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}