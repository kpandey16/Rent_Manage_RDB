"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Percent, Loader2 } from "lucide-react";
import { DefaultersChart } from "@/components/charts/defaulters-chart";
import { CollectionChart } from "@/components/charts/collection-chart";
import { toast } from "sonner";

interface ReportsData {
  defaultersData: {
    twoMonths: number;
    threeMonths: number;
    fourPlusMonths: number;
  };
  weeklyCollectionData: Array<{ label: string; amount: number }>;
  monthlyCollectionData: Array<{ label: string; amount: number }>;
  monthlyData: {
    month: string;
    totalCollection: number;
    expectedCollection: number;
    collectionRate: number;
    totalWithdrawals: number;
    netBalance: number;
    paidTenants: number;
    totalTenants: number;
  };
  monthlyHistory: Array<{
    month: string;
    collection: number;
    withdrawals: number;
    rate: number;
  }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const reportsData = await response.json();
      setData(reportsData);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <div className="text-center py-8 text-muted-foreground">
          Failed to load reports. Please try refreshing the page.
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DefaultersChart data={data.defaultersData} />
        <CollectionChart weeklyData={data.weeklyCollectionData} monthlyData={data.monthlyCollectionData} />
      </div>

      {/* Current Month Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{data.monthlyData.month}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Collection</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{data.monthlyData.totalCollection.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Collection Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{data.monthlyData.collectionRate}%</p>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Withdrawals</p>
              <p className="text-2xl font-bold text-orange-600">
                ₹{data.monthlyData.totalWithdrawals.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tenants Paid</p>
              <p className="text-2xl font-bold">
                {data.monthlyData.paidTenants}/{data.monthlyData.totalTenants}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Net Balance</span>
              <span className={`text-lg font-semibold ${data.monthlyData.netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                ₹{Math.abs(data.monthlyData.netBalance).toLocaleString("en-IN")}
                {data.monthlyData.netBalance < 0 && " (negative)"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.monthlyHistory.map((month, index) => (
            <div
              key={month.month}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-medium">{month.month}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="text-green-600">+₹{month.collection.toLocaleString("en-IN")}</span>
                  <span className="text-orange-600">-₹{month.withdrawals.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <Badge variant={month.rate >= 90 ? "default" : month.rate >= 70 ? "secondary" : "destructive"}>
                {month.rate}%
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
