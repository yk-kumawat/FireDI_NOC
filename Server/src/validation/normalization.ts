/**
 * Field Normalization and Comparison Utilities
 * Provides safe, conservative normalization for comparing document-extracted
 * values with application data.
 */

/**
 * Normalization result with both original and normalized values
 */
export interface NormalizedValue<T = string> {
  original: T | null;
  normalized: T | null;
  /** Whether normalization was applied */
  wasNormalized: boolean;
  /** Description of normalization applied */
  normalizationApplied?: string;
}

/**
 * Normalize a string value conservatively
 * - Trims whitespace
 * - Collapses multiple spaces to single space
 * - Does NOT change case (preserves legal name casing)
 * - Does NOT remove punctuation (may be meaningful in addresses/names)
 */
export function normalizeString(value: string | null | undefined): NormalizedValue<string> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const original = value;
  // Trim and collapse whitespace only
  const normalized = value
    .trim()
    .replace(/\s+/g, " ");

  return {
    original,
    normalized: normalized || null,
    wasNormalized: normalized !== original,
    normalizationApplied: normalized !== original ? "trimmed and collapsed whitespace" : undefined,
  };
}

/**
 * Normalize a string for case-insensitive comparison
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Converts to lowercase
 */
export function normalizeStringCaseInsensitive(value: string | null | undefined): NormalizedValue<string> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const original = value;
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return {
    original,
    normalized: normalized || null,
    wasNormalized: normalized !== original,
    normalizationApplied: normalized !== original ? "trimmed, collapsed whitespace, lowercased" : undefined,
  };
}

/**
 * Normalize a building/property name
 * More aggressive than basic string normalization but still conservative
 * - Removes common corporate suffixes for comparison purposes only
 * - Preserves original for audit
 */
export function normalizeBuildingName(value: string | null | undefined): NormalizedValue<string> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const original = value;
  let normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  // Remove common corporate suffixes for comparison (but keep original)
  const suffixes = [
    " pvt ltd", " pvt. ltd", " private limited", " ltd", " ltd.", " limited",
    " llp", " llc", " inc", " inc.", " corp", " corp.", " corporation",
    " co", " co.", " company", " & co", " & co.", " and company",
  ];

  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trim();
      break; // Only remove one suffix
    }
  }

  return {
    original,
    normalized: normalized || null,
    wasNormalized: normalized !== original.toLowerCase().trim().replace(/\s+/g, " "),
    normalizationApplied: "trimmed, collapsed whitespace, lowercased, removed corporate suffix",
  };
}

/**
 * Normalize an address for comparison
 * Conservative approach - only standardizes whitespace and case
 * Does NOT attempt to parse address components (street, city, etc.)
 */
export function normalizeAddress(value: string | null | undefined): NormalizedValue<string> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const original = value;
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",") // Remove duplicate commas
    .replace(/\s*,\s*/g, ", ") // Standardize comma spacing
    .toLowerCase();

  return {
    original,
    normalized: normalized || null,
    wasNormalized: normalized !== original.toLowerCase().trim().replace(/\s+/g, " "),
    normalizationApplied: "trimmed, collapsed whitespace, standardized commas, lowercased",
  };
}

/**
 * Compare two addresses with conservative approach
 * Returns match status and confidence
 */
