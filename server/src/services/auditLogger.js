import { db } from '../db/database.js';
import crypto from 'node:crypto';

/**
 * Audit Logger Service
 * 
 * Records system and user security events.
 * CRITICAL: NEVER stores sensitive patient medical data or PHI in audit logs.
 */

export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_PATIENT: 'CREATE_PATIENT',
  UPDATE_PATIENT: 'UPDATE_PATIENT',
  DELETE_PATIENT: 'DELETE_PATIENT',
  UPLOAD_REPORT: 'UPLOAD_REPORT',
  VIEW_REPORT: 'VIEW_REPORT',
  DELETE_REPORT: 'DELETE_REPORT',
  VIEW_RECORD: 'VIEW_RECORD',
  EDIT_RESULT: 'EDIT_RESULT',
  VERIFY_RESULT: 'VERIFY_RESULT',
  RESOLVE_CONFLICT: 'RESOLVE_CONFLICT',
  ANSWER_CLARIFICATION: 'ANSWER_CLARIFICATION',
  EXPORT_RECORD: 'EXPORT_RECORD',
  LOAD_DEMO: 'LOAD_DEMO'
};

/**
 * Logs an audit event to SQLite database.
 * 
 * @param {object} params
 * @param {string} params.action - One of AUDIT_ACTIONS
 * @param {string} [params.userId='system-clinician']
 * @param {string} params.resourceType - e.g. 'Patient', 'Report', 'LabResult'
 * @param {string} [params.resourceId]
 * @param {string} [params.details] - Non-PHI description
 * @param {string} [params.ipAddress='127.0.0.1']
 */
export function logAuditEvent({ action, userId = 'clinician-1', resourceType, resourceId = null, details = '', ipAddress = '127.0.0.1' }) {
  try {
    const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(id, userId, action, resourceType, resourceId, ipAddress, details);
    return id;
  } catch (err) {
    console.error('[AuditLogger] Failed to write audit event:', err.message);
    return null;
  }
}

/**
 * Retrieves audit logs ordered by newest first.
 * @param {number} [limit=50]
 * @returns {Array<object>}
 */
export function getAuditLogs(limit = 50) {
  try {
    const stmt = db.prepare(`
      SELECT id, user_id, action, resource_type, resource_id, ip_address, details, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  } catch (err) {
    console.error('[AuditLogger] Failed to query audit logs:', err.message);
    return [];
  }
}
