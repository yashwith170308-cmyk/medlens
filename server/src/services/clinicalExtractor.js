import { normalizeTestName } from './terminologyNormalizer.js';
import { evaluateReferenceRange } from './referenceRangeAnalyzer.js';

/**
 * Common clinical units pattern
 */
const UNIT_REGEX_STR = '(?:g\\/dL|g\\/dl|gm\\/dl|\\/µL|\\/uL|\\/mm3|cells\\/cu\\.mm|cu\\.mm|\\%|mg\\/dL|mg\\/dl|mmol\\/L|µmol\\/L|umol\\/L|mIU\\/L|uIU\\/mL|pg|fl|fL|ng\\/mL|µg\\/dL|ug\\/dL|mm\\/hr|U\\/L|IU\\/L|mEq\\/L)';

/**
 * Extracts report date from raw text.
 * @param {string} text 
 * @returns {string|null}
 */
export function extractReportDate(text) {
  if (!text) return null;

  // e.g. "Date: 2024-05-12", "Report Date: 12/05/2024", "Collected: May 12, 2024"
  const datePatterns = [
    /(?:report\s+date|date\s+of\s+collection|collection\s+date|date)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
    /(?:report\s+date|date)\s*[:\-]?\s*([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})/i,
    /(?:report\s+date|date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Categorizes the report based on clinical keywords.
 * @param {string} text 
 * @returns {'Blood'|'Urine'|'Imaging'|'Prescription'|'Pathology'|'Other'}
 */
export function categorizeReport(text) {
  if (!text) return 'Other';
  const lower = text.toLowerCase();

  if (lower.includes('urine') || lower.includes('urinalysis')) return 'Urine';
  if (lower.includes('x-ray') || lower.includes('mri') || lower.includes('ct scan') || lower.includes('ultrasound') || lower.includes('radiology')) return 'Imaging';
  if (lower.includes('rx') || lower.includes('prescription') || lower.includes('dispense') || lower.includes('sig:')) return 'Prescription';
  if (lower.includes('biopsy') || lower.includes('histopathology') || lower.includes('cytology')) return 'Pathology';
  if (lower.includes('hemoglobin') || lower.includes('blood') || lower.includes('cbc') || lower.includes('hematology') || lower.includes('lipid') || lower.includes('glucose') || lower.includes('serum')) return 'Blood';

  return 'Other';
}

/**
 * Extracts observations, patient concerns, and doctor notes from text.
 * @param {string} text 
 * @returns {string[]}
 */
export function extractObservations(text) {
  if (!text) return [];
  const observations = [];
  const lines = text.split(/\r?\n/);

  let capturingNotes = false;
  let buffer = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/(?:impression|interpretation|clinical\s+notes?|comments?|remarks?|observation|findings?)\s*[:\-]/i.test(trimmed)) {
      capturingNotes = true;
      buffer.push(trimmed);
      continue;
    }

    if (capturingNotes) {
      // Check if entering a new section
      if (/^[A-Z\s]{4,}:/i.test(trimmed) && !/(?:note|comment|impression|interpretation)/i.test(trimmed)) {
        capturingNotes = false;
        if (buffer.length) {
          observations.push(buffer.join(' '));
          buffer = [];
        }
      } else {
        buffer.push(trimmed);
      }
    }
  }

  if (buffer.length) {
    observations.push(buffer.join(' '));
  }

  return observations;
}

/**
 * Extracts structured laboratory test parameters from text.
 * 
 * Supports:
 * - Tabular formats (with pipes or spaces/dots)
 * - Colon-separated formats
 * - Explicit and missing reference ranges
 * - Preserves original snippet & source line
 * 
 * @param {string} text 
 * @param {string} reportFilename 
 * @param {number} [sourcePage=1]
 * @returns {Array<object>}
 */
export function extractLabResults(text, reportFilename = 'Report.txt', sourcePage = 1) {
  if (!text) return [];

  const results = [];
  const lines = text.split(/\r?\n/);
  const seenTests = new Set();

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Skip header lines
    if (/^(test\s+name|parameter|investigation|test|analyte)\b/i.test(trimmed)) continue;
    if (/^(patient\s+name|doctor|clinic|hospital|age|gender|sex|date)\b/i.test(trimmed)) continue;

    let matched = false;

    // Pattern A: Pipe-separated: Test | Value | Unit | Range
    // Example: Hemoglobin | 10.2 | g/dL | 13 - 17
    const pipeParts = trimmed.split('|').map(s => s.trim()).filter(Boolean);
    if (pipeParts.length >= 2) {
      const candidateName = pipeParts[0];
      const candidateVal = pipeParts[1];
      const candidateUnit = pipeParts[2] || '';
      const candidateRange = pipeParts[3] || null;

      const numVal = parseFloat(candidateVal.replace(/,/g, ''));
      if (!isNaN(numVal) && candidateName.length > 1 && !/^(total|result|reference)$/i.test(candidateName)) {
        const { canonicalName } = normalizeTestName(candidateName);
        const evalResult = evaluateReferenceRange(numVal, candidateRange);

        results.push({
          rawTestName: candidateName,
          canonicalName,
          observedValue: evalResult.numericValue,
          valueText: candidateVal,
          unit: candidateUnit,
          referenceRangeRaw: evalResult.referenceRangeRaw,
          rangeLow: evalResult.rangeLow,
          rangeHigh: evalResult.rangeHigh,
          status: evalResult.status,
          sourceType: 'AI-extracted',
          sourcePage,
          sourceSnippet: trimmed,
          verificationStatus: 'Requires verification'
        });
        seenTests.add(canonicalName.toLowerCase());
        matched = true;
      }
    }

    if (matched) continue;

    // Pattern B: Regex for Test Name followed by Value, optional Unit, and optional Reference Range
    // Supports:
    // "Hemoglobin 10.2 g/dL 13-17"
    // "WBC Count: 8,100 /µL (4000 - 10000)"
    // "Fasting Blood Sugar: 145 mg/dL Ref: 70 - 99"
    // "ESR 22 mm/hr" (No reference range)
    // "Total Cholesterol 220 mg/dL (< 200)"
    const lineRegex = new RegExp(
      `^([A-Za-z0-9\\+\\/\\-\\s\\.]{2,35}?)\\s*[:\\.]*\\s+` + // Test name
      `([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)\\s*` +             // Observed numeric value
      `(${UNIT_REGEX_STR})?\\s*` +                             // Optional unit
      `(?:(?:ref(?:erence)?\\s*(?:range)?|normal)?\\s*[:\\(]?\\s*` + 
      `((?:<|<=|>|>=|≤|≥|up\\s+to\\s+)?[0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?\\s*(?:-|–|—|to)\\s*[0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?|(?:<|<=|>|>=|≤|≥|up\\s+to|less\\s+than|greater\\s+than)\\s*[0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)` + // Reference range
      `\\s*\\)?)?`, 
      'i'
    );

    const lineMatch = trimmed.match(lineRegex);
    if (lineMatch) {
      const rawTest = lineMatch[1].trim().replace(/[:\.\-]+$/, '');
      const rawVal = lineMatch[2].trim();
      const rawUnit = lineMatch[3] ? lineMatch[3].trim() : '';
      const rawRange = lineMatch[4] ? lineMatch[4].trim() : null;

      // Filter out non-test false positives (e.g. "Page 1", "Room 402", "Sample 12")
      if (!/^(page|room|sample|specimen|lab|id|mrn|visit|doctor|dr|patient|bill|reg|token|age|phone|sl|s\.no)$/i.test(rawTest)) {
        const { canonicalName } = normalizeTestName(rawTest);
        const evalResult = evaluateReferenceRange(rawVal, rawRange);

        if (!seenTests.has(canonicalName.toLowerCase())) {
          results.push({
            rawTestName: rawTest,
            canonicalName,
            observedValue: evalResult.numericValue,
            valueText: rawVal,
            unit: rawUnit,
            referenceRangeRaw: evalResult.referenceRangeRaw,
            rangeLow: evalResult.rangeLow,
            rangeHigh: evalResult.rangeHigh,
            status: evalResult.status,
            sourceType: 'AI-extracted',
            sourcePage,
            sourceSnippet: trimmed,
            verificationStatus: 'Requires verification'
          });
          seenTests.add(canonicalName.toLowerCase());
        }
      }
    }
  }

  return results;
}
