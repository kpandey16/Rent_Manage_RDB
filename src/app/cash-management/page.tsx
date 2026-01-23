"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordExpenseForm } from "@/components/forms/record-expense-form";
import { RecordWithdrawalForm } from "@/components/forms/record-withdrawal-form";
import { OperatorAdjustmentForm } from "@/components/forms/operator-adjustment-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingDown, TrendingUp, DollarSign, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CashStatus {
  sinceDate: string | null;
  totalCollections: number;
  totalExpenses: number;
  totalWithdrawals: number;
  availableBalance: number;
  collectionsByMethod: Array<{ method: string; count: number; total: number }>;
  expensesByCategory: Array<{ category: string; count: number; total: number }>;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  recorded_by: string;
  expense_date: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  withdrawal_method: string;
  withdrawn_by: string;
  withdrawal_date: string;
  notes: string | null;
  created_at: string;
}

interface Adjustment {
  id: string;
  amount: number;
  adjustmentType: string;
  adjustmentDate: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

interface Collection {
  id: string;
  amount: number;
  payment_method: string;
  transaction_date: string;
  tenant_name: string;
  created_at: string;
}

interface UnifiedTransaction {
  id: string;
  date: string;
  type: 'collection' | 'expense' | 'withdrawal' | 'adjustment';
  amount: number;
  description: string;
  notes?: string;
  category?: string;
  beforeBalance: number;
  afterBalance: number;
  createdAt: string;
}

export default function CashManagementPage() {
  const [status, setStatus] = useState<CashStatus | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query params for date filter
      const statusParams = new URLSearchParams();
      const historyParams = new URLSearchParams();

      if (useCustomDate && dateFrom) {
        statusParams.set("sinceDate", dateFrom);
        historyParams.set("sinceDate", dateFrom);
      }

      const [statusRes, expensesRes, withdrawalsRes, adjustmentsRes, collectionsRes] = await Promise.all([
        fetch(`/api/operator/status?${statusParams}`),
        fetch(`/api/operator/expenses?${historyParams}`),
        fetch(`/api/operator/withdrawals?${historyParams}`),
        fetch(`/api/operator/adjustments`),
        fetch(`/api/transactions`), // Get all collections
      ]);

      let statusData = null;
      let expensesData: Expense[] = [];
      let withdrawalsData: Withdrawal[] = [];
      let adjustmentsData: Adjustment[] = [];
      let paymentTransactions: Collection[] = [];

      if (statusRes.ok) {
        statusData = await statusRes.json();
        setStatus(statusData);
      }

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        expensesData = data.expenses || [];
        setExpenses(expensesData);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        withdrawalsData = data.withdrawals || [];
        setWithdrawals(withdrawalsData);
      }

