"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { ReceiptTemplate, ReceiptData } from "./receipt-template";

interface DownloadReceiptButtonProps {
  transactionId: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function DownloadReceiptButton({
  transactionId,
  variant = "outline",
  size = "sm",
  className,
  children,
}: DownloadReceiptButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);

      // Fetch receipt data from API
      const response = await fetch(`/api/receipts/${transactionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch receipt data");
      }

      const { receipt } = await response.json();
      const receiptData: ReceiptData = receipt;

      // Generate PDF
      const blob = await pdf(<ReceiptTemplate data={receiptData} />).toBlob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Create filename with tenant name and date
      const date = new Date(receiptData.payment.date).toISOString().split("T")[0];
      const tenantName = receiptData.tenant.name.replace(/\s+/g, "_");
      link.download = `Receipt_${tenantName}_${date}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download receipt"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className={`h-4 w-4 ${size !== "icon" ? "mr-2" : ""} animate-spin`} />
          {size !== "icon" && "Generating..."}
        </>
      ) : (
        <>
          {children || (
            <>
              <Download className={`h-4 w-4 ${size !== "icon" ? "mr-2" : ""}`} />
              {size !== "icon" && "Receipt"}
            </>
          )}
        </>
      )}
    </Button>
  );
}