export function compareAddresses(
  docValue: string | null | undefined,
  appValue: string | null | undefined
): { status: "exact" | "normalized_match" | "fuzzy_similar" | "mismatch" | "insufficient_data"; confidence: number; explanation: string } {
  const docNorm = normalizeAddress(docValue);
  const appNorm = normalizeAddress(appValue);

  if (!docNorm.normalized && !appNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Both address values are missing" };
  }
  if (!docNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Document address is missing" };
  }
  if (!appNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Application address is missing" };
  }

  // Exact match after normalization
  if (docNorm.normalized === appNorm.normalized) {
    return { status: "normalized_match", confidence: 95, explanation: "Addresses match after normalization" };
  }

  // Check for significant overlap (conservative)
  const docTokens = docNorm.normalized.split(/[\s,]+/).filter(t => t.length > 2);
  const appTokens = appNorm.normalized.split(/[\s,]+/).filter(t => t.length > 2);

  if (docTokens.length === 0 || appTokens.length === 0) {
    return { status: "mismatch", confidence: 30, explanation: "Addresses have no comparable tokens" };
  }

  const intersection = docTokens.filter(t => appTokens.includes(t));
  const overlapRatio = intersection.length / Math.max(docTokens.length, appTokens.length);

  if (overlapRatio >= 0.7) {
    return { status: "fuzzy_similar", confidence: 70, explanation: `Addresses share ${Math.round(overlapRatio * 100)}% key tokens - review recommended` };
  }

  return { status: "mismatch", confidence: 80, explanation: "Addresses differ significantly" };
}

/**
 * Normalize a date string for comparison
 * Attempts to parse various formats and return ISO date (YYYY-MM-DD)
 * Only normalizes when interpretation is unambiguous
 */
export function normalizeDate(value: string | null | undefined): NormalizedValue<string> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const original = value.trim();
  if (!original) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  // Try multiple date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // DD/MM/YY or DD-MM-YY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
    // YYYY-MM-DD (ISO)
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
    // Month name formats: DD MMM YYYY, DD-MMM-YYYY
    /^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-](\d{4})$/,
    // MMM DD, YYYY
    /^([A-Za-z]{3,9})[\s]+(\d{1,2})[\s,]+(\d{4})$/,
  ];

  const monthMap: Record<string, string> = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  for (const format of formats) {
    const match = original.match(format);
    if (match) {
      let day: string, month: string, year: string;

      if (format.source.includes("([A-Za-z]{3,9})")) {
        // Month name format
        if (format.source.startsWith("^(\\d{1,2})")) {
          // DD MMM YYYY
          [, day, month, year] = match;
        } else {
          // MMM DD, YYYY
          [, month, day, year] = match;
        }
        const monthNum = monthMap[month.toLowerCase()];
        if (!monthNum) continue;
        month = monthNum;
      } else if (format.source.startsWith("^(\\d{4})")) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else {
        // DD/MM/YYYY or DD/MM/YY
        [, day, month, year] = match;
      }

      // Normalize day/month to 2 digits
      day = day.padStart(2, "0");
      month = month.padStart(2, "0");

      // Handle 2-digit year
      if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }

      // Validate date components
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
        continue;
      }

      const isoDate = `${year}-${month}-${day}`;

      // Validate it's a real date
      const testDate = new Date(isoDate);
      if (testDate.getFullYear() === yearNum && testDate.getMonth() + 1 === monthNum && testDate.getDate() === dayNum) {
        return {
          original,
          normalized: isoDate,
          wasNormalized: isoDate !== original,
          normalizationApplied: `parsed as ${isoDate}`,
        };
      }
    }
  }

  // Could not parse - return original
  return {
    original,
    normalized: null,
    wasNormalized: false,
    normalizationApplied: "unparseable date format",
  };
}

/**
 * Compare two dates
 */
export function compareDates(
  docValue: string | null | undefined,
  appValue: string | null | undefined
): { status: "exact" | "normalized_match" | "mismatch" | "insufficient_data"; confidence: number; explanation: string } {
  const docNorm = normalizeDate(docValue);
  const appNorm = normalizeDate(appValue);

  if (!docNorm.normalized && !appNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Both dates are missing or unparseable" };
  }
  if (!docNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Document date is missing or unparseable" };
  }
  if (!appNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Application date is missing or unparseable" };
  }

  if (docNorm.normalized === appNorm.normalized) {
    return { status: "normalized_match", confidence: 95, explanation: `Dates match: ${docNorm.normalized}` };
  }

  return { status: "mismatch", confidence: 90, explanation: `Document date: ${docNorm.normalized}, Application date: ${appNorm.normalized}` };
}

