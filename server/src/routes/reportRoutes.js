import express from 'express';
import { db } from '../db/database.js';
import { uploadMiddleware } from '../middleware/uploadValidator.js';
import { parseDocument } from '../services/documentParser.js';
import { extractLabResults, extractReportDate, categorizeReport, extractObservations } from '../services/clinicalExtractor.js';
import { detectConflicts } from '../services/conflictDetector.js';
import { generateClarificationQuestions } from '../services/clarificationEngine.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

const router = express.Router();

// Cached prepared statements
let stmts = null;
function getStatements() {
  if (!stmts) {
    stmts = {
      getReportsByPatient: db.prepare('SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at DESC'),
      getPatientById: db.prepare('SELECT * FROM patients WHERE id = ?'),
      insertReport: db.prepare(`
        INSERT INTO reports (id, patient_id, filename, category, report_date, raw_text, file_type, is_previous, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `),
      insertResult: db.prepare(`
        INSERT INTO lab_results (id, report_id, patient_id, canonical_name, raw_test_name, observed_value, value_text, unit, reference_range_raw, range_low, range_high, status, source_type, source_page, source_snippet, verification_status, verified_by, verified_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AI-extracted', 1, ?, 'Requires verification', NULL, NULL, datetime('now'))
      `),
      getAllReportsForPatient: db.prepare('SELECT * FROM reports WHERE patient_id = ?'),
      getAllResultsForPatient: db.prepare('SELECT * FROM lab_results WHERE patient_id = ?'),
      insertConflict: db.prepare(`
        INSERT OR IGNORE INTO conflicts (id, patient_id, title, description, source_a, source_b, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Unresolved', datetime('now'))
      `),
      insertClarification: db.prepare(`
        INSERT OR IGNORE INTO clarifications (id, patient_id, question, context_field, user_response, created_at)
        VALUES (?, ?, ?, ?, '', datetime('now'))
      `),
      getReportById: db.prepare('SELECT * FROM reports WHERE id = ?'),
      deleteLabResultsByReportId: db.prepare('DELETE FROM lab_results WHERE report_id = ?'),
      deleteReportById: db.prepare('DELETE FROM reports WHERE id = ?')
    };
  }
  return stmts;
}

