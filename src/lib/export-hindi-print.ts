/**
 * Hindi Export - Browser Print Method
 *
 * Uses browser's native Hindi font rendering
 * No custom fonts needed - works immediately!
 */

import { TenantExportData } from './export-utils';
import { HINDI_TRANSLATIONS } from './export-translations';

/**
 * Export to PDF using browser print (supports Hindi perfectly)
 */
export function exportToPDFHindi(data: TenantExportData[], filename: string = 'tenant-overview-hindi') {
  const t = HINDI_TRANSLATIONS;

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Calculate totals
  const totalDues = data.reduce((sum, t) => sum + t.totalDues, 0);
  const totalCredit = data.reduce((sum, t) => sum + t.creditBalance, 0);
  const totalNet = data.reduce((sum, t) => sum + t.netPayable, 0);

  // Create HTML with Hindi text
  const htmlContent = `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>${t.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans Devanagari', sans-serif;
      padding: 20mm;
      background: white;
      color: #000;
      font-size: 11pt;
    }

    @media print {
      body {
        padding: 10mm;
      }
      .no-print {
        display: none;
      }
    }

    .header {
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }

    .title {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .subtitle {
      color: #666;
      font-size: 10pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th {
      background: #475569;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: 600;
      font-size: 10pt;
    }

    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .summary {
      background: #f8fafc;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #475569;
    }

    .summary h3 {
      font-size: 12pt;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 10pt;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }

    .label {
      color: #666;
    }

    .value {
      font-weight: 600;
    }

    .note {
      margin-top: 15px;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #475569;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-family: 'Noto Sans Devanagari', sans-serif;
      font-size: 12pt;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .print-button:hover {
      background: #334155;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">प्रिंट / PDF सेव करें</button>

  <div class="header">
    <div class="title">${t.title}</div>
    <div class="subtitle">${t.generated}: ${new Date().toLocaleDateString('hi-IN')}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${t.headers.name}</th>
        <th>${t.headers.lastPaid}</th>
        <th class="text-right">${t.headers.monthlyRent}</th>
        <th class="text-center">${t.headers.pending}</th>
        <th class="text-right">${t.headers.totalDues}</th>
        <th class="text-right">${t.headers.credit}</th>
        <th class="text-right">${t.headers.netPayable}</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(tenant => `
        <tr>
          <td>${tenant.name}</td>
          <td>${tenant.lastPaid}</td>
          <td class="text-right">${formatCurrency(tenant.monthlyRent)}</td>
          <td class="text-center">${tenant.pendingMonths}</td>
          <td class="text-right">${formatCurrency(tenant.totalDues)}</td>
          <td class="text-right">${tenant.creditBalance > 0 ? formatCurrency(tenant.creditBalance) : '-'}</td>
          <td class="text-right">${formatCurrency(tenant.netPayable)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <h3>${t.summary.title}</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="label">${t.summary.totalTenants}:</span>
        <span class="value">${data.length}</span>
      </div>
      <div class="summary-item">
        <span class="label">${t.summary.totalDues}:</span>
        <span class="value">₹${formatCurrency(totalDues)}</span>
      </div>
      <div class="summary-item">
        <span class="label">${t.summary.totalCredit}:</span>
        <span class="value">₹${formatCurrency(totalCredit)}</span>
      </div>
      <div class="summary-item">
        <span class="label">${t.summary.netPayable}:</span>
        <span class="value">₹${formatCurrency(totalNet)}</span>
      </div>
    </div>
  </div>

  <div class="note">${t.note}</div>
</body>
</html>
  `;

  // Open in new window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-print after load
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        // User can now click the button or use Ctrl+P
      }, 100);
    };
  } else {
    alert('कृपया पॉपअप ब्लॉकर अक्षम करें (Please disable popup blocker)');
  }
}

/**
 * Export CSV with Hindi headers
 */
export function exportToCSVHindi(data: TenantExportData[], filename: string = 'tenant-overview-hindi') {
  const t = HINDI_TRANSLATIONS;

  // CSV Headers in Hindi
  const headers = [
    t.headers.name,
    t.headers.lastPaid,
    `${t.headers.monthlyRent} (₹)`,
    t.headers.pending,
    `${t.headers.totalDues} (₹)`,
    `${t.headers.credit} (₹)`,
    `${t.headers.netPayable} (₹)`,
  ];

  // Helper to escape CSV fields
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

  // Combine headers and rows with BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const csvContent = BOM + [
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
