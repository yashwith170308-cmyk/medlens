import assert from 'node:assert';
import { normalizeTestName } from '../src/services/terminologyNormalizer.js';
import { evaluateReferenceRange, parseReferenceRange } from '../src/services/referenceRangeAnalyzer.js';
import { extractLabResults, extractReportDate, categorizeReport } from '../src/services/clinicalExtractor.js';
import { detectConflicts } from '../src/services/conflictDetector.js';
import { compareLabResults } from '../src/services/longitudinalComparator.js';
import { generateClinicalSummary, MANDATORY_DISCLAIMER } from '../src/services/aiSummaryEngine.js';

console.log('--- Running MedLens Core Engine Unit Tests ---\n');

// Test 1: Terminology Normalization
console.log('1. Testing Terminology Normalization...');
assert.strictEqual(normalizeTestName('hb').canonicalName, 'Hemoglobin');
assert.strictEqual(normalizeTestName('HGB').canonicalName, 'Hemoglobin');
assert.strictEqual(normalizeTestName('Total Leucocyte Count').canonicalName, 'White Blood Cell Count');
assert.strictEqual(normalizeTestName('PLT').canonicalName, 'Platelet Count');
assert.strictEqual(normalizeTestName('FBS').canonicalName, 'Fasting Blood Glucose');
console.log('✓ Terminology Normalization passed.');

// Test 2: Reference Range Analyzer (Deterministic, Never Hallucinate)
console.log('\n2. Testing Deterministic Reference Range Evaluation...');
// Below range
const resBelow = evaluateReferenceRange(10.2, '13.0 - 17.0');
assert.strictEqual(resBelow.status, 'Below reported range');
assert.strictEqual(resBelow.rangeLow, 13.0);
assert.strictEqual(resBelow.rangeHigh, 17.0);

// Within range
const resWithin = evaluateReferenceRange(8100, '4000 - 10000');
assert.strictEqual(resWithin.status, 'Within reported range');

// Above range
const resAbove = evaluateReferenceRange(145, '70 - 99');
assert.strictEqual(resAbove.status, 'Above reported range');

// Less-than bound (< 200)
const resUpperOnly = evaluateReferenceRange(238, '< 200');
assert.strictEqual(resUpperOnly.status, 'Above reported range');

// Greater-than bound (> 60)
const resLowerOnly = evaluateReferenceRange(45, '> 60');
assert.strictEqual(resLowerOnly.status, 'Below reported range');

// Missing reference range: MUST BE 'Not determined', NEVER fabricated!
const resMissing = evaluateReferenceRange(22, null);
assert.strictEqual(resMissing.status, 'Not determined');
assert.strictEqual(resMissing.rangeLow, null);
assert.strictEqual(resMissing.rangeHigh, null);

const resEmpty = evaluateReferenceRange(15, '');
assert.strictEqual(resEmpty.status, 'Not determined');
console.log('✓ Reference Range Evaluation passed (Zero hallucinated ranges).');

// Test 3: Clinical Entity Extraction
console.log('\n3. Testing Clinical Entity Extraction...');
const sampleReportText = `
PATIENT: Alex Mercer
DATE: 2024-09-02
Hemoglobin 10.2 g/dL 13.0 - 17.0
White Blood Cell Count: 8,100 /µL (4000 - 10000)
Fasting Blood Sugar: 145 mg/dL Ref: 70 - 99
Erythrocyte Sedimentation Rate 22 mm/hr
`;
const extracted = extractLabResults(sampleReportText);
assert.strictEqual(extracted.length >= 4, true);
assert.strictEqual(extracted.some(r => r.canonicalName === 'Hemoglobin' && r.status === 'Below reported range'), true);
assert.strictEqual(extracted.some(r => r.canonicalName === 'Erythrocyte Sedimentation Rate' && r.status === 'Not determined'), true);
assert.strictEqual(extractReportDate(sampleReportText), '2024-09-02');
console.log('✓ Clinical Entity Extraction passed.');

// Test 4: Conflict Detection
console.log('\n4. Testing Conflict & Inconsistency Detection...');
const mockPatient = {
  name: 'Test Patient',
  allergies: 'No known drug allergies (NKDA)',
  conditions: 'None'
};
const mockReports = [{
  id: 'rep-1',
  filename: 'Report.txt',
  raw_text: 'Clinical note: Patient experienced allergic rash to Penicillin V in 2021.'
}];
const conflicts = detectConflicts(mockPatient, mockReports, []);
assert.strictEqual(conflicts.length, 1);
assert.strictEqual(conflicts[0].status, 'Unresolved');
assert.strictEqual(conflicts[0].title.includes('Allergy'), true);
console.log('✓ Conflict Detection passed.');

// Test 5: Longitudinal Comparison
console.log('\n5. Testing Longitudinal Comparison...');
const currentLabs = [
  { canonical_name: 'Hemoglobin', observed_value: 10.2, unit: 'g/dL', status: 'Below reported range' },
  { canonical_name: 'White Blood Cell Count', observed_value: 8100, unit: '/µL', status: 'Within reported range' }
];
const previousLabs = [
  { canonical_name: 'Hemoglobin', observed_value: 11.1, unit: 'g/dL', status: 'Below reported range' },
  { canonical_name: 'White Blood Cell Count', observed_value: 7200, unit: '/µL', status: 'Within reported range' }
];
const comparison = compareLabResults(currentLabs, previousLabs);
const hbComp = comparison.find(c => c.parameter === 'Hemoglobin');
assert.strictEqual(hbComp.delta, -0.9);
assert.strictEqual(hbComp.direction, 'down');
assert.strictEqual(hbComp.changeText.includes('↓ 0.9'), true);

const wbcComp = comparison.find(c => c.parameter === 'White Blood Cell Count');
assert.strictEqual(wbcComp.delta, 900);
assert.strictEqual(wbcComp.direction, 'up');
assert.strictEqual(wbcComp.changeText.includes('↑ 900'), true);
console.log('✓ Longitudinal Comparison passed.');

// Test 6: AI Summary Engine & Guardrails
console.log('\n6. Testing AI Summary Engine & Non-Doctor Guardrails...');
async function testSummary() {
  const summary = await generateClinicalSummary(mockPatient, currentLabs, conflicts, mockReports);
  assert.strictEqual(summary.disclaimer, MANDATORY_DISCLAIMER);
  assert.strictEqual(summary.evidenceStatements.length > 0, true);
  assert.strictEqual(summary.summaryText.includes('Hemoglobin'), true);
  console.log('✓ AI Summary Engine passed.');
}

await testSummary();

console.log('\n========================================');
console.log('ALL MEDLENS CORE TESTS PASSED (6/6)!');
console.log('========================================\n');