// GET all reports for a patient
router.get('/patient/:patientId', (req, res) => {
  try {
    const s = getStatements();
    const reports = s.getReportsByPatient.all(req.params.patientId);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process pasted text or uploaded document
async function processReportPipeline({ patientId, filename, rawText, fileType, isPrevious = false }) {
  // Step 1: Input validation
  if (!patientId) throw new Error('Patient ID is required.');
  if (!rawText || !rawText.trim()) throw new Error('Report text is empty or could not be extracted.');

  const s = getStatements();
  const patient = s.getPatientById.get(patientId);
  if (!patient) throw new Error(`Patient with ID "${patientId}" does not exist.`);

  // Step 2: Extraction & Categorization
  const reportDate = extractReportDate(rawText) || new Date().toISOString().split('T')[0];
  const category = categorizeReport(rawText);
  const observations = extractObservations(rawText);

  // Step 3 & 4: Clinical NER Extraction & Normalization
  const reportId = `rep-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
  const extractedResults = extractLabResults(rawText, filename, 1);

  // Step 5 & 6: Save Report and Extracted Results atomically in a single transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    s.insertReport.run(
      reportId,
      patientId,
      filename,
      category,
      reportDate,
      rawText,
      fileType,
      isPrevious ? 1 : 0
    );

    for (let i = 0; i < extractedResults.length; i++) {
      const item = extractedResults[i];
      const resId = `res-${Date.now()}-${i}-${Math.round(Math.random() * 1e4)}`;
      s.insertResult.run(
        resId,
        reportId,
        patientId,
        item.canonicalName,
        item.rawTestName,
        item.observedValue,
        item.valueText,
        item.unit,
        item.referenceRangeRaw,
        item.rangeLow,
        item.rangeHigh,
        item.status,
        item.sourceSnippet
      );
    }
    db.exec('COMMIT;');
  } catch (txErr) {
    db.exec('ROLLBACK;');
    throw txErr;
  }

  // Step 7: Cross-source Conflict Detection
  const allReports = s.getAllReportsForPatient.all(patientId);
  const allResults = s.getAllResultsForPatient.all(patientId);
  const detectedConflicts = detectConflicts(patient, allReports, allResults);

  if (detectedConflicts.length > 0) {
    db.exec('BEGIN TRANSACTION;');
    try {
      for (let i = 0; i < detectedConflicts.length; i++) {
        const conf = detectedConflicts[i];
        s.insertConflict.run(conf.id, patientId, conf.title, conf.description, conf.sourceA, conf.sourceB);
      }
      db.exec('COMMIT;');
    } catch (confErr) {
      db.exec('ROLLBACK;');
      throw confErr;
    }
  }

  // Step 8: Clarification Inquiry Generation
  const clarifications = generateClarificationQuestions(patient, allResults);
  if (clarifications.length > 0) {
    db.exec('BEGIN TRANSACTION;');
    try {
      for (let i = 0; i < clarifications.length; i++) {
        const q = clarifications[i];
        s.insertClarification.run(q.id, patientId, q.question, q.contextField);
      }
      db.exec('COMMIT;');
    } catch (clarifyErr) {
      db.exec('ROLLBACK;');
      throw clarifyErr;
    }
  }

  logAuditEvent({
    action: AUDIT_ACTIONS.UPLOAD_REPORT,
    resourceType: 'Report',
    resourceId: reportId,
    details: `Medical report "${filename}" processed. Extracted ${extractedResults.length} parameter(s), category: ${category}.`
  });

  return {
    reportId,
    filename,
    category,
    reportDate,
    extractedCount: extractedResults.length,
    observationsCount: observations.length,
    extractedResults,
    pipelineStagesCompleted: [
      'Input Validation',
      'Clinical Entity Extraction',
      'Data Type & Value Validation',
      'Terminology Normalization',
      'Reference Range Analysis',
      'Conflict Detection',
      'Clarification Generation'
    ]
  };
}

// POST paste report text
router.post('/paste', async (req, res) => {
  try {
    const { patientId, text, filename = 'Pasted_Clinical_Report.txt', isPrevious = false } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Please enter report text to process.' });
    }

    const doc = await parseDocument({ text });
    const result = await processReportPipeline({
      patientId,
      filename,
      rawText: doc.rawText,
      fileType: 'text',
      isPrevious: Boolean(isPrevious)
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[ReportRoute] Error processing pasted report:', err);
    res.status(500).json({ error: err.message || 'Failed to process report text.' });
  }
});

// POST upload file (PDF, JPG, PNG, TXT)
router.post('/upload', uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No report file was uploaded.' });
    }

    const { patientId, isPrevious = 'false' } = req.body;
    const doc = await parseDocument({
      filePath: req.file.path,
      mimeType: req.file.mimetype
    });

    const result = await processReportPipeline({
      patientId,
      filename: req.file.originalname,
      rawText: doc.rawText,
      fileType: doc.format,
      isPrevious: isPrevious === 'true' || isPrevious === true
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[ReportRoute] Error uploading report:', err);
    res.status(500).json({ error: err.message || 'File upload and extraction failed.' });
  }
});

// DELETE report and cascade lab results
router.delete('/:id', (req, res) => {
  try {
    const reportId = req.params.id;
    const s = getStatements();
    const report = s.getReportById.get(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      s.deleteLabResultsByReportId.run(reportId);
      s.deleteReportById.run(reportId);
      db.exec('COMMIT;');
    } catch (delErr) {
      db.exec('ROLLBACK;');
      throw delErr;
    }

    logAuditEvent({
      action: AUDIT_ACTIONS.DELETE_REPORT,
      resourceType: 'Report',
      resourceId: reportId,
      details: `Report "${report.filename}" and its extracted laboratory results removed.`
    });

    res.json({ success: true, message: 'Report deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
