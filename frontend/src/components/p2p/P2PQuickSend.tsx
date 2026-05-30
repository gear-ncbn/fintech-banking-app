import React from 'react';
import { motion } from 'framer-motion';
import { 
  Send,
  Plus,
  Star
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import { P2PContact } from '@/app/(authenticated)/p2p/page';

interface P2PQuickSendProps {
  contacts: P2PContact[];
  onSelectContact: (contact: P2PContact) => void;
  onAddContact?: () => void;
  analyticsId?: string;
  analyticsLabel?: string;
}

export const P2PQuickSend: React.FC<P2PQuickSendProps> = ({
  contacts,
  onSelectContact,
  onAddContact,
  analyticsId: _analyticsId = 'p2p-quick-send',
  analyticsLabel: _analyticsLabel = 'P2P Quick Send',
}) => {
  return (
    <Card variant="subtle" className="mb-8">
      <CardHeader>
        <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
          <Star className="w-5 h-5 text-[var(--primary-amber)]" />
          Quick Send
        </h3>
      </CardHeader>
      
      <CardBody>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {/* Add New Contact */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (onAddContact) onAddContact();
            }}
            className="flex flex-col items-center gap-2 min-w-[80px]"
          >
            <div className="w-16 h-16 rounded-full bg-[rgba(var(--glass-rgb),0.1)] border-2 border-dashed border-[var(--border-1)] flex items-center justify-center hover:border-[var(--primary-blue)] transition-colors">
              <Plus className="w-6 h-6 text-[var(--text-2)]" />
            </div>
            <span className="text-xs text-[var(--text-2)]">Add New</span>
          </motion.button>

          {/* Favorite Contacts */}
          {contacts.map((contact, index) => (
            <motion.button
              key={contact.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectContact(contact);
              }}
              className="flex flex-col items-center gap-2 min-w-[80px] group"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium text-lg group-hover:shadow-lg transition-shadow">
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--primary-emerald)] border-2 border-[var(--bg-color)] flex items-center justify-center">
                  <Send className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-[var(--text-1)] truncate max-w-[80px]">
                  {contact.name.split(' ')[0]}
                </p>
                {contact.lastTransaction && (
                  <p className="text-xs text-[var(--text-2)]">
                    ${contact.lastTransaction.amount}
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default P2PQuickSend;
