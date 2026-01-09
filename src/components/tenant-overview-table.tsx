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
import { Settings2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export type SortField = "name" | "rent" | "pending" | "dues";
export type SortDirection = "asc" | "desc";

interface TenantOverviewTableProps {
  tenants: TenantOverview[];
  showOptionalColumns: {
    securityDeposit: boolean;
    creditBalance: boolean;
  };
  onToggleColumn: (column: "securityDeposit" | "creditBalance") => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortableHeader({
  children,
  field,
  currentField,
  currentDirection,
  onSort,
  className,
}: {
  children: React.ReactNode;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === currentField;
  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export function TenantOverviewTable({
  tenants,
  showOptionalColumns,
  onToggleColumn,
  sortField,
  sortDirection,
  onSort,
}: TenantOverviewTableProps) {
  const sortOptions = [
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
    { value: "rent-desc", label: "Rent (High-Low)" },
    { value: "rent-asc", label: "Rent (Low-High)" },
    { value: "pending-desc", label: "Pending (Most)" },
    { value: "pending-asc", label: "Pending (Least)" },
    { value: "dues-desc", label: "Dues (High-Low)" },
    { value: "dues-asc", label: "Dues (Low-High)" },
  ];

  const currentSortValue = `${sortField}-${sortDirection}`;

  const handleMobileSortChange = (value: string) => {
    const [field, direction] = value.split("-") as [SortField, SortDirection];
    // Trigger sort - parent will handle the logic
    if (field !== sortField) {
      onSort(field);
    }
    if (direction !== sortDirection) {
      onSort(field); // Toggle direction by calling sort again
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-2">
        {/* Mobile Sort */}
        <div className="md:hidden flex-1">
          <Select value={currentSortValue} onValueChange={handleMobileSortChange}>
            <SelectTrigger className="h-8">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:block" />
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
              <SortableHeader
                field="name"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={onSort}
              >
                Tenant
              </SortableHeader>
              <TableHead>Rooms</TableHead>
              <SortableHeader
                field="rent"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={onSort}
                className="text-right"
              >
                Monthly Rent
              </SortableHeader>
              <TableHead>Last Paid</TableHead>
              <SortableHeader
                field="pending"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={onSort}
                className="text-center"
              >
                Pending
              </SortableHeader>
              <SortableHeader
                field="dues"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={onSort}
                className="text-right"
              >
                Total Dues
              </SortableHeader>
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
