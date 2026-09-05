import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles, Copy } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

const SAMPLE_CLINICAL_REPORT = `METROPOLITAN CLINICAL LABORATORIES
PATIENT: Alex J. Mercer    AGE: 48    SEX: Male
DATE OF REPORT: 2024-09-02    COLLECTION TIME: 08:30 AM
SPECIMEN: Serum & Whole Blood (Fasting)

COMPLETE BLOOD COUNT (CBC):
Hemoglobin 10.2 g/dL (Reference: 13.0 - 17.0 g/dL)
White Blood Cell Count: 8,100 /µL (Reference: 4000 - 10000 /µL)
Platelet Count: 245,000 /cu.mm (Reference: 150000 - 450000 /cu.mm)

BIOCHEMISTRY & LIPID PROFILE:
Fasting Blood Sugar: 145 mg/dL Ref: 70 - 99 mg/dL
Total Cholesterol 238 mg/dL (< 200 mg/dL)
Serum Creatinine 1.0 mg/dL (0.7 - 1.3 mg/dL)

INFLAMMATORY MARKERS:
Erythrocyte Sedimentation Rate 22 mm/hr

CLINICAL IMPRESSION & REMARKS:
Patient reports exertional fatigue. Hemoglobin mildly reduced; Fasting Glucose elevated.
Note: Chart records prior allergy to Penicillin V.`;

