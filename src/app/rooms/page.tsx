import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, IndianRupee } from "lucide-react";

// Placeholder data
const rooms = [
  { id: "1", code: "R1", name: "Ground Floor - Front", rent: 5000, status: "occupied", tenant: "Amit Sharma" },
  { id: "2", code: "R2", name: "Ground Floor - Back", rent: 4500, status: "occupied", tenant: "Priya Singh" },
  { id: "3", code: "R3", name: "First Floor - Front", rent: 5500, status: "occupied", tenant: "Ramesh Kumar" },
  { id: "4", code: "R4", name: "First Floor - Back", rent: 4500, status: "occupied", tenant: "Priya Singh" },
  { id: "5", code: "R5", name: "Second Floor - Front", rent: 5000, status: "occupied", tenant: "Sunita Devi" },
  { id: "6", code: "R6", name: "Second Floor - Back", rent: 4000, status: "vacant", tenant: null },
  { id: "7", code: "R7", name: "Third Floor - Front", rent: 5000, status: "occupied", tenant: "Suresh Patel" },
  { id: "8", code: "R8", name: "Third Floor - Back", rent: 4000, status: "vacant", tenant: null },
];

export default function RoomsPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rooms</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Room
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
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
        ))}
      </div>
    </div>
  );
}
