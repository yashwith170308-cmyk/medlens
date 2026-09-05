import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Trash2, Save } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function HumanReviewModal({ item, onClose }) {
  const { refreshRecord, showToast } = usePatient();

  const [observedValue, setObservedValue] = useState('');
  const [unit, setUnit] = useState('');
  const [referenceRangeRaw, setReferenceRangeRaw] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('Requires verification');
  const [verifiedBy, setVerifiedBy] = useState('Dr. Evelyn Reed, MD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setObservedValue(item.observed_value !== null ? String(item.observed_value) : item.value_text || '');
      setUnit(item.unit || '');
      setReferenceRangeRaw(item.reference_range_raw || '');
      setVerificationStatus(item.verification_status || 'Requires verification');
      setVerifiedBy(item.verified_by || 'Dr. Evelyn Reed, MD');
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async (newStatus) => {
    setSaving(true);
    try {
      const statusToSet = newStatus || verificationStatus;
      const res = await fetch(`/api/record/results/${item.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observedValue: parseFloat(observedValue) || observedValue,
          unit,
          referenceRangeRaw: referenceRangeRaw.trim() || null,
          verificationStatus: statusToSet,
          verifiedBy: statusToSet === 'Human-verified' ? verifiedBy : null
        })
      });

      if (!res.ok) throw new Error('Failed to update laboratory review');

      showToast(`Laboratory parameter "${item.canonical_name}" updated (${statusToSet}).`, 'success');
      await refreshRecord();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Error saving human review.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">Human Verification & Review</h3>
              <p className="text-[11px] text-slate-300">Human-in-the-Loop Clinical Governance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">{item.canonical_name}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                {item.source_type}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Source File: <strong className="text-slate-700">{item.report_filename || 'Medical Report'}</strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              Original Snippet: "{item.source_snippet}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observed Numerical Result
              </label>
              <input
                type="text"
                value={observedValue}
                onChange={(e) => setObservedValue(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measurement
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. g/dL, /µL, mg/dL"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reported Reference Range (from Report)
            </label>
            <input
              type="text"
              value={referenceRangeRaw}
              onChange={(e) => setReferenceRangeRaw(e.target.value)}
              placeholder="e.g. 13.0 - 17.0, < 200, or leave blank if unstated"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              *If left blank, status will strictly evaluate to "Not determined".
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewing Clinician Signature / ID
            </label>
            <input
              type="text"
              value={verifiedBy}
              onChange={(e) => setVerifiedBy(e.target.value)}
              placeholder="e.g. Dr. Evelyn Reed, MD"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Modifying the observed value or reference range automatically recalculates the normative status deterministically. AI information is never auto-verified.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleSave('Rejected')}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reject Finding</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave('Requires verification')}
              disabled={saving}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
            >
              Save Corrections
            </button>
            <button
              type="button"
              onClick={() => handleSave('Human-verified')}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Mark Verified</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
