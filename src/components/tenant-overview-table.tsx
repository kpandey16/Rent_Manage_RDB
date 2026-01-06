"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TenantOverview {
  id: string;
  name: string;
  rooms: string[];
  monthlyRent: number;
  lastPaidMonth: string | null; // "MMM-YY" format or null if never paid
  pendingMonths: number;
  totalDues: number;
  securityDeposit?: number;
  creditBalance?: number;
}

interface TenantOverviewTableProps {
  tenants: TenantOverview[];
  showOptionalColumns: {
    securityDeposit: boolean;
    creditBalance: boolean;
  };
  onToggleColumn: (column: "securityDeposit" | "creditBalance") => void;
}

export function TenantOverviewTable({
  tenants,
  showOptionalColumns,
  onToggleColumn,
}: TenantOverviewTableProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Settings2 className="h-4 w-4 mr-1" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={showOptionalColumns.securityDeposit}
              onCheckedChange={() => onToggleColumn("securityDeposit")}
            >
              Security Deposit
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showOptionalColumns.creditBalance}
              onCheckedChange={() => onToggleColumn("creditBalance")}
            >
              Credit Balance
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {tenants.map((tenant) => (
          <Link
            key={tenant.id}
            href={`/tenants/${tenant.id}`}
            className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-muted-foreground">{tenant.rooms.join(", ")}</p>
              </div>
              {tenant.totalDues > 0 ? (
                <Badge variant="destructive">₹{tenant.totalDues.toLocaleString("en-IN")}</Badge>
              ) : (
                <Badge variant="secondary">Settled</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Rent</p>
                <p className="font-medium">₹{tenant.monthlyRent.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Paid</p>
                <p className="font-medium">{tenant.lastPaidMonth || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pending</p>
                <p className="font-medium">{tenant.pendingMonths} mo</p>
              </div>
            </div>
            {(showOptionalColumns.securityDeposit || showOptionalColumns.creditBalance) && (
              <div className="grid grid-cols-2 gap-2 text-sm mt-2 pt-2 border-t">
                {showOptionalColumns.securityDeposit && (
                  <div>
                    <p className="text-muted-foreground">Deposit</p>
                    <p className="font-medium">₹{(tenant.securityDeposit || 0).toLocaleString("en-IN")}</p>
                  </div>
                )}
                {showOptionalColumns.creditBalance && (
                  <div>
                    <p className="text-muted-foreground">Credit</p>
                    <p className="font-medium text-green-600">
                      {(tenant.creditBalance || 0) > 0 ? `+₹${tenant.creditBalance?.toLocaleString("en-IN")}` : "-"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead className="text-right">Monthly Rent</TableHead>
              <TableHead>Last Paid</TableHead>
              <TableHead className="text-center">Pending</TableHead>
              <TableHead className="text-right">Total Dues</TableHead>
              {showOptionalColumns.securityDeposit && (
                <TableHead className="text-right">Deposit</TableHead>
              )}
              {showOptionalColumns.creditBalance && (
                <TableHead className="text-right">Credit</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/tenants/${tenant.id}`} className="font-medium hover:underline">
                    {tenant.name}
                  </Link>
                </TableCell>
                <TableCell>{tenant.rooms.join(", ")}</TableCell>
                <TableCell className="text-right">₹{tenant.monthlyRent.toLocaleString("en-IN")}</TableCell>
                <TableCell>{tenant.lastPaidMonth || "-"}</TableCell>
                <TableCell className="text-center">
                  {tenant.pendingMonths > 0 ? (
                    <Badge variant={tenant.pendingMonths >= 3 ? "destructive" : "secondary"}>
                      {tenant.pendingMonths}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {tenant.totalDues > 0 ? (
                    <span className="text-destructive font-medium">
                      ₹{tenant.totalDues.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                {showOptionalColumns.securityDeposit && (
                  <TableCell className="text-right">
                    ₹{(tenant.securityDeposit || 0).toLocaleString("en-IN")}
                  </TableCell>
                )}
                {showOptionalColumns.creditBalance && (
                  <TableCell className="text-right">
                    {(tenant.creditBalance || 0) > 0 ? (
                      <span className="text-green-600">+₹{tenant.creditBalance?.toLocaleString("en-IN")}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
