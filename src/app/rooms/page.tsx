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
import { User, IndianRupee, ArrowUpDown, Loader2 } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";
import { AddRoomForm } from "@/components/forms/add-room-form";
import { toast } from "sonner";

type SortOption = "code-asc" | "code-desc" | "rent-asc" | "rent-desc" | "status-occupied" | "status-vacant";

interface Room {
  id: string;
  code: string;
  name: string | null;
  rent: number;
  status: string;
  tenant: string | null;
  tenantId: string | null;
}

export default function RoomsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("code-asc");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();

      // Transform API data to match UI format
      const transformedRooms = data.rooms.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        rent: r.monthly_rent,
        status: r.status,
        tenant: r.current_tenant_name || null,
        tenantId: r.tenant_id || null,
      }));

      setRooms(transformedRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredAndSortedRooms = useMemo(() => {
    let result = rooms;

    // Filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (room) =>
          room.code.toLowerCase().includes(searchLower) ||
          room.name?.toLowerCase().includes(searchLower) ||
          room.tenant?.toLowerCase().includes(searchLower) ||
          room.status.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "code-asc":
          return a.code.localeCompare(b.code, undefined, { numeric: true });
        case "code-desc":
          return b.code.localeCompare(a.code, undefined, { numeric: true });
        case "rent-asc":
          return a.rent - b.rent;
        case "rent-desc":
          return b.rent - a.rent;
        case "status-occupied":
          return a.status === "occupied" ? -1 : 1;
        case "status-vacant":
          return a.status === "vacant" ? -1 : 1;
        default:
          return 0;
      }
    });

    return result;
  }, [search, sortBy]);

  const handleAddRoom = () => {
    // Refresh the rooms list after adding
    fetchRooms();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rooms</h1>
        <AddRoomForm onSubmit={handleAddRoom} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search by room, floor, or tenant..."
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="code-asc">Room (A-Z)</SelectItem>
            <SelectItem value="code-desc">Room (Z-A)</SelectItem>
            <SelectItem value="rent-desc">Rent (High-Low)</SelectItem>
            <SelectItem value="rent-asc">Rent (Low-High)</SelectItem>
            <SelectItem value="status-occupied">Occupied First</SelectItem>
            <SelectItem value="status-vacant">Vacant First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filteredAndSortedRooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <Card
                  className={`cursor-pointer hover:bg-muted/50 transition-colors h-full ${
                    room.status === "vacant" ? "border-dashed" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{room.code}</span>
                      <Badge variant={room.status === "occupied" ? "default" : "outline"}>
                        {room.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{room.name}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <IndianRupee className="h-3 w-3" />
                      <span className="font-medium">{room.rent.toLocaleString("en-IN")}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    {room.tenant && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{room.tenant}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {filteredAndSortedRooms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {rooms.length === 0 ? "No rooms yet. Add your first room above!" : "No rooms found matching your search."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