/**
 * Normalize registration/certificate number
 * Conservative - removes only spaces and standardizes separators
 * Does NOT remove meaningful characters like slashes, dashes
 */
export function normalizeRegistrationNumber(value: string | number | null | undefined): NormalizedValue<string> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const strValue = String(value);
  const original = strValue.trim();
  if (!original) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  // Remove spaces, standardize separators to single hyphen
  let normalized = original
    .replace(/\s+/g, "")
    .replace(/[-_\/]+/g, "-")
    .toUpperCase();

  return {
    original,
    normalized: normalized || null,
    wasNormalized: normalized !== original.toUpperCase().replace(/\s+/g, ""),
    normalizationApplied: "removed spaces, standardized separators, uppercased",
  };
}

/**
 * Compare registration numbers
 */
export function compareRegistrationNumbers(
  docValue: string | number | null | undefined,
  appValue: string | number | null | undefined
): { status: "exact" | "normalized_match" | "mismatch" | "insufficient_data"; confidence: number; explanation: string } {
  const docNorm = normalizeRegistrationNumber(String(docValue ?? ""));
  const appNorm = normalizeRegistrationNumber(String(appValue ?? ""));

  if (!docNorm.normalized && !appNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Both registration numbers are missing" };
  }
  if (!docNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Document registration number is missing" };
  }
  if (!appNorm.normalized) {
    return { status: "insufficient_data", confidence: 0, explanation: "Application registration number is missing" };
  }

  if (docNorm.normalized === appNorm.normalized) {
    return { status: "normalized_match", confidence: 95, explanation: `Registration numbers match: ${docNorm.normalized}` };
  }

  return { status: "mismatch", confidence: 90, explanation: `Document: ${docNorm.normalized}, Application: ${appNorm.normalized}` };
}

/**
 * Normalize numeric value with unit
 */
export function normalizeQuantity(value: string | number | null | undefined): NormalizedValue<number> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const original = typeof value === "string" ? value.trim() : String(value);
  if (!original) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  // Extract numeric value (handle commas, decimals)
  const numericMatch = original.match(/^([\d,]+\.?\d*)/);
  if (!numericMatch) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  const normalized = parseFloat(numericMatch[1].replace(/,/g, ""));
  if (isNaN(normalized)) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  return {
    original: normalized,
    normalized,
    wasNormalized: false,
  };
}

/**
 * Compare numeric quantities
 */
export function compareQuantities(
  docValue: string | number | null | undefined,
  appValue: string | number | null | undefined,
  tolerancePercent = 5 // Allow 5% tolerance for measurement variations
): { status: "exact" | "normalized_match" | "mismatch" | "insufficient_data"; confidence: number; explanation: string } {
  const docNorm = normalizeQuantity(docValue);
  const appNorm = normalizeQuantity(appValue);

  if (docNorm.normalized == null && appNorm.normalized == null) {
    return { status: "insufficient_data", confidence: 0, explanation: "Both quantities are missing" };
  }
  if (docNorm.normalized == null) {
    return { status: "insufficient_data", confidence: 0, explanation: "Document quantity is missing" };
  }
  if (appNorm.normalized == null) {
    return { status: "insufficient_data", confidence: 0, explanation: "Application quantity is missing" };
  }

  if (docNorm.normalized === appNorm.normalized) {
    return { status: "exact", confidence: 100, explanation: `Quantities match exactly: ${docNorm.normalized}` };
  }

  const diff = Math.abs(docNorm.normalized - appNorm.normalized);
  const maxVal = Math.max(docNorm.normalized, appNorm.normalized);
  const diffPercent = maxVal > 0 ? (diff / maxVal) * 100 : 0;

  if (diffPercent <= tolerancePercent) {
    return { status: "normalized_match", confidence: 85, explanation: `Quantities within ${tolerancePercent}% tolerance (doc: ${docNorm.normalized}, app: ${appNorm.normalized})` };
  }

  return { status: "mismatch", confidence: 90, explanation: `Quantity mismatch: document ${docNorm.normalized} vs application ${appNorm.normalized} (${diffPercent.toFixed(1)}% difference)` };
}