export default function UploadReport({ onNavigate }) {
  const { patient, refreshRecord, showToast } = usePatient();
  
  const [activeMode, setActiveMode] = useState('paste'); // 'paste' | 'file'
  const [pastedText, setPastedText] = useState('');
  const [reportTitle, setReportTitle] = useState('Laboratory_Report_Sept.txt');
  const [isPrevious, setIsPrevious] = useState(false);
  const [file, setFile] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(null);
  const [extractionResult, setExtractionResult] = useState(null);
  const [error, setError] = useState(null);

  const pipelineStages = [
    'Input Document Verification',
    'Clinical Entity Extraction (NER)',
    'Data Type & Value Validation',
    'Terminology Normalization (Hb -> Hemoglobin)',
    'Deterministic Reference Range Analysis',
    'Cross-Source Conflict Check',
    'Clarification Inquiry Generation'
  ];

  const handlePasteSample = () => {
    setPastedText(SAMPLE_CLINICAL_REPORT);
    setReportTitle('Current_Lab_Report_Sept.txt');
    showToast('Sample synthetic CBC & Metabolic clinical report loaded.', 'info');
  };

  const handleProcessPasted = async (e) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setError('Please paste medical report text before processing.');
      return;
    }

    setProcessing(true);
    setError(null);
    setExtractionResult(null);

    // Simulate pipeline stage progression visually
    for (let i = 0; i < pipelineStages.length; i++) {
      setProcessingStage(pipelineStages[i]);
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const res = await fetch('/api/reports/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient?.id,
          text: pastedText,
          filename: reportTitle || 'Pasted_Clinical_Report.txt',
          isPrevious
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Report processing failed');
      }

      const data = await res.json();
      setExtractionResult(data);
      showToast(`Extracted ${data.extractedCount} clinical parameter(s) successfully!`, 'success');
      await refreshRecord();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during report extraction.');
    } finally {
      setProcessing(false);
      setProcessingStage(null);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF, JPG, PNG, or TXT file to upload.');
      return;
    }

    setProcessing(true);
    setError(null);
    setExtractionResult(null);

    // Visual pipeline
    for (let i = 0; i < pipelineStages.length; i++) {
      setProcessingStage(pipelineStages[i]);
      await new Promise(r => setTimeout(r, 250));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patient?.id);
    formData.append('isPrevious', String(isPrevious));

    try {
      const res = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload report file.');
      }

      const data = await res.json();
      setExtractionResult(data);
      showToast(`Processed "${file.name}": Extracted ${data.extractedCount} parameters!`, 'success');
      await refreshRecord();
    } catch (err) {
      console.error(err);
      setError(err.message || 'File upload failed.');
    } finally {
      setProcessing(false);
      setProcessingStage(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Process Medical / Laboratory Report</h1>
          <p className="text-xs text-slate-500 mt-1">
            Input medical reports via plain text paste or document upload (PDF, JPG, PNG, TXT).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Active Patient:</span>
          <span className="font-semibold text-slate-800">{patient?.name || 'Alex Mercer'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveMode('paste'); setError(null); }}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeMode === 'paste'
              ? 'border-clinical-600 text-clinical-700 bg-clinical-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Option 1: Paste Report Text</span>
        </button>
        <button
          onClick={() => { setActiveMode('file'); setError(null); }}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeMode === 'file'
              ? 'border-clinical-600 text-clinical-700 bg-clinical-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Option 2: Upload File (PDF, JPG, PNG)</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Paste Report Text */}
      {activeMode === 'paste' && (
        <form onSubmit={handleProcessPasted} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Medical / Laboratory Report Text
            </label>
            <button
              type="button"
              onClick={handlePasteSample}
              className="flex items-center gap-1 text-xs font-semibold text-clinical-600 hover:text-clinical-800 underline"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Load Synthetic Sample Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Report Document Label</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Current_Lab_Report_Sept.txt"
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="pastePrevious"
                checked={isPrevious}
                onChange={(e) => setIsPrevious(e.target.checked)}
                className="w-4 h-4 text-clinical-600 rounded border-slate-300 focus:ring-clinical-500"
              />
              <label htmlFor="pastePrevious" className="text-xs font-medium text-slate-700 cursor-pointer">
                Mark as <strong>Previous Baseline Report</strong> (for Longitudinal Comparison)
              </label>
            </div>
          </div>

          <textarea
            rows="12"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste clinical report contents here (e.g., Hemoglobin 10.2 g/dL 13-17, Fasting Blood Sugar 145 mg/dL 70-99)..."
            className="w-full text-xs font-mono p-3.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none leading-relaxed bg-slate-50/50"
          ></textarea>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              *Preserves source lines &bull; Normalizes equivalents (Hb &rarr; Hemoglobin) &bull; Never fabricates ranges
            </span>
            <button
              type="submit"
              disabled={processing}
              className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold shadow-md shadow-clinical-600/20 transition-all focus:ring-2 focus:ring-clinical-500 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process Report Pipeline</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: Upload File */}
      {activeMode === 'file' && (
        <form onSubmit={handleFileUpload} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-clinical-400 transition-colors bg-slate-50/50">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Select or drop a medical report file</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Supports PDF, JPG, JPEG, PNG, TXT (Up to 10MB)</p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-4 block mx-auto text-xs text-slate-600 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-clinical-50 file:text-clinical-700 hover:file:bg-clinical-100 cursor-pointer"
            />
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-800">{file.name}</span>
              <span className="text-slate-500 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filePrevious"
              checked={isPrevious}
              onChange={(e) => setIsPrevious(e.target.checked)}
              className="w-4 h-4 text-clinical-600 rounded border-slate-300 focus:ring-clinical-500"
            />
            <label htmlFor="filePrevious" className="text-xs font-medium text-slate-700 cursor-pointer">
              Mark as <strong>Previous Baseline Report</strong> (for Longitudinal Comparison)
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={processing || !file}
              className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold shadow-md shadow-clinical-600/20 transition-all focus:ring-2 focus:ring-clinical-500 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Process Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Live Pipeline Stepper during processing */}
      {processing && (
        <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-clinical-300">
              Pipeline Stage: {processingStage}
            </span>
            <Loader2 className="w-4 h-4 text-clinical-400 animate-spin" />
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-clinical-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* Extraction Success Card */}
      {extractionResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-900">
                Report Processed Successfully!
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              Category: {extractionResult.category}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Extracted Parameters</span>
              <span className="text-lg font-bold text-emerald-900">{extractionResult.extractedCount}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Report Date</span>
              <span className="text-sm font-bold text-slate-800">{extractionResult.reportDate}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Document Label</span>
              <span className="text-xs font-bold text-slate-800 truncate block">{extractionResult.filename}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Human Verification</span>
              <span className="text-xs font-bold text-amber-700">Requires review</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => onNavigate('record')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <span>View Structured Medical Record</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
