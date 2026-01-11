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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

interface RecordWithdrawalFormProps {
  trigger?: React.ReactNode;
  availableBalance?: number;
  onSuccess?: () => void;
}

export interface WithdrawalFormData {
  amount: number;
  method: string;
  withdrawnBy: string;
  date: string;
  notes: string;
}

const withdrawalMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI Transfer" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mixed", label: "Mixed (Multiple Methods)" },
];

export function RecordWithdrawalForm({ trigger, availableBalance, onSuccess }: RecordWithdrawalFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<WithdrawalFormData>({
    amount: 0,
    method: "cash",
    withdrawnBy: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const handleQuickFill = () => {
    if (availableBalance !== undefined) {
      setFormData((prev) => ({ ...prev, amount: availableBalance }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/operator/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record withdrawal");
      }

      const data = await response.json();
      toast.success(data.message || "Withdrawal recorded successfully");
      onSuccess?.();
      setOpen(false);
      // Reset form
      setFormData({
        amount: 0,
        method: "cash",
        withdrawnBy: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
    } catch (error) {
      console.error("Error recording withdrawal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to record withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Wallet className="h-4 w-4 mr-1" />
            Record Withdrawal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Admin Withdrawal</DialogTitle>
          <DialogDescription>
            Record cash withdrawal from operator collections. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Available Balance Info */}
            {availableBalance !== undefined && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{availableBalance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount *</Label>
                {availableBalance !== undefined && availableBalance > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleQuickFill}
                  >
                    Fill full amount (₹{availableBalance.toLocaleString("en-IN")})
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

            {/* Withdrawal Method */}
            <div className="grid gap-2">
              <Label htmlFor="method">Withdrawal Method *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, method: value }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {withdrawalMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Withdrawn By */}
            <div className="grid gap-2">
              <Label htmlFor="withdrawnBy">Withdrawn By *</Label>
              <Input
                id="withdrawnBy"
                type="text"
                value={formData.withdrawnBy}
                onChange={(e) => setFormData((prev) => ({ ...prev, withdrawnBy: e.target.value }))}
                disabled={submitting}
                placeholder="Admin name"
                required
              />
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
            <Button type="submit" disabled={!formData.amount || !formData.withdrawnBy || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Recording..." : "Record Withdrawal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
