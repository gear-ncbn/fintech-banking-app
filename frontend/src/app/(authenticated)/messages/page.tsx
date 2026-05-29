'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Search,
  Plus,
  MoreVertical,
  User
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { messagesService, contactsService } from '@/lib/api';
import type { Conversation, ConversationMessage, Contact } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import ConversationView from '@/components/messaging/ConversationView';
import { uploadService } from '@/lib/uploadService';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUsername = searchParams.get('user');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await messagesService.getConversations();
      setConversations(data);
      setLoading(false);
    } catch {

      setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const data = await contactsService.getContacts('accepted', false);
      setContacts(data);
    } catch {

    }
  }, []);

  const loadMessages = useCallback(async (userId: number, isPolling: boolean = false) => {
    try {
      const data = await messagesService.getConversationMessages(userId);
      if (!isPolling || data.length !== messages.length) {
        setMessages(data);
      }
    } catch {

    }
  }, [messages.length]);

  useEffect(() => {
    loadConversations();
    loadContacts();

    // Poll for new conversations/updates every 5 seconds
    const conversationPollInterval = setInterval(() => {
      loadConversations();
    }, 5000);

    return () => clearInterval(conversationPollInterval);
  }, [loadConversations, loadContacts]);

  // Handle navigation from contacts page
  useEffect(() => {
    if (targetUsername && conversations.length >= 0) {
      
      
      
      // Find if conversation already exists
      const existingConversation = conversations.find(
        conv => conv.other_user.username === targetUsername
      );
      
      if (existingConversation) {
        
        setSelectedConversation(existingConversation);
      } else {
        
        // Look for the contact
        const contact = contacts.find(c => c.contact_username === targetUsername);
        
        if (contact) {
          
          // Create a conversation-like object for new chat
          const newConversation: Conversation = {
            id: 0, // Temporary ID
            other_user: {
              id: contact.contact_id,
              username: contact.contact_username,
              full_name: contact.nickname || contact.contact_username,
            },
            last_message: undefined,
            unread_count: 0,
            last_message_at: new Date().toISOString()
          };
          setSelectedConversation(newConversation);
          setMessages([]); // Clear messages for new conversation
          // Add to conversations list if not already there
          if (!conversations.find(c => c.other_user.username === targetUsername)) {
            setConversations([newConversation, ...conversations]);
          }
        } else {
          
          // If no contact exists, we still need to create a conversation placeholder
          // This happens when clicking "Message" from a non-contact user
          // For now, create a basic conversation object
          const newConversation: Conversation = {
            id: 0, // Temporary ID
            other_user: {
              id: 0, // Will need to be resolved
              username: targetUsername,
              full_name: targetUsername,
            },
            last_message: undefined,
            unread_count: 0,
            last_message_at: new Date().toISOString()
          };
          setSelectedConversation(newConversation);
          setMessages([]); // Clear messages for new conversation
          // Add to conversations list if not already there
          if (!conversations.find(c => c.other_user.username === targetUsername)) {
            setConversations([newConversation, ...conversations]);
          }
        }
      }
    }
  }, [targetUsername, conversations, contacts]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.other_user.id > 0) {
      loadMessages(selectedConversation.other_user.id);

      // Set up polling for new messages every 3 seconds
      const pollInterval = setInterval(() => {
        loadMessages(selectedConversation.other_user.id, true);
      }, 3000);

      return () => clearInterval(pollInterval);
    } else if (selectedConversation) {
      // For new conversations, just clear messages
      setMessages([]);
    }
  }, [selectedConversation, loadMessages]);

  const handleMessageRead = (messageId: number) => {
    // Update the message in state to mark it as read
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      )
    );

    // Update unread count in conversations
    if (selectedConversation) {
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, unread_count: Math.max(0, conv.unread_count - 1) }
            : conv
        )
      );
    }
  };

  const handleSendMessage = async (text: string, attachments?: File[]) => {
    if (!selectedConversation || (!text.trim() && (!attachments || attachments.length === 0))) return;
    
    // Can't send messages to users without a username
    if (!selectedConversation.other_user.username) {
      
      return;
    }

    setSendingMessage(true);
    try {
      // Upload attachments if any
      let attachmentData = undefined;
      if (attachments && attachments.length > 0) {
        try {
          const uploadedFiles = await uploadService.uploadMultiple(attachments);
          attachmentData = uploadedFiles.map(file => ({
            filename: file.filename,
            file_type: file.file_type,
            file_size: file.file_size,
            url: file.url
          }));
        } catch {
          
          // Continue sending message without attachments
        }
      }

      await messagesService.sendMessage({
        recipient_username: selectedConversation.other_user.username,
        subject: `Message from conversation`,
        message: text,
        priority: 'normal',
        attachments: attachmentData
      });
      
      // Reload conversations to get the real conversation if this was a new one
      await loadConversations();
      
      // If this was a temporary conversation (id=0), find the real one after sending
      if (selectedConversation.id === 0) {
        const updatedConversations = await messagesService.getConversations();
        const realConversation = updatedConversations.find(
          conv => conv.other_user.username === selectedConversation.other_user.username
        );
        if (realConversation) {
          setSelectedConversation(realConversation);
          await loadMessages(realConversation.other_user.id);
        }
      } else {
        await loadMessages(selectedConversation.other_user.id);
      }
    } catch {
      
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-[var(--border-1)] bg-[var(--bg-1)] flex flex-col">
        <div className="p-4 border-b border-[var(--border-1)] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Messages</h2>
            <Button
              size="sm"
              onClick={() => router.push('/contacts')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredConversations.map((conv, index) => (
            <div
              key={`conv-${conv.id || index}-${conv.other_user.username}`}
              className={`p-4 border-b border-[var(--border-1)] cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.1)] transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-[rgba(var(--glass-rgb),0.2)]' : ''
              }`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-[var(--primary-blue)] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">
                      {conv.other_user.full_name || conv.other_user.username}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      @{conv.other_user.username}
                    </p>
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <span className="bg-[var(--primary-blue)] text-white text-xs px-2 py-1 rounded-full">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <div className="ml-12">
                  <p className="text-sm text-[var(--text-secondary)] truncate">
                    {conv.last_message.is_from_me && 'You: '}
                    {conv.last_message.message}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {formatDistanceToNow(new Date(conv.last_message.sent_at), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-[var(--bg-2)]">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-1)] bg-[var(--bg-1)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--primary-blue)] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">
                      {selectedConversation.other_user.full_name || selectedConversation.other_user.username}
                    </h3>
                    <button
                      onClick={() => router.push(`/profile/${selectedConversation.other_user.id}`)}
                      className="text-sm text-[var(--primary-blue)] hover:underline"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Conversation View */}
            <div className="flex-1 relative overflow-hidden">
              <ConversationView
                key={selectedConversation.id || `temp-${selectedConversation.other_user.username}`}
                messages={messages}
                onSendMessage={handleSendMessage}
                onMessageRead={handleMessageRead}
                loading={sendingMessage}
                otherUser={selectedConversation.other_user}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Select a conversation
              </h3>
              <p className="text-[var(--text-secondary)]">
                Choose a conversation from the list or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}