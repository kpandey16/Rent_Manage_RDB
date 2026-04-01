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
    'Monthly Rent',
    'Pending Months',
    'Total Dues',
    'Credit Balance',
    'Net Payable',
  ];

  // Convert data to CSV rows
  const rows = data.map(tenant => [
    tenant.name,
    tenant.lastPaid,
    tenant.monthlyRent,
    tenant.pendingMonths,
    tenant.totalDues,
    tenant.creditBalance,
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

  // Prepare table data
  const tableData = data.map(tenant => [
    tenant.name,
    tenant.lastPaid,
    `₹${tenant.monthlyRent.toLocaleString('en-IN')}`,
    tenant.pendingMonths.toString(),
    `₹${tenant.totalDues.toLocaleString('en-IN')}`,
    tenant.creditBalance > 0 ? `₹${tenant.creditBalance.toLocaleString('en-IN')}` : '-',
    `₹${tenant.netPayable.toLocaleString('en-IN')}`,
  ]);

  // Add table
  autoTable(doc, {
    head: [['Name', 'Last Paid', 'Monthly Rent', 'Pending', 'Total Dues', 'Credit', 'Net Payable']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Name
      1: { cellWidth: 25 }, // Last Paid
      2: { cellWidth: 25, halign: 'right' }, // Monthly Rent
      3: { cellWidth: 20, halign: 'center' }, // Pending
      4: { cellWidth: 25, halign: 'right' }, // Total Dues
      5: { cellWidth: 25, halign: 'right' }, // Credit
      6: { cellWidth: 30, halign: 'right' }, // Net Payable
    },
  });

  // Add summary at bottom
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Summary', 14, finalY);

  doc.setFontSize(9);
  doc.setTextColor(60);

  const totalDues = data.reduce((sum, t) => sum + t.totalDues, 0);
  const totalCredit = data.reduce((sum, t) => sum + t.creditBalance, 0);
  const totalNet = data.reduce((sum, t) => sum + t.netPayable, 0);

  doc.text(`Total Tenants: ${data.length}`, 14, finalY + 8);
  doc.text(`Total Dues: ₹${totalDues.toLocaleString('en-IN')}`, 14, finalY + 14);
  doc.text(`Total Credit: ₹${totalCredit.toLocaleString('en-IN')}`, 14, finalY + 20);
  doc.text(`Net Payable: ₹${totalNet.toLocaleString('en-IN')}`, 14, finalY + 26);

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
