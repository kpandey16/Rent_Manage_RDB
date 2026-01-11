"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, IndianRupee, Calendar, Loader2 } from "lucide-react";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
import { RecordWithdrawalForm } from "@/components/forms/record-withdrawal-form";
import { toast } from "sonner";

type PeriodFilter = "1w" | "1m" | "3m" | "6m" | "1y" | "custom" | "all";

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

interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
}

function getDateThreshold(period: PeriodFilter): Date {
  const now = new Date();
  switch (period) {
    case "1w":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "all":
    case "custom":
    default:
      return new Date(0);
  }
}

export default function PaymentsPage() {
  const [withdrawalPeriod, setWithdrawalPeriod] = useState<PeriodFilter>("1m");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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

  // For now, withdrawals are empty until we implement withdrawal tracking
  const allWithdrawals: Withdrawal[] = [];

  const filteredWithdrawals = useMemo(() => {
    if (withdrawalPeriod === "custom") {
      const from = customFromDate ? new Date(customFromDate) : new Date(0);
      const to = customToDate ? new Date(customToDate + "T23:59:59") : new Date();
      return allWithdrawals.filter((w) => {
        const date = new Date(w.date);
        return date >= from && date <= to;
      });
    }
    const threshold = getDateThreshold(withdrawalPeriod);
    return allWithdrawals.filter((w) => new Date(w.date) >= threshold);
  }, [withdrawalPeriod, customFromDate, customToDate, allWithdrawals]);

  const withdrawalTotal = useMemo(() => {
    return filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  }, [filteredWithdrawals]);

  const getPeriodLabel = (): string => {
    if (withdrawalPeriod === "custom") {
      if (customFromDate && customToDate) {
        return `${format(new Date(customFromDate), "dd MMM")} - ${format(new Date(customToDate), "dd MMM yyyy")}`;
      } else if (customFromDate) {
        return `From ${format(new Date(customFromDate), "dd MMM yyyy")}`;
      } else if (customToDate) {
        return `Until ${format(new Date(customToDate), "dd MMM yyyy")}`;
      }
      return "Custom Range";
    }
    const labels: Record<PeriodFilter, string> = {
      "1w": "Last Week",
      "1m": "Last Month",
      "3m": "Last 3 Months",
      "6m": "Last 6 Months",
      "1y": "Last Year",
      "custom": "Custom Range",
      "all": "All Time",
    };
    return labels[withdrawalPeriod];
  };

  const handlePaymentSubmit = () => {
    // Refresh transactions after recording payment
    fetchTransactions();
  };

  const handleWithdrawalSuccess = () => {
    // Refresh transactions after recording withdrawal
    // Note: Main withdrawal tracking is now in /cash-management page
    toast.success("Withdrawal recorded. View full details in Cash Management.");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <RecordPaymentForm onSubmit={handlePaymentSubmit} />
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Record your first payment above!
            </div>
          ) : (
            transactions.map((transaction) => (
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
            ))
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4 space-y-4">
          {/* Period Filter */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Select value={withdrawalPeriod} onValueChange={(v) => setWithdrawalPeriod(v as PeriodFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1w">Last Week</SelectItem>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <RecordWithdrawalForm onSuccess={handleWithdrawalSuccess} />
            </div>

            {/* Custom Date Range Inputs */}
            {withdrawalPeriod === "custom" && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Custom Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="from-date" className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id="from-date"
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="to-date" className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Total Card */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">Total Withdrawn</p>
                  <p className="text-xs text-orange-600">{getPeriodLabel()}</p>
                </div>
                <div className="flex items-center gap-1 text-2xl font-bold text-orange-700">
                  <IndianRupee className="h-5 w-5" />
                  {withdrawalTotal.toLocaleString("en-IN")}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal List */}
          <div className="space-y-3">
            {filteredWithdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No withdrawals in this period.
              </div>
            ) : (
              filteredWithdrawals.map((withdrawal) => (
                <Card key={withdrawal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">Withdrawal</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(withdrawal.date).toLocaleDateString("en-IN")}
                        </p>
                        {withdrawal.notes && (
                          <p className="text-xs text-muted-foreground">{withdrawal.notes}</p>
                        )}
                      </div>
                      <span className="text-lg font-semibold text-orange-600">
                        -₹{withdrawal.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
