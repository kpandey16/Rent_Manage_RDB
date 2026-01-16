"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ChevronRight, Loader2 } from "lucide-react";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <RecordPaymentForm onSubmit={handlePaymentSubmit} />
      </div>

      <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Record your first payment above!
            </div>
          ) : (
            <>
              {transactions.slice(0, visibleCount).map((transaction) => (
                <Link key={transaction.id} href={`/tenants/${transaction.tenant_id}`}>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
      </div>
    </div>
  );
}
