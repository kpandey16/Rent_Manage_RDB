"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface RollbackPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
  onSuccess?: () => void;
}

export function RollbackPaymentDialog({
  open,
  onOpenChange,
  ledgerId,
  onSuccess,
}: RollbackPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [reason, setReason] = useState("");

  // Validate when dialog opens
  const handleOpenChange = async (newOpen: boolean) => {
    onOpenChange(newOpen);

    if (newOpen && !validation) {
      await validateRollback();
    }

    // Reset when closing
    if (!newOpen) {
      setValidation(null);
      setReason("");
    }
  };

  const validateRollback = async () => {
    setValidating(true);
    try {
      const response = await fetch("/api/rollback/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Validation failed:", data);
        toast.error(data.error || "Failed to validate rollback");
        onOpenChange(false);
        return;
      }

      console.log("Validation result:", data);
      setValidation(data);
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Failed to validate rollback");
      onOpenChange(false);
    } finally {
      setValidating(false);
    }
  };

  const handleRollback = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please provide a detailed reason (at least 10 characters)");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/rollback/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to rollback payment");
        return;
      }

      toast.success(data.message || "Payment rolled back successfully");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Rollback error:", error);
      toast.error("An error occurred during rollback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Rollback Payment Confirmation
          </DialogTitle>
          <DialogDescription>
            This action will delete the payment and mark all associated rent periods as unpaid.
          </DialogDescription>
        </DialogHeader>

        {validating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-3 text-muted-foreground">Validating payment...</p>
          </div>
        ) : !validation ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No validation data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show validation errors */}
            {validation.errors && validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Cannot Rollback Payment:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.errors.map((error: string, index: number) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Show rollback details - ALWAYS show if available */}
            {validation.rollbackDetails && (
              <>
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Payment Amount:</div>
                    <div className="font-medium">
                      ₹{validation.rollbackDetails.paymentAmount.toLocaleString("en-IN")}
                    </div>

                    <div className="text-muted-foreground">Payment Method:</div>
                    <div className="font-medium uppercase">
                      {validation.rollbackDetails.paymentMethod}
                    </div>

                    <div className="text-muted-foreground">Periods Affected:</div>
                    <div className="font-medium">
                      {validation.rollbackDetails.periods.join(", ")}
                    </div>

                    <div className="text-muted-foreground">Total Rent:</div>
                    <div className="font-medium">
                      ₹{validation.rollbackDetails.totalRentAmount.toLocaleString("en-IN")}
                    </div>

                    {validation.rollbackDetails.hasAdjustments && (
                      <>
                        <div className="text-muted-foreground">Adjustments:</div>
                        <div className="font-medium text-orange-600">
                          ₹{validation.rollbackDetails.adjustmentAmount?.toLocaleString("en-IN")}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Show warnings */}
                {validation.warnings && validation.warnings.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.warnings.map((warning: string, index: number) => (
                          <li key={index} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Reason input - only show if can rollback */}
                {validation.canRollback && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reason">
                        Reason for Rollback <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reason"
                        placeholder="e.g., Duplicate entry, incorrect amount, tenant refund"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 10 characters required
                      </p>
                    </div>

                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Warning:</strong> This action cannot be undone. The payment will be
                        permanently deleted from the database. Make sure to refund the physical
                        cash/amount to the tenant.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          {validation && (
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={
                loading ||
                !validation.canRollback ||
                !reason.trim() ||
                reason.trim().length < 10
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rolling Back...
                </>
              ) : (
                "Confirm Rollback"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
