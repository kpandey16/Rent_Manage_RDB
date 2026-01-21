"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface RollbackHistoryItem {
  id: string;
  rollbackType: string;
  tenant: {
    id: string;
    name: string;
    phone: string;
  };
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  periods: string[];
  totalRentRolledBack: number;
  adjustmentsRolledBack: number | null;
  operatorBalanceBefore: number;
  operatorBalanceAfter: number;
  reason: string;
  performedBy: {
    id: string;
    name: string;
  };
  performedAt: string;
  wasRestored: boolean;
  restoredAt: string | null;
}

export function RollbackHistoryTable() {
  const [history, setHistory] = useState<RollbackHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<RollbackHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRollbackHistory();
  }, []);

  useEffect(() => {
    // Filter history based on search query
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = history.filter(
        (item) =>
          item.tenant.name.toLowerCase().includes(query) ||
          item.tenant.phone.includes(query) ||
          item.reason.toLowerCase().includes(query)
      );
      setFilteredHistory(filtered);
    }
  }, [searchQuery, history]);

  const fetchRollbackHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/rollback/history");
      if (!response.ok) {
        throw new Error("Failed to fetch rollback history");
      }
      const data = await response.json();
      setHistory(data.history || []);
      setFilteredHistory(data.history || []);
    } catch (error) {
      console.error("Error fetching rollback history:", error);
      toast.error("Failed to load rollback history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by tenant name, phone, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Rollback History List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No results found" : "No rollback history"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <Card key={item.id} className="border-destructive/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header: Tenant and Amount */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-destructive" />
                        <span className="font-medium">{item.tenant.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.tenant.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-destructive">
                        ₹{item.paymentAmount.toLocaleString("en-IN")}
                      </span>
                      <Badge variant="outline" className="ml-2 text-xs uppercase">
                        {item.paymentMethod}
                      </Badge>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t pt-3">
                    <div className="text-muted-foreground">
                      Rolled back on:
                    </div>
                    <div className="font-medium">
                      {new Date(item.performedAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>

                    <div className="text-muted-foreground">
                      Rolled back by:
                    </div>
                    <div className="font-medium">{item.performedBy.name}</div>

                    <div className="text-muted-foreground">
                      Periods affected:
                    </div>
                    <div className="font-medium">
                      {item.periods.join(", ")}
                    </div>

                    {item.adjustmentsRolledBack !== null && (
                      <>
                        <div className="text-muted-foreground">
                          Adjustments:
                        </div>
                        <div className="font-medium text-orange-600">
                          ₹{item.adjustmentsRolledBack.toLocaleString("en-IN")}
                        </div>
                      </>
                    )}

                    <div className="text-muted-foreground">
                      Operator Balance:
                    </div>
                    <div className="font-medium">
                      <span className="text-xs text-muted-foreground">
                        Before:{" "}
                      </span>
                      ₹{item.operatorBalanceBefore.toLocaleString("en-IN")}
                      <span className="mx-1">→</span>
                      <span className="text-xs text-muted-foreground">
                        After:{" "}
                      </span>
                      ₹{item.operatorBalanceAfter.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Rollback Reason:
                    </p>
                    <p className="text-sm">{item.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
