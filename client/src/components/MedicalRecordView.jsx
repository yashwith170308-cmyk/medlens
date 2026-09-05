import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Check,
  Edit3,
  Search,
  User,
  ShieldCheck
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { usePrivacy } from '../context/PrivacyContext';

export default function MedicalRecordView({ onOpenEvidence, onOpenReview, mode = 'record' }) {
  const { patient, recordData } = usePatient();
  const { maskName, maskIdentifier } = usePrivacy();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(mode === 'ranges' ? 'ABNORMAL' : 'ALL');
  const [verificationFilter, setVerificationFilter] = useState(mode === 'review' ? 'UNVERIFIED' : 'ALL');

  const currentLabs = recordData?.currentResults || [];

  // Filter laboratory results (memoized to avoid recalculating on unrelated parent renders)
  const filteredResults = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return currentLabs.filter((item) => {
      const matchesSearch =
        !term ||
        item.canonical_name.toLowerCase().includes(term) ||
        item.raw_test_name.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ABNORMAL' && (item.status === 'Below reported range' || item.status === 'Above reported range')) ||
        (statusFilter === 'NORMAL' && item.status === 'Within reported range') ||
        (statusFilter === 'UNDETERMINED' && item.status === 'Not determined');

      const matchesVerification =
        verificationFilter === 'ALL' ||
        (verificationFilter === 'VERIFIED' && item.verification_status === 'Human-verified') ||
        (verificationFilter === 'UNVERIFIED' && item.verification_status === 'Requires verification');

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [currentLabs, searchTerm, statusFilter, verificationFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {mode === 'ranges'
                ? 'Deterministic Reference Range Analysis'
                : mode === 'review'
                ? 'Human-in-the-Loop Review Center'
                : 'Structured Medical Record'}
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              {mode === 'ranges' ? 'Zero-Hallucination Range Bounds' : mode === 'review' ? 'Clinician Certification' : 'Validated Clinical Model'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'ranges'
              ? 'Deterministic interval parsing (< X, > X, X-Y). Unstated ranges are strictly tagged as Not determined.'
              : mode === 'review'
              ? 'Inspect, calibrate, correct, and certify AI-extracted observations before final chart integration.'
              : 'Normalized, traceable laboratory data with deterministic reference-range comparison and provenance tracking.'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-500 font-semibold">Provenance:</span>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">User-provided</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">AI-extracted</span>
          <span className="px-2 py-0.5 rounded bg-clinical-50 text-clinical-700 border border-clinical-200 font-medium">AI-generated</span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Human-verified</span>
        </div>
      </div>

      {/* Mode-Specific Evaluator Banners */}
      {mode === 'ranges' && (
        <div className="bg-clinical-50 border border-clinical-200 rounded-xl p-4 text-xs text-clinical-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-clinical-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wide">Deterministic Range Evaluation Engine</h3>
            <p className="mt-0.5 text-slate-600 leading-relaxed">
              Every extracted observed parameter is numerically checked against explicit document intervals. 
              Parameters without stated bounds are never assigned hallucinated default ranges; they are explicitly categorized under <strong>Not determined</strong> to ensure patient safety.
            </p>
          </div>
        </div>
      )}

      {mode === 'review' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wide">Human-in-the-Loop Certification Station</h3>
            <p className="mt-0.5 text-slate-700 leading-relaxed">
              AI extraction produces drafts tagged <strong>Requires verification</strong>. Authorized clinicians can click <strong>Review</strong> to modify values, change units, amend reference bounds, and permanently upgrade parameters to <strong>Human-verified</strong> with audit trail logging.
            </p>
          </div>
        </div>
      )}

      {/* Patient Intake Summary (Tagged User-provided) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Patient Intake Baseline</h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
            User-provided
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Identifier / Name</span>
            <span className="font-semibold text-slate-900">{maskName(patient?.name || 'Alex Mercer')}</span>
            <span className="text-slate-400 block text-[10px]">ID: {maskIdentifier(patient?.id || 'pt-demo')}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Age / Sex</span>
            <span className="font-semibold text-slate-900">{patient?.age || '--'} Years &bull; {patient?.sex || '--'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Documented Allergies</span>
            <span className="font-semibold text-slate-900">{patient?.allergies || 'None reported'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Current Medications</span>
            <span className="font-semibold text-slate-900">{patient?.medications || 'None'}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500 block text-[11px]">Symptoms & Presenting Concerns</span>
            <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] mt-0.5">
              {patient?.symptoms || 'None recorded'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500 block text-[11px]">Existing Medical Conditions</span>
            <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] mt-0.5">
              {patient?.conditions || 'None reported'}
            </p>
          </div>
        </div>
      </div>

      {/* Laboratory Results Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-clinical-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Extracted Laboratory Results ({filteredResults.length} of {currentLabs.length})
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Source: Medical Reports &bull; Deterministic evaluation &bull; Ranges never fabricated
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search parameter (e.g. Hb, WBC)..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none bg-white text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="NORMAL">Within Reported Range</option>
              <option value="ABNORMAL">Outside Reported Range</option>
              <option value="UNDETERMINED">Not Determined (No Range)</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none bg-white text-slate-700"
            >
              <option value="ALL">All Verifications</option>
              <option value="VERIFIED">Human Verified</option>
              <option value="UNVERIFIED">Requires Verification</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Test / Parameter</th>
                <th className="py-3 px-3">Observed Result</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3">
                  Reported Reference Range
                  <span className="block text-[9px] text-slate-400 font-normal">Exact text from report</span>
                </th>
                <th className="py-3 px-3">
                  Calculated Status
                  <span className="block text-[9px] text-slate-400 font-normal">Deterministic</span>
                </th>
                <th className="py-3 px-3">Provenance Source</th>
                <th className="py-3 px-3">Verification</th>
                <th className="py-3 px-4 text-right">Human Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No laboratory findings match the selected search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredResults.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.canonical_name}</div>
                      {item.raw_test_name !== item.canonical_name && (
                        <div className="text-[10px] text-slate-400 font-mono">Reported as: {item.raw_test_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-sm">
                      {item.value_text}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {item.unit || '--'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {item.reference_range_raw && item.reference_range_raw !== 'None reported' ? (
                        <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.reference_range_raw}
                        </span>
                      ) : (
                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px] font-semibold">
                          None reported (Not invented)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 shadow-sm ${
                        item.status === 'Within reported range'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'Below reported range'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : item.status === 'Above reported range'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                      }`}>
                        {item.status === 'Within reported range' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {item.status === 'Below reported range' && <ArrowDownRight className="w-3 h-3 text-amber-700" />}
                        {item.status === 'Above reported range' && <ArrowUpRight className="w-3 h-3 text-rose-700" />}
                        {item.status === 'Not determined' && <HelpCircle className="w-3 h-3 text-purple-700" />}
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {item.source_type}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]" title={item.report_filename}>
                          {item.report_filename || 'Current Report'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                        item.verification_status === 'Human-verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {item.verification_status === 'Human-verified' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            <span>Human verified</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Requires verification</span>
                          </>
                        )}
                      </span>
                      {item.verified_by && (
                        <span className="block text-[9px] text-slate-400 mt-0.5">By: {item.verified_by}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => onOpenEvidence(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-clinical-600 hover:text-clinical-800 bg-clinical-50 hover:bg-clinical-100 px-2.5 py-1 rounded border border-clinical-200 transition-colors"
                        title="View exact source snippet and report provenance"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Show Evidence</span>
                      </button>
                      <button
                        onClick={() => onOpenReview(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                        title="Edit value, correct unit, or confirm verification"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
