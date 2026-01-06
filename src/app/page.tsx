"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, Users, AlertTriangle, IndianRupee } from "lucide-react";
import { SearchFilter } from "@/components/search-filter";
import { TenantOverviewTable, TenantOverview } from "@/components/tenant-overview-table";
import { DefaultersChart } from "@/components/charts/defaulters-chart";
import { CollectionChart } from "@/components/charts/collection-chart";

// Placeholder data - will be fetched from DB
const stats = {
  occupiedRooms: 8,
  vacantRooms: 2,
  activeTenants: 7,
  defaultersCount: 4,
  totalDues: 60000,
  thisMonthCollection: 45000,
};

const defaultersData = {
  twoMonths: 2,
  threeMonths: 1,
  fourPlusMonths: 1,
};

const weeklyCollectionData = [
  { label: "W1", amount: 12000 },
  { label: "W2", amount: 18000 },
  { label: "W3", amount: 8000 },
  { label: "W4", amount: 7000 },
];

const monthlyCollectionData = [
  { label: "Oct", amount: 48000 },
  { label: "Nov", amount: 45000 },
  { label: "Dec", amount: 52000 },
  { label: "Jan", amount: 45000 },
];

const tenantsOverview: TenantOverview[] = [
  { id: "1", name: "Amit Sharma", rooms: ["R1"], monthlyRent: 5000, lastPaidMonth: "Jan-26", pendingMonths: 0, totalDues: 0, securityDeposit: 10000, creditBalance: 500 },
  { id: "2", name: "Priya Singh", rooms: ["R2", "R4"], monthlyRent: 9000, lastPaidMonth: "Jan-26", pendingMonths: 0, totalDues: 0, securityDeposit: 18000, creditBalance: 0 },
  { id: "3", name: "Ramesh Kumar", rooms: ["R3"], monthlyRent: 5500, lastPaidMonth: "Nov-25", pendingMonths: 2, totalDues: 11000, securityDeposit: 11000, creditBalance: 0 },
  { id: "4", name: "Sunita Devi", rooms: ["R5"], monthlyRent: 5000, lastPaidMonth: "Jan-26", pendingMonths: 0, totalDues: 0, securityDeposit: 10000, creditBalance: 200 },
  { id: "5", name: "Suresh Patel", rooms: ["R7"], monthlyRent: 5000, lastPaidMonth: "Dec-25", pendingMonths: 1, totalDues: 5000, securityDeposit: 10000, creditBalance: 0 },
  { id: "6", name: "Meera Joshi", rooms: ["R8"], monthlyRent: 4000, lastPaidMonth: "Oct-25", pendingMonths: 3, totalDues: 12000, securityDeposit: 8000, creditBalance: 0 },
  { id: "7", name: "Vikram Rao", rooms: ["R9", "R10"], monthlyRent: 8000, lastPaidMonth: "Sep-25", pendingMonths: 4, totalDues: 32000, securityDeposit: 16000, creditBalance: 0 },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [showOptionalColumns, setShowOptionalColumns] = useState({
    securityDeposit: false,
    creditBalance: false,
  });

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenantsOverview;
    const searchLower = search.toLowerCase();
    return tenantsOverview.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.rooms.some((room) => room.toLowerCase().includes(searchLower))
    );
  }, [search]);

  const handleToggleColumn = (column: "securityDeposit" | "creditBalance") => {
    setShowOptionalColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

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
            <div className="text-2xl font-bold">{stats.occupiedRooms}/{stats.occupiedRooms + stats.vacantRooms}</div>
            <p className="text-xs text-muted-foreground">
              {stats.vacantRooms} vacant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTenants}</div>
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
            <div className="text-2xl font-bold">{stats.thisMonthCollection.toLocaleString("en-IN")}</div>
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
            <div className="text-2xl font-bold text-destructive">{stats.defaultersCount}</div>
            <p className="text-xs text-muted-foreground">
              ₹{stats.totalDues.toLocaleString("en-IN")} dues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DefaultersChart data={defaultersData} />
        <CollectionChart weeklyData={weeklyCollectionData} monthlyData={monthlyCollectionData} />
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
            tenants={filteredTenants}
            showOptionalColumns={showOptionalColumns}
            onToggleColumn={handleToggleColumn}
          />
        </CardContent>
      </Card>
    </div>
  );
}
