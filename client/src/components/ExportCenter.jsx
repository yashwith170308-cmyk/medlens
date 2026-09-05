import React from 'react';
import { Download, FileText, FileSpreadsheet, Printer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { usePrivacy } from '../context/PrivacyContext';

export default function ExportCenter() {
  const { patient, recordData } = usePatient();
  const { maskName } = usePrivacy();

  const handleExportJson = () => {
    if (!patient?.id) return;
    window.open(`/api/export/${patient.id}/json`, '_blank');
  };

  const handleExportCsv = () => {
    if (!patient?.id) return;
    window.open(`/api/export/${patient.id}/csv`, '_blank');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const labsCount = recordData?.currentResults?.length || 0;
  const reportsCount = recordData?.reports?.length || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Export Clinical Patient Record</h1>
        <p className="text-xs text-slate-500 mt-1">
          Export structured clinical information to standardized open formats (PDF, CSV, JSON) without proprietary lock-in.
        </p>
      </div>

      {/* Record Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Active Export Target</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Patient Name</span>
            <span className="font-bold text-slate-900">{maskName(patient?.name || 'Alex Mercer')}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Reports Included</span>
            <span className="font-bold text-slate-900">{reportsCount} Document(s)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Extracted Results</span>
            <span className="font-bold text-slate-900">{labsCount} Findings</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Audit Timestamp</span>
            <span className="font-bold text-slate-900">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* PDF Option */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-clinical-400 transition-colors">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Clinical PDF Summary</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate a formatted, printable clinical document containing patient demographics, structured lab table, and disclaimer.
            </p>
          </div>
          <button
            onClick={handlePrintPdf}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>

        {/* CSV Option */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-clinical-400 transition-colors">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Laboratory CSV Export</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Download tabular laboratory parameters, units, reference bounds, statuses, and verification signatures in standard CSV.
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV (.csv)</span>
          </button>
        </div>

        {/* JSON Option */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-clinical-400 transition-colors">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Structured JSON Interoperability</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export the complete clinical JSON document model with provenance chains, conflicts, AI summary, and evidence nodes.
            </p>
          </div>
          <button
            onClick={handleExportJson}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
