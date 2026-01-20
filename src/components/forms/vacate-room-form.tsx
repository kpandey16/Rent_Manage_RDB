"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogOut, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  code: string;
  currentRent: number;
}

interface Tenant {
  id: string;
  name: string;
  rooms: Room[];
  totalDues: number;
  creditBalance: number;
  securityDeposit: number;
}

interface VacateRoomFormProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: VacateFormData) => void;
}

export interface VacateFormData {
  tenantId: string;
  roomId: string;
  vacateDate: string;
  refundDeposit: boolean;
  refundAmount: number;
  refundCreditBalance: number;
  notes: string;
}

export function VacateRoomForm({ trigger, onSubmit }: VacateRoomFormProps) {
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<VacateFormData>({
    tenantId: "",
    roomId: "",
    vacateDate: format(new Date(), "yyyy-MM-dd"),
    refundDeposit: false,
    refundAmount: 0,
    refundCreditBalance: 0,
    notes: "",
  });

  // Fetch tenants when dialog opens
  useEffect(() => {
    if (open) {
      fetchTenants();
      // Reset form
      setFormData({
        tenantId: "",
        roomId: "",
        vacateDate: format(new Date(), "yyyy-MM-dd"),
        refundDeposit: false,
        refundAmount: 0,
        refundCreditBalance: 0,
        notes: "",
      });
    }
  }, [open]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      const data = await response.json();

      // Transform API data to match form format
      const transformedTenants = data.tenants
        .filter((t: any) => {
          // Only show active tenants with allocated rooms
          const rooms = t.room_codes ? t.room_codes.split(',').filter(Boolean) : [];
          return t.is_active === 1 && rooms.length > 0;
        })
        .map((t: any) => {
          // Parse room data
          const roomCodes = t.room_codes ? t.room_codes.split(',') : [];
          const roomIds = t.room_ids ? t.room_ids.split(',') : [];
          const roomRents = t.room_rents ? t.room_rents.split(',').map(Number) : [];

          const rooms = roomCodes.map((code: string, index: number) => ({
            id: roomIds[index] || '',
            code: code,
            currentRent: roomRents[index] || 0,
          }));

          return {
            id: t.id,
            name: t.name,
            rooms,
            totalDues: Number(t.total_dues || 0),
            creditBalance: Number(t.credit_balance || 0),
            securityDeposit: Number(t.security_deposit_balance || 0),
          };
        });

      setTenants(transformedTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const selectedTenant = tenants.find((t) => t.id === formData.tenantId);
  const selectedRoom = selectedTenant?.rooms.find((r) => r.id === formData.roomId);

  // Check if vacate is allowed
  const vacateValidation = useMemo(() => {
    if (!selectedTenant || !selectedRoom) {
      return { allowed: false, reason: "select_tenant_room" };
    }

    const hasMultipleRooms = selectedTenant.rooms.length > 1;
    const hasDues = selectedTenant.totalDues > 0;

    if (hasMultipleRooms) {
      // Allow vacate even with dues if tenant has multiple rooms
      return {
        allowed: true,
        reason: hasDues ? "multiple_rooms_with_dues" : "multiple_rooms_no_dues",
        warning: hasDues ? `Tenant has ₹${selectedTenant.totalDues.toLocaleString("en-IN")} pending dues. Since they have other rooms, vacate is allowed.` : null
      };
    }

    if (hasDues) {
      // Block vacate if single room with dues
      return {
        allowed: false,
        reason: "single_room_with_dues",
        error: `Cannot vacate: Tenant has ₹${selectedTenant.totalDues.toLocaleString("en-IN")} pending dues. Please clear dues before vacating the only room.`
      };
    }

    return { allowed: true, reason: "single_room_no_dues" };
  }, [selectedTenant, selectedRoom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacateValidation.allowed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/tenants/${formData.tenantId}/vacate-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: formData.roomId,
          vacateDate: formData.vacateDate,
          refundAmount: formData.refundAmount,
          refundCreditBalance: formData.refundCreditBalance,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to vacate room");
      }

      const data = await response.json();
      toast.success(data.message || "Room vacated successfully");
      onSubmit?.(formData);
      setOpen(false);
    } catch (error) {
      console.error("Error vacating room:", error);
      toast.error(error instanceof Error ? error.message : "Failed to vacate room");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    setFormData((prev) => ({
      ...prev,
      tenantId,
      roomId: "", // Reset room selection when tenant changes
      refundAmount: 0,
      refundCreditBalance: 0,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-1" />
            Vacate Room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vacate Room</DialogTitle>
          <DialogDescription>
            Process a room vacate for a tenant. Select tenant and room to see dues.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Tenant Selection */}
            <div className="grid gap-2">
              <Label htmlFor="tenant">Tenant *</Label>
              <Select
                value={formData.tenantId}
                onValueChange={handleTenantChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading tenants..." : "Select tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {loading ? "Loading..." : "No tenants with allocated rooms"}
                    </div>
                  ) : (
                    tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.rooms.length} room{tenant.rooms.length > 1 ? "s" : ""})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Room Selection */}
            {selectedTenant && (
              <div className="grid gap-2">
                <Label htmlFor="room">Room to Vacate *</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, roomId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTenant.rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.code} - ₹{room.currentRent.toLocaleString("en-IN")}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tenant Summary */}
            {selectedTenant && selectedRoom && (
              <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Rooms:</span>
                  <span className="font-medium">{selectedTenant.rooms.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security Deposit:</span>
                  <span className="font-medium">₹{selectedTenant.securityDeposit.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credit Balance:</span>
                  <span className={`font-medium ${selectedTenant.creditBalance > 0 ? "text-green-600" : selectedTenant.creditBalance < 0 ? "text-destructive" : ""}`}>
                    {selectedTenant.creditBalance > 0 ? '+' : selectedTenant.creditBalance < 0 ? '-' : ''}₹{Math.abs(selectedTenant.creditBalance).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending Dues:</span>
                  <span className={`font-medium ${selectedTenant.totalDues > 0 ? "text-destructive" : "text-green-600"}`}>
                    {selectedTenant.totalDues > 0
                      ? `₹${selectedTenant.totalDues.toLocaleString("en-IN")}`
                      : "No dues"}
                  </span>
                </div>
              </div>
            )}

            {/* Validation Messages */}
            {vacateValidation.reason === "single_room_with_dues" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Vacate Blocked</AlertTitle>
                <AlertDescription>{vacateValidation.error}</AlertDescription>
              </Alert>
            )}

            {vacateValidation.reason === "multiple_rooms_with_dues" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Dues Pending</AlertTitle>
                <AlertDescription>{vacateValidation.warning}</AlertDescription>
              </Alert>
            )}

            {(vacateValidation.reason === "single_room_no_dues" || vacateValidation.reason === "multiple_rooms_no_dues") && selectedRoom && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  No pending dues. Room can be vacated.
                </AlertDescription>
              </Alert>
            )}

            {/* Vacate Date */}
            {vacateValidation.allowed && selectedRoom && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="vacateDate">Vacate Date *</Label>
                  <Input
                    id="vacateDate"
                    type="date"
                    value={formData.vacateDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vacateDate: e.target.value }))}
                    required
                  />
                </div>

                {/* Refund Amount */}
                <div className="grid gap-2">
                  <Label htmlFor="refundAmount">Deposit Refund Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="refundAmount"
                      type="number"
                      min="0"
                      max={selectedTenant?.securityDeposit || 0}
                      step="1"
                      value={formData.refundAmount || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, refundAmount: Number(e.target.value) }))}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max refundable: ₹{(selectedTenant?.securityDeposit || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Credit Balance Refund */}
                {selectedTenant && selectedTenant.creditBalance > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="refundCreditBalance">Credit Balance Refund</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        id="refundCreditBalance"
                        type="number"
                        min="0"
                        max={selectedTenant.creditBalance}
                        step="1"
                        value={formData.refundCreditBalance || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, refundCreditBalance: Number(e.target.value) }))}
                        className="pl-7"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available credit: ₹{selectedTenant.creditBalance.toLocaleString("en-IN")}. This will be deducted from collection.
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Reason for vacating, condition notes..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!vacateValidation.allowed || !formData.tenantId || !formData.roomId || submitting}
              variant={vacateValidation.allowed ? "default" : "secondary"}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Processing..." : vacateValidation.allowed ? "Confirm Vacate" : "Cannot Vacate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
