"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ChevronRight, ChevronDown, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
import { RollbackPaymentDialog } from "@/components/rollback/rollback-payment-dialog";
import { RollbackHistoryTable } from "@/components/rollback/rollback-history-table";
import { DownloadReceiptButton } from "@/components/receipt/download-receipt-button";
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

  // Format date as DD-MMM-YY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <RecordPaymentForm onSubmit={handlePaymentSubmit} />
      </div>

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
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found
            </div>
          ) : (
            <>
              {transactions.slice(0, visibleCount).map((transaction) => {
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
                        className="p-4 cursor-pointer"
                        onClick={() => toggleCardExpansion(transaction.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Tenant name and basic info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isFullyApplied ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                              <span className="font-medium truncate">{transaction.tenant_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(transaction.transaction_date)}</span>
                              {transaction.appliedTo && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">Applied to: {transaction.appliedTo}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Amount, badge, and expand icon */}
                          <div className="flex items-start gap-2">
                            <div className="text-right">
                              <div className={`text-lg font-semibold whitespace-nowrap ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                                {isPositive ? '+' : ''}₹{Math.abs(amount).toLocaleString("en-IN")}
                              </div>
                              <Badge variant="outline" className="text-xs capitalize mt-1">
                                {transaction.type}
                              </Badge>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded View - Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 space-y-3 border-t">
                          <div className="pt-3 space-y-2">
                            {/* Collected by */}
                            {transaction.collectedBy && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Collected by:</span>
                                <span className="font-medium">{transaction.collectedBy}</span>
                              </div>
                            )}

                            {/* Payment method */}
                            {transaction.payment_method && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Payment method:</span>
                                <span className="font-medium capitalize">{transaction.payment_method}</span>
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
              {visibleCount < transactions.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + 10)}
                  >
                    Load 10 More ({transactions.length - visibleCount} remaining)
                  </Button>
                </div>
              )}

              {/* Showing count */}
              {transactions.length > 0 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Showing {Math.min(visibleCount, transactions.length)} of {transactions.length} transactions
                </p>
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
