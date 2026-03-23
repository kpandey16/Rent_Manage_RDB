"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, ChevronDown, Loader2, RotateCcw, Search, Filter, X, Calendar, ArrowUpDown } from "lucide-react";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
import { RollbackPaymentDialog } from "@/components/rollback/rollback-payment-dialog";
import { RollbackHistoryTable } from "@/components/rollback/rollback-history-table";
import { DownloadReceiptButton } from "@/components/receipt/download-receipt-button";
import { PAYMENT_METHOD_COLORS } from "@/lib/constants";
import { toast } from "sonner";

interface Transaction {
  id: string;
  tenant_id: string;
  tenant_name: string;
  transaction_date: string;
  type: string;
  amount: number;
  payment_method: string | null;
  description: string | null;
  created_at: string;
  appliedTo?: string;
  creditRemaining?: number | null;
  collectedBy?: string | null;
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "name-asc" | "name-desc">("date-desc");

  // Format date as DD MMM YYYY (single line, no hyphens)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = () => {
    // Refresh transactions after recording payment
    fetchTransactions();
  };

  const handleRollbackClick = (e: React.MouseEvent, ledgerId: string) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    setSelectedLedgerId(ledgerId);
    setRollbackDialogOpen(true);
  };

  const handleRollbackSuccess = () => {
    fetchTransactions();
    setSelectedLedgerId(null);
  };

  const toggleCardExpansion = (transactionId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  // Check if transaction can show rollback button
  const canShowRollback = (transaction: Transaction) => {
    // Allow rollback for:
    // 1. Cash/UPI payments
    // 2. Adjustments (discount, maintenance, other)
    if (transaction.type === "payment") {
      return transaction.payment_method === "cash" || transaction.payment_method === "upi";
    }
    if (transaction.type === "adjustment") {
      return true; // All adjustments can be rolled back within 24 hours if not applied to rent
    }
    return false;
  };

  // Helper function to get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let fromDate: Date | null = null;

    switch (dateRangeFilter) {
      case "7days":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1month":
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 1);
        break;
      case "6months":
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 6);
        break;
      case "custom":
        if (customDateFrom) {
          fromDate = new Date(customDateFrom);
        }
        break;
      default:
        return null;
    }

    return fromDate;
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Search filter (tenant name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.tenant_name.toLowerCase().includes(query)
      );
    }

    // 2. Payment method filter
    if (paymentMethodFilter !== "all") {
      result = result.filter(t =>
        t.payment_method === paymentMethodFilter
      );
    }

    // 3. Date range filter
    const fromDate = getDateRange();
    if (fromDate) {
      const toDate = dateRangeFilter === "custom" && customDateTo
        ? new Date(customDateTo)
        : new Date();

      result = result.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= fromDate && transactionDate <= toDate;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        case "date-asc":
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        case "amount-desc":
          return Math.abs(b.amount) - Math.abs(a.amount);
        case "amount-asc":
          return Math.abs(a.amount) - Math.abs(b.amount);
        case "name-asc":
          return a.tenant_name.localeCompare(b.tenant_name);
        case "name-desc":
          return b.tenant_name.localeCompare(a.tenant_name);
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, searchQuery, paymentMethodFilter, dateRangeFilter, customDateFrom, customDateTo, sortBy]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (paymentMethodFilter !== "all") count++;
    if (dateRangeFilter !== "all") count++;
    return count;
  }, [searchQuery, paymentMethodFilter, dateRangeFilter]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setPaymentMethodFilter("all");
    setDateRangeFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    setSortBy("date-desc");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <RecordPaymentForm onSubmit={handlePaymentSubmit} />
      </div>

      {/* Filter Bar */}
      <Card className="sticky top-0 z-10 bg-background shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* First Row: Search, Payment Method, Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Payment Method Filter */}
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Payment Method" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">💵 Cash Only</SelectItem>
                <SelectItem value="upi">📱 UPI Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <SelectValue placeholder="Date Range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="1month">Last 1 Month</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range (shown when custom is selected) */}
          {dateRangeFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Second Row: Sort & Clear Filters */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="amount-desc">Amount (High)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>

              {/* Active Filter Count */}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </Badge>
              )}
            </div>

            {/* Clear All Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground pt-2 border-t">
            Showing <span className="font-medium text-foreground">{filteredAndSortedTransactions.length}</span> of{" "}
            <span className="font-medium text-foreground">{transactions.length}</span> payments
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payments" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="rollback">Rollback History</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {activeFilterCount > 0 ? (
                <div className="space-y-2">
                  <p>No payments match your filters</p>
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              ) : (
                "No payments found"
              )}
            </div>
          ) : (
            <>
              {filteredAndSortedTransactions.slice(0, visibleCount).map((transaction) => {
                const isExpanded = expandedCards.has(transaction.id);
                const amount = Number(transaction.amount);
                const isPositive = amount >= 0;
                const isFullyApplied = transaction.creditRemaining === 0;
                const hasCredit = transaction.creditRemaining !== null && transaction.creditRemaining !== undefined && transaction.creditRemaining > 0;

                return (
                  <Card key={transaction.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-0">
                      {/* Collapsed View - Always Visible */}
                      <div
                        className="p-3.5 cursor-pointer"
                        onClick={() => toggleCardExpansion(transaction.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Left: Tenant name and info */}
                          <div className="flex-1 min-w-0">
                            {/* Tenant name + Amount on same line */}
                            <div className="flex items-baseline justify-between gap-3 mb-1">
                              <span className="font-medium text-base truncate">{transaction.tenant_name}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-lg font-semibold whitespace-nowrap ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                                  {isPositive ? '+' : ''}₹{Math.abs(amount).toLocaleString("en-IN")}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Date • Period • Payment Method */}
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
                              <span className="whitespace-nowrap">{formatDate(transaction.transaction_date)}</span>
                              {transaction.appliedTo && (
                                <>
                                  <span>•</span>
                                  <span className="whitespace-nowrap">{transaction.appliedTo}</span>
                                </>
                              )}
                              {transaction.payment_method && (
                                <>
                                  <span>•</span>
                                  <Badge
                                    variant="outline"
                                    className={`capitalize ${PAYMENT_METHOD_COLORS[transaction.payment_method as keyof typeof PAYMENT_METHOD_COLORS] || 'bg-gray-100 text-gray-700'}`}
                                  >
                                    {transaction.payment_method}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded View - Details */}
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t">
                          <div className="pt-3 space-y-2">
                            {/* Collected by */}
                            {transaction.collectedBy && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Collected by:</span>
                                <span className="font-medium">{transaction.collectedBy}</span>
                              </div>
                            )}

                            {/* Breakdown */}
                            <div className="text-sm space-y-1">
                              <div className="font-medium text-muted-foreground">Breakdown:</div>
                              {transaction.appliedTo ? (
                                <div className="pl-3">
                                  <div className="flex justify-between">
                                    <span>Applied to rent:</span>
                                    <span className="font-medium">₹{Math.abs(amount).toLocaleString("en-IN")}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">({transaction.appliedTo})</div>
                                </div>
                              ) : (
                                <div className="pl-3 text-muted-foreground italic">
                                  Credit added only (no rent periods paid)
                                </div>
                              )}

                              {hasCredit && transaction.creditRemaining && (
                                <div className="pl-3 flex justify-between pt-1 border-t">
                                  <span className="text-muted-foreground">→ Remaining credit:</span>
                                  <span className="font-medium text-green-600">
                                    ₹{transaction.creditRemaining.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {transaction.description && transaction.description !== "Payment received" && (
                              <div className="text-sm pt-2 border-t">
                                <div className="text-muted-foreground mb-1">📝 Note:</div>
                                <div className="text-foreground">{transaction.description}</div>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-2">
                              <Link href={`/tenants/${transaction.tenant_id}`}>
                                <Button variant="outline" size="sm">
                                  View Tenant Details
                                </Button>
                              </Link>

                              {/* Download Receipt button */}
                              {(transaction.type === "payment" || transaction.type === "credit") && (
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                  <DownloadReceiptButton
                                    transactionId={transaction.id}
                                    variant="outline"
                                    size="sm"
                                  />
                                </div>
                              )}

                              {/* Rollback button */}
                              {canShowRollback(transaction) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRollbackClick(e, transaction.id);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Rollback
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Load More Button */}
              {visibleCount < filteredAndSortedTransactions.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + 10)}
                  >
                    Load 10 More ({filteredAndSortedTransactions.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rollback" className="mt-4">
          <RollbackHistoryTable />
        </TabsContent>
      </Tabs>

      {/* Rollback Dialog */}
      {selectedLedgerId && (
        <RollbackPaymentDialog
          open={rollbackDialogOpen}
          onOpenChange={setRollbackDialogOpen}
          ledgerId={selectedLedgerId}
          onSuccess={handleRollbackSuccess}
        />
      )}
    </div>
  );
}
