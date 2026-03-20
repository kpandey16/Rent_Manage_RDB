"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DoorOpen, Users, AlertTriangle, IndianRupee, Loader2, TrendingUp, Wallet } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";
import { TenantOverviewTable, TenantOverview, SortField, SortDirection } from "@/components/tenant-overview-table";
import { useTranslations } from "@/hooks/use-translations";

interface DashboardData {
  stats: {
    rooms: {
      total: number;
      occupied: number;
      vacant: number;
      occupancyRate: number;
    };
    tenants: {
      total: number;
      active: number;
      defaulters: number;
      totalDues: number;
    };
    collections: {
      thisMonth: number;
      paymentCount: number;
      cash: number;
      upi: number;
    };
  };
  tenants: any[];
}

export default function Home() {
  const { t } = useTranslations();
  const [search, setSearch] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

        // Single API call for all dashboard data
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setDashboardData(data);

        // Format tenants overview data
        const tenants = data.tenants || [];
        const tenantsOverviewData: TenantOverview[] = tenants
          .filter((t: any) => t.is_active === 1)
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

  const stats = dashboardData?.stats;

  return (
    <div className="p-4 space-y-4">
      {/* Critical Alert Banner */}
      {stats && stats.tenants.defaulters > 5 && (
        <Alert variant="destructive" className="border-l-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{stats.tenants.defaulters} tenants</strong> with overdue payments (₹{stats.tenants.totalDues.toLocaleString("en-IN")} total dues)
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Compact Stats Grid - 2x2 Grouped Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Rooms & Occupancy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Rooms & Occupancy
            </CardTitle>
            <DoorOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">{stats?.rooms.occupied || 0}</span>
              <span className="text-lg text-muted-foreground">/ {stats?.rooms.total || 0} rooms</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{stats?.rooms.vacant || 0} vacant</span>
              <span className="font-medium text-green-600">{stats?.rooms.occupancyRate || 0}% occupied</span>
            </div>
          </CardContent>
        </Card>

        {/* Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Tenants
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">{stats?.tenants.active || 0}</span>
              <span className="text-lg text-muted-foreground">active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              {stats && stats.tenants.defaulters > 0 ? (
                <>
                  <span className="text-muted-foreground">{stats.tenants.defaulters} with dues</span>
                  <span className="font-medium text-destructive">₹{stats.tenants.totalDues.toLocaleString("en-IN")}</span>
                </>
              ) : (
                <span className="text-green-600 font-medium">All settled ✓</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* This Month Collection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              This Month Collections
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">₹{(stats?.collections.thisMonth || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{stats?.collections.paymentCount || 0} payments</span>
              <div className="flex gap-2 text-xs">
                <span>Cash: ₹{(stats?.collections.cash || 0).toLocaleString("en-IN")}</span>
                <span>•</span>
                <span>UPI: ₹{(stats?.collections.upi || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash in Hand - Placeholder for future enhancement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Quick Stats
            </CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rooms:</span>
                <span className="font-medium">{stats?.rooms.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tenants:</span>
                <span className="font-medium">{stats?.tenants.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occupancy Rate:</span>
                <span className="font-medium text-green-600">{stats?.rooms.occupancyRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Overview Table */}
      <Card>
        <CardHeader className="pb-3 sticky top-0 z-30 bg-background/95 backdrop-blur md:static">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base">{t("dashboard.tenantsOverview")}</CardTitle>
            <div className="w-full md:w-64">
              <SearchFilter
                value={search}
                onChange={setSearch}
                placeholder={t("dashboard.search")}
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
