/**
 * ListCard Component
 *
 * A reusable, flexible card component for displaying list items
 * Used across tenants, payments, rooms, and other list pages
 *
 * Features:
 * - Compact, mobile-optimized design
 * - Clickable with hover effects
 * - Flexible content slots (title, subtitle, metadata, badge)
 * - Consistent styling across app
 * - TypeScript support
 */

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListCardProps {
  /** Main title (tenant name, room code, etc.) */
  title: string;

  /** Subtitle or secondary info (phone, address, etc.) */
  subtitle?: string;

  /** Array of metadata items to display inline */
  metadata?: {
    label?: string;
    value: string | React.ReactNode;
    className?: string;
  }[];

  /** Badge configuration for status/amount */
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  };

  /** Link URL (makes card clickable) */
  href?: string;

  /** Click handler (alternative to href) */
  onClick?: () => void;

  /** Show chevron icon on right */
  showChevron?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Children for custom content */
  children?: React.ReactNode;
}

/**
 * ListCard - Reusable card component for list views
 *
 * @example
 * // Simple tenant card
 * <ListCard
 *   title="Ram avadh Yadav"
 *   subtitle="9876543210"
 *   metadata={[
 *     { value: "R1, R2" },
 *     { value: "Last paid: Feb 2026" }
 *   ]}
 *   badge={{ label: "₹-5,000", variant: "destructive" }}
 *   href="/tenants/123"
 * />
 *
 * @example
 * // Custom content
 * <ListCard title="Room R1" subtitle="Occupied">
 *   <div className="flex justify-between">
 *     <span>Monthly Rent</span>
 *     <span className="font-bold">₹5,000</span>
 *   </div>
 * </ListCard>
 */
export function ListCard({
  title,
  subtitle,
  metadata = [],
  badge,
  href,
  onClick,
  showChevron = true,
  className,
  children,
}: ListCardProps) {
  const content = (
    <Card className={cn(
      "hover:bg-muted/50 transition-colors",
      (href || onClick) && "cursor-pointer",
      className
    )}>
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Main content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title row with optional badge */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium text-base truncate">{title}</h3>
              {badge && (
                <Badge
                  variant={badge.variant || "outline"}
                  className={cn("flex-shrink-0 whitespace-nowrap", badge.className)}
                >
                  {badge.label}
                </Badge>
              )}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}

            {/* Metadata items (inline with bullets) */}
            {metadata.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
                {metadata.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>•</span>}
                    {item.label && (
                      <span className="text-xs text-muted-foreground/70">{item.label}:</span>
                    )}
                    <span className={item.className}>{item.value}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Custom children */}
            {children}
          </div>

          {/* Right: Chevron */}
          {showChevron && (href || onClick) && (
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Wrap in Link if href provided
  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  // Wrap in div with onClick if provided
  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  // Return plain card
  return content;
}

/**
 * ListCardSkeleton - Loading skeleton for ListCard
 */
export function ListCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * CompactStat - Inline stat display for metadata
 *
 * @example
 * <CompactStat label="Rooms" value="R1, R2" />
 * <CompactStat label="Balance" value="₹5,000" className="text-red-600" />
 */
export function CompactStat({
  label,
  value,
  className,
}: {
  label?: string;
  value: string | React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {label && <span className="text-xs text-muted-foreground/70">{label}:</span>}
      <span>{value}</span>
    </span>
  );
}
