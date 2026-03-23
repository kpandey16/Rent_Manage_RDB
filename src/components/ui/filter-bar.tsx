/**
 * FilterBar Component
 *
 * Mobile-optimized filter bar that collapses filters into a sheet
 * Desktop shows filters inline
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchFilter } from "@/components/search-filter";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export interface FilterBarProps {
  /** Search query */
  searchQuery?: string;

  /** Search change handler */
  onSearchChange?: (value: string) => void;

  /** Search placeholder */
  searchPlaceholder?: string;

  /** Filter configurations */
  filters?: FilterConfig[];

  /** Show search on mobile (default: true) */
  showSearchOnMobile?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Active filter count (for badge) */
  activeFilterCount?: number;
}

/**
 * FilterBar - Responsive filter bar component
 *
 * Mobile: Collapses into a single "Filters" button that opens a sheet
 * Desktop: Shows all filters inline
 *
 * @example
 * <FilterBar
 *   searchQuery={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Search payments..."
 *   filters={[
 *     {
 *       id: "method",
 *       label: "Payment Method",
 *       value: methodFilter,
 *       options: [
 *         { label: "All Methods", value: "all" },
 *         { label: "Cash", value: "cash" },
 *       ],
 *       onChange: setMethodFilter,
 *     }
 *   ]}
 * />
 */
export function FilterBar({
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  showSearchOnMobile = true,
  className,
  activeFilterCount,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters (non-default values)
  const activeCount = activeFilterCount ?? filters.filter(f =>
    f.value && f.value !== "all" && f.value !== ""
  ).length;

  const hasSearch = onSearchChange !== undefined;
  const hasFilters = filters.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile View - Compact */}
      <div className="md:hidden">
        <div className="flex gap-2">
          {/* Search (always visible on mobile if enabled) */}
          {hasSearch && showSearchOnMobile && (
            <div className="flex-1">
              <SearchFilter
                value={searchQuery}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          {/* Filters Button */}
          {hasFilters && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Filter and sort your results
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] pb-6">
                  {/* Search in sheet (if not shown above) */}
                  {hasSearch && !showSearchOnMobile && (
                    <div className="space-y-2">
                      <Label>Search</Label>
                      <SearchFilter
                        value={searchQuery}
                        onChange={onSearchChange}
                        placeholder={searchPlaceholder}
                      />
                    </div>
                  )}

                  {/* Filter Selects */}
                  {filters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <Label htmlFor={filter.id}>{filter.label}</Label>
                      <Select value={filter.value} onValueChange={filter.onChange}>
                        <SelectTrigger id={filter.id}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}

                  {/* Clear Filters */}
                  {activeCount > 0 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        filters.forEach(f => {
                          const defaultValue = f.options[0]?.value || "all";
                          if (f.value !== defaultValue) {
                            f.onChange(defaultValue);
                          }
                        });
                        if (onSearchChange && searchQuery) {
                          onSearchChange("");
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>

                {/* Apply Button */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
                  <Button className="w-full" onClick={() => setIsOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Desktop View - Expanded */}
      <div className="hidden md:block">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          {hasSearch && (
            <div className="flex-1">
              <SearchFilter
                value={searchQuery}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          {/* Filter Selects */}
          {filters.map((filter) => (
            <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                {filter.icon}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </div>
    </div>
  );
}
