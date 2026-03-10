/**
 * Transliteration utility for converting English names to Hindi (Devanagari)
 *
 * NOTE: This is a simple mapping and may not be 100% accurate for all names.
 * Users should review and edit the transliterated names.
 */

const englishToHindiMap: Record<string, string> = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',

  // Consonants
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ',
  't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ',
  'n': 'न', 'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ',
  'm': 'म', 'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  's': 'स', 'sh': 'श', 'h': 'ह',
};

// Common name mappings (more accurate for known names)
const commonNames: Record<string, string> = {
  'ramesh': 'रमेश',
  'suresh': 'सुरेश',
  'kumar': 'कुमार',
  'patel': 'पटेल',
  'sharma': 'शर्मा',
  'singh': 'सिंह',
  'gupta': 'गुप्ता',
  'verma': 'वर्मा',
  'rao': 'राव',
  'reddy': 'रेड्डी',
  'nair': 'नायर',
  'iyer': 'अय्यर',
  'agarwal': 'अग्रवाल',
  'jain': 'जैन',
  'mehta': 'मेहता',
  'khan': 'खान',
  'ali': 'अली',
  'ahmed': 'अहमद',
  'raj': 'राज',
  'priya': 'प्रिया',
  'anita': 'अनीता',
  'amit': 'अमित',
  'vijay': 'विजय',
  'ajay': 'अजय',
  'sanjay': 'संजय',
  'deepak': 'दीपक',
  'rahul': 'राहुल',
  'rohit': 'रोहित',
  'neha': 'नेहा',
  'pooja': 'पूजा',
};

/**
 * Transliterate English name to Hindi
 * @param name - English name (e.g., "Ramesh Kumar")
 * @returns Hindi transliteration (e.g., "रमेश कुमार")
 */
export function transliterateToHindi(name: string): string {
  if (!name) return '';

  // Split name into parts (first name, last name, etc.)
  const parts = name.toLowerCase().split(' ');

  const transliteratedParts = parts.map(part => {
    // Check if it's a common name with known mapping
    if (commonNames[part]) {
      return commonNames[part];
    }

    // Otherwise, do simple character-by-character mapping
    // This is very basic and may not be accurate
    let result = '';
    for (let i = 0; i < part.length; i++) {
      const char = part[i];
      result += englishToHindiMap[char] || char;
    }
    return result;
  });

  return transliteratedParts.join(' ');
}

/**
 * Check if a string contains Hindi characters
 */
export function isHindiText(text: string): boolean {
  // Hindi Unicode range: \u0900-\u097F
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Validate Hindi name format
 */
export function isValidHindiName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;

  // Should contain Hindi characters
  return isHindiText(name);
}
