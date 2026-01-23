import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register fonts (optional - uses default fonts if not specified)
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf',
      fontWeight: 700,
    },
  ],
});

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 11,
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: '#64748b',
    fontSize: 10,
  },
  value: {
    fontWeight: 700,
    color: '#1e293b',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#cbd5e1',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCell: {
    fontSize: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#059669',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  receiptId: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 5,
  },
  badge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingLeft: 10,
  },
  adjustmentLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  adjustmentValue: {
    fontSize: 9,
    color: '#ea580c',
  },
});

export interface ReceiptData {
  receiptId: string;
  receiptDate: string;
  tenant: {
    name: string;
    id: string;
    rooms: string[];
  };
  payment: {
    amount: number;
    method: string;
    date: string;
    description?: string;
  };
  adjustments?: {
    type: string;
    amount: number;
    description: string;
  }[];
  rentPeriods?: {
    period: string;
    amount: number;
  }[];
  totalAmount: number;
  creditRemaining?: number;
  landlord?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatPeriod = (period: string): string => {
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${year}`;
};

export const ReceiptTemplate: React.FC<{ data: ReceiptData }> = ({ data }) => {
  const formatPaymentMethod = (method: string): string => {
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
    };
    return methodMap[method] || method;
  };

  const formatAdjustmentType = (type: string): string => {
    const typeMap: Record<string, string> = {
      discount: 'Discount',
      maintenance: 'Maintenance Deduction',
      other: 'Other Adjustment',
    };
    return typeMap[type] || type;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RENT RECEIPT</Text>
          <Text style={styles.subtitle}>Payment Confirmation</Text>
        </View>

        {/* Receipt Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Receipt Number</Text>
              <Text style={styles.value}>{data.receiptId}</Text>
            </View>
            <View>
              <Text style={styles.label}>Receipt Date</Text>
              <Text style={styles.value}>{new Date(data.receiptDate).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Landlord Info */}
        {data.landlord && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>From (Landlord)</Text>
            <View>
              <Text style={styles.value}>{data.landlord.name}</Text>
              {data.landlord.address && <Text style={styles.label}>{data.landlord.address}</Text>}
              {data.landlord.phone && <Text style={styles.label}>Phone: {data.landlord.phone}</Text>}
              {data.landlord.email && <Text style={styles.label}>Email: {data.landlord.email}</Text>}
            </View>
          </View>
        )}

        {/* Tenant Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To (Tenant)</Text>
          <View>
            <Text style={styles.value}>{data.tenant.name}</Text>
            <Text style={styles.label}>Tenant ID: {data.tenant.id}</Text>
            {data.tenant.rooms.length > 0 && (
              <Text style={styles.label}>Room(s): {data.tenant.rooms.join(', ')}</Text>
            )}
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid</Text>
            <Text style={styles.value}>{formatCurrency(data.payment.amount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{formatPaymentMethod(data.payment.method)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date</Text>
            <Text style={styles.value}>{new Date(data.payment.date).toLocaleDateString('en-IN')}</Text>
          </View>
          {data.payment.description && (
            <View style={styles.row}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{data.payment.description}</Text>
            </View>
          )}
        </View>

        {/* Adjustments */}
        {data.adjustments && data.adjustments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adjustments Applied</Text>
            {data.adjustments.map((adj, index) => (
              <View key={index} style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>
                  {formatAdjustmentType(adj.type)}: {adj.description}
                </Text>
                <Text style={styles.adjustmentValue}>{formatCurrency(adj.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rent Periods Paid */}
        {data.rentPeriods && data.rentPeriods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rent Periods Covered</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: '60%', fontWeight: 700 }]}>Period</Text>
              <Text style={[styles.tableCell, { width: '40%', fontWeight: 700, textAlign: 'right' }]}>Amount</Text>
            </View>
            {data.rentPeriods.map((period, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '60%' }]}>{formatPeriod(period.period)}</Text>
                <Text style={[styles.tableCell, { width: '40%', textAlign: 'right' }]}>
                  {formatCurrency(period.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.totalAmount)}</Text>
        </View>

        {/* Credit Remaining */}
        {data.creditRemaining !== undefined && data.creditRemaining > 0 && (
          <View style={[styles.row, { marginTop: 10 }]}>
            <Text style={styles.label}>Credit Balance Remaining</Text>
            <Text style={[styles.value, { color: '#059669' }]}>{formatCurrency(data.creditRemaining)}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This is a computer-generated receipt and does not require a signature.</Text>
          <Text style={styles.footerText}>Thank you for your payment!</Text>
          <Text style={styles.receiptId}>Receipt ID: {data.receiptId}</Text>
        </View>
      </Page>
    </Document>
  );
};
