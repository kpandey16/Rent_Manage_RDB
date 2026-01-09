"use client";

import { use, useState, useEffect } from "react";
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
import { ArrowLeft, Phone, Mail, Calendar, IndianRupee, DoorOpen, Plus, Loader2 } from "lucide-react";
import { AllocateRoomForm } from "@/components/forms/allocate-room-form";
import { toast } from "sonner";

interface Room {
  id: string;
  code: string;
  name: string | null;
  monthly_rent: number;
  move_in_date: string;
  is_active: number;
}

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
  rooms: Room[];
  monthlyRent: number;
  securityDeposit: number;
  creditBalance: number;
  totalDues: number;
  lastPaidMonth: string | null;
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tenants/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Tenant not found");
          } else {
            throw new Error("Failed to fetch tenant details");
          }
          return;
        }
        const data = await response.json();
        setTenant(data.tenant);
      } catch (error) {
        console.error("Error fetching tenant details:", error);
        toast.error("Failed to load tenant details");
      } finally {
        setLoading(false);
      }
    };

    fetchTenantDetails();
  }, [id]);

  const handleRoomAllocated = () => {
    // Refresh tenant data after room allocation
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Tenant not found</p>
          <Link href="/tenants">
            <Button className="mt-4">Back to Tenants</Button>
          </Link>
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground">Tenant since {new Date(tenant.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
        </div>
        <Badge variant={tenant.is_active === 1 ? "default" : "secondary"}>
          {tenant.is_active === 1 ? "Active" : "Inactive"}
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
              <p className="text-sm text-muted-foreground">Last Paid Month</p>
              <p className="text-lg font-semibold">{tenant.lastPaidMonth || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocated Rooms */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              Allocated Rooms
            </CardTitle>
            <AllocateRoomForm
              preSelectedTenantId={tenant.id}
              onSubmit={handleRoomAllocated}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Allocate Room
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenant.rooms.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No rooms allocated yet</p>
          ) : (
            tenant.rooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Link href={`/rooms/${room.id}`} className="font-medium hover:underline">
                    {room.code} {room.name && `- ${room.name}`}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(room.move_in_date).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Badge>₹{Number(room.monthly_rent).toLocaleString("en-IN")}/mo</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

    </div>
  );
}
