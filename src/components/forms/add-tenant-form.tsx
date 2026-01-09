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
import { Plus } from "lucide-react";

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
  const [formData, setFormData] = useState<TenantFormData>({
    name: "",
    phone: "",
    email: "",
    moveInDate: format(new Date(), "yyyy-MM-dd"),
    securityDeposit: 0,
    openingBalance: 0,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || !formData.phone}>
              Add Tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
