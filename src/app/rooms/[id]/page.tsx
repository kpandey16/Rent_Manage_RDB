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
import { ArrowLeft, User, IndianRupee, Calendar, History, Edit, Loader2 } from "lucide-react";
import { AllocateRoomForm } from "@/components/forms/allocate-room-form";
import { toast } from "sonner";

interface CurrentTenant {
  id: string;
  name: string;
  allocated_from: string;
}

interface RentHistory {
  effective_from: string;
  new_rent: number;
  created_by: string | null;
}

interface PastTenant {
  id: string;
  name: string;
  from_date: string;
  to_date: string;
  duration: string;
}

interface Room {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  currentRent: number;
  status: string;
  currentTenant: CurrentTenant | null;
  rentHistory: RentHistory[];
  pastTenants: PastTenant[];
}

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/rooms/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Room not found");
          } else {
            throw new Error("Failed to fetch room details");
          }
          return;
        }
        const data = await response.json();
        setRoom(data.room);
      } catch (error) {
        console.error("Error fetching room details:", error);
        toast.error("Failed to load room details");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [id]);

  const handleRoomAllocated = () => {
    // Refresh room data after allocation
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Room not found</p>
          <Link href="/rooms">
            <Button className="mt-4">Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

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
                  Since {new Date(room.currentTenant.allocated_from).toLocaleDateString("en-IN")}
                </p>
              </div>
            )}
          </div>
          {room.status === "vacant" && (
            <AllocateRoomForm
              preSelectedRoomId={room.id}
              onSubmit={handleRoomAllocated}
              trigger={<Button className="w-full">Allocate to Tenant</Button>}
            />
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
          {room.rentHistory.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No rent history available</p>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {room.rentHistory.map((history, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">₹{Number(history.new_rent).toLocaleString("en-IN")}/mo</p>
                      <p className="text-sm text-muted-foreground">
                        From {new Date(history.effective_from).toLocaleDateString("en-IN")}
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
                      <TableHead>Created By</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {room.rentHistory.map((history, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(history.effective_from).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-right font-medium">₹{Number(history.new_rent).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-muted-foreground">{history.created_by || "-"}</TableCell>
                        <TableCell className="text-right">
                          {idx === 0 && <Badge variant="secondary">Current</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
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
                      {new Date(tenant.from_date).toLocaleDateString("en-IN")} - {new Date(tenant.to_date).toLocaleDateString("en-IN")}
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
                        <TableCell>{new Date(tenant.from_date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>{new Date(tenant.to_date).toLocaleDateString("en-IN")}</TableCell>
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
