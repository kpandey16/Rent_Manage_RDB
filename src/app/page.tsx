import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, Users, AlertTriangle, IndianRupee, Wrench } from "lucide-react";

// Placeholder data - will be fetched from DB
const stats = {
  occupiedRooms: 8,
  vacantRooms: 2,
  activeTenants: 10,
  defaultersCount: 2,
  totalDues: 15000,
  thisMonthCollection: 45000,
  pendingMaintenance: 3,
};

export default function Home() {
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
              {stats.totalDues.toLocaleString("en-IN")} dues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Defaulters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Defaulters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
            <div>
              <p className="font-medium">Ramesh Kumar</p>
              <p className="text-sm text-muted-foreground">R3 - 2 months</p>
            </div>
            <Badge variant="destructive">10,000</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
            <div>
              <p className="font-medium">Suresh Patel</p>
              <p className="text-sm text-muted-foreground">R7 - 1 month</p>
            </div>
            <Badge variant="destructive">5,000</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pending Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-orange-500" />
            Pending Maintenance
            <Badge variant="secondary" className="ml-auto">{stats.pendingMaintenance}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Water leakage</p>
              <p className="text-sm text-muted-foreground">R2 - Jan 3</p>
            </div>
            <Badge variant="outline">Open</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Electrical issue</p>
              <p className="text-sm text-muted-foreground">R5 - Jan 5</p>
            </div>
            <Badge variant="outline">In Progress</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
