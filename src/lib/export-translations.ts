/**
 * Hindi Language Support for PDF Export
 *
 * To enable Hindi export, we need:
 * 1. A font that supports Devanagari script
 * 2. Translation strings for headers
 * 3. Hindi names stored in database (or transliteration)
 */

// Hindi translations for export
export const HINDI_TRANSLATIONS = {
  title: 'किरायेदार विवरण रिपोर्ट',
  generated: 'बनाया गया',
  headers: {
    name: 'नाम',
    lastPaid: 'अंतिम भुगतान',
    monthlyRent: 'मासिक किराया',
    pending: 'लंबित',
    totalDues: 'कुल बकाया',
    credit: 'क्रेडिट',
    netPayable: 'शुद्ध देय',
  },
  summary: {
    title: 'सारांश',
    totalTenants: 'कुल किरायेदार',
    totalDues: 'कुल बकाया',
    totalCredit: 'कुल क्रेडिट',
    netPayable: 'शुद्ध देय',
  },
  note: 'नोट: सभी राशि भारतीय रुपये (₹) में',
  never: 'कभी नहीं',
  months: 'महीने',
};

// English translations (default)
export const ENGLISH_TRANSLATIONS = {
  title: 'Tenant Overview Report',
  generated: 'Generated',
  headers: {
    name: 'Name',
    lastPaid: 'Last Paid',
    monthlyRent: 'Monthly Rent',
    pending: 'Pending',
    totalDues: 'Total Dues',
    credit: 'Credit',
    netPayable: 'Net Payable',
  },
  summary: {
    title: 'Summary',
    totalTenants: 'Total Tenants',
    totalDues: 'Total Dues',
    totalCredit: 'Total Credit',
    netPayable: 'Net Payable',
  },
  note: 'Note: All amounts in Indian Rupees (Rs.)',
  never: 'Never',
  months: 'months',
};

/**
 * Steps to Add Hindi Font Support:
 *
 * 1. Download a Devanagari font (e.g., Noto Sans Devanagari)
 * 2. Convert to base64 using online tool
 * 3. Add to jsPDF using addFileToVFS() and addFont()
 *
 * Example:
 * import notoSansDevanagariBase64 from './fonts/NotoSansDevanagari-normal';
 *
 * doc.addFileToVFS('NotoSansDevanagari.ttf', notoSansDevanagariBase64);
 * doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');
 * doc.setFont('NotoSansDevanagari');
 */

export type ExportLanguage = 'english' | 'hindi';

export function getTranslations(language: ExportLanguage) {
  return language === 'hindi' ? HINDI_TRANSLATIONS : ENGLISH_TRANSLATIONS;
}
