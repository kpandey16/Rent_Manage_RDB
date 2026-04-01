# Hindi PDF Export Setup Guide

## Overview
To export PDFs in Hindi (Devanagari script), we need to add a custom font to jsPDF.

## ✅ What's Already Done
- Hindi translations for all headers and labels
- Export function structure ready for language support
- Translation system in place

## 📋 Steps to Enable Hindi

### Step 1: Download Hindi Font

Download **Noto Sans Devanagari** (Google's free font with excellent Hindi support):

```bash
# Option 1: Direct download
https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari

# Option 2: Using Google Fonts
https://fonts.google.com/specimen/Noto+Sans+Devanagari

# Download these files:
- NotoSansDevanagari-Regular.ttf
- NotoSansDevanagari-Bold.ttf
```

### Step 2: Convert Font to Base64

Use this online tool to convert TTF to Base64:
```
https://www.giftofspeed.com/base64-encoder/
```

OR use Node.js:
```bash
node scripts/convert-font-to-base64.js
```

### Step 3: Add Font Files to Project

Create font files:
```
src/lib/fonts/
├── NotoSansDevanagari-normal.ts
└── NotoSansDevanagari-bold.ts
```

Example content:
```typescript
// src/lib/fonts/NotoSansDevanagari-normal.ts
export const NotoSansDevanagariNormal = 
  "AAEAAAATABAAAQAABAAAAAA..."; // Base64 string (very long)
```

### Step 4: Update Export Function

The export function is already prepared to accept a `language` parameter:

```typescript
import { getTranslations } from './export-translations';

// Usage
exportToPDF(data, 'tenant-overview', 'hindi');  // Hindi export
exportToPDF(data, 'tenant-overview', 'english'); // English export (default)
```

## 🎯 Quick Test (Without Font File)

To test Hindi headers without the font (will show boxes/question marks for Hindi text):

1. Go to Reports page
2. Click "Export as PDF" 
3. Hindi headers will be used but won't render properly yet

## ⚡ Simplified Alternative

If adding custom fonts is too complex, we can:

### Option A: Use Transliteration
Store names in both English and Hindi in database:
```sql
ALTER TABLE tenants ADD COLUMN name_hindi TEXT;
```

### Option B: Use External Service
Use a service like PDFShift or DocRaptor that has built-in Hindi support:
```javascript
// Send data to external API
const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
  method: 'POST',
  body: JSON.stringify({ html: hindiHTML }),
});
```

### Option C: Use Browser Print (Easiest)
Let browser handle Hindi rendering:
```javascript
// Create Hindi HTML page
// Use window.print() - browser handles fonts
```

## 📦 Complete Implementation (If Using Custom Font)

```typescript
import { jsPDF } from 'jspdf';
import { NotoSansDevanagariNormal } from './fonts/NotoSansDevanagari-normal';

// Add font to jsPDF
doc.addFileToVFS('NotoSansDevanagari.ttf', NotoSansDevanagariNormal);
doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');

// Use Hindi font
doc.setFont('NotoSansDevanagari');

// Now Hindi text will render properly
doc.text('किरायेदार विवरण रिपोर्ट', 14, 20);
```

## 🎨 Recommended Approach

**For Your Use Case:**

I recommend **Option C (Browser Print)** because:
1. ✅ No font files needed
2. ✅ Browser handles Hindi perfectly
3. ✅ Works immediately
4. ✅ User can save as PDF from print dialog

**Implementation:**
1. Create HTML template with Hindi text
2. Open in new window
3. Call window.print()
4. User saves as PDF

Would you like me to implement this browser-based approach?

## 📝 Current Status

✅ Hindi translations ready
✅ Export structure ready
⏳ Font file needed (or use browser print alternative)

## Next Steps

Choose one:
1. **Full PDF with Font** - I can guide you through adding the font file
2. **Browser Print** - I can implement this now (5 minutes, works immediately)
3. **Transliteration** - Store Hindi names in database

Which would you prefer?
