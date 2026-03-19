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
import { ArrowLeft, Phone, Mail, Calendar, IndianRupee, DoorOpen, Plus, Loader2, CreditCard, ChevronDown, ChevronRight, CheckCircle2, Download, RotateCcw } from "lucide-react";
import { AllocateRoomForm } from "@/components/forms/allocate-room-form";
import { EditTenantForm } from "@/components/forms/edit-tenant-form";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
import { formatDate, formatMonthYear } from "@/lib/date-utils";
import { SetOpeningBalanceDialog } from "@/components/tenant/set-opening-balance-dialog";
import { RollbackPaymentDialog } from "@/components/rollback/rollback-payment-dialog";
import { DownloadReceiptButton } from "@/components/receipt/download-receipt-button";
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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

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

  const handleRollbackClick = (e: React.MouseEvent, ledgerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLedgerId(ledgerId);
    setRollbackDialogOpen(true);
  };

  const handleRollbackSuccess = () => {
    fetchData();
    setSelectedLedgerId(null);
  };

  const canShowRollback = (transaction: Transaction) => {
    if (transaction.type === "payment") {
      return transaction.payment_method === "cash" || transaction.payment_method === "upi";
    }
    if (transaction.type === "adjustment") {
      return true;
    }
    return false;
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
          <p className="text-sm text-muted-foreground">Tenant since {formatMonthYear(tenant.created_at)}</p>
        </div>
        <EditTenantForm
          tenantId={tenant.id}
          currentName={tenant.name}
          currentPhone={tenant.phone}
          currentEmail={tenant.email}
          onSuccess={fetchData}
        />
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
                    Since {formatDate(room.moveInDate)}
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
            <div className="flex items-center gap-2">
              <RecordPaymentForm
                preSelectedTenantId={tenant.id}
                onSubmit={() => {
                  fetchData();
                }}
                trigger={
                  <Button size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Record Payment
                  </Button>
                }
              />
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
                  const isExpanded = expandedCards.has(transaction.id);
                  const amount = Number(transaction.amount);
                  const totalAmount = transaction.totalAmount || amount;
                  const isPositive = totalAmount >= 0;
                  const hasAdjustments = transaction.adjustments && transaction.adjustments.length > 0;
                  const isFullyApplied = transaction.creditRemaining === 0;
                  const hasCredit = transaction.creditRemaining !== null && transaction.creditRemaining !== undefined && transaction.creditRemaining > 0;

                  return (
                    <Card key={transaction.id} className="hover:bg-muted/50 transition-colors">
                      {/* Collapsed View - Always Visible */}
                      <div
                        className="p-3 cursor-pointer"
                        onClick={() => toggleCardExpansion(transaction.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Basic info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isFullyApplied ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <IndianRupee className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                              <span className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                                {isPositive ? '+' : ''}₹{Math.abs(amount).toLocaleString("en-IN")}
                              </span>
                              <Badge variant="outline" className="capitalize text-xs">{transaction.type}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span>{formatDate(transaction.transaction_date)}</span>
                              {transaction.appliedTo && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="truncate">Applied to: {transaction.appliedTo}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Expand icon */}
                          <div>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded View - Details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
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

                            {/* Adjustments */}
                            {hasAdjustments && (
                              <div className="text-sm space-y-1">
                                <div className="font-medium text-muted-foreground">Adjustments:</div>
                                <div className="pl-3 space-y-1">
                                  {transaction.adjustments!.map((adj, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span className="capitalize">{adj.type}:</span>
                                      <span className="font-medium">+₹{adj.amount.toLocaleString("en-IN")}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between pt-1 border-t">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-medium">₹{totalAmount.toLocaleString("en-IN")}</span>
                                  </div>
                                </div>
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
                            {transaction.description && (
                              <div className="text-sm pt-2 border-t">
                                <div className="text-muted-foreground mb-1">📝 Note:</div>
                                <div className="text-foreground">{transaction.description}</div>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-2 flex-wrap">
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
                    </Card>
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
                          <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
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
