"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, Users, AlertTriangle, IndianRupee, Loader2 } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";
import { TenantOverviewTable, TenantOverview, SortField, SortDirection } from "@/components/tenant-overview-table";

interface DashboardStats {
  occupiedRooms: number;
  vacantRooms: number;
  activeTenants: number;
  defaultersCount: number;
  totalDues: number;
  thisMonthCollection: number;
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenantsOverview, setTenantsOverview] = useState<TenantOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOptionalColumns, setShowOptionalColumns] = useState({
    securityDeposit: false,
    creditBalance: false,
  });
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch rooms and tenants data
        const [roomsRes, tenantsRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/tenants"),
        ]);

        if (!roomsRes.ok || !tenantsRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const roomsData = await roomsRes.json();
        const tenantsData = await tenantsRes.json();

        const rooms = roomsData.rooms || [];
        const tenants = tenantsData.tenants || [];

        // Calculate stats
        const occupiedRooms = rooms.filter((r: any) => r.status === "occupied").length;
        const vacantRooms = rooms.filter((r: any) => r.status === "vacant").length;
        const activeTenants = tenants.filter((t: any) => t.is_active).length;
        const defaultersCount = tenants.filter((t: any) => t.is_active && (t.total_dues || 0) > 0).length;
        const totalDues = tenants.reduce((sum: number, t: any) => sum + (t.total_dues || 0), 0);

        // Calculate this month's collection
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        const transactionsRes = await fetch("/api/transactions");
        const transactionsData = await transactionsRes.json();
        const transactions = transactionsData.transactions || [];

        const thisMonthCollection = transactions
          .filter((t: any) => {
            const transactionMonth = t.transaction_date?.substring(0, 7);
            return transactionMonth === currentMonth && t.type === 'payment';
          })
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        setStats({
          occupiedRooms,
          vacantRooms,
          activeTenants,
          defaultersCount,
          totalDues,
          thisMonthCollection,
        });

        // Format tenants overview data
        const tenantsOverviewData: TenantOverview[] = tenants
          .filter((t: any) => t.is_active)
          .map((tenant: any) => {
            // Parse room codes from comma-separated string
            const roomCodes = tenant.room_codes ? tenant.room_codes.split(',').filter(Boolean) : [];

            // Calculate pending months based on dues and monthly rent
            const monthlyRent = Number(tenant.monthly_rent || 0);
            const totalDues = Number(tenant.total_dues || 0);
            const pendingMonths = monthlyRent > 0 ? Math.floor(totalDues / monthlyRent) : 0;

            return {
              id: tenant.id,
              name: tenant.name,
              rooms: roomCodes,
              monthlyRent,
              lastPaidMonth: tenant.last_paid_month || "Never",
              pendingMonths,
              totalDues,
              securityDeposit: Number(tenant.security_deposit_balance || 0),
              creditBalance: Number(tenant.credit_balance || 0),
            };
          });

        setTenantsOverview(tenantsOverviewData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const filteredAndSortedTenants = useMemo(() => {
    let result = tenantsOverview;

    // Filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(searchLower) ||
          tenant.rooms.some((room) => room.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "rent":
          comparison = a.monthlyRent - b.monthlyRent;
          break;
        case "pending":
          comparison = a.pendingMonths - b.pendingMonths;
          break;
        case "dues":
          comparison = a.totalDues - b.totalDues;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tenantsOverview, search, sortField, sortDirection]);

  const handleToggleColumn = (column: "securityDeposit" | "creditBalance") => {
    setShowOptionalColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.occupiedRooms || 0}/{(stats?.occupiedRooms || 0) + (stats?.vacantRooms || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.vacantRooms || 0} vacant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats?.thisMonthCollection || 0).toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Defaulters</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.defaultersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(stats?.totalDues || 0).toLocaleString("en-IN")} dues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Overview Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base">Tenant Overview</CardTitle>
            <div className="w-full md:w-64">
              <SearchFilter
                value={search}
                onChange={setSearch}
                placeholder="Search tenant or room..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TenantOverviewTable
            tenants={filteredAndSortedTenants}
            showOptionalColumns={showOptionalColumns}
            onToggleColumn={handleToggleColumn}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </CardContent>
      </Card>
    </div>
  );
}
