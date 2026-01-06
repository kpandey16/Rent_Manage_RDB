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
import { ArrowLeft, Phone, Mail, Calendar, IndianRupee, DoorOpen, Plus } from "lucide-react";

// Placeholder data - will be fetched from DB based on ID
const tenantData = {
  id: "1",
  name: "Amit Sharma",
  phone: "9876543210",
  email: "amit.sharma@email.com",
  moveInDate: "2024-03-15",
  monthlyRent: 5000,
  securityDeposit: 10000,
  creditBalance: 500,
  isActive: true,
  rooms: [
    {
      id: "r1",
      code: "R1",
      name: "Ground Floor - Front",
      currentRent: 5000,
      allocatedFrom: "2024-03-15",
      rentHistory: [
        { effectiveFrom: "2024-03-15", rent: 4500 },
        { effectiveFrom: "2024-09-01", rent: 5000 },
      ],
    },
  ],
  paymentHistory: [
    { id: "p1", date: "2026-01-05", amount: 5000, type: "payment", method: "UPI", period: "Jan-26", balance: 500 },
    { id: "p2", date: "2025-12-03", amount: 5000, type: "payment", method: "Cash", period: "Dec-25", balance: 0 },
    { id: "p3", date: "2025-11-02", amount: 5500, type: "payment", method: "UPI", period: "Nov-25", balance: 500 },
    { id: "p4", date: "2025-10-05", amount: 4500, type: "payment", method: "Cash", period: "Oct-25", balance: 0 },
    { id: "p5", date: "2025-09-03", amount: 5000, type: "payment", method: "UPI", period: "Sep-25", balance: 500 },
  ],
};

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // In real app, fetch tenant data based on id
  const tenant = tenantData;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tenants">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">Tenant since {new Date(tenant.moveInDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
        <Badge variant={tenant.isActive ? "default" : "secondary"}>
          {tenant.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Contact & Summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${tenant.phone}`} className="hover:underline">{tenant.phone}</a>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${tenant.email}`} className="hover:underline">{tenant.email}</a>
              </div>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="text-lg font-semibold">₹{tenant.monthlyRent.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="text-lg font-semibold">₹{tenant.securityDeposit.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credit Balance</p>
              <p className="text-lg font-semibold text-green-600">
                {tenant.creditBalance > 0 ? `+₹${tenant.creditBalance.toLocaleString("en-IN")}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Move-in Date</p>
              <p className="text-lg font-semibold">{new Date(tenant.moveInDate).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocated Rooms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Allocated Rooms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenant.rooms.map((room) => (
            <div key={room.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/rooms/${room.id}`} className="font-medium hover:underline">
                    {room.code} - {room.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(room.allocatedFrom).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Badge>₹{room.currentRent.toLocaleString("en-IN")}/mo</Badge>
              </div>

              {/* Rent History for this room */}
              <div className="pl-4 border-l-2">
                <p className="text-sm font-medium mb-2">Rent History</p>
                <div className="space-y-1">
                  {room.rentHistory.map((history, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        From {new Date(history.effectiveFrom).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </span>
                      <span>₹{history.rent.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Payment History
            </CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {tenant.paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">₹{payment.amount.toLocaleString("en-IN")}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString("en-IN")} • {payment.method}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{payment.period}</Badge>
                  {payment.balance > 0 && (
                    <p className="text-xs text-green-600 mt-1">+{payment.balance} credit</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="font-medium">₹{payment.amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{payment.type}</Badge>
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.period}</TableCell>
                    <TableCell className="text-right">
                      {payment.balance > 0 ? (
                        <span className="text-green-600">+₹{payment.balance}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
