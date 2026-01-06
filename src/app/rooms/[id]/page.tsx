"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, User, IndianRupee, Calendar, History, Edit } from "lucide-react";

// Placeholder data - will be fetched from DB based on ID
const roomData = {
  id: "1",
  code: "R1",
  name: "Ground Floor - Front",
  currentRent: 5000,
  status: "occupied",
  currentTenant: {
    id: "1",
    name: "Amit Sharma",
    allocatedFrom: "2024-03-15",
  },
  rentHistory: [
    { effectiveFrom: "2024-09-01", rent: 5000, updatedBy: "Admin" },
    { effectiveFrom: "2024-03-15", rent: 4500, updatedBy: "Admin" },
    { effectiveFrom: "2023-01-01", rent: 4000, updatedBy: "System" },
  ],
  pastTenants: [
    { id: "old1", name: "Ravi Verma", from: "2023-01-01", to: "2024-03-10", duration: "14 months" },
    { id: "old2", name: "Sanjay Gupta", from: "2021-06-15", to: "2022-12-20", duration: "18 months" },
    { id: "old3", name: "Anjali Mehta", from: "2019-08-01", to: "2021-05-31", duration: "22 months" },
  ],
};

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // In real app, fetch room data based on id
  const room = roomData;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/rooms">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{room.code}</h1>
          <p className="text-sm text-muted-foreground">{room.name}</p>
        </div>
        <Badge variant={room.status === "occupied" ? "default" : "outline"}>
          {room.status}
        </Badge>
      </div>

      {/* Room Info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Rent</p>
              <p className="text-2xl font-bold">₹{room.currentRent.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
            {room.currentTenant && (
              <div>
                <p className="text-sm text-muted-foreground">Current Tenant</p>
                <Link href={`/tenants/${room.currentTenant.id}`} className="text-lg font-semibold hover:underline">
                  {room.currentTenant.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Since {new Date(room.currentTenant.allocatedFrom).toLocaleDateString("en-IN")}
                </p>
              </div>
            )}
          </div>
          {room.status === "vacant" && (
            <Button className="w-full">Allocate to Tenant</Button>
          )}
        </CardContent>
      </Card>

      {/* Rent History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Rent History
            </CardTitle>
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4 mr-1" />
              Update Rent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {room.rentHistory.map((history, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">₹{history.rent.toLocaleString("en-IN")}/mo</p>
                  <p className="text-sm text-muted-foreground">
                    From {new Date(history.effectiveFrom).toLocaleDateString("en-IN")}
                  </p>
                </div>
                {idx === 0 && <Badge>Current</Badge>}
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective From</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Updated By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {room.rentHistory.map((history, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(history.effectiveFrom).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-right font-medium">₹{history.rent.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-muted-foreground">{history.updatedBy}</TableCell>
                    <TableCell className="text-right">
                      {idx === 0 && <Badge variant="secondary">Current</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Past Tenants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Past Tenants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {room.pastTenants.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No past tenants</p>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {room.pastTenants.map((tenant) => (
                  <div key={tenant.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{tenant.name}</p>
                      <Badge variant="outline">{tenant.duration}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.from).toLocaleDateString("en-IN")} - {new Date(tenant.to).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {room.pastTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>{new Date(tenant.from).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>{new Date(tenant.to).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-right">{tenant.duration}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
