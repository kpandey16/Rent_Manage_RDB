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
  SelectItem,
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
import { Plus, Info, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
  active_rooms_count: number;
}

interface Room {
  id: string;
  code: string;
  name: string | null;
  monthly_rent: number;
  status: string;
}

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
  const [tenantComboOpen, setTenantComboOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  // Fetch tenants and rooms when dialog opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, roomsRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/rooms"),
      ]);

      if (!tenantsRes.ok || !roomsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [tenantsData, roomsData] = await Promise.all([
        tenantsRes.json(),
        roomsRes.json(),
      ]);

      setTenants(tenantsData.tenants || []);
      setRooms(roomsData.rooms || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load tenants and rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch(`/api/tenants/${formData.tenantId}/allocate-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to allocate room");
      }

      const data = await response.json();
      toast.success(data.message || "Room allocated successfully");
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
    } catch (error) {
      console.error("Error allocating room:", error);
      toast.error(error instanceof Error ? error.message : "Failed to allocate room");
    } finally {
      setSubmitting(false);
    }
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
            {/* Tenant Selection with Search */}
            <div className="grid gap-2">
              <Label htmlFor="tenant">Tenant *</Label>
              <Popover open={tenantComboOpen} onOpenChange={setTenantComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tenantComboOpen}
                    className="w-full justify-between"
                    disabled={!!preSelectedTenantId || loading || submitting}
                  >
                    {formData.tenantId
                      ? tenants.find((tenant) => tenant.id === formData.tenantId)?.name
                      : loading ? "Loading..." : "Select tenant..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tenant..." />
                    <CommandList>
                      <CommandEmpty>No tenant found.</CommandEmpty>
                      <CommandGroup>
                        {tenants.map((tenant) => (
                          <CommandItem
                            key={tenant.id}
                            value={tenant.name}
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, tenantId: tenant.id }));
                              setTenantComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.tenantId === tenant.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {tenant.name} {tenant.active_rooms_count > 0 && `(${tenant.active_rooms_count} room${tenant.active_rooms_count > 1 ? 's' : ''})`}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Room Selection */}
            <div className="grid gap-2">
              <Label htmlFor="room">Room *</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, roomId: value }))}
                disabled={!!preSelectedRoomId || loading || submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select room"} />
                </SelectTrigger>
                <SelectContent>
                  {vacantRooms.length === 0 ? (
                    <SelectItem value="none" disabled>No vacant rooms available</SelectItem>
                  ) : (
                    vacantRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.code} - {room.name} (₹{room.monthly_rent.toLocaleString("en-IN")}/mo)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Room Info Display */}
            {selectedRoom && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div><span className="font-medium">Room:</span> {selectedRoom.code} - {selectedRoom.name}</div>
                    <div><span className="font-medium">Monthly Rent:</span> ₹{selectedRoom.monthly_rent.toLocaleString("en-IN")}</div>
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
                placeholder="Additional notes about this allocation..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.tenantId ||
                !formData.roomId ||
                !formData.allocationDate ||
                !formData.rentEffectiveDate ||
                new Date(formData.rentEffectiveDate) < new Date(formData.allocationDate) ||
                submitting
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Allocating..." : "Allocate Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
