"use client";

import { useState } from "react";
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
import { Plus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Placeholder data - will come from DB
const tenants = [
  { id: "1", name: "Amit Sharma", monthlyRent: 5000, securityDeposit: 10000 },
  { id: "2", name: "Priya Singh", monthlyRent: 9000, securityDeposit: 18000 },
  { id: "3", name: "Ramesh Kumar", monthlyRent: 5500, securityDeposit: 11000 },
  { id: "4", name: "Sunita Devi", monthlyRent: 5000, securityDeposit: 10000 },
  { id: "5", name: "Suresh Patel", monthlyRent: 5000, securityDeposit: 10000 },
  { id: "6", name: "Meera Joshi", monthlyRent: 4000, securityDeposit: 8000 },
  { id: "7", name: "Vikram Rao", monthlyRent: 8000, securityDeposit: 16000 },
];

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
  const [formData, setFormData] = useState<PaymentFormData>({
    tenantId: "",
    amount: 0,
    type: "payment",
    method: "cash",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const selectedTenant = tenants.find((t) => t.id === formData.tenantId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} (₹{tenant.monthlyRent.toLocaleString("en-IN")}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.tenantId || !formData.amount}>
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
