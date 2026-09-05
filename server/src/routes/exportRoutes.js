import express from 'express';
import { db } from '../db/database.js';
import { generateClinicalSummary } from '../services/aiSummaryEngine.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

const router = express.Router();

// GET export as structured JSON
router.get('/:patientId/json', async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const reports = db.prepare('SELECT * FROM reports WHERE patient_id = ?').all(patientId);
    const labResults = db.prepare(`
      SELECT lr.*, r.filename as report_filename, r.report_date
      FROM lab_results lr
      LEFT JOIN reports r ON lr.report_id = r.id
      WHERE lr.patient_id = ?
    `).all(patientId);

    const conflicts = db.prepare('SELECT * FROM conflicts WHERE patient_id = ?').all(patientId);
    const clarifications = db.prepare('SELECT * FROM clarifications WHERE patient_id = ?').all(patientId);
    const aiSummary = await generateClinicalSummary(patient, labResults.filter(r => !r.is_previous), conflicts, reports);

    logAuditEvent({
      action: AUDIT_ACTIONS.EXPORT_RECORD,
      resourceType: 'Patient',
      resourceId: patientId,
      details: 'Patient clinical record exported as JSON.'
    });

    const exportPayload = {
      system: 'MedLens Clinical Information Intelligence',
      exportedAt: new Date().toISOString(),
      disclaimer: aiSummary.disclaimer,
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
        symptoms: patient.symptoms,
        conditions: patient.conditions,
        allergies: patient.allergies,
        medications: patient.medications,
        notes: patient.notes,
        sourceTag: 'User-provided'
      },
      reports: reports.map(r => ({
        id: r.id,
        filename: r.filename,
        category: r.category,
        date: r.report_date,
        fileType: r.file_type
      })),
      laboratoryResults: labResults.map(l => ({
        canonicalName: l.canonical_name,
        rawName: l.raw_test_name,
        value: l.observed_value,
        valueText: l.value_text,
        unit: l.unit,
        referenceRange: l.reference_range_raw,
        status: l.status,
        report: l.report_filename,
        date: l.report_date,
        sourceType: l.source_type,
        sourceSnippet: l.source_snippet,
        verificationStatus: l.verification_status,
        verifiedBy: l.verified_by
      })),
      conflicts,
      clarifications,
      aiSummary: {
        summaryText: aiSummary.summaryText,
        evidenceStatements: aiSummary.evidenceStatements,
        disclaimer: aiSummary.disclaimer
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="medlens-patient-${patient.id}.json"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export as CSV
router.get('/:patientId/csv', (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const results = db.prepare(`
      SELECT lr.*, r.filename as report_filename, r.report_date
      FROM lab_results lr
      LEFT JOIN reports r ON lr.report_id = r.id
      WHERE lr.patient_id = ?
      ORDER BY r.report_date DESC, lr.canonical_name ASC
    `).all(patientId);

    const headers = [
      'Canonical Parameter',
      'Raw Test Name',
      'Observed Value',
      'Unit',
      'Reference Range',
      'Calculated Status',
      'Report File',
      'Report Date',
      'Source Type',
      'Verification Status',
      'Verified By'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = results.map(r => [
      escapeCsv(r.canonical_name),
      escapeCsv(r.raw_test_name),
      escapeCsv(r.observed_value !== null ? r.observed_value : r.value_text),
      escapeCsv(r.unit),
      escapeCsv(r.reference_range_raw || 'None reported'),
      escapeCsv(r.status),
      escapeCsv(r.report_filename),
      escapeCsv(r.report_date),
      escapeCsv(r.source_type),
      escapeCsv(r.verification_status),
      escapeCsv(r.verified_by || 'Unverified')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    logAuditEvent({
      action: AUDIT_ACTIONS.EXPORT_RECORD,
      resourceType: 'Patient',
      resourceId: patientId,
      details: 'Laboratory findings exported as CSV.'
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="medlens-labs-${patient.id}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
