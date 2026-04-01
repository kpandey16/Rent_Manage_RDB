/**
 * Export Utilities
 *
 * Handles exporting data to CSV and PDF formats
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TenantExportData {
  name: string;
  lastPaid: string;
  monthlyRent: number;
  pendingMonths: number;
  totalDues: number;
  creditBalance: number;
  netPayable: number;
}

/**
 * Export tenant data to CSV
 */
export function exportToCSV(data: TenantExportData[], filename: string = 'tenants-report') {
  // CSV Headers
  const headers = [
    'Name',
    'Last Paid',
    'Monthly Rent (Rs.)',
    'Pending Months',
    'Total Dues (Rs.)',
    'Credit Balance (Rs.)',
    'Net Payable (Rs.)',
  ];

  // Helper to escape CSV fields (handle commas in names)
  const escapeCSV = (field: string | number): string => {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Convert data to CSV rows
  const rows = data.map(tenant => [
    escapeCSV(tenant.name),
    escapeCSV(tenant.lastPaid),
    tenant.monthlyRent,
    tenant.pendingMonths,
    tenant.totalDues,
    tenant.creditBalance > 0 ? tenant.creditBalance : 0,
    tenant.netPayable,
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export tenant data to PDF
 */
export function exportToPDF(data: TenantExportData[], filename: string = 'tenants-report') {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text('Tenant Overview Report', 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

  // Helper function to format currency without locale (avoids spacing issues)
  const formatCurrency = (amount: number): string => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Prepare table data
  const tableData = data.map(tenant => [
    tenant.name,
    tenant.lastPaid,
    formatCurrency(tenant.monthlyRent),
    tenant.pendingMonths.toString(),
    formatCurrency(tenant.totalDues),
    tenant.creditBalance > 0 ? formatCurrency(tenant.creditBalance) : '-',
    formatCurrency(tenant.netPayable),
  ]);

  // Add table
  autoTable(doc, {
    head: [['Name', 'Last Paid', 'Monthly Rent', 'Pending', 'Total Dues', 'Credit', 'Net Payable']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 45 }, // Name - wider
      1: { cellWidth: 22 }, // Last Paid
      2: { cellWidth: 24, halign: 'right' }, // Monthly Rent
      3: { cellWidth: 18, halign: 'center' }, // Pending
      4: { cellWidth: 24, halign: 'right' }, // Total Dues
      5: { cellWidth: 20, halign: 'right' }, // Credit
      6: { cellWidth: 25, halign: 'right' }, // Net Payable
    },
  });

  // Add summary at bottom
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Summary', 14, finalY);

  doc.setFontSize(9);
  doc.setTextColor(60);

  const totalDues = data.reduce((sum, t) => sum + t.totalDues, 0);
  const totalCredit = data.reduce((sum, t) => sum + t.creditBalance, 0);
  const totalNet = data.reduce((sum, t) => sum + t.netPayable, 0);

  doc.text(`Total Tenants: ${data.length}`, 14, finalY + 8);
  doc.text(`Total Dues: Rs. ${formatCurrency(totalDues)}`, 14, finalY + 14);
  doc.text(`Total Credit: Rs. ${formatCurrency(totalCredit)}`, 14, finalY + 20);
  doc.text(`Net Payable: Rs. ${formatCurrency(totalNet)}`, 14, finalY + 26);

  // Add note about currency
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Note: All amounts in Indian Rupees (Rs.)', 14, finalY + 34);

  // Save PDF
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Format tenant data for export
 */
export function formatTenantForExport(tenant: any): TenantExportData {
  const totalDues = Number(tenant.total_dues || 0);
  const creditBalance = Number(tenant.credit_balance || 0);
  const netPayable = Math.max(0, totalDues - creditBalance);

  return {
    name: tenant.name,
    lastPaid: tenant.last_paid_month || 'Never',
    monthlyRent: Number(tenant.monthly_rent || 0),
    pendingMonths: tenant.pending_months || 0,
    totalDues,
    creditBalance,
    netPayable,
  };
}
