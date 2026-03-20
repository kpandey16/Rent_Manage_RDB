"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, User, DoorOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTranslations } from "@/hooks/use-translations";

interface Tenant {
  tenant_id: string;
  name: string;
  phone: string | null;
  room_id: string | null;
}

interface Room {
  room_id: string;
  code: string;
  monthly_rent: number;
  status: string;
  tenant_name: string | null;
  tenant_id: string | null;
}

interface SearchResults {
  tenants: Tenant[];
  rooms: Room[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ tenants: [], rooms: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslations();

  const searchData = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults({ tenants: [], rooms: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search and auto-open when results available
  useEffect(() => {
    const timer = setTimeout(() => {
      searchData(query);
      // Only open popover if there's a query with enough characters
      if (query.trim().length >= 2) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchData]);

  const handleSelect = (type: "tenant" | "room", id: string) => {
    setOpen(false);
    setQuery("");
    if (type === "tenant") {
      router.push(`/tenants/${id}`);
    } else {
      router.push(`/rooms/${id}`);
    }
  };

  const hasResults = results.tenants.length > 0 || results.rooms.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("search.placeholder") || "Search tenants, rooms..."}
            className="pl-8 pr-4"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {!loading && query.length >= 2 && !hasResults && (
              <CommandEmpty>
                {t("search.noResults") || "No results found"}
              </CommandEmpty>
            )}

            {!loading && query.length > 0 && query.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("search.typeMore") || "Type at least 2 characters"}
              </div>
            )}

            {!loading && results.tenants.length > 0 && (
              <CommandGroup heading={t("nav.tenants") || "Tenants"}>
                {results.tenants.map((tenant) => (
                  <CommandItem
                    key={`tenant-${tenant.tenant_id}`}
                    onSelect={() => handleSelect("tenant", tenant.tenant_id)}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{tenant.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {tenant.room_id && `Room ${tenant.room_id}`}
                        {tenant.phone && ` • ${tenant.phone}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && results.rooms.length > 0 && (
              <CommandGroup heading={t("nav.rooms") || "Rooms"}>
                {results.rooms.map((room) => (
                  <CommandItem
                    key={`room-${room.room_id}`}
                    onSelect={() => handleSelect("room", room.room_id)}
                    className="cursor-pointer"
                  >
                    <DoorOpen className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Room {room.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {room.status === "occupied"
                          ? `Occupied${room.tenant_name ? ` • ${room.tenant_name}` : ""}`
                          : "Vacant"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
