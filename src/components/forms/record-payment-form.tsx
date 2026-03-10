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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Info, Loader2, Check, ChevronsUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import { NoTranslate } from "@/components/no-translate";

interface Room {
  id: string;
  code: string;
  name: string;
  currentRent: number;
  expectedRent: number;
  moveInDate: string;
  isActive: boolean;
}

interface Tenant {
  id: string;
  name: string;
  monthlyRent: number;
  securityDeposit: number;
  lastPaidMonth: string | null;
  creditBalance: number;
  totalDues: number;
  rooms: Room[];
  nextUnpaidPeriod: string | null;
  nextUnpaidPeriodRaw: string | null;
}

const paymentTypes = [
  { value: "payment", label: "Payment", category: "income" },
  { value: "credit", label: "Apply Credit to Rent", category: "adjustment" },
  { value: "adjustment", label: "Adjustment (Discount/Maintenance/Other)", category: "adjustment" },
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

const adjustmentTypes = [
  { value: "none", label: "No Adjustment", description: "" },
  { value: "discount", label: "Discount", description: "One-time discount given to tenant" },
  { value: "maintenance", label: "Maintenance Deduction", description: "Deduct for tenant-paid maintenance expenses" },
  { value: "other", label: "Other Adjustment", description: "Any other adjustment or waiver" },
];

interface RecordPaymentFormProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: PaymentFormData) => void;
  preSelectedTenantId?: string; // Pre-select a tenant when opening the form
}

export interface PaymentFormData {
  tenantId: string;
  amount: number;
  type: string;
  method: string;
  date: string;
  notes: string;
  // Adjustments - single type and amount
  adjustmentType?: string;
  adjustmentAmount?: number;
  // Legacy fields for backward compatibility
  discount?: number;
  maintenanceDeduction?: number;
  otherAdjustment?: number;
  autoApplyToRent?: boolean;
}

