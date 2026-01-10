"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  monthlyRent: number;
  securityDeposit: number;
  lastPaidMonth: string | null;
  creditBalance: number;
  totalDues: number;
}

const paymentTypes = [
  { value: "payment", label: "Payment", category: "income" },
  { value: "security_deposit_add", label: "Security Deposit - Add/Increase", category: "deposit" },
  { value: "security_deposit_withdraw", label: "Security Deposit - Withdraw/Decrease", category: "deposit" },
  { value: "deposit_used", label: "Security Deposit Used (for dues)", category: "adjustment" },
  { value: "credit", label: "Credit Applied", category: "adjustment" },
  { value: "discount", label: "Discount", category: "adjustment" },
  { value: "maintenance", label: "Maintenance Adjustment", category: "adjustment" },
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

interface RecordPaymentFormProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: PaymentFormData) => void;
}

export interface PaymentFormData {
  tenantId: string;
  amount: number;
  type: string;
  method: string;
  date: string;
  notes: string;
}

export function RecordPaymentForm({ trigger, onSubmit }: RecordPaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>({
    tenantId: "",
    amount: 0,
    type: "payment",
    method: "cash",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  // Fetch tenants when dialog opens
  useEffect(() => {
    if (open) {
      fetchTenants();
    }
  }, [open]);

  // Fetch tenant details when tenant is selected
  useEffect(() => {
    if (formData.tenantId) {
      fetchTenantDetails(formData.tenantId);
    } else {
      setSelectedTenant(null);
    }
  }, [formData.tenantId]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantDetails = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch tenant details");
      const data = await response.json();
      setSelectedTenant(data.tenant);
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      toast.error("Failed to load tenant details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record transaction");
      }

      const data = await response.json();
      toast.success(data.message || "Transaction recorded successfully");
      onSubmit?.(formData);
      setOpen(false);
      // Reset form
      setFormData({
        tenantId: "",
        amount: 0,
        type: "payment",
        method: "cash",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    if (selectedTenant) {
      setFormData((prev) => ({ ...prev, amount: selectedTenant.monthlyRent }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a new payment from a tenant. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Tenant Selection */}
            <div className="grid gap-2">
              <Label htmlFor="tenant">Tenant *</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tenantId: value }))}
                disabled={loading || submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading tenants..." : "Select tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.length === 0 ? (
                    <SelectItem value="none" disabled>No tenants found</SelectItem>
                  ) : (
                    tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tenant Information Display */}
            {selectedTenant && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Monthly Rent</p>
                    <p className="font-semibold">₹{selectedTenant.monthlyRent.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Paid Month</p>
                    <p className="font-semibold">{selectedTenant.lastPaidMonth}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Credit Balance</p>
                    <p className={`font-semibold ${selectedTenant.creditBalance > 0 ? 'text-green-600' : ''}`}>
                      ₹{selectedTenant.creditBalance.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Dues</p>
                    <p className={`font-semibold ${selectedTenant.totalDues > 0 ? 'text-red-600' : ''}`}>
                      ₹{selectedTenant.totalDues.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount *</Label>
                {selectedTenant && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleQuickFill}
                  >
                    Fill monthly rent (₹{selectedTenant.monthlyRent.toLocaleString("en-IN")})
                  </Button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                  className="pl-7"
                  placeholder="0"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Transaction Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payment</SelectLabel>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Security Deposit</SelectLabel>
                    <SelectItem value="security_deposit_add">Add / Increase Deposit</SelectItem>
                    <SelectItem value="security_deposit_withdraw">Withdraw / Decrease Deposit</SelectItem>
                    <SelectItem value="deposit_used">Use Deposit for Dues</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Adjustments</SelectLabel>
                    <SelectItem value="credit">Credit Applied</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="maintenance">Maintenance Adjustment</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Security Deposit Info */}
            {selectedTenant && (formData.type === "security_deposit_add" || formData.type === "security_deposit_withdraw" || formData.type === "deposit_used") && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Current security deposit: <span className="font-semibold">₹{selectedTenant.securityDeposit.toLocaleString("en-IN")}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Method */}
            <div className="grid gap-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, method: value }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                disabled={submitting}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.tenantId || !formData.amount || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
