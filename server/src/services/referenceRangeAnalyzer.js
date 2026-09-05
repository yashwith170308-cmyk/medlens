/**
 * Reference Range Analyzer
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Must use the exact reference range provided in the report.
 * 2. NEVER invent, substitute, or hallucinate a medical reference range.
 * 3. If a report does NOT provide a reference range, status MUST be 'Not determined'.
 * 4. Perform deterministic numerical comparison.
 * 5. Preserve original reference-range text verbatim.
 */

const RANGE_PATTERN = /^([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:-|–|—|to)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/i;
const LESS_THAN_PATTERN = /^(?:<|<=|≤|up\s+to|less\s+than)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/i;
const GREATER_THAN_PATTERN = /^(?:>|>=|≥|greater\s+than)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/i;

/**
 * Parses raw reference range string into numerical bounds.
 * Supports patterns:
 * - "13 - 17", "13.0 – 17.5", "13.0—17.5", "13 to 17"
 * - "< 200", "<= 200", "≤ 200", "Up to 200", "Less than 200"
 * - "> 60", ">= 60", "≥ 60", "Greater than 60"
 * - "4,000 - 10,000" (with commas)
 * 
 * @param {string|null|undefined} rawRange 
 * @returns {{ low: number|null, high: number|null, isValidRange: boolean, rawText: string }}
 */
export function parseReferenceRange(rawRange) {
  if (!rawRange || typeof rawRange !== 'string' || !rawRange.trim()) {
    return { low: null, high: null, isValidRange: false, rawText: 'None reported' };
  }

  const clean = rawRange.trim();

  // Pattern 1: X - Y, X – Y, X — Y, X to Y (e.g., "13 - 17", "4000 - 10000", "4,000 - 10,000")
  const rangeMatch = clean.match(RANGE_PATTERN);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
    if (!isNaN(low) && !isNaN(high)) {
      return { low, high, isValidRange: true, rawText: clean };
    }
  }

  // Pattern 2: < X, <= X, ≤ X, "Up to X", "Less than X"
  const lessThanMatch = clean.match(LESS_THAN_PATTERN);
  if (lessThanMatch) {
    const high = parseFloat(lessThanMatch[1].replace(/,/g, ''));
    if (!isNaN(high)) {
      return { low: null, high, isValidRange: true, rawText: clean };
    }
  }

  // Pattern 3: > X, >= X, ≥ X, "Greater than X"
  const greaterThanMatch = clean.match(GREATER_THAN_PATTERN);
  if (greaterThanMatch) {
    const low = parseFloat(greaterThanMatch[1].replace(/,/g, ''));
    if (!isNaN(low)) {
      return { low, high: null, isValidRange: true, rawText: clean };
    }
  }

  return { low: null, high: null, isValidRange: false, rawText: clean };
}

/**
 * Deterministically evaluates an observed laboratory value against a reported reference range.
 * 
 * @param {number|string|null} observedValue 
 * @param {string|null|undefined} referenceRangeRaw 
 * @returns {{
 *   status: 'Within reported range' | 'Below reported range' | 'Above reported range' | 'Not determined',
 *   rangeLow: number|null,
 *   rangeHigh: number|null,
 *   referenceRangeRaw: string,
 *   numericValue: number|null
 * }}
 */
export function evaluateReferenceRange(observedValue, referenceRangeRaw) {
  // 1. Sanitize raw reference range
  const rangeInfo = parseReferenceRange(referenceRangeRaw);

  // 2. Parse observed value numerically
  let numericValue = null;
  if (typeof observedValue === 'number' && !isNaN(observedValue)) {
    numericValue = observedValue;
  } else if (typeof observedValue === 'string') {
    const parsed = parseFloat(observedValue.replace(/,/g, '').trim());
    if (!isNaN(parsed)) {
      numericValue = parsed;
    }
  }

  // 3. If no reference range was provided, or range cannot be parsed, status MUST be 'Not determined'
  // NEVER invent or substitute standard ranges!
  if (!rangeInfo.isValidRange || numericValue === null) {
    return {
      status: 'Not determined',
      rangeLow: null,
      rangeHigh: null,
      referenceRangeRaw: rangeInfo.rawText,
      numericValue
    };
  }

  const { low, high } = rangeInfo;

  // 4. Deterministic numerical bounds check
  if (low !== null && high !== null) {
    if (numericValue < low) {
      return {
        status: 'Below reported range',
        rangeLow: low,
        rangeHigh: high,
        referenceRangeRaw: rangeInfo.rawText,
        numericValue
      };
    }
    if (numericValue > high) {
      return {
        status: 'Above reported range',
        rangeLow: low,
        rangeHigh: high,
        referenceRangeRaw: rangeInfo.rawText,
        numericValue
      };
    }
    return {
      status: 'Within reported range',
      rangeLow: low,
      rangeHigh: high,
      referenceRangeRaw: rangeInfo.rawText,
      numericValue
    };
  }

  if (high !== null && low === null) {
    // Upper bound only (e.g. < 200)
    if (numericValue > high) {
      return {
        status: 'Above reported range',
        rangeLow: null,
        rangeHigh: high,
        referenceRangeRaw: rangeInfo.rawText,
        numericValue
      };
    }
    return {
      status: 'Within reported range',
      rangeLow: null,
      rangeHigh: high,
      referenceRangeRaw: rangeInfo.rawText,
      numericValue
    };
  }

  if (low !== null && high === null) {
    // Lower bound only (e.g. > 60)
    if (numericValue < low) {
      return {
        status: 'Below reported range',
        rangeLow: low,
        rangeHigh: null,
        referenceRangeRaw: rangeInfo.rawText,
        numericValue
      };
    }
    return {
      status: 'Within reported range',
      rangeLow: low,
      rangeHigh: null,
      referenceRangeRaw: rangeInfo.rawText,
      numericValue
    };
  }

  return {
    status: 'Not determined',
    rangeLow: null,
    rangeHigh: null,
    referenceRangeRaw: rangeInfo.rawText,
    numericValue
  };
}