export function RecordPaymentForm({ trigger, onSubmit, preSelectedTenantId }: RecordPaymentFormProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [tenantComboboxOpen, setTenantComboboxOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [formData, setFormData] = useState<PaymentFormData>({
    tenantId: "",
    amount: 0,
    type: "payment",
    method: "cash",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    adjustmentType: "none",
    adjustmentAmount: 0,
    discount: 0,
    maintenanceDeduction: 0,
    otherAdjustment: 0,
    autoApplyToRent: true,
  });

  // Fetch tenants when dialog opens
  useEffect(() => {
    if (open) {
      fetchTenants();
      // Reset form when dialog opens
      setFormData({
        tenantId: preSelectedTenantId || "", // Use pre-selected tenant if provided
        amount: 0,
        type: "payment",
        method: "cash",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        discount: 0,
        maintenanceDeduction: 0,
        otherAdjustment: 0,
        autoApplyToRent: true,
      });
      setSelectedTenant(null);
      setShowAdjustments(false);
    }
  }, [open, preSelectedTenantId]);

  // Fetch tenant details when tenant is selected
  useEffect(() => {
    if (formData.tenantId) {
      fetchTenantDetails(formData.tenantId);
    } else {
      setSelectedTenant(null);
    }
  }, [formData.tenantId]);

  // Auto-fill amount with expected rent when tenant is selected
  useEffect(() => {
    if (selectedTenant && formData.type === "payment" && formData.amount === 0) {
      const expectedTotal = selectedTenant.rooms?.reduce((sum, room) => sum + room.expectedRent, 0) || selectedTenant.monthlyRent;
      setFormData((prev) => ({ ...prev, amount: expectedTotal }));
    }
  }, [selectedTenant, formData.type]);

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
    // Show confirmation dialog instead of directly submitting
    setShowConfirmation(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setSubmitting(true);
      setShowConfirmation(false);
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
      setPaymentResult(data);
      setShowSuccess(true);
      onSubmit?.(formData);
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast.error(error instanceof Error ? error.message : t("messages.paymentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setOpen(false);
    // Reset form
    setFormData({
      tenantId: "",
      amount: 0,
      type: "payment",
      method: "cash",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      adjustmentType: "none",
      adjustmentAmount: 0,
      discount: 0,
      maintenanceDeduction: 0,
      otherAdjustment: 0,
      autoApplyToRent: true,
    });
    setShowAdjustments(false);
    setPaymentResult(null);
  };

  const handleQuickFill = () => {
    if (selectedTenant) {
      // Use total expected rent if rooms data is available, otherwise use monthly rent
      const expectedTotal = selectedTenant.rooms?.reduce((sum, room) => sum + room.expectedRent, 0) || selectedTenant.monthlyRent;
      setFormData((prev) => ({ ...prev, amount: expectedTotal }));
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset all states when dialog closes
      setShowConfirmation(false);
      setShowSuccess(false);
      setPaymentResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("payment.recordPayment")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("payment.recordPayment")}</DialogTitle>
          <DialogDescription>
            Record a new payment from a tenant. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Tenant Selection */}
            <div className="grid gap-2">
              <Label htmlFor="tenant">{t("payment.selectTenant")} *</Label>
              <Popover open={tenantComboboxOpen} onOpenChange={setTenantComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tenantComboboxOpen}
                    className="w-full justify-between"
                    disabled={loading || submitting}
                  >
                    {formData.tenantId ? (
                      <NoTranslate>{tenants.find((tenant) => tenant.id === formData.tenantId)?.name}</NoTranslate>
                    ) : loading ? (
                      t("common.loading")
                    ) : (
                      t("payment.searchTenant")
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder={t("payment.searchTenant")} />
                    <CommandList>
                      <CommandEmpty>{t("payment.noTenantFound")}</CommandEmpty>
                      <CommandGroup>
                        {tenants.map((tenant) => (
                          <CommandItem
                            key={tenant.id}
                            value={tenant.name}
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, tenantId: tenant.id }));
                              setTenantComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.tenantId === tenant.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <NoTranslate>{tenant.name}</NoTranslate>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tenant Information Display - Compact */}
            {selectedTenant && (
              <div className="space-y-2">
                {/* Compact Summary */}
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-muted-foreground">
                        Last Paid: <span className="font-medium text-foreground">{selectedTenant.lastPaidMonth || "N/A"}</span>
                      </span>
                      {selectedTenant.creditBalance > 0 && (
                        <span className="text-muted-foreground">
                          Credit: <span className="font-medium text-green-600">₹{selectedTenant.creditBalance.toLocaleString("en-IN")}</span>
                        </span>
                      )}
                      {selectedTenant.totalDues > 0 && (
                        <span className="text-muted-foreground">
                          Dues: <span className="font-medium text-red-600">₹{selectedTenant.totalDues.toLocaleString("en-IN")}</span>
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setShowTenantDetails(!showTenantDetails)}
                    >
                      {showTenantDetails ? "Hide Details" : "View Details"} {showTenantDetails ? "▲" : "▼"}
                    </Button>
                  </div>
                </div>

                {/* Expandable Details */}
                {showTenantDetails && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monthly Rent</p>
                          <p className="font-semibold">₹{selectedTenant.monthlyRent.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Paid Month</p>
                          <p className="font-semibold">{selectedTenant.lastPaidMonth || "N/A"}</p>
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

                    {/* Room Breakdown */}
                    {selectedTenant.rooms && selectedTenant.rooms.length > 0 && (
                      <div className="rounded-lg border bg-muted/50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold">
                            Rooms & Expected Rent
                            {selectedTenant.nextUnpaidPeriod && (
                              <span className="ml-2 text-muted-foreground font-normal">
                                (for {selectedTenant.nextUnpaidPeriod})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {selectedTenant.rooms.map((room) => (
                            <div
                              key={room.id}
                              className="flex items-center justify-between text-sm py-2 border-t first:border-t-0 first:pt-0"
                            >
                              <div>
                                <p className="font-medium">{room.code}</p>
                                <p className="text-xs text-muted-foreground">{room.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  ₹{room.expectedRent.toLocaleString("en-IN")}
                                </p>
                                {room.expectedRent !== room.currentRent && (
                                  <p className="text-xs text-muted-foreground">
                                    (Current: ₹{room.currentRent.toLocaleString("en-IN")})
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {selectedTenant.rooms.length > 1 && (
                            <div className="flex items-center justify-between text-sm pt-2 border-t font-semibold">
                              <p>Total Expected</p>
                              <p>
                                ₹{selectedTenant.rooms
                                  .reduce((sum, room) => sum + room.expectedRent, 0)
                                  .toLocaleString("en-IN")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">{t("payment.amount")} *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  min={formData.type === "adjustment" ? undefined : "0"}
                  step="1"
                  value={formData.type === "credit" ? "" : (formData.amount || "")}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                  className="pl-7"
                  placeholder={formData.type === "credit" ? "Uses existing credit" : formData.type === "adjustment" ? "Positive to add, negative to reduce" : "0"}
                  disabled={submitting || formData.type === "credit"}
                  required={formData.type !== "credit"}
                />
              </div>

              {/* Quick Action Buttons */}
              {selectedTenant && formData.type === "payment" && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const expectedTotal = selectedTenant.rooms?.reduce((sum, room) => sum + room.expectedRent, 0) || selectedTenant.monthlyRent;
                      setFormData((prev) => ({ ...prev, amount: expectedTotal }));
                    }}
                  >
                    {t("payment.fullRent")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const expectedTotal = selectedTenant.rooms?.reduce((sum, room) => sum + room.expectedRent, 0) || selectedTenant.monthlyRent;
                      setFormData((prev) => ({ ...prev, amount: Math.floor(expectedTotal / 2) }));
                    }}
                  >
                    {t("payment.halfRent")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setFormData((prev) => ({ ...prev, amount: 1000 }))}
                  >
                    ₹1,000
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setFormData((prev) => ({ ...prev, amount: 5000 }))}
                  >
                    ₹5,000
                  </Button>
                </div>
              )}
              {formData.type === "adjustment" && (
                <Alert>
                  <AlertDescription>
                    <Info className="h-4 w-4 inline mr-2" />
                    Enter positive amount to add credit, negative amount to reduce credit.
                    <br />
                    Example: <strong>-800</strong> will reduce credit by ₹800
                  </AlertDescription>
                </Alert>
              )}
              {formData.type === "credit" && selectedTenant && (
                <Alert>
                  <AlertDescription>
                    <Info className="inline h-4 w-4 mr-1" />
                    This will apply existing credit balance (₹{selectedTenant.creditBalance.toLocaleString("en-IN")}) to unpaid rent periods.
                    {selectedTenant.creditBalance === 0 && " No credit available to apply."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Adjustments Section - Only for Payment type */}
            {formData.type === "payment" && selectedTenant && (
              <div className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setShowAdjustments(!showAdjustments)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Adjustments (Optional)</span>
                    <span className="text-xs text-muted-foreground">
                      {formData.adjustmentType && formData.adjustmentType !== "none" && (formData.adjustmentAmount || 0) > 0
                        ? `${adjustmentTypes.find(t => t.value === formData.adjustmentType)?.label}: ₹${(formData.adjustmentAmount || 0).toLocaleString("en-IN")}`
                        : "Add discount or deduction"}
                    </span>
                  </div>
                  {showAdjustments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAdjustments && (
                  <div className="p-4 pt-0 space-y-3 border-t">
                    {/* Adjustment Type - Quick Selection Buttons */}
                    <div className="grid gap-2">
                      <Label className="text-sm">Adjustment Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {adjustmentTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                adjustmentType: type.value,
                                adjustmentAmount: type.value === "none" ? 0 : prev.adjustmentAmount,
                                // Update legacy fields for backend compatibility
                                discount: type.value === "discount" ? prev.adjustmentAmount || 0 : 0,
                                maintenanceDeduction: type.value === "maintenance" ? prev.adjustmentAmount || 0 : 0,
                                otherAdjustment: type.value === "other" ? prev.adjustmentAmount || 0 : 0,
                              }));
                            }}
                            disabled={submitting}
                            className={cn(
                              "px-3 py-2 text-sm font-medium rounded-md border transition-all",
                              formData.adjustmentType === type.value
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background hover:bg-muted border-input"
                            )}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                      {formData.adjustmentType && formData.adjustmentType !== "none" && (
                        <p className="text-xs text-muted-foreground">
                          {adjustmentTypes.find(t => t.value === formData.adjustmentType)?.description}
                        </p>
                      )}
                    </div>

                    {/* Adjustment Amount - Only show if type is selected */}
                    {formData.adjustmentType && formData.adjustmentType !== "none" && (
                      <div className="grid gap-2">
                        <Label htmlFor="adjustmentAmount" className="text-sm">Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                          <Input
                            id="adjustmentAmount"
                            type="number"
                            min="0"
                            step="1"
                            value={formData.adjustmentAmount || ""}
                            onChange={(e) => {
                              const amount = Number(e.target.value) || 0;
                              setFormData((prev) => ({
                                ...prev,
                                adjustmentAmount: amount,
                                // Update legacy fields for backend compatibility
                                discount: prev.adjustmentType === "discount" ? amount : 0,
                                maintenanceDeduction: prev.adjustmentType === "maintenance" ? amount : 0,
                                otherAdjustment: prev.adjustmentType === "other" ? amount : 0,
                              }));
                            }}
                            className="pl-7"
                            placeholder="0"
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    )}

                    {/* Real-time Calculation Summary */}
                    {formData.adjustmentType && formData.adjustmentType !== "none" && (formData.adjustmentAmount || 0) > 0 && (() => {
                      const expectedRent = selectedTenant.rooms?.reduce((sum, room) => sum + room.expectedRent, 0) || selectedTenant.monthlyRent;
                      const totalAdjustments = formData.adjustmentAmount || 0;
                      const amountDue = Math.max(0, expectedRent - totalAdjustments);
                      const amountPaid = formData.amount || 0;
                      const difference = amountPaid - amountDue;

                      return (
                        <div className="mt-4 p-3 bg-muted/50 rounded-md space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expected Rent:</span>
                            <span className="font-medium">₹{expectedRent.toLocaleString("en-IN")}</span>
                          </div>
                          {totalAdjustments > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Adjustments:</span>
                              <span className="font-medium text-orange-600">-₹{totalAdjustments.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Amount Due:</span>
                            <span className="font-semibold">₹{amountDue.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Paid:</span>
                            <span className="font-semibold">₹{amountPaid.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-medium">Status:</span>
                            <span className={cn(
                              "font-semibold",
                              difference === 0 ? "text-green-600" : difference > 0 ? "text-blue-600" : "text-orange-600"
                            )}>
                              {difference === 0 ? "✓ Fully Paid" :
                               difference > 0 ? `Overpaid (+₹${difference.toLocaleString("en-IN")})` :
                               `Partial (₹${Math.abs(difference).toLocaleString("en-IN")} short)`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Auto-apply to rent */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="autoApply"
                        checked={formData.autoApplyToRent}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autoApplyToRent: checked as boolean }))}
                      />
                      <label
                        htmlFor="autoApply"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Auto-apply to rent
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">{t("payment.type")} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`paymentTypes.${type.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.type === "payment" && selectedTenant && (
                <p className="text-xs text-muted-foreground">
                  {t("payment.tipUseAdjustments")}
                </p>
              )}
              {formData.type === "adjustment" && (
                <p className="text-xs text-muted-foreground">
                  {t("payment.forPaymentWithAdjustments")}
                </p>
              )}
            </div>

            {/* Method & Date - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="method">{t("payment.method")} *</Label>
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
                        {t(`paymentMethods.${method.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">{t("payment.date")} *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">{t("payment.notes")} (optional)</Label>
              <Input
                id="notes"
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                disabled={submitting}
                placeholder="Additional notes..."
              />
            </div>

            {/* Compact Payment Summary */}
            {selectedTenant && formData.type === "payment" && formData.amount > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm border">
                {(() => {
                  const monthlyRent = selectedTenant.rooms?.reduce((sum, room) => sum + room.expectedRent, 0) || selectedTenant.monthlyRent;
                  const totalAdjustments = formData.adjustmentType && formData.adjustmentType !== "none" ? (formData.adjustmentAmount || 0) : 0;
                  const netPayment = (formData.amount || 0) - totalAdjustments;

                  // Calculate how many months this payment covers
                  const monthsCovered = Math.floor(netPayment / monthlyRent);
                  const remainingAfterMonths = netPayment - (monthsCovered * monthlyRent);

                  // Generate display message
                  if (monthsCovered === 0) {
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Monthly rent: <span className="font-medium text-foreground">₹{monthlyRent.toLocaleString("en-IN")}</span>
                        </span>
                        <span className="font-semibold text-orange-600">
                          Partial payment (₹{(monthlyRent - netPayment).toLocaleString("en-IN")} short)
                        </span>
                      </div>
                    );
                  }

                  if (monthsCovered === 1 && remainingAfterMonths === 0) {
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Paying: <span className="font-medium text-foreground">₹{netPayment.toLocaleString("en-IN")}</span>
                        </span>
                        <span className="font-semibold text-green-600">
                          ✓ Covers 1 month fully
                        </span>
                      </div>
                    );
                  }

                  if (monthsCovered >= 1 && remainingAfterMonths === 0) {
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Paying: <span className="font-medium text-foreground">₹{netPayment.toLocaleString("en-IN")}</span>
                        </span>
                        <span className="font-semibold text-green-600">
                          ✓ Covers {monthsCovered} months fully
                        </span>
                      </div>
                    );
                  }

                  if (monthsCovered >= 1 && remainingAfterMonths > 0) {
                    return (
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-muted-foreground">
                          Paying: <span className="font-medium text-foreground">₹{netPayment.toLocaleString("en-IN")}</span>
                        </span>
                        <span className="font-semibold text-green-600">
                          ✓ Covers {monthsCovered} month{monthsCovered > 1 ? 's' : ''} + ₹{remainingAfterMonths.toLocaleString("en-IN")} credit
                        </span>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t("payment.cancel")}
            </Button>
            <Button type="submit" disabled={!formData.tenantId || (formData.type !== "credit" && !formData.amount) || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? t("payment.submitting") : t("payment.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⚠️ Confirm Payment
            </DialogTitle>
            <DialogDescription>
              Please review the payment details before confirming
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tenant:</span>
              <span className="font-medium">{selectedTenant?.name}</span>
            </div>
            {selectedTenant?.rooms && selectedTenant.rooms.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room(s):</span>
                <span className="font-medium">
                  {selectedTenant.rooms.map(r => r.code).join(", ")}
                </span>
              </div>
            )}
            {selectedTenant?.nextUnpaidPeriod && (formData.type === "payment" || formData.type === "credit") && (
              <div className="flex justify-between text-sm bg-blue-50 dark:bg-blue-950 p-2 rounded">
                <span className="text-muted-foreground">📅 Paying for:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {selectedTenant.nextUnpaidPeriod}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold text-green-600">₹{formData.amount.toLocaleString("en-IN")}</span>
            </div>
            {formData.adjustmentType && formData.adjustmentType !== "none" && formData.adjustmentAmount && formData.adjustmentAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {adjustmentTypes.find(t => t.value === formData.adjustmentType)?.label}:
                </span>
                <span className="font-semibold text-orange-600">
                  +₹{formData.adjustmentAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Date:</span>
              <span className="font-medium">{format(new Date(formData.date), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-medium capitalize">
                {paymentMethods.find(m => m.value === formData.method)?.label}
              </span>
            </div>
            {formData.notes && (
              <div className="text-sm pt-2 border-t">
                <span className="text-muted-foreground">Notes:</span>
                <p className="font-medium mt-1">{formData.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayment}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Processing..." : "✅ Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              ✅ Payment Successful!
            </DialogTitle>
            <DialogDescription>
              Payment has been recorded successfully
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {paymentResult?.transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-xs">{paymentResult.transactionId.slice(0, 8)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tenant:</span>
              <span className="font-medium">{selectedTenant?.name}</span>
            </div>
            {selectedTenant?.rooms && selectedTenant.rooms.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room(s):</span>
                <span className="font-medium">
                  {selectedTenant.rooms.map(r => r.code).join(", ")}
                </span>
              </div>
            )}
            {paymentResult?.appliedPeriods && paymentResult.appliedPeriods.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">📅 Paid Period(s):</span>
                  <span className="font-semibold text-green-700 dark:text-green-300">
                    {paymentResult.appliedPeriods.length === 1
                      ? formatPeriodDisplay(paymentResult.appliedPeriods[0])
                      : `${formatPeriodDisplay(paymentResult.appliedPeriods[0])} to ${formatPeriodDisplay(paymentResult.appliedPeriods[paymentResult.appliedPeriods.length - 1])}`
                    }
                  </span>
                </div>
                <div className="text-xs text-center text-green-700 dark:text-green-300 font-medium">
                  ✅ {paymentResult.appliedPeriods.length === 1
                    ? `${formatPeriodDisplay(paymentResult.appliedPeriods[0])} rent fully paid!`
                    : `${paymentResult.appliedPeriods.length} months rent fully paid!`
                  }
                </div>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold text-green-600">₹{formData.amount.toLocaleString("en-IN")}</span>
            </div>
            {paymentResult?.creditAmount !== undefined && paymentResult.creditAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining Credit:</span>
                <span className="font-semibold text-blue-600">
                  ₹{paymentResult.creditAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Date:</span>
              <span className="font-medium">{format(new Date(formData.date), "dd MMM yyyy")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleSuccessClose}
              className="w-full"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// Helper function to format period (YYYY-MM) to readable format (MMM-YY)
function formatPeriodDisplay(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]}-${year.substring(2)}`;
}
