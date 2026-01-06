import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";

// Placeholder data
const recentPayments = [
  { id: "1", tenant: "Amit Sharma", amount: 5000, type: "payment", method: "UPI", date: "2026-01-05", periods: ["Jan 2026"] },
  { id: "2", tenant: "Priya Singh", amount: 9000, type: "payment", method: "Cash", date: "2026-01-04", periods: ["Jan 2026"] },
  { id: "3", tenant: "Sunita Devi", amount: 5500, type: "payment", method: "UPI", date: "2026-01-03", periods: ["Jan 2026"] },
  { id: "4", tenant: "Ramesh Kumar", amount: 2000, type: "discount", method: null, date: "2026-01-02", periods: [] },
];

const recentWithdrawals = [
  { id: "1", amount: 20000, date: "2026-01-05", notes: "Monthly collection" },
  { id: "2", amount: 5000, date: "2025-12-28", notes: "Emergency expense" },
];

export default function PaymentsPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Record Payment
        </Button>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {recentPayments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{payment.tenant}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payment.date} {payment.method && `- ${payment.method}`}
                    </p>
                    {payment.periods.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        For: {payment.periods.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-green-600">
                      +{payment.amount.toLocaleString("en-IN")}
                    </span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {payment.type}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4 space-y-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Record Withdrawal
            </Button>
          </div>
          {recentWithdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Withdrawal</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{withdrawal.date}</p>
                    {withdrawal.notes && (
                      <p className="text-xs text-muted-foreground">{withdrawal.notes}</p>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-orange-600">
                    -{withdrawal.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
