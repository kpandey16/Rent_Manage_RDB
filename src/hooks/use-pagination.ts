/**
 * Pagination Hook
 *
 * Manages pagination state and provides helper functions
 */

import { useState, useCallback } from "react";

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UsePaginationOptions {
  /** Initial page (default: 1) */
  initialPage?: number;

  /** Items per page (default: 20) */
  limit?: number;
}

export interface UsePaginationReturn {
  /** Current page number */
  page: number;

  /** Items per page */
  limit: number;

  /** Total items (from API) */
  total: number;

  /** Total pages (from API) */
  totalPages: number;

  /** Whether there are more pages */
  hasMore: boolean;

  /** Go to specific page */
  goToPage: (page: number) => void;

  /** Go to next page */
  nextPage: () => void;

  /** Go to previous page */
  prevPage: () => void;

  /** Reset to first page */
  reset: () => void;

  /** Update pagination from API response */
  setPagination: (data: Partial<PaginationState>) => void;

  /** Get query params for API call */
  getQueryParams: () => { page: number; limit: number };
}

/**
 * Hook to manage pagination state
 *
 * @example
 * const pagination = usePagination({ limit: 20 });
 *
 * // In fetch function:
 * const params = pagination.getQueryParams();
 * const data = await fetch(`/api/data?page=${params.page}&limit=${params.limit}`);
 * pagination.setPagination(data.pagination);
 *
 * // In UI:
 * <Pagination
 *   currentPage={pagination.page}
 *   totalPages={pagination.totalPages}
 *   onPageChange={pagination.goToPage}
 * />
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { initialPage = 1, limit: initialLimit = 20 } = options;

  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const goToPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: prev.hasMore ? prev.page + 1 : prev.page,
    }));
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, prev.page - 1),
    }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: initialPage,
    }));
  }, [initialPage]);

  const setPagination = useCallback((data: Partial<PaginationState>) => {
    setState((prev) => ({
      ...prev,
      ...data,
      // Recalculate hasMore if totalPages is provided
      hasMore: data.totalPages
        ? (data.page || prev.page) < data.totalPages
        : data.hasMore ?? prev.hasMore,
    }));
  }, []);

  const getQueryParams = useCallback(() => {
    return {
      page: state.page,
      limit: state.limit,
    };
  }, [state.page, state.limit]);

  return {
    page: state.page,
    limit: state.limit,
    total: state.total,
    totalPages: state.totalPages,
    hasMore: state.hasMore,
    goToPage,
    nextPage,
    prevPage,
    reset,
    setPagination,
    getQueryParams,
  };
}
