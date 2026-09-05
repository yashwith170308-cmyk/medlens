import express from 'express';
import { db } from '../db/database.js';
import { evaluateReferenceRange } from '../services/referenceRangeAnalyzer.js';
import { compareLabResults } from '../services/longitudinalComparator.js';
import { generateClinicalSummary } from '../services/aiSummaryEngine.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

const router = express.Router();

// GET complete structured medical record for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const reports = db.prepare('SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
    const labResults = db.prepare(`
      SELECT lr.*, r.filename as report_filename, r.report_date, r.is_previous
      FROM lab_results lr
      LEFT JOIN reports r ON lr.report_id = r.id
      WHERE lr.patient_id = ?
      ORDER BY r.is_previous ASC, lr.created_at DESC
    `).all(patientId);

    const conflicts = db.prepare('SELECT * FROM conflicts WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
    const clarifications = db.prepare('SELECT * FROM clarifications WHERE patient_id = ? ORDER BY created_at ASC').all(patientId);

    // Filter current vs previous results
    const currentResults = labResults.filter(r => !r.is_previous);
    const previousResults = labResults.filter(r => r.is_previous);

    // Generate AI clinical summary with evidence bindings
    const aiSummary = await generateClinicalSummary(patient, currentResults, conflicts, reports);

    // Compute longitudinal comparison if previous results exist
    const comparison = compareLabResults(currentResults, previousResults);

    logAuditEvent({
      action: AUDIT_ACTIONS.VIEW_RECORD,
      resourceType: 'Patient',
      resourceId: patientId,
      details: 'Structured clinical record viewed.'
    });

    res.json({
      patient,
      reports,
      labResults,
      currentResults,
      previousResults,
      conflicts,
      clarifications,
      aiSummary,
      comparison,
      stats: {
        totalTests: currentResults.length,
        withinRangeCount: currentResults.filter(r => r.status === 'Within reported range').length,
        belowRangeCount: currentResults.filter(r => r.status === 'Below reported range').length,
        aboveRangeCount: currentResults.filter(r => r.status === 'Above reported range').length,
        notDeterminedCount: currentResults.filter(r => r.status === 'Not determined').length,
        verifiedCount: currentResults.filter(r => r.verification_status === 'Human-verified').length,
        requiresVerificationCount: currentResults.filter(r => r.verification_status === 'Requires verification').length,
        unresolvedConflictsCount: conflicts.filter(c => c.status === 'Unresolved').length
      }
    });
  } catch (err) {
    console.error('[RecordRoute] Error generating structured record:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve structured medical record.' });
  }
});

// PATCH human review of extracted lab result
router.patch('/results/:id/review', (req, res) => {
  try {
    const { id } = req.params;
    const {
      observedValue,
      unit,
      referenceRangeRaw,
      verificationStatus,
      verifiedBy = 'Clinician Reviewer'
    } = req.body;

    const existing = db.prepare('SELECT * FROM lab_results WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Laboratory result not found.' });
    }

    // Determine value to evaluate
    const finalVal = observedValue !== undefined ? observedValue : existing.observed_value;
    const finalRange = referenceRangeRaw !== undefined ? referenceRangeRaw : existing.reference_range_raw;
    const finalUnit = unit !== undefined ? unit : existing.unit;
    const finalStatus = verificationStatus || existing.verification_status;

    // Re-evaluate reference range deterministically if value or range changed
    const evalResult = evaluateReferenceRange(finalVal, finalRange);

    db.prepare(`
      UPDATE lab_results
      SET observed_value = ?,
          value_text = ?,
          unit = ?,
          reference_range_raw = ?,
          range_low = ?,
          range_high = ?,
          status = ?,
          verification_status = ?,
          verified_by = ?,
          verified_at = ?
      WHERE id = ?
    `).run(
      evalResult.numericValue,
      String(finalVal),
      finalUnit,
      evalResult.referenceRangeRaw,
      evalResult.rangeLow,
      evalResult.rangeHigh,
      evalResult.status,
      finalStatus,
      finalStatus === 'Human-verified' ? verifiedBy : null,
      finalStatus === 'Human-verified' ? new Date().toISOString() : null,
      id
    );

    logAuditEvent({
      action: finalStatus === 'Human-verified' ? AUDIT_ACTIONS.VERIFY_RESULT : AUDIT_ACTIONS.EDIT_RESULT,
      resourceType: 'LabResult',
      resourceId: id,
      details: `Lab result ${existing.canonical_name} updated: status=${evalResult.status}, verification=${finalStatus}.`
    });

    const updated = db.prepare('SELECT * FROM lab_results WHERE id = ?').get(id);
    res.json({ success: true, labResult: updated });
  } catch (err) {
    console.error('[RecordRoute] Error in human review:', err);
    res.status(500).json({ error: err.message || 'Failed to update result verification.' });
  }
});

