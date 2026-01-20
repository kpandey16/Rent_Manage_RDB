"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [reason, setReason] = useState("");

  // Validate when dialog opens (triggered by useEffect)
  useEffect(() => {
    console.log("👀 useEffect triggered - open:", open, "validation:", validation ? "present" : "null");
    if (open && !validation) {
      console.log("🔄 Dialog opened, calling validateRollback");
      validateRollback();
    }

    // Reset when closing
    if (!open) {
      console.log("🔄 Dialog closed, resetting state");
      setValidation(null);
      setReason("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle dialog close button (user clicking X or backdrop)
  const handleOpenChange = (newOpen: boolean) => {
    console.log("🚪 handleOpenChange called with:", newOpen);
    onOpenChange(newOpen);
  };

  const validateRollback = async () => {
    console.log("🔍 Starting validation for ledgerId:", ledgerId);
    setValidating(true);
    try {
      console.log("📡 Sending validation request...");
      const response = await fetch("/api/rollback/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerId }),
      });

      console.log("📥 Response status:", response.status, response.statusText);
      const data = await response.json();
      console.log("📦 Response data:", data);

      if (!response.ok) {
        console.error("❌ Validation API error - Status:", response.status, "Data:", data);
        toast.error(data.error || t('rollback.rollbackError'));
        // Don't close dialog - let user see the error
        return;
      }

      console.log("✅ Validation successful, setting validation state");
      setValidation(data);
      console.log("✅ Validation state set:", data);
    } catch (error) {
      console.error("❌ Validation network error:", error);
      toast.error(t('rollback.rollbackError'));
      // Don't close dialog - let user see the error
    } finally {
      console.log("🏁 Validation complete, setting validating to false");
      setValidating(false);
    }
  };

  const handleRollback = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error(t('rollback.reasonMinLength'));
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
        toast.error(data.error || t('rollback.rollbackError'));
        return;
      }

      toast.success(data.message || t('rollback.rollbackSuccess'));
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Rollback error:", error);
      toast.error(t('rollback.rollbackError'));
    } finally {
      setLoading(false);
    }
  };

  console.log("🎨 Rendering dialog - open:", open, "validating:", validating, "validation:", validation ? "present" : "null");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('rollback.title')}
          </DialogTitle>
          <DialogDescription>
            {t('rollback.description')}
          </DialogDescription>
        </DialogHeader>

        {validating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-3 text-muted-foreground">{t('rollback.validating')}</p>
          </div>
        ) : !validation ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{t('rollback.noValidationData')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show validation errors */}
            {validation.errors && validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">{t('rollback.cannotRollback')}</div>
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
                    <div className="text-muted-foreground">{t('rollback.paymentAmount')}:</div>
                    <div className="font-medium">
                      ₹{validation.rollbackDetails.paymentAmount.toLocaleString("en-IN")}
                    </div>

                    <div className="text-muted-foreground">{t('rollback.paymentMethod')}:</div>
                    <div className="font-medium uppercase">
                      {validation.rollbackDetails.paymentMethod}
                    </div>

                    <div className="text-muted-foreground">{t('rollback.periodsAffected')}:</div>
                    <div className="font-medium">
                      {validation.rollbackDetails.periods.join(", ")}
                    </div>

                    <div className="text-muted-foreground">{t('rollback.totalRent')}:</div>
                    <div className="font-medium">
                      ₹{validation.rollbackDetails.totalRentAmount.toLocaleString("en-IN")}
                    </div>

                    {validation.rollbackDetails.hasAdjustments && (
                      <>
                        <div className="text-muted-foreground">{t('rollback.adjustments')}:</div>
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
                        {t('rollback.reason')} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reason"
                        placeholder={t('rollback.reasonPlaceholder')}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('rollback.reasonMinLength')}
                      </p>
                    </div>

                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>{t('rollback.warning')}:</strong> {t('rollback.warningMessage')}
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
            {t('common.cancel')}
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
                  {t('common.loading')}
                </>
              ) : (
                t('rollback.confirmRollback')
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
