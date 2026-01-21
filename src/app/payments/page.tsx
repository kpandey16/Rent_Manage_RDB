"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
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
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

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

  // Check if transaction can show rollback button (payment type with cash/upi)
  const canShowRollback = (transaction: Transaction) => {
    return (
      transaction.type === "payment" &&
      (transaction.payment_method === "cash" || transaction.payment_method === "upi")
    );
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
              {transactions.slice(0, visibleCount).map((transaction) => (
                <Card key={transaction.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <Link href={`/tenants/${transaction.tenant_id}`} className="block">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{transaction.tenant_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                            {transaction.payment_method && ` • ${transaction.payment_method}`}
                          </p>
                          {transaction.appliedTo && (
                            <p className="text-xs text-muted-foreground">
                              Applied to: {transaction.appliedTo}
                            </p>
                          )}
                          {transaction.creditRemaining !== null && transaction.creditRemaining !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {transaction.creditRemaining > 0 ? 'Remaining credit' : transaction.creditRemaining < 0 ? 'Remaining dues' : 'Fully applied'}: {transaction.creditRemaining !== 0 && `₹${Math.abs(transaction.creditRemaining).toLocaleString("en-IN")}`}
                            </p>
                          )}
                          {transaction.description && transaction.description !== "Payment received" && (
                            <p className="text-xs text-muted-foreground">
                              {transaction.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            {(() => {
                              const amount = Number(transaction.amount);
                              const isPositive = amount >= 0;
                              return (
                                <span className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                                  {isPositive ? '+' : ''}₹{Math.abs(amount).toLocaleString("en-IN")}
                                </span>
                              );
                            })()}
                            <Badge variant="outline" className="ml-2 text-xs capitalize">
                              {transaction.type}
                            </Badge>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            {/* Download Receipt button - for payment and credit types */}
                            {(transaction.type === "payment" || transaction.type === "credit") && (
                              <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <DownloadReceiptButton
                                  transactionId={transaction.id}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                />
                              </div>
                            )}

                            {/* Rollback button - only for payment type with cash/upi */}
                            {canShowRollback(transaction) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => handleRollbackClick(e, transaction.id)}
                                title="Rollback payment"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            ) : (
                              !transaction.type.match(/payment|credit/) && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}

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
