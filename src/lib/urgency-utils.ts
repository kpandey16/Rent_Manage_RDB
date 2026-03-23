/**
 * Utility functions for payment urgency indicators
 */

export interface UrgencyLevel {
  level: "critical" | "high" | "medium" | "low" | "none";
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
}

/**
 * Calculate payment urgency based on balance and last payment period
 * @param balance - Current balance (negative means dues, positive means credit)
 * @param lastPaidPeriod - Last payment period in YYYY-MM format
 * @returns Urgency level with styling information
 */
export function getPaymentUrgency(
  balance: number,
  lastPaidPeriod?: string
): UrgencyLevel {
  // No dues - all good
  if (balance >= 0) {
    return {
      level: "none",
      color: "text-green-600",
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      label: "Current",
    };
  }

  // Has dues - calculate how many months overdue
  const monthsOverdue = calculateMonthsOverdue(lastPaidPeriod);

  // Critical: 3+ months overdue OR never paid with dues
  if (monthsOverdue >= 3 || (!lastPaidPeriod && balance < 0)) {
    return {
      level: "critical",
      color: "text-red-600 font-bold",
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      label: "Critical",
    };
  }

  // High: 2 months overdue
  if (monthsOverdue >= 2) {
    return {
      level: "high",
      color: "text-orange-600 font-semibold",
      bgColor: "bg-orange-100",
      textColor: "text-orange-700",
      label: "High Priority",
    };
  }

  // Medium: 1 month overdue
  if (monthsOverdue >= 1) {
    return {
      level: "medium",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-700",
      label: "Due",
    };
  }

  // Low: Current month (just started having dues)
  return {
    level: "low",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    label: "Recent",
  };
}

/**
 * Calculate how many months have passed since last payment
 * @param lastPaidPeriod - Last payment period in YYYY-MM format
 * @returns Number of months overdue
 */
function calculateMonthsOverdue(lastPaidPeriod?: string): number {
  if (!lastPaidPeriod) {
    return 999; // Never paid - treat as critically overdue
  }

  const [year, month] = lastPaidPeriod.split("-").map(Number);
  const lastPayment = new Date(year, month - 1); // month is 0-indexed

  const now = new Date();
  const currentPeriod = new Date(now.getFullYear(), now.getMonth());

  // Calculate difference in months
  const yearsDiff = currentPeriod.getFullYear() - lastPayment.getFullYear();
  const monthsDiff = currentPeriod.getMonth() - lastPayment.getMonth();

  return yearsDiff * 12 + monthsDiff;
}

/**
 * Get badge variant for urgency level (for shadcn Badge component)
 */
export function getUrgencyBadgeVariant(
  urgencyLevel: UrgencyLevel["level"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (urgencyLevel) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "outline";
    case "low":
    case "none":
    default:
      return "default";
  }
}

/**
 * Format urgency message for tooltips or descriptions
 */
export function getUrgencyMessage(
  balance: number,
  lastPaidPeriod?: string
): string {
  if (balance >= 0) {
    return "Account is current";
  }

  const monthsOverdue = calculateMonthsOverdue(lastPaidPeriod);

  if (!lastPaidPeriod) {
    return "No payment history - dues outstanding";
  }

  if (monthsOverdue === 0) {
    return "Payment due this month";
  }

  if (monthsOverdue === 1) {
    return "1 month overdue";
  }

  return `${monthsOverdue} months overdue`;
}
