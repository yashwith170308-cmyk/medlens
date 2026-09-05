import React from 'react';
import { ArrowRight, Database, FileText } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function EvidenceModeView() {
  const { recordData } = usePatient();
  const aiSummary = recordData?.aiSummary;
  const evidenceList = aiSummary?.evidenceStatements || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Evidence Mode & Audit Traceability</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-clinical-100 text-clinical-800 border border-clinical-200">
              3-Tier Statement Binding
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every AI statement links directly to verified laboratory observations and underlying source document text.
          </p>
        </div>
      </div>

      {/* Concept Architecture Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-clinical-300 block">
          Evidence Mapping Protocol
        </span>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10 text-center w-full">
            <span className="text-[10px] text-clinical-300 font-bold uppercase block mb-1">Tier 1</span>
            <span className="font-semibold text-slate-100">AI-Generated Statement</span>
          </div>
          <ArrowRight className="w-4 h-4 text-clinical-400 rotate-90 md:rotate-0" />
          <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10 text-center w-full">
            <span className="text-[10px] text-emerald-300 font-bold uppercase block mb-1">Tier 2</span>
            <span className="font-semibold text-slate-100">Supporting Laboratory Data</span>
          </div>
          <ArrowRight className="w-4 h-4 text-clinical-400 rotate-90 md:rotate-0" />
          <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10 text-center w-full">
            <span className="text-[10px] text-indigo-300 font-bold uppercase block mb-1">Tier 3</span>
            <span className="font-semibold text-slate-100">Source Report Snippet</span>
          </div>
        </div>
      </div>

      {/* Evidence Statements List */}
      <div className="space-y-4">
        {evidenceList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No Evidence Mappings Available</p>
            <p className="text-slate-400 mt-1">Upload a medical report to generate traceable statement bindings.</p>
          </div>
        ) : (
          evidenceList.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              {/* Row: Statement */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-clinical-50 text-clinical-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded">
                      AI Statement
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-relaxed">
                    "{item.statement}"
                  </p>
                </div>
              </div>

              {/* Grid: Supporting Data & Source */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <Database className="w-3.5 h-3.5" /> Supporting Clinical Data
                  </div>
                  <p className="font-mono text-emerald-950 font-bold text-xs mt-0.5">
                    {item.supportingData}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Source Origin
                  </div>
                  <p className="font-mono text-slate-800 text-[11px] break-all">
                    {item.source}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
