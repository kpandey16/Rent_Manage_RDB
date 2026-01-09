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
import { Plus } from "lucide-react";

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
  const [formData, setFormData] = useState<RoomFormData>({
    code: "",
    name: "",
    rent: 0,
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
    setOpen(false);
    // Reset form
    setFormData({
      code: "",
      name: "",
      rent: 0,
      description: "",
    });
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.code || !formData.name || !formData.rent}>
              Add Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
