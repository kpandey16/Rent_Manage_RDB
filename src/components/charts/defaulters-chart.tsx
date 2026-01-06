"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DefaultersChartProps {
  data: {
    twoMonths: number;
    threeMonths: number;
    fourPlusMonths: number;
  };
}

export function DefaultersChart({ data }: DefaultersChartProps) {
  const chartData = [
    { name: "2 months", count: data.twoMonths, color: "#f59e0b" },
    { name: "3 months", count: data.threeMonths, color: "#f97316" },
    { name: "4+ months", count: data.fourPlusMonths, color: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Defaulters by Months Overdue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={70}
                tick={{ fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
