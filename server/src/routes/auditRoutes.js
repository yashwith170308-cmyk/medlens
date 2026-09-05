import express from 'express';
import { getAuditLogs, logAuditEvent, AUDIT_ACTIONS } from '../services/auditLogger.js';

const router = express.Router();

// GET audit logs
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = getAuditLogs(limit);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST mock login event (security audit demo)
router.post('/login', (req, res) => {
  const { username = 'demo_clinician' } = req.body;
  logAuditEvent({
    action: AUDIT_ACTIONS.LOGIN,
    userId: username,
    resourceType: 'UserSession',
    details: `Clinician "${username}" authenticated successfully.`
  });
  res.json({ success: true, user: { username, role: 'Clinician' } });
});

export default router;
