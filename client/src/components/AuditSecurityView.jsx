import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, Clock, ShieldAlert } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function AuditSecurityView() {
  const { patient, fetchCurrentPatient, showToast } = usePatient();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDeletePatient = async () => {
    if (!patient?.id) return;
    if (!window.confirm(`SECURITY WARNING: Are you sure you want to permanently delete patient record "${patient.name}" and all associated reports and laboratory findings? This action is recorded in the audit trail.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/patient/${patient.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete patient record');

      showToast('Patient record and associated data permanently purged.', 'info');
      await fetchCurrentPatient();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      showToast('Error deleting patient record.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const securityChecklist = [
    { title: 'Authentication & Session Control', status: 'Enforced', desc: 'Authorized clinician sessions; audit logs tag active user identifier.' },
    { title: 'Secure File Upload Validation', status: 'Enforced', desc: 'Strict MIME type & extension checks (PDF, JPG, PNG, TXT), 10MB size limit, no execution.' },
    { title: 'Backend Input Validation', status: 'Enforced', desc: 'Deterministic bounds checking on API routes; prevents SQL injections via parameterized SQLite.' },
    { title: 'Rate Limiting Protection', status: 'Enforced', desc: 'Sliding-window limiter active on sensitive /api endpoints (120 req/min).' },
    { title: 'Secrets & Credential Isolation', status: 'Enforced', desc: 'Zero API keys or secrets embedded in frontend build; 100% free offline deterministic engine.' },
    { title: 'HIPAA-Style Audit Logging', status: 'Enforced', desc: 'Security actions logged with timestamps without storing unnecessary medical PHI in logs.' },
    { title: 'Data Deletion & Purge Controls', status: 'Enforced', desc: 'Authorized clinicians can permanently delete individual reports or full patient records.' },
    { title: 'HTTPS Readiness', status: 'Enforced', desc: 'Security headers (nosniff, SAMEORIGIN, strict referrer policy) pre-configured.' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Security, Privacy & Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-1">
          Governance dashboard demonstrating security controls, rate limiting, and tamper-evident audit history.
        </p>
      </div>

      {/* Security Architecture Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Implemented Security Controls Checklist</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {securityChecklist.map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {item.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Live Security Audit Log ({auditLogs.length} Events)</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Non-PHI Log Protocol</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-4">Audit Details (Non-PHI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 font-mono text-[11px]">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{log.resource_type}</td>
                  <td className="py-2.5 px-3 text-slate-700">{log.user_id}</td>
                  <td className="py-2.5 px-4 text-slate-600 font-sans text-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Deletion & Purge Controls */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h2 className="text-sm font-bold">Authorized Patient Data Purge Controls</h2>
        </div>
        <p className="text-xs text-rose-800 leading-relaxed">
          Authorized clinicians may permanently purge active patient records and all cascade laboratory findings in accordance with data privacy regulations. This action is irreversible and recorded in the audit trail.
        </p>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={deleting || !patient?.id}
            onClick={handleDeletePatient}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Purging Record...' : `Permanently Delete Active Patient Record`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
