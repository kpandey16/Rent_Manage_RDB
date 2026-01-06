"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CollectionChartProps {
  weeklyData: { label: string; amount: number }[];
  monthlyData: { label: string; amount: number }[];
}

export function CollectionChart({ weeklyData, monthlyData }: CollectionChartProps) {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const data = view === "weekly" ? weeklyData : monthlyData;

  const formatAmount = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Collection</CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as "weekly" | "monthly")}>
            <TabsList className="h-7">
              <TabsTrigger value="weekly" className="text-xs px-2 h-5">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-2 h-5">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={formatAmount}
              />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Collection"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
