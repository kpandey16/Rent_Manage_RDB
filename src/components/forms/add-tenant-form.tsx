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
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddTenantFormProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: TenantFormData) => void;
}

export interface TenantFormData {
  name: string;
  phone: string;
  email: string;
  moveInDate: string;
  securityDeposit: number;
  openingBalance: number;
  notes: string;
}

export function AddTenantForm({ trigger, onSubmit }: AddTenantFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    name: "",
    phone: "",
    email: "",
    moveInDate: format(new Date(), "yyyy-MM-dd"),
    securityDeposit: 0,
    openingBalance: 0,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.notes, // Using notes as address
          openingBalance: formData.openingBalance || 0,
          securityDeposit: formData.securityDeposit || 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add tenant");
      }

      const data = await response.json();
      toast.success(data.message || "Tenant added successfully");
      onSubmit?.(formData);
      setOpen(false);
      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        moveInDate: format(new Date(), "yyyy-MM-dd"),
        securityDeposit: 0,
        openingBalance: 0,
        notes: "",
      });
    } catch (error) {
      console.error("Error adding tenant:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add tenant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Tenant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
          <DialogDescription>
            Enter tenant details. You can allocate rooms after creating the tenant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tenant name"
                disabled={submitting}
                required
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="9876543210"
                disabled={submitting}
                required
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="tenant@email.com"
                disabled={submitting}
              />
            </div>

            {/* Move-in Date */}
            <div className="grid gap-2">
              <Label htmlFor="moveInDate">Move-in Date *</Label>
              <Input
                id="moveInDate"
                type="date"
                value={formData.moveInDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, moveInDate: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            {/* Security Deposit */}
            <div className="grid gap-2">
              <Label htmlFor="securityDeposit">Security Deposit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.securityDeposit || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, securityDeposit: Number(e.target.value) }))}
                  className="pl-7"
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Opening Balance */}
            <div className="grid gap-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <p className="text-xs text-muted-foreground">
                Use positive for credit, negative for dues (for migration)
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="openingBalance"
                  type="number"
                  step="1"
                  value={formData.openingBalance || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, openingBalance: Number(e.target.value) }))}
                  className="pl-7"
                  placeholder="0"
                  disabled={submitting}
                />
              </div>
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
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || !formData.phone || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Adding..." : "Add Tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
