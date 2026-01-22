"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Phone, Mail, Calendar, IndianRupee, DoorOpen, Plus, Loader2 } from "lucide-react";
import { AllocateRoomForm } from "@/components/forms/allocate-room-form";
import { SetOpeningBalanceDialog } from "@/components/tenant/set-opening-balance-dialog";
import { toast } from "sonner";

interface Room {
  id: string;
  code: string;
  name: string | null;
  currentRent: number;
  expectedRent?: number;
  moveInDate: string;
  isActive: number;
}

interface Adjustment {
  type: string;
  amount: number;
  description: string | null;
}

interface Transaction {
  id: string;
  transaction_date: string;
  type: string;
  amount: number;
  payment_method: string | null;
  description: string | null;
  appliedTo?: string;
  creditRemaining?: number | null;
  documentId?: string | null;
  adjustments?: Adjustment[];
  totalAmount?: number;
  collectedBy?: string | null;
}

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
  rooms: Room[];
  monthlyRent: number;
  securityDeposit: number;
  creditBalance: number;
  totalRentDue: number; // Total unpaid rent
  netBalance: number; // Balance after credits (can be negative)
  totalDues: number; // DEPRECATED: Keeping for compatibility
  lastPaidMonth: string | null;
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOpeningBalance, setHasOpeningBalance] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch tenant details
      const tenantResponse = await fetch(`/api/tenants/${id}`);
      if (!tenantResponse.ok) {
        if (tenantResponse.status === 404) {
          toast.error("Tenant not found");
        } else {
          throw new Error("Failed to fetch tenant details");
        }
        return;
      }
      const tenantData = await tenantResponse.json();
      setTenant(tenantData.tenant);

      // Fetch transactions
      const transactionsResponse = await fetch(`/api/transactions?tenantId=${id}`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        const txns = transactionsData.transactions || [];
        setTransactions(txns);

        // Check if opening balance exists
        const hasOpening = txns.some((t: Transaction) =>
          t.type === 'adjustment' && t.description?.toLowerCase().includes('opening balance')
        );
        setHasOpeningBalance(hasOpening);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load tenant details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoomAllocated = () => {
    // Refresh tenant data after room allocation
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Tenant not found</p>
          <Link href="/tenants">
            <Button className="mt-4">Back to Tenants</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tenants">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">Tenant since {new Date(tenant.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
        <Badge variant={tenant.is_active === 1 ? "default" : "secondary"}>
          {tenant.is_active === 1 ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Contact & Summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${tenant.phone}`} className="hover:underline">{tenant.phone}</a>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${tenant.email}`} className="hover:underline">{tenant.email}</a>
              </div>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="text-lg font-semibold">₹{tenant.monthlyRent.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="text-lg font-semibold">₹{tenant.securityDeposit.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Paid Month</p>
              <p className="text-lg font-semibold">{tenant.lastPaidMonth || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Rent Due</p>
              <p className={`text-lg font-semibold ${tenant.totalRentDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {tenant.totalRentDue > 0 ? `₹${tenant.totalRentDue.toLocaleString("en-IN")}` : "₹0"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credit/Advance</p>
              <p className={`text-lg font-semibold ${tenant.creditBalance > 0 ? 'text-green-600' : tenant.creditBalance < 0 ? 'text-red-600' : ''}`}>
                {tenant.creditBalance > 0 ? '+' : tenant.creditBalance < 0 ? '-' : ''}₹{Math.abs(tenant.creditBalance).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Balance</p>
              <p className={`text-lg font-semibold ${tenant.netBalance > 0 ? 'text-red-600' : tenant.netBalance < 0 ? 'text-green-600' : ''}`}>
                {tenant.netBalance > 0 ? `₹${tenant.netBalance.toLocaleString("en-IN")}` : tenant.netBalance < 0 ? `+₹${Math.abs(tenant.netBalance).toLocaleString("en-IN")}` : "₹0"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tenant.netBalance > 0 ? 'To pay' : tenant.netBalance < 0 ? 'Extra credit' : 'Settled'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocated Rooms */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              Allocated Rooms
            </CardTitle>
            <AllocateRoomForm
              preSelectedTenantId={tenant.id}
              onSubmit={handleRoomAllocated}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Allocate Room
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenant.rooms.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No rooms allocated yet</p>
          ) : (
            tenant.rooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Link href={`/rooms/${room.id}`} className="font-medium hover:underline">
                    {room.code} {room.name && `- ${room.name}`}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(room.moveInDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Badge>₹{Number(room.currentRent).toLocaleString("en-IN")}/mo</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Payment History
            </CardTitle>
            {!hasOpeningBalance && tenant && (
              <SetOpeningBalanceDialog
                tenantId={tenant.id}
                tenantName={tenant.name}
                moveInDate={tenant.rooms[0]?.moveInDate}
                onSuccess={() => {
                  fetchData();
                }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {transactions.map((transaction) => {
                  const amount = Number(transaction.amount);
                  const totalAmount = transaction.totalAmount || amount;
                  const isPositive = totalAmount >= 0;
                  const hasAdjustments = transaction.adjustments && transaction.adjustments.length > 0;

                  return (
                    <div key={transaction.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                            {isPositive ? '+' : ''}₹{Math.abs(amount).toLocaleString("en-IN")}
                          </span>
                          {hasAdjustments && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {transaction.adjustments!.map((adj, idx) => (
                                <div key={idx}>
                                  + ₹{adj.amount.toLocaleString("en-IN")} {adj.type}
                                </div>
                              ))}
                              <div className="font-medium mt-0.5">
                                Total: ₹{totalAmount.toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize">{transaction.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString("en-IN")}
                        {transaction.payment_method && ` • ${transaction.payment_method}`}
                        {transaction.collectedBy && ` • Collected by: ${transaction.collectedBy}`}
                      </p>
                      {transaction.appliedTo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied to: {transaction.appliedTo}
                        </p>
                      )}
                      {transaction.creditRemaining !== null && transaction.creditRemaining !== undefined && (
                        <p className="text-xs mt-1">
                          <span className="text-muted-foreground">Credit Balance: </span>
                          <span className={`font-medium ${transaction.creditRemaining >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {transaction.creditRemaining >= 0 ? '+' : '-'}₹{Math.abs(transaction.creditRemaining).toLocaleString("en-IN")}
                          </span>
                        </p>
                      )}
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: {transaction.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Applied To</TableHead>
                      <TableHead>Credit Balance</TableHead>
                      <TableHead>Collected By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const amount = Number(transaction.amount);
                      const totalAmount = transaction.totalAmount || amount;
                      const isPositive = totalAmount >= 0;
                      const hasAdjustments = transaction.adjustments && transaction.adjustments.length > 0;

                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.transaction_date).toLocaleDateString("en-IN")}</TableCell>
                          <TableCell className={`font-medium ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                            <div>
                              <div>{isPositive ? '+' : ''}₹{Math.abs(amount).toLocaleString("en-IN")}</div>
                              {hasAdjustments && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {transaction.adjustments!.map((adj, idx) => (
                                    <div key={idx}>+ ₹{adj.amount.toLocaleString("en-IN")} {adj.type}</div>
                                  ))}
                                  <div className="font-medium">Total: ₹{totalAmount.toLocaleString("en-IN")}</div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{transaction.type}</Badge>
                          </TableCell>
                          <TableCell>{transaction.payment_method || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.appliedTo || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.creditRemaining !== null && transaction.creditRemaining !== undefined ? (
                              <span className={transaction.creditRemaining >= 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                                {transaction.creditRemaining >= 0 ? '+' : '-'}₹{Math.abs(transaction.creditRemaining).toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.collectedBy || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transaction.description || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
