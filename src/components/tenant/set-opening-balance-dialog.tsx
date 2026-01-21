"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, Plus } from "lucide-react";
import { toast } from "sonner";

interface SetOpeningBalanceDialogProps {
  tenantId: string;
  tenantName: string;
  moveInDate?: string;
  onSuccess?: () => void;
}

export function SetOpeningBalanceDialog({
  tenantId,
  tenantName,
  moveInDate,
  onSuccess,
}: SetOpeningBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [balanceDate, setBalanceDate] = useState(
    moveInDate || new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    // Validation
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (numAmount === 0) {
      toast.error("Amount cannot be zero");
      return;
    }

    if (!balanceDate) {
      toast.error("Please select a date");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/opening-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          date: balanceDate,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to set opening balance");
        return;
      }

      toast.success("Opening balance set successfully");
      setOpen(false);

      // Reset form
      setAmount("");
      setBalanceDate(moveInDate || new Date().toISOString().split("T")[0]);
      setDescription("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error setting opening balance:", error);
      toast.error("Failed to set opening balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Set Opening Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Opening Balance</DialogTitle>
          <DialogDescription>
            Set the initial balance for {tenantName}. This can only be set once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Positive amount:</strong> Tenant owes you (dues)
              <br />
              <strong>Negative amount:</strong> Tenant has paid in advance (credit)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount (e.g., 5000 or -3000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Use positive for dues, negative for advance payment
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={balanceDate}
              onChange={(e) => setBalanceDate(e.target.value)}
              disabled={loading}
              max={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground">
              Date when this balance is from
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Previous rent dues from old system"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting...
              </>
            ) : (
              "Set Opening Balance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
