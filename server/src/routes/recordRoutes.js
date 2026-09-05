import express from 'express';
import { db } from '../db/database.js';
import { evaluateReferenceRange } from '../services/referenceRangeAnalyzer.js';
import { compareLabResults } from '../services/longitudinalComparator.js';
import { generateClinicalSummary } from '../services/aiSummaryEngine.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

const router = express.Router();

// Cached prepared statements
let stmts = null;
function getStatements() {
  if (!stmts) {
    stmts = {
      getPatient: db.prepare('SELECT * FROM patients WHERE id = ?'),
      getReportsDesc: db.prepare('SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at DESC'),
      getReportsAsc: db.prepare('SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at ASC'),
      getLabResultsForRecord: db.prepare(`
        SELECT lr.*, r.filename as report_filename, r.report_date, r.is_previous
        FROM lab_results lr
        LEFT JOIN reports r ON lr.report_id = r.id
        WHERE lr.patient_id = ?
        ORDER BY r.is_previous ASC, lr.created_at DESC
      `),
      getLabResultsAsc: db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY created_at ASC'),
      getConflictsDesc: db.prepare('SELECT * FROM conflicts WHERE patient_id = ? ORDER BY created_at DESC'),
      getClarificationsAsc: db.prepare('SELECT * FROM clarifications WHERE patient_id = ? ORDER BY created_at ASC'),
      getLabResultById: db.prepare('SELECT * FROM lab_results WHERE id = ?'),
      updateLabResultReview: db.prepare(`
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
      `),
      getConflictById: db.prepare('SELECT * FROM conflicts WHERE id = ?'),
      updateConflict: db.prepare(`
        UPDATE conflicts
        SET status = ?, resolution_notes = ?
        WHERE id = ?
      `),
      getClarificationById: db.prepare('SELECT * FROM clarifications WHERE id = ?'),
      updateClarification: db.prepare(`
        UPDATE clarifications
        SET user_response = ?
        WHERE id = ?
      `)
    };
  }
  return stmts;
}

// GET complete structured medical record for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const s = getStatements();
    const patient = s.getPatient.get(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const reports = s.getReportsDesc.all(patientId);
    const labResults = s.getLabResultsForRecord.all(patientId);
    const conflicts = s.getConflictsDesc.all(patientId);
    const clarifications = s.getClarificationsAsc.all(patientId);

    // Single-pass partition: current vs previous results
    const currentResults = [];
    const previousResults = [];
    for (let i = 0; i < labResults.length; i++) {
      if (labResults[i].is_previous) {
        previousResults.push(labResults[i]);
      } else {
        currentResults.push(labResults[i]);
      }
    }

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

    // Single-pass stats aggregation
    let withinRangeCount = 0;
    let belowRangeCount = 0;
    let aboveRangeCount = 0;
    let notDeterminedCount = 0;
    let verifiedCount = 0;
    let requiresVerificationCount = 0;

    for (let i = 0; i < currentResults.length; i++) {
      const r = currentResults[i];
      if (r.status === 'Within reported range') withinRangeCount++;
      else if (r.status === 'Below reported range') belowRangeCount++;
      else if (r.status === 'Above reported range') aboveRangeCount++;
      else if (r.status === 'Not determined') notDeterminedCount++;

      if (r.verification_status === 'Human-verified') verifiedCount++;
      else if (r.verification_status === 'Requires verification') requiresVerificationCount++;
    }

    let unresolvedConflictsCount = 0;
    for (let i = 0; i < conflicts.length; i++) {
      if (conflicts[i].status === 'Unresolved') unresolvedConflictsCount++;
    }

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
        withinRangeCount,
        belowRangeCount,
        aboveRangeCount,
        notDeterminedCount,
        verifiedCount,
        requiresVerificationCount,
        unresolvedConflictsCount
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

    const s = getStatements();
    const existing = s.getLabResultById.get(id);
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

    s.updateLabResultReview.run(
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

    const updated = s.getLabResultById.get(id);
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

    const s = getStatements();
    s.updateConflict.run(status, resolutionNotes || '', id);

    logAuditEvent({
      action: AUDIT_ACTIONS.RESOLVE_CONFLICT,
      resourceType: 'Conflict',
      resourceId: id,
      details: `Documentation conflict marked as ${status}.`
    });

    const updated = s.getConflictById.get(id);
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

    const s = getStatements();
    s.updateClarification.run(response || '', id);

    logAuditEvent({
      action: AUDIT_ACTIONS.ANSWER_CLARIFICATION,
      resourceType: 'Clarification',
      resourceId: id,
      details: 'Response submitted for clarification inquiry.'
    });

    const updated = s.getClarificationById.get(id);
    res.json({ success: true, clarification: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chronological timeline events
router.get('/timeline/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    const s = getStatements();
    const patient = s.getPatient.get(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const reports = s.getReportsAsc.all(patientId);
    const labResults = s.getLabResultsAsc.all(patientId);

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
    for (let i = 0; i < reports.length; i++) {
      const rep = reports[i];
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
    for (let i = 0; i < labResults.length; i++) {
      const resItem = labResults[i];
      if (resItem.status === 'Below reported range' || resItem.status === 'Above reported range') {
        timeline.push({
          id: `tl-res-${resItem.id}`,
          date: resItem.created_at,
          title: `Reported Lab Variance: ${resItem.canonical_name}`,
          category: 'Laboratory Finding',
          description: `Observed ${resItem.observed_value} ${resItem.unit} is ${resItem.status.toLowerCase()} (Reported Range: ${resItem.reference_range_raw}).`,
          sourceType: resItem.source_type
        });
      }
      if (resItem.verification_status === 'Human-verified') {
        timeline.push({
          id: `tl-ver-${resItem.id}`,
          date: resItem.verified_at || resItem.created_at,
          title: `Result Human-Verified: ${resItem.canonical_name}`,
          category: 'Human Verification',
          description: `Verified by ${resItem.verified_by || 'Clinician'}.`,
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
