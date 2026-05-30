'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Send,
  Paperclip,
  Smile,
  Image as ImageIcon,
  X,
  Download,
  File,
  DollarSign,
  Check,
  CheckCheck
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { ConversationMessage } from '@/lib/api';
import { uploadService } from '@/lib/uploadService';

interface ConversationViewProps {
  messages: ConversationMessage[];
  onSendMessage: (text: string, attachments?: File[]) => Promise<void>;
  onMessageRead?: (messageId: number) => void;
  loading?: boolean;
  otherUser: {
    id: number;
    username: string;
    full_name?: string;
  };
}

// Simple emoji picker data
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
  '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
  '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕',
  '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
  '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'
];

// Whether two timestamps fall on the same calendar day (local time).
const isSameDay = (a: string, b: string): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

// Human-friendly day label used for date separators between messages.
const formatDateSeparator = (date: string): string => {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d.toISOString(), now.toISOString())) return 'Today';
  if (isSameDay(d.toISOString(), yesterday.toISOString())) return 'Yesterday';

  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

export default function ConversationView({
  messages,
  onSendMessage,
  onMessageRead
}: ConversationViewProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToBottom = useRef(false);
  const lastMessageCount = useRef(0);

  // Handle scrolling logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Don't do anything if no messages
    if (messages.length === 0) {
      hasScrolledToBottom.current = false;
      lastMessageCount.current = 0;
      return;
    }

    // First time seeing messages in this conversation - scroll to bottom
    if (!hasScrolledToBottom.current) {
      const timer = setTimeout(() => {
        if (container) {
          // Scroll the container itself, not the page
          container.scrollTop = container.scrollHeight;
          hasScrolledToBottom.current = true;
          lastMessageCount.current = messages.length;
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
    
    // After initial scroll, only scroll for new messages sent by user
    if (messages.length > lastMessageCount.current) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage?.is_from_me) {
        setTimeout(() => {
          if (container) {
            // Smooth scroll the container
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
    
    lastMessageCount.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() && attachments.length === 0) return;

    setSending(true);
    try {
      await onSendMessage(messageText, attachments);
      setMessageText('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      // Keep the message text so user can retry
      // Show error in UI - message text is preserved for retry
      const _errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      // Consider adding a toast notification here if a notification system is available
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderTransactionMessage = (msg: ConversationMessage) => {
    const details = msg.transaction_details;
    if (!details) return null;

    const isReceived = details.direction === 'received';
    
    return (
      <div className={`p-4 rounded-lg border ${
        isReceived 
          ? 'bg-[rgba(var(--primary-emerald-rgb),0.05)] border-[var(--primary-emerald)]' 
          : 'bg-[rgba(var(--primary-blue-rgb),0.05)] border-[var(--primary-blue)]'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className={`w-5 h-5 ${
            isReceived ? 'text-[var(--primary-emerald)]' : 'text-[var(--primary-blue)]'
          }`} />
          <span className="font-medium text-[var(--text-primary)]">
            {isReceived ? 'Money Received' : 'Money Sent'}
          </span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          ${details.amount.toFixed(2)}
        </div>
        {details.note && (
          <p className="text-sm text-[var(--text-secondary)]">{details.note}</p>
        )}
        <div className="text-xs text-[var(--text-tertiary)] mt-2">
          {new Date(details.transaction_date).toLocaleString()}
        </div>
      </div>
    );
  };

  const renderAttachment = (attachment: {
    url?: string;
    filename?: string;
    file_type?: string;
    file_size?: number;
  }) => {
    if (!attachment) return null;

    const isImage = attachment.file_type?.startsWith('image/');
    const attachmentUrl = uploadService.getFileUrl(attachment.url);
    
    return (
      <div className="mt-2">
        {isImage ? (
          <Image
            src={attachmentUrl}
            alt={attachment.filename}
            width={300}
            height={200}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachmentUrl, '_blank')}
          />
        ) : (
          <Card className="p-3 flex items-center gap-3 max-w-xs cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.3)]"
            onClick={() => window.open(attachmentUrl, '_blank')}
          >
            <File className="w-8 h-8 text-[var(--primary-blue)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {attachment.filename}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {attachment.file_size && `${(attachment.file_size / 1024).toFixed(1)} KB`}
              </p>
            </div>
            <Download className="w-4 h-4 text-[var(--text-secondary)]" />
          </Card>
        )}
      </div>
    );
  };

  // Mark messages as read when they come into view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const unreadMessages = messages.filter(msg => !msg.is_from_me && !msg.is_read);
    if (unreadMessages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0');
            const message = messages.find(m => m.id === messageId);
            
            if (message && !message.is_from_me && !message.is_read) {
              // Mark this message as read
              fetch(`/api/messages/${message.id}/mark-read`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                  'Content-Type': 'application/json'
                }
              }).then(() => {
                // Notify parent component to update the message
                if (onMessageRead) {
                  onMessageRead(message.id);
                }
              }).catch(() => {
                // Silently fail - message read status update is not critical
              });
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.5 // Message is considered "read" when 50% visible
      }
    );

    // Observe all unread messages
    unreadMessages.forEach(msg => {
      const element = container.querySelector(`[data-message-id="${msg.id}"]`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, index) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showDateSeparator = !prev || !isSameDay(prev.sent_at, msg.sent_at);
          return (
          <React.Fragment key={`msg-${msg.id}-${index}`}>
          {showDateSeparator && (
            <div className="flex justify-center my-2">
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-1)] border border-[var(--border-1)] rounded-full px-3 py-1">
                {formatDateSeparator(msg.sent_at)}
              </span>
            </div>
          )}
          <div
            data-message-id={msg.id}
            className={`flex ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${msg.is_from_me ? 'text-right' : 'text-left'}`}>
              {msg.message_type === 'transaction' ? (
                renderTransactionMessage(msg)
              ) : (
                <>
                  <div className={`inline-block p-3 rounded-lg ${
                    msg.is_from_me 
                      ? 'bg-[var(--primary-blue)] text-white' 
                      : 'bg-[var(--bg-1)] text-[var(--text-primary)] border border-[var(--border-1)]'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((attachment, idx) => (
                          <div key={idx}>
                            {renderAttachment(attachment)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {new Date(msg.sent_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                  })}
                </span>
                {msg.is_from_me && (
                  msg.is_read ? (
                    <CheckCheck className="w-3 h-3 text-[var(--primary-blue)]" />
                  ) : (
                    <Check className="w-3 h-3 text-[var(--text-tertiary)]" />
                  )
                )}
              </div>
            </div>
          </div>
          </React.Fragment>
          );
        })}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            {attachments.map((file, index) => (
              <Card key={index} className="p-2 flex items-center gap-2">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-[var(--primary-blue)]" />
                ) : (
                  <File className="w-4 h-4 text-[var(--primary-blue)]" />
                )}
                <span className="text-sm text-[var(--text-primary)] max-w-[100px] truncate">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3 h-3" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <Card className="p-4 w-80 max-h-60 overflow-y-auto">
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_LIST.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-2xl hover:bg-[rgba(var(--glass-rgb),0.3)] rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-[var(--border-1)] bg-[var(--bg-1)]">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={sending}
          >
            <Smile className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 bg-[var(--bg-2)] border border-[var(--border-1)] rounded-lg resize-none focus:outline-none focus:border-[var(--primary-blue)] text-[var(--text-primary)] max-h-32"
              rows={1}
              disabled={sending}
            />
          </div>
          
          <Button
            onClick={handleSend}
            disabled={(!messageText.trim() && attachments.length === 0) || sending}
            className="px-4"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}