// PATCH conflict status / resolution
router.patch('/conflicts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!['Unresolved', 'Acknowledged', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Unresolved, Acknowledged, or Resolved.' });
    }

    db.prepare(`
      UPDATE conflicts
      SET status = ?, resolution_notes = ?
      WHERE id = ?
    `).run(status, resolutionNotes || '', id);

    logAuditEvent({
      action: AUDIT_ACTIONS.RESOLVE_CONFLICT,
      resourceType: 'Conflict',
      resourceId: id,
      details: `Documentation conflict marked as ${status}.`
    });

    const updated = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(id);
    res.json({ success: true, conflict: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH clarification response
router.patch('/clarifications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    db.prepare(`
      UPDATE clarifications
      SET user_response = ?
      WHERE id = ?
    `).run(response || '', id);

    logAuditEvent({
      action: AUDIT_ACTIONS.ANSWER_CLARIFICATION,
      resourceType: 'Clarification',
      resourceId: id,
      details: 'Response submitted for clarification inquiry.'
    });

    const updated = db.prepare('SELECT * FROM clarifications WHERE id = ?').get(id);
    res.json({ success: true, clarification: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chronological timeline events
router.get('/timeline/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const reports = db.prepare('SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at ASC').all(patientId);
    const labResults = db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY created_at ASC').all(patientId);

    const timeline = [];

    // Patient intake event
    timeline.push({
      id: 'tl-intake',
      date: patient.created_at,
      title: 'Initial Patient Intake Registered',
      category: 'Intake',
      description: `Patient intake recorded. Symptoms: "${patient.symptoms || 'None'}", Conditions: "${patient.conditions || 'None'}".`,
      sourceType: 'User-provided'
    });

    // Report events
    for (const rep of reports) {
      timeline.push({
        id: `tl-rep-${rep.id}`,
        date: rep.report_date || rep.created_at,
        title: `Medical Report Uploaded: ${rep.filename}`,
        category: rep.category || 'Diagnostic Report',
        description: `Document processed (${rep.file_type.toUpperCase()}). Categorized under ${rep.category}.`,
        sourceType: 'AI-extracted'
      });
    }

    // Key abnormal / uncalibrated events
    for (const res of labResults) {
      if (res.status === 'Below reported range' || res.status === 'Above reported range') {
        timeline.push({
          id: `tl-res-${res.id}`,
          date: res.created_at,
          title: `Reported Lab Variance: ${res.canonical_name}`,
          category: 'Laboratory Finding',
          description: `Observed ${res.observed_value} ${res.unit} is ${res.status.toLowerCase()} (Reported Range: ${res.reference_range_raw}).`,
          sourceType: res.source_type
        });
      }
      if (res.verification_status === 'Human-verified') {
        timeline.push({
          id: `tl-ver-${res.id}`,
          date: res.verified_at || res.created_at,
          title: `Result Human-Verified: ${res.canonical_name}`,
          category: 'Human Verification',
          description: `Verified by ${res.verified_by || 'Clinician'}.`,
          sourceType: 'Human-verified'
        });
      }
    }

    // Sort chronologically
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
