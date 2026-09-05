import { db } from './database.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

/**
 * Seeds a comprehensive synthetic patient into the database.
 * Demonstrates all critical features:
 * - Normal results
 * - Below reported range
 * - Above reported range
 * - Missing reference range (Not determined)
 * - Source provenance & evidence snippets
 * - Human-verified vs Requires verification
 * - Cross-source conflict
 * - Longitudinal comparison (Previous vs Current reports)
 * - 3-5 Clarification questions
 */
export function seedDemoPatient() {
  const patientId = 'demo-patient-alex-mercer';
  const userId = 'clinician-demo';

  // 1. Clear previous demo data if any
  db.prepare('DELETE FROM patients WHERE id = ?').run(patientId);
  db.prepare('DELETE FROM reports WHERE patient_id = ?').run(patientId);
  db.prepare('DELETE FROM lab_results WHERE patient_id = ?').run(patientId);
  db.prepare('DELETE FROM conflicts WHERE patient_id = ?').run(patientId);
  db.prepare('DELETE FROM clarifications WHERE patient_id = ?').run(patientId);

  // 2. Insert Patient Intake (User-provided)
  db.prepare(`
    INSERT INTO patients (id, user_id, name, age, sex, symptoms, conditions, allergies, medications, notes, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', '-7 days'), datetime('now'))
  `).run(
    patientId,
    userId,
    'Alex J. Mercer (DEMO)',
    48,
    'Male',
    'Persistent fatigue and exertional shortness of breath for past 3 weeks; occasional mild morning headaches.',
    'Essential Hypertension (mild)',
    'No known drug allergies (NKDA)',
    'Amlodipine 5 mg once daily',
    'Routine follow-up requested by primary physician. Fasting status maintained prior to morning blood collection.'
  );

  // 3. Insert Previous Report (6 months ago)
  const prevReportId = 'demo-report-prev-2024';
  const prevReportDate = '2024-03-15';
  const prevRawText = `METROPOLITAN CLINICAL LABORATORIES
PATIENT: Alex J. Mercer (DEMO)    AGE: 47   SEX: Male
DATE OF COLLECTION: 2024-03-15    SPECIMEN: Blood
ORDERING PHYSICIAN: Dr. S. Patel, MD

HEMATOLOGY PANEL:
Hemoglobin: 11.1 g/dL (Reference: 13.0 - 17.0 g/dL)
White Blood Cell Count: 7,200 /µL (Reference: 4000 - 10000 /µL)
Platelet Count: 230,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)

BIOCHEMISTRY:
Fasting Blood Glucose: 92 mg/dL (Reference: 70 - 99 mg/dL)
Serum Creatinine: 0.9 mg/dL (Reference: 0.7 - 1.3 mg/dL)

CLINICAL NOTES:
Patient baseline evaluation. Hemoglobin mildly reduced.`;

  db.prepare(`
    INSERT INTO reports (id, patient_id, filename, category, report_date, raw_text, file_type, is_previous, created_at)
    VALUES (?, ?, ?, 'Blood', ?, ?, 'text', 1, datetime('now', '-180 days'))
  `).run(
    prevReportId,
    patientId,
    'Baseline_Lab_Report_March.txt',
    prevReportDate,
    prevRawText
  );

  // Insert Previous Lab Results
  const prevResults = [
    {
      id: 'demo-prev-res-1',
      raw: 'Hemoglobin: 11.1 g/dL (Reference: 13.0 - 17.0 g/dL)',
      canon: 'Hemoglobin',
      val: 11.1,
      valText: '11.1',
      unit: 'g/dL',
      rangeRaw: '13.0 - 17.0',
      low: 13.0,
      high: 17.0,
      status: 'Below reported range',
      snippet: 'Hemoglobin: 11.1 g/dL (Reference: 13.0 - 17.0 g/dL)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. S. Patel, MD'
    },
    {
      id: 'demo-prev-res-2',
      raw: 'White Blood Cell Count: 7,200 /µL (Reference: 4000 - 10000 /µL)',
      canon: 'White Blood Cell Count',
      val: 7200,
      valText: '7,200',
      unit: '/µL',
      rangeRaw: '4000 - 10000',
      low: 4000,
      high: 10000,
      status: 'Within reported range',
      snippet: 'White Blood Cell Count: 7,200 /µL (Reference: 4000 - 10000 /µL)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. S. Patel, MD'
    },
    {
      id: 'demo-prev-res-3',
      raw: 'Platelet Count: 230,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)',
      canon: 'Platelet Count',
      val: 230000,
      valText: '230,000',
      unit: '/cu.mm',
      rangeRaw: '150000 - 450000',
      low: 150000,
      high: 450000,
      status: 'Within reported range',
      snippet: 'Platelet Count: 230,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. S. Patel, MD'
    },
    {
      id: 'demo-prev-res-4',
      raw: 'Fasting Blood Glucose: 92 mg/dL (Reference: 70 - 99 mg/dL)',
      canon: 'Fasting Blood Glucose',
      val: 92,
      valText: '92',
      unit: 'mg/dL',
      rangeRaw: '70 - 99',
      low: 70,
      high: 99,
      status: 'Within reported range',
      snippet: 'Fasting Blood Glucose: 92 mg/dL (Reference: 70 - 99 mg/dL)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. S. Patel, MD'
    },
    {
      id: 'demo-prev-res-5',
      raw: 'Serum Creatinine: 0.9 mg/dL (Reference: 0.7 - 1.3 mg/dL)',
      canon: 'Serum Creatinine',
      val: 0.9,
      valText: '0.9',
      unit: 'mg/dL',
      rangeRaw: '0.7 - 1.3',
      low: 0.7,
      high: 1.3,
      status: 'Within reported range',
      snippet: 'Serum Creatinine: 0.9 mg/dL (Reference: 0.7 - 1.3 mg/dL)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. S. Patel, MD'
    }
  ];

  for (const r of prevResults) {
    db.prepare(`
      INSERT INTO lab_results (id, report_id, patient_id, canonical_name, raw_test_name, observed_value, value_text, unit, reference_range_raw, range_low, range_high, status, source_type, source_page, source_snippet, verification_status, verified_by, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AI-extracted', 1, ?, ?, ?, datetime('now', '-180 days'), datetime('now', '-180 days'))
    `).run(r.id, prevReportId, patientId, r.canon, r.raw, r.val, r.valText, r.unit, r.rangeRaw, r.low, r.high, r.status, r.snippet, r.verStatus, r.verifiedBy);
  }

  // 4. Insert Current Report (Recent)
  const currReportId = 'demo-report-curr-2024';
  const currReportDate = '2024-09-02';
  const currRawText = `METROPOLITAN CLINICAL LABORATORIES
PATIENT: Alex J. Mercer (DEMO)    AGE: 48   SEX: Male
DATE OF COLLECTION: 2024-09-02    SPECIMEN: Whole Blood & Serum
ORDERING PHYSICIAN: Dr. Evelyn Reed, MD

COMPLETE BLOOD COUNT (CBC):
Hemoglobin 10.2 g/dL (Reference: 13.0 - 17.0 g/dL)
White Blood Cell Count: 8,100 /µL (Reference: 4000 - 10000 /µL)
Platelet Count: 245,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)

BIOCHEMISTRY & LIPIDS:
Fasting Blood Glucose: 145 mg/dL (Reference: 70 - 99 mg/dL)
Total Cholesterol 238 mg/dL (Reference: < 200 mg/dL)
Serum Creatinine: 1.0 mg/dL (Reference: 0.7 - 1.3 mg/dL)

INFLAMMATORY MARKER:
Erythrocyte Sedimentation Rate 22 mm/hr

CLINICAL OBSERVATIONS & NOTES:
Patient reports ongoing fatigue. Fasting confirmed.
Historical Chart Note: Prior documentation indicates allergic cutaneous reaction to Penicillin V in 2021.`;

  db.prepare(`
    INSERT INTO reports (id, patient_id, filename, category, report_date, raw_text, file_type, is_previous, created_at)
    VALUES (?, ?, ?, 'Blood', ?, ?, 'text', 0, datetime('now', '-3 days'))
  `).run(
    currReportId,
    patientId,
    'Current_Comprehensive_Lab_Report_Sept.txt',
    currReportDate,
    currRawText
  );

  // Insert Current Lab Results (showing normal, below range, above range, missing range, verified, requires verification)
  const currResults = [
    {
      id: 'demo-curr-res-1',
      raw: 'Hemoglobin 10.2 g/dL (Reference: 13.0 - 17.0 g/dL)',
      canon: 'Hemoglobin',
      val: 10.2,
      valText: '10.2',
      unit: 'g/dL',
      rangeRaw: '13.0 - 17.0',
      low: 13.0,
      high: 17.0,
      status: 'Below reported range',
      snippet: 'Hemoglobin 10.2 g/dL (Reference: 13.0 - 17.0 g/dL)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. Evelyn Reed, MD'
    },
    {
      id: 'demo-curr-res-2',
      raw: 'White Blood Cell Count: 8,100 /µL (Reference: 4000 - 10000 /µL)',
      canon: 'White Blood Cell Count',
      val: 8100,
      valText: '8,100',
      unit: '/µL',
      rangeRaw: '4000 - 10000',
      low: 4000,
      high: 10000,
      status: 'Within reported range',
      snippet: 'White Blood Cell Count: 8,100 /µL (Reference: 4000 - 10000 /µL)',
      verStatus: 'Requires verification',
      verifiedBy: null
    },
    {
      id: 'demo-curr-res-3',
      raw: 'Platelet Count: 245,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)',
      canon: 'Platelet Count',
      val: 245000,
      valText: '245,000',
      unit: '/cu.mm',
      rangeRaw: '150000 - 450000',
      low: 150000,
      high: 450000,
      status: 'Within reported range',
      snippet: 'Platelet Count: 245,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)',
      verStatus: 'Requires verification',
      verifiedBy: null
    },
    {
      id: 'demo-curr-res-4',
      raw: 'Fasting Blood Glucose: 145 mg/dL (Reference: 70 - 99 mg/dL)',
      canon: 'Fasting Blood Glucose',
      val: 145,
      valText: '145',
      unit: 'mg/dL',
      rangeRaw: '70 - 99',
      low: 70,
      high: 99,
      status: 'Above reported range',
      snippet: 'Fasting Blood Glucose: 145 mg/dL (Reference: 70 - 99 mg/dL)',
      verStatus: 'Requires verification',
      verifiedBy: null
    },
    {
      id: 'demo-curr-res-5',
      raw: 'Total Cholesterol 238 mg/dL (Reference: < 200 mg/dL)',
      canon: 'Total Cholesterol',
      val: 238,
      valText: '238',
      unit: 'mg/dL',
      rangeRaw: '< 200',
      low: null,
      high: 200,
      status: 'Above reported range',
      snippet: 'Total Cholesterol 238 mg/dL (Reference: < 200 mg/dL)',
      verStatus: 'Requires verification',
      verifiedBy: null
    },
    {
      id: 'demo-curr-res-6',
      raw: 'Serum Creatinine: 1.0 mg/dL (Reference: 0.7 - 1.3 mg/dL)',
      canon: 'Serum Creatinine',
      val: 1.0,
      valText: '1.0',
      unit: 'mg/dL',
      rangeRaw: '0.7 - 1.3',
      low: 0.7,
      high: 1.3,
      status: 'Within reported range',
      snippet: 'Serum Creatinine: 1.0 mg/dL (Reference: 0.7 - 1.3 mg/dL)',
      verStatus: 'Human-verified',
      verifiedBy: 'Dr. Evelyn Reed, MD'
    },
    {
      id: 'demo-curr-res-7',
      raw: 'Erythrocyte Sedimentation Rate 22 mm/hr',
      canon: 'Erythrocyte Sedimentation Rate',
      val: 22,
      valText: '22',
      unit: 'mm/hr',
      rangeRaw: null,
      low: null,
      high: null,
      status: 'Not determined',
      snippet: 'Erythrocyte Sedimentation Rate 22 mm/hr',
      verStatus: 'Requires verification',
      verifiedBy: null
    }
  ];

  for (const r of currResults) {
    db.prepare(`
      INSERT INTO lab_results (id, report_id, patient_id, canonical_name, raw_test_name, observed_value, value_text, unit, reference_range_raw, range_low, range_high, status, source_type, source_page, source_snippet, verification_status, verified_by, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AI-extracted', 1, ?, ?, ?, ?, datetime('now', '-3 days'))
    `).run(r.id, currReportId, patientId, r.canon, r.raw, r.val, r.valText, r.unit, r.rangeRaw, r.low, r.high, r.status, r.snippet, r.verStatus, r.verifiedBy, r.verifiedBy ? new Date().toISOString() : null);
  }

  // 5. Insert Conflict (Allergy Intake vs Lab Clinical Notes)
  db.prepare(`
    INSERT INTO conflicts (id, patient_id, title, description, source_a, source_b, status, resolution_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Unresolved', NULL, datetime('now', '-3 days'))
  `).run(
    'demo-conflict-allergy-1',
    patientId,
    'Allergy Documentation Discrepancy: Penicillin',
    'Patient intake form explicitly records "No known drug allergies (NKDA)". However, current laboratory report notes historical cutaneous allergy reaction to Penicillin V in 2021.',
    'User-provided Patient Intake: "No known drug allergies (NKDA)"',
    'AI-extracted from Current_Comprehensive_Lab_Report_Sept.txt: "Historical Chart Note: Prior documentation indicates allergic cutaneous reaction to Penicillin V in 2021."'
  );

  // 6. Insert Clarification Questions
  const demoClarifications = [
    {
      id: 'demo-clarify-1',
      question: 'Regarding the reported symptom ("Persistent fatigue"): Does this fatigue worsen at specific times of the day, or is it accompanied by sleep disturbances?',
      field: 'Symptoms / Concerns',
      response: 'Mainly worsens in the late afternoon; sleep duration is about 6 hours with occasional nighttime waking.'
    },
    {
      id: 'demo-clarify-2',
      question: 'For the documented Penicillin reaction in historical records: Was the cutaneous reaction an immediate hive/anaphylactic response or a delayed rash?',
      field: 'Known Allergies',
      response: ''
    },
    {
      id: 'demo-clarify-3',
      question: 'The laboratory report did not include a reference range for Erythrocyte Sedimentation Rate (ESR). Has the testing laboratory provided an age-adjusted normative range sheet?',
      field: 'Laboratory Results',
      response: ''
    },
    {
      id: 'demo-clarify-4',
      question: 'Fasting Blood Glucose is recorded at 145 mg/dL. Was a strict 8-to-12 hour fasting window observed prior to this blood draw?',
      field: 'Laboratory Results',
      response: 'Yes, approximately 10 hours overnight fasting was completed before 8:30 AM collection.'
    }
  ];

  for (const c of demoClarifications) {
    db.prepare(`
      INSERT INTO clarifications (id, patient_id, question, context_field, user_response, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'))
    `).run(c.id, patientId, c.question, c.field, c.response);
  }

  logAuditEvent({
    action: AUDIT_ACTIONS.LOAD_DEMO,
    userId,
    resourceType: 'Patient',
    resourceId: patientId,
    details: 'Synthetic demo patient record initialized with complete verification and comparison suite.'
  });

  console.log('[SeedDemo] Synthetic demo patient Alex J. Mercer loaded successfully.');
  return patientId;
}
