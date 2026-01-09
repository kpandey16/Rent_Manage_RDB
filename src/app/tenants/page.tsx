"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, DoorOpen, ChevronRight, ArrowUpDown } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";
import { AddTenantForm } from "@/components/forms/add-tenant-form";
import { VacateRoomForm } from "@/components/forms/vacate-room-form";

type SortOption = "name-asc" | "name-desc" | "balance-asc" | "balance-desc" | "rooms-asc" | "rooms-desc";

// Placeholder data
const tenants = [
  { id: "1", name: "Amit Sharma", phone: "9876543210", rooms: ["R1"], balance: 500, isActive: true },
  { id: "2", name: "Priya Singh", phone: "9876543211", rooms: ["R2", "R4"], balance: 0, isActive: true },
  { id: "3", name: "Ramesh Kumar", phone: "9876543212", rooms: ["R3"], balance: -11000, isActive: true },
  { id: "4", name: "Sunita Devi", phone: "9876543213", rooms: ["R5"], balance: 200, isActive: true },
  { id: "5", name: "Suresh Patel", phone: "9876543214", rooms: ["R7"], balance: -5000, isActive: true },
  { id: "6", name: "Meera Joshi", phone: "9876543215", rooms: ["R8"], balance: -12000, isActive: true },
  { id: "7", name: "Vikram Rao", phone: "9876543216", rooms: ["R9", "R10"], balance: -32000, isActive: true },
];

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const filteredAndSortedTenants = useMemo(() => {
    let result = tenants;

    // Filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(searchLower) ||
          tenant.phone.includes(search) ||
          tenant.rooms.some((room) => room.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "balance-asc":
          return a.balance - b.balance;
        case "balance-desc":
          return b.balance - a.balance;
        case "rooms-asc":
          return a.rooms.length - b.rooms.length;
        case "rooms-desc":
          return b.rooms.length - a.rooms.length;
        default:
          return 0;
      }
    });

    return result;
  }, [search, sortBy]);

  const handleAddTenant = (data: unknown) => {
    console.log("New tenant:", data);
    // In real app, save to DB and refresh list
  };

  const handleVacateRoom = (data: unknown) => {
    console.log("Vacate room:", data);
    // In real app, process vacate and refresh list
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tenants</h1>
        <div className="flex items-center gap-2">
          <VacateRoomForm onSubmit={handleVacateRoom} />
          <AddTenantForm onSubmit={handleAddTenant} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, or room..."
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="balance-desc">Balance (High-Low)</SelectItem>
            <SelectItem value="balance-asc">Balance (Low-High)</SelectItem>
            <SelectItem value="rooms-desc">Rooms (Most)</SelectItem>
            <SelectItem value="rooms-asc">Rooms (Least)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredAndSortedTenants.map((tenant) => (
          <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium">{tenant.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {tenant.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <DoorOpen className="h-3 w-3" />
                        {tenant.rooms.join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={tenant.balance < 0 ? "destructive" : tenant.balance > 0 ? "default" : "secondary"}
                    >
                      {tenant.balance < 0 ? `-₹${Math.abs(tenant.balance).toLocaleString("en-IN")}` :
                       tenant.balance > 0 ? `+₹${tenant.balance.toLocaleString("en-IN")}` : "Settled"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredAndSortedTenants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No tenants found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
