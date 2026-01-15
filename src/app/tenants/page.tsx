"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Phone, DoorOpen, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";
import { AddTenantForm } from "@/components/forms/add-tenant-form";
import { VacateRoomForm } from "@/components/forms/vacate-room-form";
import { toast } from "sonner";

type SortOption = "name-asc" | "name-desc" | "balance-asc" | "balance-desc" | "rooms-asc" | "rooms-desc";

interface Tenant {
  id: string;
  name: string;
  phone: string;
  rooms: string[];
  monthlyRent: number;
  dues: number;
  creditBalance: number;
  isActive: boolean;
}

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      const data = await response.json();

      // Transform API data to match UI format
      // Show all tenants (including those without room allocations)
      const transformedTenants = data.tenants
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          rooms: t.room_codes ? t.room_codes.split(',').filter(Boolean) : [],
          monthlyRent: Number(t.monthly_rent || 0),
          dues: Number(t.total_dues || 0),
          creditBalance: Number(t.credit_balance || 0),
          isActive: t.is_active === 1,
        }));

      setTenants(transformedTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

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
          return a.dues - b.dues;
        case "balance-desc":
          return b.dues - a.dues;
        case "rooms-asc":
          return a.rooms.length - b.rooms.length;
        case "rooms-desc":
          return b.rooms.length - a.rooms.length;
        default:
          return 0;
      }
    });

    return result;
  }, [tenants, search, sortBy]);

  const handleAddTenant = () => {
    // Refresh the tenant list after adding
    fetchTenants();
  };

  const handleVacateRoom = () => {
    // Refresh the tenant list after vacating
    fetchTenants();
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
                        {tenant.rooms.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <DoorOpen className="h-3 w-3" />
                            {tenant.rooms.join(", ")}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No room allocated
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Monthly Rent: ₹{tenant.monthlyRent.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tenant.dues > 0 ? (
                        <Badge variant="destructive">
                          Dues: ₹{tenant.dues.toLocaleString("en-IN")}
                        </Badge>
                      ) : tenant.creditBalance > 0 ? (
                        <Badge variant="default">
                          Credit: ₹{tenant.creditBalance.toLocaleString("en-IN")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Settled</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filteredAndSortedTenants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {tenants.length === 0 ? "No tenants yet. Add your first tenant above!" : "No tenants found matching your search."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
