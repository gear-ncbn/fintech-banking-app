import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import { Subscription } from '@/app/(authenticated)/subscriptions/page';

interface SubscriptionCalendarProps {
  subscriptions: Subscription[];
}

export const SubscriptionCalendar: React.FC<SubscriptionCalendarProps> = ({ subscriptions }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getSubscriptionsForDate = (date: Date) => {
    return subscriptions.filter(sub => {
      if (sub.status !== 'active') return false;
      const billingDate = new Date(sub.nextBilling);
      return billingDate.getDate() === date.getDate() &&
             billingDate.getMonth() === date.getMonth() &&
             billingDate.getFullYear() === date.getFullYear();
    });
  };

  const getTotalForDate = (date: Date) => {
    const subs = getSubscriptionsForDate(date);
    return subs.reduce((total, sub) => total + sub.amount, 0);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(direction === 'prev' ? prev.getMonth() - 1 : prev.getMonth() + 1);
      return newDate;
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(0)}`;
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate total for the month
  const monthlyTotal = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return getTotalForDate(date);
  }).reduce((sum, amount) => sum + amount, 0);

  // Get upcoming renewals
  const today = new Date();
  const upcomingRenewals = subscriptions.filter(sub => {
    if (sub.status !== 'active') return false;
    const billingDate = new Date(sub.nextBilling);
    const daysDiff = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 7;
  });

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-1)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--primary-blue)]" />
              Billing Calendar
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronLeft size={16} />}
                onClick={() => navigateMonth('prev')}
              />
              <span className="text-sm font-medium text-[var(--text-1)] min-w-[120px] text-center">
                {monthYear}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronRight size={16} />}
                onClick={() => navigateMonth('next')}
              />
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {/* Month Total */}
          <div className="mb-4 p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] text-center">
            <p className="text-sm text-[var(--text-2)]">Total for {monthYear}</p>
            <p className="text-xl font-bold text-[var(--text-1)]">
              ${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map(day => (
              <div key={day} className="text-center text-xs font-medium text-[var(--text-2)] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
              const subs = getSubscriptionsForDate(date);
              const totalAmount = getTotalForDate(date);
              const isToday = date.toDateString() === today.toDateString();
              const isPast = date < today && !isToday;

              return (
                <motion.div
                  key={i + 1}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={`
                    aspect-square p-1 rounded-lg border relative
                    ${isToday 
                      ? 'border-[var(--primary-blue)] bg-[rgba(var(--primary-blue),0.1)]' 
                      : subs.length > 0
                      ? 'border-[var(--border-1)] bg-[rgba(var(--glass-rgb),0.05)]'
                      : 'border-transparent'
                    }
                    ${isPast ? 'opacity-50' : ''}
                    ${subs.length > 0 && !isPast ? 'cursor-pointer hover:bg-[rgba(var(--glass-rgb),0.1)]' : ''}
                  `}
                >
                  <div className="flex flex-col h-full">
                    <span className={`text-xs ${isToday ? 'font-bold text-[var(--primary-blue)]' : 'text-[var(--text-1)]'}`}>
                      {i + 1}
                    </span>
                    
                    {subs.length > 0 && (
                      <div className="flex-1 flex flex-col justify-end">
                        <div className="text-center">
                          <p className="text-xs font-medium text-[var(--text-1)]">
                            {subs.length}
                          </p>
                          <p className="text-xs text-[var(--primary-blue)]">
                            {formatCurrency(totalAmount)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Upcoming Renewals */}
      {upcomingRenewals.length > 0 && (
        <Card variant="subtle">
          <CardHeader>
            <h3 className="text-sm font-medium text-[var(--text-1)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--primary-amber)]" />
              Upcoming Renewals
            </h3>
          </CardHeader>
          
          <CardBody>
            <div className="space-y-2">
              {upcomingRenewals.slice(0, 5).map((sub) => {
                const daysUntil = Math.ceil((new Date(sub.nextBilling).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.05)]"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded bg-gradient-to-r ${sub.color}`}>
                        {React.cloneElement(sub.icon as React.ReactElement<{ className?: string }>, { className: 'w-3 h-3' })}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {sub.name}
                        </p>
                        <p className="text-xs text-[var(--text-2)]">
                          {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-1)]">
                      ${sub.amount.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionCalendar;