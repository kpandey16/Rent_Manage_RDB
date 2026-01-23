"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, Plus, Minus, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface OperatorAdjustmentFormProps {
  onSuccess?: () => void;
}

type AdjustmentType = 'opening_balance' | 'add_cash' | 'remove_cash' | 'reconciliation';

interface AdjustmentConfig {
  type: AdjustmentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
  notesPlaceholder: string;
}

const adjustmentTypes: AdjustmentConfig[] = [
  {
    type: 'opening_balance',
    title: 'Set Opening Balance',
    description: 'Set the initial cash balance when starting to use the system',
    icon: <DollarSign className="h-4 w-4 mr-2" />,
    color: 'text-blue-600',
    placeholder: 'Enter initial balance',
    notesPlaceholder: 'e.g., Cash in hand as of [date]',
  },
  {
    type: 'add_cash',
    title: 'Add Cash',
    description: 'Add external cash to the operator balance (personal funds, loans, etc.)',
    icon: <Plus className="h-4 w-4 mr-2" />,
    color: 'text-green-600',
    placeholder: 'Amount to add',
    notesPlaceholder: 'e.g., Personal funds added for business expenses',
  },
  {
    type: 'remove_cash',
    title: 'Remove Cash',
    description: 'Remove cash from operator balance (personal withdrawal, corrections)',
    icon: <Minus className="h-4 w-4 mr-2" />,
    color: 'text-red-600',
    placeholder: 'Amount to remove',
    notesPlaceholder: 'e.g., Personal withdrawal or correction for duplicate entry',
  },
  {
    type: 'reconciliation',
    title: 'Reconciliation',
    description: 'Adjust balance after physical cash counting (use + or - to indicate direction)',
    icon: <RefreshCw className="h-4 w-4 mr-2" />,
    color: 'text-purple-600',
    placeholder: 'Adjustment amount (+ or -)',
    notesPlaceholder: 'e.g., Discrepancy found during cash count on [date]',
  },
];

export function OperatorAdjustmentForm({ onSuccess }: OperatorAdjustmentFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AdjustmentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleOpenDialog = (config: AdjustmentConfig) => {
    setSelectedType(config);
    setFormData({
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) return;

    const amount = parseFloat(formData.amount);

    // Validation
    if (isNaN(amount) || amount === 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // For non-reconciliation types, amount should be positive
    if (selectedType.type !== 'reconciliation' && amount < 0) {
      toast.error('Amount must be positive');
      return;
    }

    if (!formData.notes.trim()) {
      toast.error('Please provide a reason for this adjustment');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/operator/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          adjustmentType: selectedType.type,
          adjustmentDate: formData.date,
          notes: formData.notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create adjustment');
        return;
      }

      toast.success(data.message || 'Adjustment recorded successfully');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast.error('An error occurred while creating adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Adjust Balance
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Balance Adjustments</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {adjustmentTypes.map((config) => (
            <DropdownMenuItem
              key={config.type}
              onClick={() => handleOpenDialog(config)}
              className="cursor-pointer"
            >
              <div className="flex items-start gap-2 w-full">
                <div className={config.color}>{config.icon}</div>
                <div className="flex-1">
                  <div className="font-medium">{config.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {config.description}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Adjustment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {selectedType && (
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={selectedType.color}>{selectedType.icon}</span>
                  {selectedType.title}
                </DialogTitle>
                <DialogDescription>{selectedType.description}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Amount */}
                <div className="grid gap-2">
                  <Label htmlFor="amount">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="1"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      className="pl-7"
                      placeholder={selectedType.placeholder}
                      disabled={loading}
                      required
                    />
                  </div>
                  {selectedType.type === 'reconciliation' && (
                    <p className="text-xs text-muted-foreground">
                      Use positive (+) to add or negative (-) to remove
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="grid gap-2">
                  <Label htmlFor="date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="notes">
                    Reason / Notes <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={selectedType.notesPlaceholder}
                    disabled={loading}
                    rows={3}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Please explain why this adjustment is needed
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Record Adjustment'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
