/**
 * Pagination Component
 *
 * A reusable pagination component with page numbers and navigation
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;

  /** Callback when page changes */
  onPageChange: (page: number) => void;

  /** Show page numbers (default: true) */
  showPageNumbers?: boolean;

  /** Maximum page buttons to show (default: 5) */
  maxPageButtons?: number;

  /** Show "First" and "Last" buttons (default: false) */
  showFirstLast?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Size variant */
  size?: "sm" | "default" | "lg";
}

/**
 * Pagination - Navigate through pages of data
 *
 * @example
 * <Pagination
 *   currentPage={page}
 *   totalPages={10}
 *   onPageChange={setPage}
 * />
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  maxPageButtons = 5,
  showFirstLast = false,
  className,
  size = "default",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "default";

  // Calculate page numbers to show
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    const halfMax = Math.floor(maxPageButtons / 2);

    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    // Adjust if we're near the start
    if (currentPage <= halfMax) {
      endPage = Math.min(totalPages, maxPageButtons);
    }

    // Adjust if we're near the end
    if (currentPage >= totalPages - halfMax) {
      startPage = Math.max(1, totalPages - maxPageButtons + 1);
    }

    // Always show first page
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push("...");
    }

    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Always show last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = showPageNumbers ? getPageNumbers() : [];

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {/* First button */}
      {showFirstLast && (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Go to first page"
        >
          First
        </Button>
      )}

      {/* Previous button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        {size !== "sm" && <span className="ml-1">Prev</span>}
      </Button>

      {/* Page numbers */}
      {showPageNumbers &&
        pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground"
              >
                ...
              </span>
            );
          }

          const isCurrentPage = page === currentPage;

          return (
            <Button
              key={page}
              variant={isCurrentPage ? "default" : "outline"}
              size={buttonSize}
              onClick={() => onPageChange(page as number)}
              className={cn(
                "min-w-[40px]",
                isCurrentPage && "pointer-events-none"
              )}
              aria-label={`Go to page ${page}`}
              aria-current={isCurrentPage ? "page" : undefined}
            >
              {page}
            </Button>
          );
        })}

      {/* Next button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        {size !== "sm" && <span className="mr-1">Next</span>}
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last button */}
      {showFirstLast && (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
        >
          Last
        </Button>
      )}
    </div>
  );
}

/**
 * PaginationInfo - Display pagination information
 *
 * @example
 * <PaginationInfo page={1} limit={20} total={100} />
 * // Shows: "Showing 1-20 of 100"
 */
export function PaginationInfo({
  page,
  limit,
  total,
  className,
}: {
  page: number;
  limit: number;
  total: number;
  className?: string;
}) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (total === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No items
      </div>
    );
  }

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Showing {start}-{end} of {total}
    </div>
  );
}
