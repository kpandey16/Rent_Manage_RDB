"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Wallet, TrendingUp, TrendingDown, Plus, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LawnStatus {
  openingBalance: number;
  totalIncome: number;
  totalWithdrawals: number;
  availableBalance: number;
  eventCount: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'opening_balance' | 'event' | 'withdrawal';
  amount: number;
  runningBalance: number;
  customerName?: string;
  phone?: string;
  notes?: string;
  withdrawnBy?: string;
  withdrawalMethod?: string;
  description?: string;
}

export default function LawnEventsPage() {
  const [status, setStatus] = useState<LawnStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addWithdrawalOpen, setAddWithdrawalOpen] = useState(false);
  const [setOpeningBalanceOpen, setSetOpeningBalanceOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Event form state
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bookingAmount, setBookingAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  // Withdrawal form state
  const [withdrawalDate, setWithdrawalDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawnBy, setWithdrawnBy] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState("cash");
  const [withdrawalNotes, setWithdrawalNotes] = useState("");

  // Opening balance form state
  const [openingBalance, setOpeningBalance] = useState("");

  // Date filter state
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (fromDate?: string, toDate?: string) => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      const queryString = params.toString();

      const [statusRes, eventsRes] = await Promise.all([
        fetch(`/api/lawn/status${queryString ? `?${queryString}` : ''}`),
        fetch(`/api/lawn/events${queryString ? `?${queryString}` : ''}`),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
        setOpeningBalance(statusData.openingBalance.toString());
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setTransactions(eventsData.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/lawn/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate,
          bookingAmount: Number(bookingAmount),
          customerName: customerName.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: eventNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add event");
      }

      toast.success("Event added successfully");
      setAddEventOpen(false);
      // Reset form
      setEventDate(format(new Date(), "yyyy-MM-dd"));
      setBookingAmount("");
      setCustomerName("");
      setPhone("");
      setEventNotes("");
      fetchData();
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/lawn/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(withdrawalAmount),
          withdrawalDate,
          withdrawnBy: withdrawnBy.trim(),
          withdrawalMethod,
          notes: withdrawalNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record withdrawal");
      }

      toast.success(data.message || "Withdrawal recorded successfully");
      setAddWithdrawalOpen(false);
      // Reset form
      setWithdrawalDate(format(new Date(), "yyyy-MM-dd"));
      setWithdrawalAmount("");
      setWithdrawnBy("");
      setWithdrawalMethod("cash");
      setWithdrawalNotes("");
      fetchData();
    } catch (error) {
      console.error("Error adding withdrawal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to record withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/lawn/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(openingBalance),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set opening balance");
      }

      toast.success("Opening balance updated successfully");
      setSetOpeningBalanceOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error setting opening balance:", error);
      toast.error(error instanceof Error ? error.message : "Failed to set opening balance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyFilter = () => {
    if (!filterFromDate && !filterToDate) {
      toast.error("Please select at least one date");
      return;
    }
    setIsFiltered(true);
    fetchData(filterFromDate, filterToDate);
  };

  const handleClearFilter = () => {
    setFilterFromDate("");
    setFilterToDate("");
    setIsFiltered(false);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marriage Lawn Events</h1>
          <p className="text-sm text-muted-foreground">Track event bookings and income</p>
        </div>
        <Dialog open={setOpeningBalanceOpen} onOpenChange={setSetOpeningBalanceOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Opening Balance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSetOpeningBalance}>
              <DialogHeader>
                <DialogTitle>Set Opening Balance</DialogTitle>
                <DialogDescription>
                  Set the initial balance for the lawn events account
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    placeholder="Enter amount"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSetOpeningBalanceOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.eventCount || 0}</div>
            <p className="text-xs text-muted-foreground">Bookings recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(status?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">From events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(status?.totalWithdrawals || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Amount withdrawn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(status?.availableBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <div className="sticky top-14 z-40 bg-background pb-3 -mx-4 px-4 md:static md:pb-0 md:mx-0 md:px-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by Date Range</CardTitle>
            <CardDescription>
              {isFiltered
                ? "Showing filtered results"
                : "View events and income for a specific period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 grid gap-2">
                <Label htmlFor="filterFromDate">From Date</Label>
                <Input
                  id="filterFromDate"
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                />
              </div>
              <div className="flex-1 grid gap-2">
                <Label htmlFor="filterToDate">To Date</Label>
                <Input
                  id="filterToDate"
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleApplyFilter}
                  disabled={!filterFromDate && !filterToDate}
                  className="flex-1 sm:flex-initial"
                >
                  Apply Filter
                </Button>
                {isFiltered && (
                  <Button variant="outline" onClick={handleClearFilter} className="flex-1 sm:flex-initial">
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {isFiltered && (filterFromDate || filterToDate) && (
              <div className="mt-3 text-sm text-muted-foreground">
                <p>
                  Showing data
                  {filterFromDate && ` from ${formatDate(filterFromDate)}`}
                  {filterToDate && ` to ${formatDate(filterToDate)}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAddEvent}>
              <DialogHeader>
                <DialogTitle>Add Event Booking</DialogTitle>
                <DialogDescription>
                  Record a new marriage lawn event booking
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="eventDate">Event Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bookingAmount">Booking Amount *</Label>
                  <Input
                    id="bookingAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter amount"
                    value={bookingAmount}
                    onChange={(e) => setBookingAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    type="text"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eventNotes">Notes</Label>
                  <Textarea
                    id="eventNotes"
                    placeholder="Additional notes..."
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddEventOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Event
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={addWithdrawalOpen} onOpenChange={setAddWithdrawalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <TrendingDown className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAddWithdrawal}>
              <DialogHeader>
                <DialogTitle>Record Withdrawal</DialogTitle>
                <DialogDescription>
                  Withdraw funds from lawn events income
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="withdrawalAmount">Amount *</Label>
                  <Input
                    id="withdrawalAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter amount"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {formatCurrency(status?.availableBalance || 0)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdrawalDate">Withdrawal Date *</Label>
                  <Input
                    id="withdrawalDate"
                    type="date"
                    value={withdrawalDate}
                    onChange={(e) => setWithdrawalDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdrawnBy">Withdrawn By *</Label>
                  <Input
                    id="withdrawnBy"
                    type="text"
                    placeholder="Enter name"
                    value={withdrawnBy}
                    onChange={(e) => setWithdrawnBy(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdrawalMethod">Withdrawal Method</Label>
                  <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdrawalNotes">Notes</Label>
                  <Textarea
                    id="withdrawalNotes"
                    placeholder="Additional notes..."
                    value={withdrawalNotes}
                    onChange={(e) => setWithdrawalNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddWithdrawalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Withdrawal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All events and withdrawals with running balance</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Add an event or set opening balance to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {transaction.type === 'opening_balance' ? '-' : formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'opening_balance' && (
                          <Badge variant="secondary">Opening Balance</Badge>
                        )}
                        {transaction.type === 'event' && (
                          <Badge variant="default" className="bg-green-600">Event</Badge>
                        )}
                        {transaction.type === 'withdrawal' && (
                          <Badge variant="destructive">Withdrawal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.type === 'opening_balance' && (
                          <span className="text-sm text-muted-foreground">
                            {transaction.description}
                          </span>
                        )}
                        {transaction.type === 'event' && (
                          <div>
                            {transaction.customerName && (
                              <div className="font-medium">{transaction.customerName}</div>
                            )}
                            {transaction.phone && (
                              <div className="text-sm text-muted-foreground">{transaction.phone}</div>
                            )}
                            {transaction.notes && (
                              <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                            )}
                          </div>
                        )}
                        {transaction.type === 'withdrawal' && (
                          <div>
                            <div className="font-medium">By: {transaction.withdrawnBy}</div>
                            {transaction.withdrawalMethod && (
                              <div className="text-sm text-muted-foreground capitalize">
                                {transaction.withdrawalMethod.replace('_', ' ')}
                              </div>
                            )}
                            {transaction.notes && (
                              <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {transaction.type === 'opening_balance' && (
                          <span className="text-blue-600 font-medium">
                            {formatCurrency(transaction.amount)}
                          </span>
                        )}
                        {transaction.type === 'event' && (
                          <span className="text-green-600 font-medium">
                            +{formatCurrency(transaction.amount)}
                          </span>
                        )}
                        {transaction.type === 'withdrawal' && (
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(transaction.amount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(transaction.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
