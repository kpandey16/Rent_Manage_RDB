/**
 * Application Constants
 * Centralized constants for consistent styling and behavior across the application
 */

/**
 * Icon Sizes
 * Standardized icon dimensions using Tailwind classes
 *
 * Usage:
 * <Icon className={ICON_SIZES.md} />
 */
export const ICON_SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',    // Default for most icons
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

/**
 * Status Colors
 * Consistent color schemes for different statuses
 * Format: Tailwind CSS classes for background and text
 */
export const STATUS_COLORS = {
  // Room statuses
  occupied: 'bg-green-100 text-green-700 border-green-200',
  vacant: 'bg-gray-100 text-gray-700 border-gray-200',

  // Payment/Balance statuses
  dues: 'bg-red-100 text-red-700 border-red-200',
  credit: 'bg-green-100 text-green-700 border-green-200',
  settled: 'bg-blue-100 text-blue-700 border-blue-200',

  // General statuses
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-700 border-gray-200',

  // Request/Task statuses
  open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',

  // Transaction types
  payment: 'bg-green-100 text-green-700 border-green-200',
  adjustment: 'bg-blue-100 text-blue-700 border-blue-200',
  refund: 'bg-orange-100 text-orange-700 border-orange-200',
  withdrawal: 'bg-red-100 text-red-700 border-red-200',
} as const;

/**
 * Badge Variants for Transaction Types
 * Maps transaction types to appropriate badge variants
 */
export const TRANSACTION_TYPE_VARIANTS = {
  payment: 'default',
  credit: 'secondary',
  adjustment: 'outline',
  opening_balance: 'secondary',
} as const;

/**
 * Payment Method Colors
 * Color schemes for different payment methods
 */
export const PAYMENT_METHOD_COLORS = {
  cash: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  upi: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  bank_transfer: 'bg-blue-100 text-blue-700 border-blue-200',
  cheque: 'bg-purple-100 text-purple-700 border-purple-200',
} as const;

/**
 * Urgency Colors
 * Color schemes based on payment overdue duration
 *
 * Usage: Apply to balance/dues amounts
 */
export const URGENCY_COLORS = {
  current: 'text-green-600',
  soon: 'text-yellow-600',       // 15-30 days overdue
  overdue: 'text-orange-600',    // 30-60 days overdue
  critical: 'text-red-600 font-bold',  // 60+ days overdue
} as const;

/**
 * Get urgency level based on days overdue
 *
 * @param daysOverdue - Number of days payment is overdue
 * @returns Urgency level key
 */
export const getUrgencyLevel = (daysOverdue: number): keyof typeof URGENCY_COLORS => {
  if (daysOverdue < 0) return 'current';  // Credit/advance
  if (daysOverdue < 15) return 'current';
  if (daysOverdue < 30) return 'soon';
  if (daysOverdue < 60) return 'overdue';
  return 'critical';
};

/**
 * Get urgency color classes based on days overdue
 *
 * @param daysOverdue - Number of days payment is overdue
 * @returns Tailwind CSS classes for text color
 *
 * @example
 * getUrgencyColor(70) // "text-red-600 font-bold"
 * getUrgencyColor(20) // "text-yellow-600"
 */
export const getUrgencyColor = (daysOverdue: number): string => {
  return URGENCY_COLORS[getUrgencyLevel(daysOverdue)];
};

/**
 * Role Colors
 * Color schemes for user roles
 */
export const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  operator: 'bg-blue-100 text-blue-700 border-blue-200',
} as const;

/**
 * Amount Display Configuration
 * Settings for currency formatting
 */
export const CURRENCY_CONFIG = {
  symbol: '₹',
  locale: 'en-IN',
  showSymbol: true,
  showPositiveSign: true,  // Show + for credits
} as const;

/**
 * Format currency amount
 *
 * @param amount - Numeric amount
 * @param showSign - Whether to show +/- sign (defaults to config)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(5000) // "₹5,000"
 * formatCurrency(5000, true) // "+₹5,000"
 * formatCurrency(-5000, true) // "-₹5,000"
 */
export const formatCurrency = (amount: number, showSign?: boolean): string => {
  const formatted = Math.abs(amount).toLocaleString(CURRENCY_CONFIG.locale);
  const sign = amount >= 0 ? '+' : '-';
  const useSign = showSign ?? (amount >= 0 && CURRENCY_CONFIG.showPositiveSign);

  return `${useSign ? sign : ''}${CURRENCY_CONFIG.symbol}${formatted}`;
};

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  loadMoreIncrement: 20,  // For "Load More" pattern
} as const;

/**
 * Date Configuration
 */
export const DATE_CONFIG = {
  defaultFormat: 'DD MMM YYYY',  // e.g., "19 Mar 2026"
  shortFormat: 'DD MMM',         // e.g., "19 Mar"
  monthFormat: 'MMM YYYY',       // e.g., "Mar 2026"
  isoFormat: 'YYYY-MM-DD',       // e.g., "2026-03-19"
} as const;

/**
 * Rent Due Day Configuration
 * Default day of month when rent is due
 */
export const RENT_DUE_DAY = 1;  // 1st of every month

/**
 * Overdue Thresholds
 * Days overdue to trigger different urgency levels
 */
export const OVERDUE_THRESHOLDS = {
  warning: 15,    // Yellow warning
  alert: 30,      // Orange alert
  critical: 60,   // Red critical
} as const;

/**
 * UI Animation Durations (milliseconds)
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Breakpoints (matches Tailwind config)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Z-Index Layers
 * Standardized z-index values for layering
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
} as const;

/**
 * Common CSS Classes
 * Reusable class combinations
 */
export const COMMON_CLASSES = {
  card: 'rounded-lg border bg-card text-card-foreground shadow-sm',
  cardHeader: 'flex flex-col space-y-1.5 p-6',
  cardContent: 'p-6 pt-0',
  badge: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  input: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  button: 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
} as const;

/**
 * Feature Flags
 * Toggle features on/off
 */
export const FEATURES = {
  debugMode: false,           // Show debug info (admin only)
  exportReports: false,       // CSV/PDF export (coming soon)
  advancedSearch: false,      // Advanced search filters (coming soon)
  notifications: false,       // Push notifications (coming soon)
  darkMode: false,           // Dark mode theme (coming soon)
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  timeout: 30000,            // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,          // 1 second
} as const;

/**
 * Validation Rules
 */
export const VALIDATION = {
  phone: {
    minLength: 10,
    maxLength: 15,
    pattern: /^[0-9+\s-()]+$/,
  },
  amount: {
    min: 0,
    max: 1000000,           // 10 lakhs
  },
  name: {
    minLength: 2,
    maxLength: 100,
  },
} as const;
