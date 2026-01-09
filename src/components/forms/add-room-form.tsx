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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddRoomFormProps {
  trigger?: React.ReactNode;
  onSubmit?: (data: RoomFormData) => void;
}

export interface RoomFormData {
  code: string;
  name: string;
  rent: number;
  description: string;
}

export function AddRoomForm({ trigger, onSubmit }: AddRoomFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<RoomFormData>({
    code: "",
    name: "",
    rent: 0,
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          monthlyRent: formData.rent,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add room");
      }

      const data = await response.json();
      toast.success(data.message || "Room added successfully");
      onSubmit?.(formData);
      setOpen(false);
      // Reset form
      setFormData({
        code: "",
        name: "",
        rent: 0,
        description: "",
      });
    } catch (error) {
      console.error("Error adding room:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add room");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
          <DialogDescription>
            Enter room details. The room will be available for allocation after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Room Code */}
            <div className="grid gap-2">
              <Label htmlFor="code">Room Code *</Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="R1, R2, A101, etc."
                disabled={submitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Short identifier for the room (e.g., R1, R2)
              </p>
            </div>

            {/* Room Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Room Name / Description *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ground Floor - Front"
                disabled={submitting}
                required
              />
            </div>

            {/* Rent */}
            <div className="grid gap-2">
              <Label htmlFor="rent">Monthly Rent *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="rent"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.rent || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rent: Number(e.target.value) }))}
                  className="pl-7"
                  placeholder="5000"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Additional Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Additional Details (optional)</Label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Size, amenities, etc."
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.code || !formData.name || !formData.rent || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Adding..." : "Add Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
