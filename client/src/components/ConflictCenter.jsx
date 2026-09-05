import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function ConflictCenter() {
  const { recordData, refreshRecord, showToast } = usePatient();
  const conflicts = recordData?.conflicts || [];

  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUpdateStatus = async (conflictId, status) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/record/conflicts/${conflictId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolutionNotes: resolutionNotes.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to update conflict status');

      showToast(`Conflict marked as ${status}.`, 'success');
      setResolvingId(null);
      setResolutionNotes('');
      await refreshRecord();
    } catch (err) {
      console.error(err);
      showToast('Error updating conflict.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const unresolvedCount = conflicts.filter(c => c.status === 'Unresolved').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Inconsistency & Conflict Detection</h1>
            {unresolvedCount > 0 ? (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                {unresolvedCount} Potential Conflict{unresolvedCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                All Reconciled
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated reconciliation across patient intake disclosures, laboratory findings, and diagnostic reports.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wide text-amber-950">
            System Governance Notice: Non-Autonomous Resolution
          </h3>
          <p className="text-[11px] leading-relaxed mt-1">
            MedLens highlights contradictory clinical statements between records but does NOT automatically determine which source is correct. Authorized human review is required to clarify discrepancies.
          </p>
        </div>
      </div>

      {/* Conflict Cards */}
      <div className="space-y-4">
        {conflicts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No Inconsistencies Detected</p>
            <p className="text-slate-400 mt-1">Patient disclosures and laboratory reports are currently aligned.</p>
          </div>
        ) : (
          conflicts.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-5 shadow-sm space-y-4 transition-all ${
                item.status === 'Unresolved'
                  ? 'border-rose-200 ring-1 ring-rose-100'
                  : item.status === 'Acknowledged'
                  ? 'border-amber-200'
                  : 'border-emerald-200 bg-slate-50/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    item.status === 'Unresolved' ? 'text-rose-600' : item.status === 'Acknowledged' ? 'text-amber-600' : 'text-emerald-600'
                  }`} />
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  item.status === 'Unresolved'
                    ? 'bg-rose-100 text-rose-800'
                    : item.status === 'Acknowledged'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Status: {item.status}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {item.description}
              </p>

              {/* Source Comparison Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Source A (Intake Record)
                  </span>
                  <p className="text-slate-800 font-medium">{item.source_a}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Source B (Medical Document)
                  </span>
                  <p className="text-slate-800 font-medium">{item.source_b}</p>
                </div>
              </div>

              {/* Resolution Notes Display if already resolved */}
              {item.resolution_notes && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-bold block text-[11px] mb-0.5">Clinician Resolution Note:</span>
                  <p className="text-slate-800">{item.resolution_notes}</p>
                </div>
              )}

              {/* Interactive Resolution Form */}
              {resolvingId === item.id ? (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Clinical Reconciliation Rationale / Notes:
                  </label>
                  <textarea
                    rows="2"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Document verified history (e.g., Patient clarified that allergic rash to Penicillin occurred in childhood; allergy allergy chart updated to active Penicillin allergy)..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
                  ></textarea>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setResolvingId(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleUpdateStatus(item.id, 'Acknowledged')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                    >
                      Mark Acknowledged
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleUpdateStatus(item.id, 'Resolved')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Save Resolution
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setResolvingId(item.id);
                      setResolutionNotes(item.resolution_notes || '');
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-clinical-600 hover:text-clinical-800 bg-clinical-50 hover:bg-clinical-100 px-3 py-1.5 rounded-lg border border-clinical-200 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{item.status === 'Resolved' ? 'Edit Resolution' : 'Review & Resolve Conflict'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
