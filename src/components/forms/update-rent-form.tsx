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
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UpdateRentFormProps {
  roomId: string;
  roomCode: string;
  currentRent: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function UpdateRentForm({ roomId, roomCode, currentRent, trigger, onSuccess }: UpdateRentFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    newRent: currentRent,
    effectiveFrom: format(new Date(), "yyyy-MM-dd"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.newRent <= 0) {
      toast.error("Rent amount must be greater than zero");
      return;
    }

    if (formData.newRent === currentRent) {
      toast.error("New rent must be different from current rent");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/rooms/${roomId}/update-rent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update rent");
      }

      const data = await response.json();
      toast.success(data.message || "Rent updated successfully");
      onSuccess?.();
      setOpen(false);

      // Reset form
      setFormData({
        newRent: currentRent,
        effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      });
    } catch (error) {
      console.error("Error updating rent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update rent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4 mr-1" />
            Update Rent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Rent - {roomCode}</DialogTitle>
          <DialogDescription>
            Update the monthly rent for this room. The change will be effective from the specified date.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Current Rent Display */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">Current Monthly Rent</div>
              <div className="text-2xl font-bold">₹{currentRent.toLocaleString("en-IN")}</div>
            </div>

            {/* New Rent */}
            <div className="grid gap-2">
              <Label htmlFor="newRent">New Monthly Rent *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="newRent"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.newRent || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newRent: Number(e.target.value) }))}
                  className="pl-7"
                  placeholder="0"
                  disabled={submitting}
                  required
                />
              </div>
              {formData.newRent > 0 && formData.newRent !== currentRent && (
                <p className="text-xs text-muted-foreground">
                  {formData.newRent > currentRent ? "Increase" : "Decrease"} of ₹
                  {Math.abs(formData.newRent - currentRent).toLocaleString("en-IN")}
                </p>
              )}
            </div>

            {/* Effective From */}
            <div className="grid gap-2">
              <Label htmlFor="effectiveFrom">Effective From *</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                disabled={submitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Rent calculations will use the new amount from this date onwards
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || formData.newRent === currentRent}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Updating..." : "Update Rent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
