/**
 * Date Utilities
 * Centralized date formatting to ensure consistency across the application
 */

/**
 * Format date as "DD MMM YYYY" (e.g., "19 Mar 2026")
 * This is the standard format used throughout the application
 *
 * @param date - Date string or Date object
 * @returns Formatted date string
 *
 * @example
 * formatDate("2026-03-19") // "19 Mar 2026"
 * formatDate(new Date()) // "19 Mar 2026"
 */
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format date as "DD MMM" (e.g., "19 Mar")
 * Used for compact displays where year is obvious from context
 *
 * @param date - Date string or Date object
 * @returns Formatted date string without year
 *
 * @example
 * formatDateShort("2026-03-19") // "19 Mar"
 */
export const formatDateShort = (date: string | Date): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Format date as "MMM YYYY" (e.g., "Mar 2026")
 * Used for month-year displays in reports and period labels
 *
 * @param date - Date string or Date object
 * @returns Formatted month-year string
 *
 * @example
 * formatMonthYear("2026-03-19") // "Mar 2026"
 * formatMonthYear("2026-03") // "Mar 2026"
 */
export const formatMonthYear = (date: string | Date): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  return d.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format date as "YYYY-MM" (e.g., "2026-03")
 * Used for API parameters and database storage
 *
 * @param date - Date string or Date object
 * @returns ISO month format
 *
 * @example
 * formatISOMonth("2026-03-19") // "2026-03"
 */
export const formatISOMonth = (date: string | Date): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Format date for input[type="date"] elements (YYYY-MM-DD)
 *
 * @param date - Date string or Date object
 * @returns ISO date format
 *
 * @example
 * formatDateForInput(new Date()) // "2026-03-19"
 */
export const formatDateForInput = (date: string | Date): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return '';
  }

  return d.toISOString().split('T')[0];
};

/**
 * Calculate days between two dates
 *
 * @param from - Start date
 * @param to - End date (defaults to today)
 * @returns Number of days between dates
 *
 * @example
 * daysBetween("2026-01-01", "2026-01-15") // 14
 * daysBetween("2026-01-01") // days from Jan 1 to today
 */
export const daysBetween = (from: string | Date, to?: string | Date): number => {
  const fromDate = new Date(from);
  const toDate = to ? new Date(to) : new Date();

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate days since a date (always positive)
 *
 * @param date - Past date
 * @returns Number of days from date to today
 *
 * @example
 * daysSince("2026-01-01") // e.g., 77 (if today is Mar 19)
 */
export const daysSince = (date: string | Date): number => {
  return daysBetween(date, new Date());
};

/**
 * Format relative time (e.g., "2 days ago", "in 3 days")
 *
 * @param date - Date to compare
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime("2026-03-17") // "2 days ago"
 * formatRelativeTime("2026-03-21") // "in 2 days"
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};

/**
 * Check if date is in the past
 *
 * @param date - Date to check
 * @returns true if date is before today
 */
export const isPast = (date: string | Date): boolean => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

/**
 * Check if date is in the future
 *
 * @param date - Date to check
 * @returns true if date is after today
 */
export const isFuture = (date: string | Date): boolean => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today;
};

/**
 * Get start of month for a date
 *
 * @param date - Date in the month
 * @returns Date object for first day of month
 */
export const getMonthStart = (date: string | Date): Date => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Get end of month for a date
 *
 * @param date - Date in the month
 * @returns Date object for last day of month
 */
export const getMonthEnd = (date: string | Date): Date => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

/**
 * Format date range as "MMM YYYY" or "MMM-MMM YYYY" if different months
 * Used for displaying payment periods
 *
 * @param from - Start date
 * @param to - End date (optional)
 * @returns Formatted period string
 *
 * @example
 * formatPeriod("2026-01-01", "2026-01-31") // "Jan 2026"
 * formatPeriod("2026-01-01", "2026-03-31") // "Jan-Mar 2026"
 */
export const formatPeriod = (from: string | Date, to?: string | Date): string => {
  const fromDate = new Date(from);

  if (isNaN(fromDate.getTime())) {
    return 'Invalid Period';
  }

  if (!to) {
    return formatMonthYear(fromDate);
  }

  const toDate = new Date(to);

  if (isNaN(toDate.getTime())) {
    return formatMonthYear(fromDate);
  }

  // Same month and year
  if (fromDate.getFullYear() === toDate.getFullYear() &&
      fromDate.getMonth() === toDate.getMonth()) {
    return formatMonthYear(fromDate);
  }

  // Same year, different months
  if (fromDate.getFullYear() === toDate.getFullYear()) {
    const fromMonth = fromDate.toLocaleDateString('en-GB', { month: 'short' });
    const toMonth = toDate.toLocaleDateString('en-GB', { month: 'short' });
    return `${fromMonth}-${toMonth} ${fromDate.getFullYear()}`;
  }

  // Different years
  return `${formatMonthYear(fromDate)} - ${formatMonthYear(toDate)}`;
};

/**
 * Parse YYYY-MM format to readable format
 *
 * @param period - Period in YYYY-MM format (e.g., "2026-03")
 * @returns Formatted period (e.g., "Mar 2026")
 *
 * @example
 * parsePeriod("2026-03") // "Mar 2026"
 */
export const parsePeriod = (period: string): string => {
  // Handle "YYYY-MM" format
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = match[1];
    const month = match[2];
    return formatMonthYear(`${year}-${month}-01`);
  }
  return period;
};
