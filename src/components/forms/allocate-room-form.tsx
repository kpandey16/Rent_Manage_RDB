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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Placeholder data - will come from DB
const tenants = [
  { id: "1", name: "Amit Sharma", activeRooms: 0 },
  { id: "2", name: "Priya Singh", activeRooms: 2 },
  { id: "3", name: "Ramesh Kumar", activeRooms: 1 },
  { id: "4", name: "Sunita Devi", activeRooms: 0 },
  { id: "5", name: "Suresh Patel", activeRooms: 1 },
  { id: "6", name: "Meera Joshi", activeRooms: 1 },
  { id: "7", name: "Vikram Rao", activeRooms: 2 },
];

const rooms = [
  { id: "r1", code: "R1", name: "Ground Floor - Front", monthlyRent: 5000, status: "vacant" },
  { id: "r2", code: "R2", name: "Ground Floor - Back", monthlyRent: 4500, status: "vacant" },
  { id: "r3", code: "R3", name: "First Floor - Left", monthlyRent: 5500, status: "vacant" },
  { id: "r4", code: "R4", name: "First Floor - Right", monthlyRent: 5500, status: "vacant" },
  { id: "r5", code: "R5", name: "Second Floor - Front", monthlyRent: 6000, status: "vacant" },
  { id: "r6", code: "R6", name: "Second Floor - Back", monthlyRent: 5800, status: "occupied" },
  { id: "r7", code: "R7", name: "Third Floor - Premium", monthlyRent: 8000, status: "vacant" },
];

interface AllocateRoomFormProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: RoomAllocationFormData) => void;
  preSelectedTenantId?: string;
  preSelectedRoomId?: string;
}

export interface RoomAllocationFormData {
  tenantId: string;
  roomId: string;
  allocationDate: string;
  rentEffectiveDate: string;
  notes: string;
}

export function AllocateRoomForm({
  trigger,
  onSubmit,
  preSelectedTenantId,
  preSelectedRoomId
}: AllocateRoomFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<RoomAllocationFormData>({
    tenantId: preSelectedTenantId || "",
    roomId: preSelectedRoomId || "",
    allocationDate: format(new Date(), "yyyy-MM-dd"),
    rentEffectiveDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const selectedTenant = tenants.find((t) => t.id === formData.tenantId);
  const selectedRoom = rooms.find((r) => r.id === formData.roomId);
  const vacantRooms = rooms.filter((r) => r.status === "vacant");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Room allocation data:", formData);
    onSubmit?.(formData);
    setOpen(false);
    // Reset form
    setFormData({
      tenantId: preSelectedTenantId || "",
      roomId: preSelectedRoomId || "",
      allocationDate: format(new Date(), "yyyy-MM-dd"),
      rentEffectiveDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const handleAllocationDateChange = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      allocationDate: date,
      // Auto-set rent effective date to same as allocation date if not manually changed
      rentEffectiveDate: prev.rentEffectiveDate === prev.allocationDate ? date : prev.rentEffectiveDate,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Allocate Room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Allocate Room to Tenant</DialogTitle>
          <DialogDescription>
            Assign a vacant room to a tenant. Specify allocation and rent effective dates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Tenant Selection */}
            <div className="grid gap-2">
              <Label htmlFor="tenant">Tenant *</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tenantId: value }))}
                disabled={!!preSelectedTenantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} {tenant.activeRooms > 0 && `(${tenant.activeRooms} room${tenant.activeRooms > 1 ? 's' : ''})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Selection */}
            <div className="grid gap-2">
              <Label htmlFor="room">Room *</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, roomId: value }))}
                disabled={!!preSelectedRoomId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {vacantRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.code} - {room.name} (₹{room.monthlyRent.toLocaleString("en-IN")}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vacantRooms.length === 0 && (
                <p className="text-sm text-muted-foreground">No vacant rooms available</p>
              )}
            </div>

            {/* Room Info Display */}
            {selectedRoom && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div><span className="font-medium">Room:</span> {selectedRoom.code} - {selectedRoom.name}</div>
                    <div><span className="font-medium">Monthly Rent:</span> ₹{selectedRoom.monthlyRent.toLocaleString("en-IN")}</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Allocation Date */}
            <div className="grid gap-2">
              <Label htmlFor="allocationDate">Allocation Date (Move-in Date) *</Label>
              <Input
                id="allocationDate"
                type="date"
                value={formData.allocationDate}
                onChange={(e) => handleAllocationDateChange(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                The date when the tenant moves into the room
              </p>
            </div>

            {/* Rent Effective Date */}
            <div className="grid gap-2">
              <Label htmlFor="rentEffectiveDate">Rent Effective Date *</Label>
              <Input
                id="rentEffectiveDate"
                type="date"
                value={formData.rentEffectiveDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, rentEffectiveDate: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                The date from which rent will be applicable
              </p>
            </div>

            {/* Date Validation Info */}
            {formData.rentEffectiveDate && formData.allocationDate &&
             new Date(formData.rentEffectiveDate) < new Date(formData.allocationDate) && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Rent effective date cannot be before allocation date
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this allocation..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.tenantId ||
                !formData.roomId ||
                !formData.allocationDate ||
                !formData.rentEffectiveDate ||
                new Date(formData.rentEffectiveDate) < new Date(formData.allocationDate)
              }
            >
              Allocate Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
