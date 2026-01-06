import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, DoorOpen } from "lucide-react";

// Placeholder data
const tenants = [
  { id: "1", name: "Amit Sharma", phone: "9876543210", rooms: ["R1"], balance: 0, isActive: true },
  { id: "2", name: "Priya Singh", phone: "9876543211", rooms: ["R2", "R4"], balance: 2000, isActive: true },
  { id: "3", name: "Ramesh Kumar", phone: "9876543212", rooms: ["R3"], balance: -10000, isActive: true },
  { id: "4", name: "Sunita Devi", phone: "9876543213", rooms: ["R5"], balance: 500, isActive: true },
  { id: "5", name: "Suresh Patel", phone: "9876543214", rooms: ["R7"], balance: -5000, isActive: true },
];

export default function TenantsPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tenants</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Tenant
        </Button>
      </div>

      <div className="space-y-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">{tenant.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {tenant.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DoorOpen className="h-3 w-3" />
                    {tenant.rooms.join(", ")}
                  </div>
                </div>
                <Badge
                  variant={tenant.balance < 0 ? "destructive" : tenant.balance > 0 ? "default" : "secondary"}
                >
                  {tenant.balance < 0 ? `-${Math.abs(tenant.balance).toLocaleString("en-IN")}` :
                   tenant.balance > 0 ? `+${tenant.balance.toLocaleString("en-IN")}` : "Settled"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
