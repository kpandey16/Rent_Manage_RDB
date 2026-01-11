"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordExpenseForm } from "@/components/forms/record-expense-form";
import { RecordWithdrawalForm } from "@/components/forms/record-withdrawal-form";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingDown, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface CashStatus {
  sinceDate: string | null;
  totalCollections: number;
  totalExpenses: number;
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

export default function CashManagementPage() {
  const [status, setStatus] = useState<CashStatus | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, expensesRes, withdrawalsRes] = await Promise.all([
        fetch("/api/operator/status"),
        fetch("/api/operator/expenses"),
        fetch("/api/operator/withdrawals"),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData.expenses || []);
      }

      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json();
        setWithdrawals(withdrawalsData.withdrawals || []);
      }
    } catch (error) {
      console.error("Error fetching cash management data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals History</TabsTrigger>
          <TabsTrigger value="expenses">Expenses History</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
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
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{status?.availableBalance.toLocaleString("en-IN") || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Collections - Expenses</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Record new transactions</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <RecordWithdrawalForm
                availableBalance={status?.availableBalance}
                onSuccess={fetchData}
              />
              <RecordExpenseForm onSuccess={fetchData} />
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