      if (adjustmentsRes.ok) {
        const data = await adjustmentsRes.json();
        adjustmentsData = data.adjustments || [];
        setAdjustments(adjustmentsData);
      }

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        // Filter only payment type transactions
        paymentTransactions = (collectionsData.transactions || [])
          .filter((t: any) => t.type === 'payment')
          .map((t: any) => ({
            id: t.id,
            amount: Number(t.amount),
            payment_method: t.payment_method,
            transaction_date: t.transaction_date,
            tenant_name: t.tenant_name,
            created_at: t.created_at,
          }));
        setCollections(paymentTransactions);
      }

      // Build unified transaction history after all data is fetched
      if (statusData && statusRes.ok && expensesRes.ok && withdrawalsRes.ok && adjustmentsRes.ok && collectionsRes.ok) {
        buildUnifiedHistory(
          statusData,
          expensesData,
          withdrawalsData,
          adjustmentsData,
          paymentTransactions
        );
      }
    } catch (error) {
      console.error("Error fetching cash management data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildUnifiedHistory = (
    statusData: CashStatus,
    expensesData: Expense[],
    withdrawalsData: Withdrawal[],
    adjustmentsData: Adjustment[],
    collectionsData: Collection[]
  ) => {
    const unified: UnifiedTransaction[] = [];

    // Add collections
    collectionsData.forEach((collection) => {
      unified.push({
        id: collection.id,
        date: collection.transaction_date,
        type: 'collection',
        amount: collection.amount,
        description: `Rent collection from ${collection.tenant_name}`,
        notes: `Payment method: ${formatMethod(collection.payment_method)}`,
        beforeBalance: 0, // Will calculate below
        afterBalance: 0, // Will calculate below
        createdAt: collection.created_at,
      });
    });

    // Add expenses
    expensesData.forEach((expense) => {
      unified.push({
        id: expense.id,
        date: expense.expense_date,
        type: 'expense',
        amount: expense.amount,
        description: expense.description,
        category: formatCategory(expense.category),
        notes: `Recorded by: ${expense.recorded_by}`,
        beforeBalance: 0,
        afterBalance: 0,
        createdAt: expense.created_at,
      });
    });

    // Add withdrawals
    withdrawalsData.forEach((withdrawal) => {
      unified.push({
        id: withdrawal.id,
        date: withdrawal.withdrawal_date,
        type: 'withdrawal',
        amount: withdrawal.amount,
        description: `Admin withdrawal via ${formatMethod(withdrawal.withdrawal_method)}`,
        notes: withdrawal.notes || `Withdrawn by: ${withdrawal.withdrawn_by}`,
        beforeBalance: 0,
        afterBalance: 0,
        createdAt: withdrawal.created_at,
      });
    });

    // Add adjustments
    adjustmentsData.forEach((adjustment) => {
      let description = '';
      switch (adjustment.adjustmentType) {
        case 'opening_balance':
          description = 'Opening Balance';
          break;
        case 'add_cash':
          description = 'Cash Added';
          break;
        case 'remove_cash':
          description = 'Cash Removed';
          break;
        case 'reconciliation':
          description = 'Balance Reconciliation';
          break;
        default:
          description = 'Balance Adjustment';
      }

      unified.push({
        id: adjustment.id,
        date: adjustment.adjustmentDate,
        type: 'adjustment',
        amount: adjustment.amount,
        description,
        notes: `${adjustment.notes} (by ${adjustment.createdBy})`,
        beforeBalance: 0,
        afterBalance: 0,
        createdAt: adjustment.createdAt,
      });
    });

    // Sort by date (newest first), then by created_at
    unified.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate running balance (working backwards from current balance)
    let currentBalance = statusData.availableBalance;

    unified.forEach((transaction) => {
      transaction.afterBalance = currentBalance;

      // Calculate before balance based on transaction type
      switch (transaction.type) {
        case 'collection':
          // Before collecting, we had less
          transaction.beforeBalance = currentBalance - transaction.amount;
          currentBalance = transaction.beforeBalance;
          break;
        case 'expense':
          // Before spending, we had more
          transaction.beforeBalance = currentBalance + transaction.amount;
          currentBalance = transaction.beforeBalance;
          break;
        case 'withdrawal':
          // Before withdrawal, we had more
          transaction.beforeBalance = currentBalance + transaction.amount;
          currentBalance = transaction.beforeBalance;
          break;
        case 'adjustment':
          // Adjustments - need to reverse the impact
          // If it was opening_balance or add_cash, it increased balance
          // If it was remove_cash, amount is stored positive but decreased balance
          // If it was reconciliation, amount can be positive or negative
          const adjustmentData = adjustmentsData.find(a => a.id === transaction.id);
          if (adjustmentData) {
            if (adjustmentData.adjustmentType === 'opening_balance' || adjustmentData.adjustmentType === 'add_cash') {
              transaction.beforeBalance = currentBalance - adjustmentData.amount;
            } else if (adjustmentData.adjustmentType === 'remove_cash') {
              transaction.beforeBalance = currentBalance + adjustmentData.amount;
            } else if (adjustmentData.adjustmentType === 'reconciliation') {
              transaction.beforeBalance = currentBalance - adjustmentData.amount;
            }
          }
          currentBalance = transaction.beforeBalance;
          break;
      }
    });

    setUnifiedTransactions(unified);
  };

  useEffect(() => {
    fetchData();
  }, [useCustomDate, dateFrom]);

  const handleApplyDateFilter = () => {
    setUseCustomDate(true);
    fetchData();
  };

  const handleClearDateFilter = () => {
    setUseCustomDate(false);
    setDateFrom("");
    setDateTo("");
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatMethod = (method: string) => {
    const methods: Record<string, string> = {
      cash: "Cash",
      upi: "UPI",
      bank_transfer: "Bank Transfer",
      mixed: "Mixed",
    };
    return methods[method] || method;
  };

  const formatCategory = (category: string) => {
    const categories: Record<string, string> = {
      maintenance: "Maintenance",
      supplies: "Supplies",
      utilities: "Utilities",
      repairs: "Repairs",
      other: "Other",
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cash Management</h1>
          <p className="text-muted-foreground">Track operator collections, expenses, and withdrawals</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
          <CardDescription>
            Filter collections and expenses by date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="dateTo">To Date (optional)</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled
              />
              <p className="text-xs text-muted-foreground">Currently shows all data since from date</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:items-end md:pb-0.5">
              <Button onClick={handleApplyDateFilter} disabled={!dateFrom} className="w-full sm:w-auto">
                Apply Filter
              </Button>
              {useCustomDate && (
                <Button onClick={handleClearDateFilter} variant="outline" className="w-full sm:w-auto">
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
          {useCustomDate && dateFrom && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>Showing data from {formatDate(dateFrom)} onwards</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals History</TabsTrigger>
          <TabsTrigger value="expenses">Expenses History</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{status?.totalCollections.toLocaleString("en-IN") || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {status?.sinceDate ? `Since ${formatDate(status.sinceDate)}` : "All time"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{status?.totalExpenses.toLocaleString("en-IN") || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {status?.sinceDate ? `Since ${formatDate(status.sinceDate)}` : "All time"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{status?.totalWithdrawals?.toLocaleString("en-IN") || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {status?.sinceDate ? `Since ${formatDate(status.sinceDate)}` : "All time"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{status?.availableBalance.toLocaleString("en-IN") || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Net cash with operator</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Record new transactions</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <RecordWithdrawalForm
                availableBalance={status?.availableBalance}
                onSuccess={fetchData}
              />
              <RecordExpenseForm onSuccess={fetchData} />
              <OperatorAdjustmentForm onSuccess={fetchData} />
            </CardContent>
          </Card>

          {/* Collections Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Collections by Payment Method</CardTitle>
              <CardDescription>
                {status?.sinceDate ? `Since ${formatDate(status.sinceDate)}` : "All time"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status?.collectionsByMethod && status.collectionsByMethod.length > 0 ? (
                <div className="space-y-3">
                  {status.collectionsByMethod.map((item) => (
                    <div key={item.method} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium capitalize">{formatMethod(item.method)}</p>
                        <p className="text-xs text-muted-foreground">{item.count} transactions</p>
                      </div>
                      <p className="text-lg font-semibold">₹{item.total.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No collections recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Expenses Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>
                {status?.sinceDate ? `Since ${formatDate(status.sinceDate)}` : "All time"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status?.expensesByCategory && status.expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {status.expensesByCategory.map((item) => (
                    <div key={item.category} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium capitalize">{formatCategory(item.category)}</p>
                        <p className="text-xs text-muted-foreground">{item.count} expenses</p>
                      </div>
                      <p className="text-lg font-semibold text-orange-600">₹{item.total.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No expenses recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unified Transaction History</CardTitle>
              <CardDescription>All collections, expenses, withdrawals, and adjustments in chronological order</CardDescription>
            </CardHeader>
            <CardContent>
              {unifiedTransactions.length > 0 ? (
                <div className="space-y-4">
                  {unifiedTransactions.map((transaction) => {
                    // Determine styling based on transaction type
                    let typeColor = '';
                    let typeLabel = '';
                    let amountColor = '';
                    let amountSign = '';

                    switch (transaction.type) {
                      case 'collection':
                        typeColor = 'bg-green-100 text-green-800';
                        typeLabel = 'Collection';
                        amountColor = 'text-green-600';
                        amountSign = '+';
                        break;
                      case 'expense':
                        typeColor = 'bg-orange-100 text-orange-800';
                        typeLabel = 'Expense';
                        amountColor = 'text-orange-600';
                        amountSign = '-';
                        break;
                      case 'withdrawal':
                        typeColor = 'bg-red-100 text-red-800';
                        typeLabel = 'Withdrawal';
                        amountColor = 'text-red-600';
                        amountSign = '-';
                        break;
                      case 'adjustment':
                        typeColor = 'bg-purple-100 text-purple-800';
                        typeLabel = 'Adjustment';
                        // Determine sign based on amount and type
                        const adj = adjustments.find(a => a.id === transaction.id);
                        if (adj) {
                          if (adj.adjustmentType === 'remove_cash') {
                            amountSign = '-';
                            amountColor = 'text-purple-600';
                          } else if (adj.adjustmentType === 'reconciliation') {
                            amountSign = adj.amount >= 0 ? '+' : '';
                            amountColor = adj.amount >= 0 ? 'text-purple-600' : 'text-purple-600';
                          } else {
                            amountSign = '+';
                            amountColor = 'text-purple-600';
                          }
                        }
                        break;
                    }

                    return (
                      <div key={transaction.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColor}`}>
                                {typeLabel}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(transaction.date)}
                              </span>
                              {transaction.category && (
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  {transaction.category}
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-base">{transaction.description}</p>
                            {transaction.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{transaction.notes}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-xl font-bold ${amountColor}`}>
                              {amountSign}₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>

                        {/* Balance Information */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-muted-foreground">Before: </span>
                              <span className="font-semibold">₹{transaction.beforeBalance.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">After: </span>
                              <span className="font-semibold">₹{transaction.afterBalance.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'MMM dd, yyyy hh:mm a')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Withdrawal History</CardTitle>
                  <CardDescription>All admin withdrawals from operator collections</CardDescription>
                </div>
                <RecordWithdrawalForm
                  availableBalance={status?.availableBalance}
                  onSuccess={fetchData}
                />
              </div>
            </CardHeader>
            <CardContent>
              {withdrawals.length > 0 ? (
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">₹{Number(withdrawal.amount).toLocaleString("en-IN")}</p>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {formatMethod(withdrawal.withdrawal_method)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Withdrawn by: {withdrawal.withdrawn_by} on {formatDate(withdrawal.withdrawal_date)}
                        </p>
                        {withdrawal.notes && (
                          <p className="text-sm text-muted-foreground italic">{withdrawal.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No withdrawals recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense History</CardTitle>
                  <CardDescription>All operator expenses</CardDescription>
                </div>
                <RecordExpenseForm onSuccess={fetchData} />
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">₹{Number(expense.amount).toLocaleString("en-IN")}</p>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                            {formatCategory(expense.category)}
                          </span>
                        </div>
                        <p className="text-sm">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          By: {expense.recorded_by} on {formatDate(expense.expense_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
