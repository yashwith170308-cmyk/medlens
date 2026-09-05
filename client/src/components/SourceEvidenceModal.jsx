import React from 'react';
import { X, FileText, Eye, Hash } from 'lucide-react';

export default function SourceEvidenceModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-clinical-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-clinical-300" />
            <div>
              <h3 className="text-sm font-bold">Source Provenance & Evidence</h3>
              <p className="text-[11px] text-slate-300">Auditable Clinical Evidence Chain</p>
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
        <div className="p-6 space-y-4 text-xs">
          {/* Parameter Details */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 block">Parameter Evaluated</span>
              <span className="text-base font-bold text-slate-900">{item.canonical_name}</span>
              {item.raw_test_name !== item.canonical_name && (
                <span className="text-[10px] text-slate-400 block">Reported as: {item.raw_test_name}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 font-mono block">
                {item.value_text} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                item.status === 'Within reported range'
                  ? 'bg-emerald-100 text-emerald-800'
                  : item.status === 'Below reported range'
                  ? 'bg-amber-100 text-amber-900'
                  : item.status === 'Above reported range'
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-purple-100 text-purple-900'
              }`}>
                {item.status}
              </span>
            </div>
          </div>

          {/* Provenance Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-500" /> Source Document
              </span>
              <span className="font-semibold text-slate-800 truncate block" title={item.report_filename}>
                {item.report_filename || 'Current Medical Report'}
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-500" /> Page & Origin
              </span>
              <span className="font-semibold text-slate-800">
                Page {item.source_page || 1} &bull; Tag: {item.source_type}
              </span>
            </div>
          </div>

          {/* Raw Highlighted Snippet */}
          <div>
            <span className="text-[11px] font-bold text-slate-700 block mb-1">
              Verbatim Extracted Source Snippet:
            </span>
            <div className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs border border-slate-800 leading-relaxed shadow-inner">
              <div className="text-[10px] text-slate-500 mb-1 flex items-center justify-between">
                <span>RAW LINE EXTRACT</span>
                <span className="text-slate-400">Exact String Match</span>
              </div>
              <p className="bg-slate-800/80 p-2 rounded text-emerald-300 font-semibold selection:bg-emerald-800">
                "{item.source_snippet || 'Snippet unavailable'}"
              </p>
            </div>
          </div>

          {/* Deterministic Evaluation Trace */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 space-y-1">
            <span className="font-bold block text-[11px] uppercase tracking-wider text-blue-900">
              Deterministic Range Logic
            </span>
            <p className="text-[11px] leading-relaxed">
              Reported reference range: <strong>{item.reference_range_raw || 'None reported'}</strong>.
              {item.status === 'Not determined'
                ? ' In accordance with MedLens safety requirements, since the report provided no range, the normative status is strictly not determined and no external ranges were substituted.'
                : ` Mathematical comparison (${item.value_text} vs ${item.reference_range_raw}) evaluated to "${item.status}".`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Evidence Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
