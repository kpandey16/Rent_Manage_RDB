"use client";

import { useState, useMemo } from "react";
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
import { LogOut, AlertTriangle, CheckCircle, Info } from "lucide-react";

// Placeholder data - will come from DB
const tenants = [
  { id: "1", name: "Amit Sharma", rooms: [{ id: "R1", code: "R1", rent: 5000 }], totalDues: 0, securityDeposit: 10000 },
  { id: "2", name: "Priya Singh", rooms: [{ id: "R2", code: "R2", rent: 4500 }, { id: "R4", code: "R4", rent: 4500 }], totalDues: 0, securityDeposit: 18000 },
  { id: "3", name: "Ramesh Kumar", rooms: [{ id: "R3", code: "R3", rent: 5500 }], totalDues: 11000, securityDeposit: 11000 },
  { id: "4", name: "Sunita Devi", rooms: [{ id: "R5", code: "R5", rent: 5000 }], totalDues: 0, securityDeposit: 10000 },
  { id: "5", name: "Suresh Patel", rooms: [{ id: "R7", code: "R7", rent: 5000 }], totalDues: 5000, securityDeposit: 10000 },
  { id: "6", name: "Meera Joshi", rooms: [{ id: "R8", code: "R8", rent: 4000 }], totalDues: 12000, securityDeposit: 8000 },
  { id: "7", name: "Vikram Rao", rooms: [{ id: "R9", code: "R9", rent: 4000 }, { id: "R10", code: "R10", rent: 4000 }], totalDues: 32000, securityDeposit: 16000 },
];

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
  notes: string;
}

export function VacateRoomForm({ trigger, onSubmit }: VacateRoomFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<VacateFormData>({
    tenantId: "",
    roomId: "",
    vacateDate: format(new Date(), "yyyy-MM-dd"),
    refundDeposit: false,
    refundAmount: 0,
    notes: "",
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacateValidation.allowed) return;

    onSubmit?.(formData);
    setOpen(false);
    // Reset form
    setFormData({
      tenantId: "",
      roomId: "",
      vacateDate: format(new Date(), "yyyy-MM-dd"),
      refundDeposit: false,
      refundAmount: 0,
      notes: "",
    });
  };

  const handleTenantChange = (tenantId: string) => {
    setFormData((prev) => ({
      ...prev,
      tenantId,
      roomId: "", // Reset room selection when tenant changes
      refundAmount: 0,
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
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.rooms.length} room{tenant.rooms.length > 1 ? "s" : ""})
                    </SelectItem>
                  ))}
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
                        {room.code} - ₹{room.rent.toLocaleString("en-IN")}/mo
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!vacateValidation.allowed || !formData.tenantId || !formData.roomId}
              variant={vacateValidation.allowed ? "default" : "secondary"}
            >
              {vacateValidation.allowed ? "Confirm Vacate" : "Cannot Vacate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
