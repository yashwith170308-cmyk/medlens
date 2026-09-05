import React, { useState } from 'react';
import { Files, FileText, Calendar, Trash2, Eye, Tag, PlusCircle } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function ReportsList({ onNavigate }) {
  const { recordData, refreshRecord, showToast } = usePatient();
  const reports = recordData?.reports || [];

  const [selectedReport, setSelectedReport] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (reportId, filename) => {
    if (!window.confirm(`Are you sure you want to delete report "${filename}"? All extracted results from this document will be removed.`)) {
      return;
    }

    setDeletingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete report');

      showToast(`Report "${filename}" deleted.`, 'info');
      await refreshRecord();
      if (selectedReport?.id === reportId) setSelectedReport(null);
    } catch (err) {
      console.error(err);
      showToast('Error deleting report.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Blood': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Urine': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Imaging': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Prescription': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pathology': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Medical Document Repository</h1>
          <p className="text-xs text-slate-500 mt-1">
            Categorized diagnostic and laboratory documents associated with the current patient record.
          </p>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Upload New Report</span>
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            <Files className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No Reports Uploaded</p>
            <p className="text-slate-400 mt-1">Upload a clinical report or paste document text to get started.</p>
          </div>
        ) : (
          reports.map((rep) => (
            <div key={rep.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-clinical-50 text-clinical-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-[220px]" title={rep.filename}>
                      {rep.filename}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Format: {rep.file_type.toUpperCase()}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(rep.category)}`}>
                  {rep.category}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Report Date:</span>
                  <span className="font-semibold text-slate-700">{rep.report_date || 'Undated'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Role in Record:</span>
                  <span className="font-semibold text-slate-700">
                    {rep.is_previous ? 'Previous Baseline' : 'Current Diagnostic'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReport(rep)}
                  className="flex items-center gap-1 text-xs font-semibold text-clinical-600 hover:text-clinical-800"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Raw Text</span>
                </button>

                <button
                  type="button"
                  disabled={deletingId === rep.id}
                  onClick={() => handleDelete(rep.id, rep.filename)}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                  title="Delete report and associated results"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Raw Text Inspector Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold">{selectedReport.filename}</h3>
                <p className="text-[10px] text-slate-400">Raw Document Text Preview</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-800 bg-slate-50 whitespace-pre-wrap leading-relaxed border-b border-slate-200">
              {selectedReport.raw_text}
            </div>
            <div className="p-3 bg-white flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
