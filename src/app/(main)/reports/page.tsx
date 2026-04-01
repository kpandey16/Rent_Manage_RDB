"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Percent, Loader2, FileText, Download, FileSpreadsheet, Languages } from "lucide-react";
import { DefaultersChart } from "@/components/charts/defaulters-chart";
import { CollectionChart } from "@/components/charts/collection-chart";
import { exportToCSV, exportToPDF, formatTenantForExport } from "@/lib/export-utils";
import { exportToPDFHindi, exportToCSVHindi } from "@/lib/export-hindi-print";
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
  const [tenants, setTenants] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchTenants();
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

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const handleExportCSV = () => {
    try {
      setExporting(true);
      const exportData = tenants
        .filter(t => t.is_active === 1)
        .map(formatTenantForExport);

      exportToCSV(exportData, 'tenant-overview');
      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    try {
      setExporting(true);
      const exportData = tenants
        .filter(t => t.is_active === 1)
        .map(formatTenantForExport);

      exportToPDF(exportData, 'tenant-overview');
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDFHindi = () => {
    try {
      setExporting(true);
      const exportData = tenants
        .filter(t => t.is_active === 1)
        .map(formatTenantForExport);

      exportToPDFHindi(exportData, 'tenant-overview-hindi');
      toast.success("हिंदी PDF तैयार! (Hindi PDF ready!)");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Hindi PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSVHindi = () => {
    try {
      setExporting(true);
      const exportData = tenants
        .filter(t => t.is_active === 1)
        .map(formatTenantForExport);

      exportToCSVHindi(exportData, 'tenant-overview-hindi');
      toast.success("हिंदी CSV निर्यात हो गया! (Hindi CSV exported!)");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Hindi CSV");
    } finally {
      setExporting(false);
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
                  <span className={`font-medium ${month.rate >= 90 ? 'text-green-600' : month.rate >= 70 ? 'text-yellow-600' : 'text-destructive'}`}>
                    ({month.rate}% collected)
                  </span>
                </div>
              </div>
              <Badge variant={month.rate >= 90 ? "default" : month.rate >= 70 ? "secondary" : "destructive"}>
                {month.rate}%
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Tenant Overview
          </CardTitle>
          <CardDescription>
            Download complete tenant data including rent, dues, credits, and payment history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Export Includes:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Tenant Name</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Last Paid</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Monthly Rent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Pending Months</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Total Dues</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Credit Balance</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Net Payable</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{tenants.filter(t => t.is_active === 1).length} Active Tenants</span>
              </div>
            </div>
          </div>

          {/* Export Buttons - English */}
          <div>
            <p className="text-sm font-medium mb-2">English Export:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleExportPDF}
                disabled={exporting || tenants.length === 0}
                className="flex-1"
                variant="default"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                disabled={exporting || tenants.length === 0}
                className="flex-1"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
            </div>
          </div>

          {/* Export Buttons - Hindi */}
          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Languages className="h-4 w-4" />
              हिंदी में निर्यात (Hindi Export):
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleExportPDFHindi}
                disabled={exporting || tenants.length === 0}
                className="flex-1"
                variant="secondary"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF (हिंदी)
              </Button>
              <Button
                onClick={handleExportCSVHindi}
                disabled={exporting || tenants.length === 0}
                className="flex-1"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV (हिंदी)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              PDF: Opens in new window → Click "प्रिंट / PDF सेव करें" → Save as PDF
            </p>
          </div>

          {/* Stats */}
          {tenants.length > 0 && (
            <div className="pt-3 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Tenants</p>
                  <p className="font-semibold">{tenants.filter(t => t.is_active === 1).length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Dues</p>
                  <p className="font-semibold text-destructive">
                    ₹{tenants
                      .filter(t => t.is_active === 1)
                      .reduce((sum, t) => sum + Number(t.total_dues || 0), 0)
                      .toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Credits</p>
                  <p className="font-semibold text-green-600">
                    ₹{tenants
                      .filter(t => t.is_active === 1)
                      .reduce((sum, t) => sum + Number(t.credit_balance || 0), 0)
                      .toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net Payable</p>
                  <p className="font-semibold">
                    ₹{tenants
                      .filter(t => t.is_active === 1)
                      .reduce((sum, t) => sum + Math.max(0, Number(t.total_dues || 0) - Number(t.credit_balance || 0)), 0)
                      .toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
