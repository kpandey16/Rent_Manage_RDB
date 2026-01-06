"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, DoorOpen, ChevronRight } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";

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

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants;
    const searchLower = search.toLowerCase();
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.phone.includes(search) ||
        tenant.rooms.some((room) => room.toLowerCase().includes(searchLower))
    );
  }, [search]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tenants</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Tenant
        </Button>
      </div>

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search by name, phone, or room..."
      />

      <div className="space-y-3">
        {filteredTenants.map((tenant) => (
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
        {filteredTenants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No tenants found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
