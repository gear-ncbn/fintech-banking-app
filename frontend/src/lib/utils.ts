/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Coerce string/Decimal-serialized inputs and guard against non-finite values.
  amount = Number(amount);
  if (!Number.isFinite(amount)) amount = 0;
  // Normalize values that round to zero so we never render a signed "-$0.00".
  amount = Math.round((amount + Number.EPSILON) * 100) / 100;
  if (amount === 0) amount = 0;
  const cryptoSymbols: Record<string, string> = { BTC: '₿', ETH: 'Ξ', USDT: '₮' };
  if (cryptoSymbols[currency]) {
    return `${cryptoSymbols[currency]}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount)}`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }
}

/**
 * Format a percentage
 * @param value - The percentage value (e.g., 0.05 for 5%)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format a number with thousands separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Truncate a string to a specified length
 * @param str - The string to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Convert a string to title case
 * @param str - The string to convert
 * @returns Title cased string
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Format a Date as a local YYYY-MM-DD string (no UTC shift).
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type StatsPeriod = 'week' | 'month' | 'quarter' | 'year';

/**
 * Canonical date range for transaction-stats queries.
 *
 * Returns a calendar-aligned, inclusive window (start of the period through
 * today) as local YYYY-MM-DD strings. The default `month` resolves to the
 * current calendar month, which is exactly the window the backend uses for
 * monthly budgets and the analytics cash-flow summary. Sharing this single
 * helper across the Dashboard, Transactions, Analytics and Budget views
 * guarantees the same period always resolves to the same window — and
 * therefore the same income / expense / net-flow figures across pages.
 */
export function getStatsDateRange(period: StatsPeriod = 'month'): { start: string; end: string } {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (period) {
    case 'week': {
      // Start of the current week (Monday).
      const day = (now.getDay() + 6) % 7; // 0 = Monday
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      break;
    }
    case 'quarter': {
      // Start of the current calendar quarter.
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    }
    case 'year': {
      // Start of the current calendar year.
      start = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case 'month':
    default: {
      // Start of the current calendar month.
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
  }

  return { start: getLocalDateString(start), end: getLocalDateString(end) };
}

const DAYS_PER_MONTH = 30;

/**
 * Whole days remaining until a target date (never negative).
 */
export function getDaysRemaining(targetDate: string | Date): number {
  const msLeft = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

/**
 * Months remaining until a target date, derived from days so that goal
 * contribution math is identical wherever it is computed. Always at least 1
 * to avoid divide-by-zero / runaway contribution figures.
 */
export function getMonthsRemaining(targetDate: string | Date): number {
  return Math.max(1, getDaysRemaining(targetDate) / DAYS_PER_MONTH);
}

/**
 * Canonical monthly contribution needed to reach a savings goal. Shared by the
 * Goals and Budget views so the same goal always reports the same figure.
 */
export function getMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  targetDate: string | Date
): number {
  const amountNeeded = Math.max(0, (Number(targetAmount) || 0) - (Number(currentAmount) || 0));
  return amountNeeded / getMonthsRemaining(targetDate);
}