import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, IndianRupee, Percent } from "lucide-react";

// Placeholder data
const monthlyData = {
  month: "January 2026",
  totalCollection: 45000,
  expectedCollection: 52500,
  collectionRate: 85.7,
  totalWithdrawals: 25000,
  netBalance: 20000,
  paidTenants: 7,
  totalTenants: 10,
};

const monthlyHistory = [
  { month: "Jan 2026", collection: 45000, withdrawals: 25000, rate: 85.7 },
  { month: "Dec 2025", collection: 50000, withdrawals: 45000, rate: 95.2 },
  { month: "Nov 2025", collection: 48000, withdrawals: 40000, rate: 91.4 },
  { month: "Oct 2025", collection: 52500, withdrawals: 50000, rate: 100 },
];

export default function ReportsPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>

      {/* Current Month Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{monthlyData.month}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Collection</p>
              <p className="text-2xl font-bold text-green-600">
                {monthlyData.totalCollection.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Collection Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{monthlyData.collectionRate}%</p>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Withdrawals</p>
              <p className="text-2xl font-bold text-orange-600">
                {monthlyData.totalWithdrawals.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tenants Paid</p>
              <p className="text-2xl font-bold">
                {monthlyData.paidTenants}/{monthlyData.totalTenants}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Net Balance</span>
              <span className="text-lg font-semibold">
                {monthlyData.netBalance.toLocaleString("en-IN")}
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
          {monthlyHistory.map((month, index) => (
            <div
              key={month.month}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-medium">{month.month}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="text-green-600">+{month.collection.toLocaleString("en-IN")}</span>
                  <span className="text-orange-600">-{month.withdrawals.toLocaleString("en-IN")}</span>
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