/**
 * Normalize boolean-like values
 */
export function normalizeBoolean(value: string | boolean | number | null | undefined): NormalizedValue<boolean> {
  if (value == null) {
    return { original: null, normalized: null, wasNormalized: false };
  }

  if (typeof value === "boolean") {
    return { original: value, normalized: value, wasNormalized: false };
  }

  if (typeof value === "number") {
    const normalized = value !== 0;
    return { original: normalized, normalized, wasNormalized: true, normalizationApplied: "number to boolean" };
  }

  const str = String(value).trim().toLowerCase();
  const truthy = ["true", "yes", "y", "1", "on", "present", "available", "has"];
  const falsy = ["false", "no", "n", "0", "off", "absent", "not present", "not available", "does not have"];

  if (truthy.includes(str)) {
    return { original: true, normalized: true, wasNormalized: true, normalizationApplied: `string "${str}" to true` };
  }
  if (falsy.includes(str)) {
    return { original: false, normalized: false, wasNormalized: true, normalizationApplied: `string "${str}" to false` };
  }

  return { original: null, normalized: null, wasNormalized: false, normalizationApplied: "unrecognized boolean value" };
}

/**
 * Compare boolean values
 */
export function compareBooleans(
  docValue: string | boolean | number | null | undefined,
  appValue: string | boolean | number | null | undefined
): { status: "exact" | "mismatch" | "insufficient_data"; confidence: number; explanation: string } {
  const docNorm = normalizeBoolean(docValue);
  const appNorm = normalizeBoolean(appValue);

  if (docNorm.normalized == null && appNorm.normalized == null) {
    return { status: "insufficient_data", confidence: 0, explanation: "Both boolean values are missing" };
  }
  if (docNorm.normalized == null) {
    return { status: "insufficient_data", confidence: 0, explanation: "Document boolean value is missing" };
  }
  if (appNorm.normalized == null) {
    return { status: "insufficient_data", confidence: 0, explanation: "Application boolean value is missing" };
  }

  if (docNorm.normalized === appNorm.normalized) {
    return { status: "exact", confidence: 100, explanation: `Boolean values match: ${docNorm.normalized}` };
  }

  return { status: "mismatch", confidence: 100, explanation: `Boolean mismatch: document ${docNorm.normalized} vs application ${appNorm.normalized}` };
}

/**
 * Check if a value is "missing" (null, undefined, empty string)
 */
export function isMissing(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Extract field value from AI classification extractedFields array
 */
export function getExtractedFieldValue(
  extractedFields: Array<{ name: string; value: string | number | null; confidence?: number; missing: boolean }>,
  fieldName: string
): { value: string | number | null; confidence?: number; missing: boolean } | null {
  const field = extractedFields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
  return field || null;
}

/**
 * Generic field comparison with normalization
 */
export function compareFields<T>(
  docValue: T | null | undefined,
  appValue: T | null | undefined,
  normalizeFn: (v: T | null | undefined) => NormalizedValue<T>,
  compareFn: (docNorm: NormalizedValue<T>, appNorm: NormalizedValue<T>) => { status: string; confidence: number; explanation: string }
): { status: string; confidence: number; explanation: string; docNormalized: NormalizedValue<T>; appNormalized: NormalizedValue<T> } {
  const docNorm = normalizeFn(docValue);
  const appNorm = normalizeFn(appValue);
  const result = compareFn(docNorm, appNorm);
  return { ...result, docNormalized: docNorm, appNormalized: appNorm };
}