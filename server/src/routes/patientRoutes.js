import express from 'express';
import { db } from '../db/database.js';
import { seedDemoPatient } from '../db/seedDemo.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

const router = express.Router();

// Cached prepared statements
let stmts = null;
function getStatements() {
  if (!stmts) {
    stmts = {
      getCurrentPatient: db.prepare('SELECT * FROM patients ORDER BY updated_at DESC LIMIT 1'),
      getPatientById: db.prepare('SELECT * FROM patients WHERE id = ?'),
      getPatientExists: db.prepare('SELECT id FROM patients WHERE id = ?'),
      updatePatient: db.prepare(`
        UPDATE patients
        SET name = ?, age = ?, sex = ?, symptoms = ?, conditions = ?, allergies = ?, medications = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `),
      insertPatient: db.prepare(`
        INSERT INTO patients (id, user_id, name, age, sex, symptoms, conditions, allergies, medications, notes, is_demo, created_at, updated_at)
        VALUES (?, 'clinician-1', ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
      `),
      deleteLabResultsByPatient: db.prepare('DELETE FROM lab_results WHERE patient_id = ?'),
      deleteReportsByPatient: db.prepare('DELETE FROM reports WHERE patient_id = ?'),
      deleteConflictsByPatient: db.prepare('DELETE FROM conflicts WHERE patient_id = ?'),
      deleteClarificationsByPatient: db.prepare('DELETE FROM clarifications WHERE patient_id = ?'),
      deletePatientById: db.prepare('DELETE FROM patients WHERE id = ?')
    };
  }
  return stmts;
}

// GET current patient (or auto-seed demo if none exist)
router.get('/current', (req, res) => {
  try {
    const s = getStatements();
    let patient = s.getCurrentPatient.get();

    if (!patient) {
      const demoId = seedDemoPatient();
      patient = s.getPatientById.get(demoId);
    }

    res.json({ patient });
  } catch (err) {
    console.error('[PatientRoute] Error getting current patient:', err);
    res.status(500).json({ error: 'Failed to retrieve patient data.' });
  }
});

// GET patient by ID
router.get('/:id', (req, res) => {
  try {
    const s = getStatements();
    const patient = s.getPatientById.get(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create or update patient intake
router.post('/', (req, res) => {
  try {
    const {
      id,
      name,
      age,
      sex,
      symptoms,
      conditions,
      allergies,
      medications,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Patient name or identifier is required.' });
    }

    const patientId = id || `pt-${Date.now()}`;
    const parsedAge = parseInt(age, 10) || 0;
    const cleanSex = sex || 'Unspecified';

    const s = getStatements();
    const existing = s.getPatientExists.get(patientId);

    if (existing) {
      s.updatePatient.run(
        name.trim(),
        parsedAge,
        cleanSex,
        symptoms || '',
        conditions || '',
        allergies || '',
        medications || '',
        notes || '',
        patientId
      );

      logAuditEvent({
        action: AUDIT_ACTIONS.UPDATE_PATIENT,
        resourceType: 'Patient',
        resourceId: patientId,
        details: 'Patient intake details updated by clinician.'
      });
    } else {
      s.insertPatient.run(
        patientId,
        name.trim(),
        parsedAge,
        cleanSex,
        symptoms || '',
        conditions || '',
        allergies || '',
        medications || '',
        notes || ''
      );

      logAuditEvent({
        action: AUDIT_ACTIONS.CREATE_PATIENT,
        resourceType: 'Patient',
        resourceId: patientId,
        details: 'New patient record initialized via patient intake form.'
      });
    }

    const saved = s.getPatientById.get(patientId);
    res.json({ success: true, patient: saved });
  } catch (err) {
    console.error('[PatientRoute] Error saving patient:', err);
    res.status(500).json({ error: 'Failed to save patient intake form.' });
  }
});

// POST seed demo patient
router.post('/demo', (req, res) => {
  try {
    const s = getStatements();
    const demoId = seedDemoPatient();
    const patient = s.getPatientById.get(demoId);
    res.json({ success: true, patient, message: 'Synthetic demo patient loaded successfully.' });
  } catch (err) {
    console.error('[PatientRoute] Error seeding demo:', err);
    res.status(500).json({ error: 'Failed to load demo patient data.' });
  }
});

// DELETE patient and cascade
router.delete('/:id', (req, res) => {
  try {
    const patientId = req.params.id;
    const s = getStatements();

    db.exec('BEGIN TRANSACTION;');
    try {
      s.deleteLabResultsByPatient.run(patientId);
      s.deleteReportsByPatient.run(patientId);
      s.deleteConflictsByPatient.run(patientId);
      s.deleteClarificationsByPatient.run(patientId);
      s.deletePatientById.run(patientId);
      db.exec('COMMIT;');
    } catch (delErr) {
      db.exec('ROLLBACK;');
      throw delErr;
    }

    logAuditEvent({
      action: AUDIT_ACTIONS.DELETE_PATIENT,
      resourceType: 'Patient',
      resourceId: patientId,
      details: 'Patient record and all associated lab data deleted by authorized clinician.'
    });

    res.json({ success: true, message: 'Patient and all associated records deleted.' });
  } catch (err) {
    console.error('[PatientRoute] Error deleting patient:', err);
    res.status(500).json({ error: 'Failed to delete patient record.' });
  }
});

export default router;
