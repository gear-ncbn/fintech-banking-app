import type { ReactNode } from 'react';

export interface Subscription {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: ReactNode;
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

// On average a month is 52/12 weeks. Using a single constant (instead of 4 in
// some places and 52 in others) keeps monthly and yearly cost in sync so that
// yearly always equals monthly * 12.
export const WEEKS_PER_MONTH = 52 / 12;

// Canonical per-subscription cost conversions. Every monthly/yearly figure on
// this page is derived from these so the totals can never disagree.
export const getSubscriptionMonthlyCost = (
  sub: Pick<Subscription, 'billing' | 'amount'>
): number => {
  switch (sub.billing) {
    case 'yearly':
      return sub.amount / 12;
    case 'weekly':
      return sub.amount * WEEKS_PER_MONTH;
    default:
      return sub.amount;
  }
};

export const getSubscriptionYearlyCost = (
  sub: Pick<Subscription, 'billing' | 'amount'>
): number => getSubscriptionMonthlyCost(sub) * 12;
